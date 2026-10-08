/**
 * Google Analytics 4 for FPA Lens.
 *
 * GA_MEASUREMENT_ID is the public tag ID (G-...) rendered on the frontend; it
 * is public by design, so it lives here rather than in an env var. null = no tag.
 * The admin dashboard panel and the /admin/analytics page read the GA4 Data API
 * with a read-only service account:
 *   - GA_PROPERTY_ID           numeric property ID (Admin -> Property details)
 *   - GA_SERVICE_ACCOUNT_JSON  the service account's JSON key, stored ONLY as a
 *                              Vercel env var (never commit it; repo is public)
 * The service account holds the Viewer role on the GA property and nothing else.
 * Token minting is a hand-rolled RS256 JWT so no Google SDK is needed.
 */
import { createSign } from "node:crypto";
import { unstable_cache } from "next/cache";

export const GA_MEASUREMENT_ID: string | null = "G-X2R4DRZMEY";

/** The property reports in Central time; ranges are computed in the same zone. */
const TIME_ZONE = "America/Chicago";

type ServiceAccount = { client_email: string; private_key: string };

function readConfig(): { propertyId: string; sa: ServiceAccount } | null {
  const propertyId = process.env.GA_PROPERTY_ID?.trim();
  const raw = process.env.GA_SERVICE_ACCOUNT_JSON;
  if (!propertyId || !raw) return null;
  const sa = JSON.parse(raw) as ServiceAccount;
  return { propertyId, sa };
}

export function isTrafficConfigured(): boolean {
  return Boolean(process.env.GA_PROPERTY_ID && process.env.GA_SERVICE_ACCOUNT_JSON);
}

export function gaReportsUrl(propertyId: string): string {
  return `https://analytics.google.com/analytics/web/#/p${propertyId}/reports/intelligenthome`;
}

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

// Tokens last an hour; reuse one per warm function instance.
let cachedToken: { value: string; expires: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(sa.private_key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${b64url(signature)}`,
    }),
  });
  if (!res.ok) throw new Error(`GA token request failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

type ReportRow = { dimensionValues?: { value: string }[]; metricValues: { value: string }[] };

async function gaCall(method: "runReport" | "runRealtimeReport", body: object): Promise<ReportRow[]> {
  const config = readConfig();
  if (!config) throw new Error("GA not configured");
  const token = await getAccessToken(config.sa);
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${config.propertyId}:${method}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`GA ${method} failed: ${res.status}`);
  return ((await res.json()) as { rows?: ReportRow[] }).rows ?? [];
}

const num = (r: ReportRow, i: number) => Number(r.metricValues[i]?.value) || 0;
const dim = (r: ReportRow, i: number) => r.dimensionValues?.[i]?.value ?? "";

// Every page title ends in " | FPA Lens" (or is the full site title on home).
function cleanTitle(title: string, path: string): string {
  if (path === "/") return "Home";
  return title.replace(/\s*\|\s*(FPA Lens|Southeast Louisiana Flood Protection Authority).*$/i, "").trim() || path;
}

/* ------------------------------------------------------------------ */
/*  Dashboard summary panel                                            */
/* ------------------------------------------------------------------ */

export type TrafficSummary = {
  visitors: number;
  pageViews: number;
  avgEngagementSeconds: number;
  topPages: { title: string; path: string; views: number }[];
  propertyId: string;
};

async function fetchTrafficSummary(): Promise<TrafficSummary | null> {
  const config = readConfig();
  if (!config) return null;
  const dateRanges = [{ startDate: "30daysAgo", endDate: "today" }];

  const [totals, pages] = await Promise.all([
    gaCall("runReport", {
      dateRanges,
      metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }, { name: "userEngagementDuration" }],
    }),
    gaCall("runReport", {
      dateRanges,
      dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
      metrics: [{ name: "screenPageViews" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 10,
    }),
  ]);

  const t = totals[0];
  const users = t ? num(t, 0) : 0;
  return {
    visitors: users,
    pageViews: t ? num(t, 1) : 0,
    avgEngagementSeconds: users && t ? num(t, 2) / users : 0,
    topPages: pages.map((r) => ({ path: dim(r, 0), title: cleanTitle(dim(r, 1), dim(r, 0)), views: num(r, 0) })),
    propertyId: config.propertyId,
  };
}

/** Last-30-day traffic, cached for an hour (the Data API has per-property quotas). */
export const getTrafficSummary = unstable_cache(fetchTrafficSummary, ["ga4-traffic-summary"], {
  revalidate: 3600,
});

/* ------------------------------------------------------------------ */
/*  Full analytics page                                                */
/* ------------------------------------------------------------------ */

export const PERIODS = [
  { key: "7d", label: "7 D" },
  { key: "30d", label: "30 D" },
  { key: "90d", label: "90 D" },
  { key: "ytd", label: "YTD" },
  { key: "custom", label: "Custom" },
] as const;

export type DateRange = { start: string; end: string; priorStart: string; priorEnd: string; label: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function todayCentral(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

/** Resolve ?period= / ?start= / ?end= into a range plus the equal-length prior range. */
export function resolveRange(period?: string, start?: string, end?: string): { period: string; range: DateRange } {
  const today = todayCentral();
  let p = PERIODS.some((x) => x.key === period) ? period! : "30d";
  let s: string;
  let e = today;
  if (p === "custom" && start && end && ISO.test(start) && ISO.test(end) && start <= end) {
    s = start;
    e = end > today ? today : end;
  } else if (p === "ytd") {
    s = `${today.slice(0, 4)}-01-01`;
  } else {
    if (p === "custom") p = "30d"; // incomplete custom range falls back
    s = addDays(today, -(Number.parseInt(p, 10) - 1));
  }
  const len = daysBetween(s, e) + 1;
  const priorEnd = addDays(s, -1);
  const priorStart = addDays(priorEnd, -(len - 1));
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return { period: p, range: { start: s, end: e, priorStart, priorEnd, label: `${fmt(s)} – ${fmt(e)}` } };
}

export type Kpis = {
  visitors: number;
  newVisitors: number;
  sessions: number;
  pageViews: number;
  avgEngagementSeconds: number;
  engagementRate: number;
};

export type AnalyticsReport = {
  current: Kpis;
  prior: Kpis;
  daily: { date: string; visitors: number; pageViews: number }[];
  topPages: { path: string; title: string; views: number; visitors: number; avgSeconds: number }[];
  channels: { name: string; sessions: number }[];
  referrers: { name: string; sessions: number }[];
  cities: { city: string; region: string; visitors: number }[];
  louisianaShare: number | null;
  devices: { name: string; visitors: number }[];
  downloads: { file: string; count: number }[];
  outbound: { domain: string; count: number }[];
};

const KPI_METRICS = [
  { name: "activeUsers" },
  { name: "newUsers" },
  { name: "sessions" },
  { name: "screenPageViews" },
  { name: "userEngagementDuration" },
  { name: "engagementRate" },
];

function toKpis(rows: ReportRow[]): Kpis {
  const r = rows[0];
  if (!r) return { visitors: 0, newVisitors: 0, sessions: 0, pageViews: 0, avgEngagementSeconds: 0, engagementRate: 0 };
  const visitors = num(r, 0);
  return {
    visitors,
    newVisitors: num(r, 1),
    sessions: num(r, 2),
    pageViews: num(r, 3),
    avgEngagementSeconds: visitors ? num(r, 4) / visitors : 0,
    engagementRate: num(r, 5),
  };
}

const pageFilter = (page: string | null) =>
  page ? { filter: { fieldName: "pagePath", stringFilter: { matchType: "EXACT", value: page } } } : null;

function withFilters(...filters: (object | null)[]) {
  const f = filters.filter(Boolean) as object[];
  if (f.length === 0) return {};
  return { dimensionFilter: f.length === 1 ? f[0] : { andGroup: { expressions: f } } };
}

const eventIs = (name: string) => ({ filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: name } } });

async function fetchAnalyticsReport(start: string, end: string, priorStart: string, priorEnd: string, page: string | null): Promise<AnalyticsReport> {
  const dateRanges = [{ startDate: start, endDate: end }];
  const pf = pageFilter(page);
  const byMetric = (metricName: string) => [{ metric: { metricName }, desc: true }];
  // KPIs and the daily series are required; every other section degrades to
  // empty on its own so one rejected query can't take down the whole page.
  const soft = (name: string, body: object) =>
    gaCall("runReport", body).catch((err) => {
      console.error(`[ga4] ${name} report failed:`, err);
      return [] as ReportRow[];
    });

  const [cur, prev, daily, pages, channels, referrers, cities, regions, devices, downloads, outbound] = await Promise.all([
    gaCall("runReport", { dateRanges, metrics: KPI_METRICS, ...withFilters(pf) }),
    gaCall("runReport", { dateRanges: [{ startDate: priorStart, endDate: priorEnd }], metrics: KPI_METRICS, ...withFilters(pf) }),
    gaCall("runReport", {
      dateRanges,
      dimensions: [{ name: "date" }],
      metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
      keepEmptyRows: true,
      ...withFilters(pf),
    }),
    soft("pages", {
      dateRanges,
      dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
      metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }, { name: "userEngagementDuration" }],
      orderBys: byMetric("screenPageViews"),
      limit: 15,
      ...withFilters(pf),
    }),
    soft("channels", {
      dateRanges,
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }],
      orderBys: byMetric("sessions"),
      ...withFilters(pf),
    }),
    soft("referrers", {
      dateRanges,
      dimensions: [{ name: "sessionSource" }],
      metrics: [{ name: "sessions" }],
      orderBys: byMetric("sessions"),
      limit: 10,
      ...withFilters(pf),
    }),
    soft("cities", {
      dateRanges,
      dimensions: [{ name: "city" }, { name: "region" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: byMetric("activeUsers"),
      limit: 10,
      ...withFilters(pf),
    }),
    soft("regions", {
      dateRanges,
      dimensions: [{ name: "region" }],
      metrics: [{ name: "activeUsers" }],
      ...withFilters(pf),
    }),
    soft("devices", {
      dateRanges,
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: byMetric("activeUsers"),
      ...withFilters(pf),
    }),
    soft("downloads", {
      dateRanges,
      dimensions: [{ name: "fileName" }],
      metrics: [{ name: "eventCount" }],
      orderBys: byMetric("eventCount"),
      limit: 10,
      ...withFilters(pf, eventIs("file_download")),
    }),
    soft("outbound", {
      dateRanges,
      dimensions: [{ name: "linkDomain" }],
      metrics: [{ name: "eventCount" }],
      orderBys: byMetric("eventCount"),
      limit: 10,
      ...withFilters(pf, eventIs("click")),
    }),
  ]);

  const regionTotal = regions.reduce((s, r) => s + num(r, 0), 0);
  const louisiana = regions.find((r) => dim(r, 0) === "Louisiana");

  return {
    current: toKpis(cur),
    prior: toKpis(prev),
    daily: daily.map((r) => {
      const d = dim(r, 0); // YYYYMMDD
      return { date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, visitors: num(r, 0), pageViews: num(r, 1) };
    }),
    topPages: pages.map((r) => {
      const visitors = num(r, 1);
      return {
        path: dim(r, 0),
        title: cleanTitle(dim(r, 1), dim(r, 0)),
        views: num(r, 0),
        visitors,
        avgSeconds: visitors ? num(r, 2) / visitors : 0,
      };
    }),
    channels: channels.map((r) => ({ name: dim(r, 0), sessions: num(r, 0) })),
    referrers: referrers.map((r) => ({ name: dim(r, 0), sessions: num(r, 0) })),
    cities: cities.map((r) => ({ city: dim(r, 0), region: dim(r, 1), visitors: num(r, 0) })),
    louisianaShare: regionTotal ? (louisiana ? num(louisiana, 0) : 0) / regionTotal : null,
    devices: devices.map((r) => ({ name: dim(r, 0), visitors: num(r, 0) })),
    downloads: downloads.map((r) => ({ file: dim(r, 0), count: num(r, 0) })).filter((d) => d.file),
    outbound: outbound
      .map((r) => ({ domain: dim(r, 0), count: num(r, 0) }))
      .filter((d) => d.domain && !/fpalens\.org$/i.test(d.domain)),
  };
}

/** Cached 15 min per (range, page) — reports lag hours anyway. */
export const getAnalyticsReport = unstable_cache(fetchAnalyticsReport, ["ga4-analytics-report"], {
  revalidate: 900,
});

async function fetchPageList(): Promise<{ path: string; title: string }[]> {
  const rows = await gaCall("runReport", {
    dateRanges: [{ startDate: "365daysAgo", endDate: "today" }],
    dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
    metrics: [{ name: "screenPageViews" }],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: 100,
  });
  const seen = new Set<string>();
  return rows
    .map((r) => ({ path: dim(r, 0), title: cleanTitle(dim(r, 1), dim(r, 0)) }))
    .filter((p) => p.path && !seen.has(p.path) && seen.add(p.path));
}

/** Pages seen in the last year, for the page filter. */
export const getPageList = unstable_cache(fetchPageList, ["ga4-page-list"], { revalidate: 3600 });

export type Realtime = { activeNow: number; pages: { name: string; visitors: number }[] };

/** Visitors in the last 30 minutes. Not cached: it's the one live number. */
export async function getRealtime(): Promise<Realtime> {
  const [total, pages] = await Promise.all([
    gaCall("runRealtimeReport", { metrics: [{ name: "activeUsers" }] }),
    gaCall("runRealtimeReport", {
      dimensions: [{ name: "unifiedScreenName" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 5,
    }),
  ]);
  return {
    activeNow: total[0] ? num(total[0], 0) : 0,
    pages: pages.map((r) => {
      const name = cleanTitle(dim(r, 0), "");
      return { name: name === "FPA Lens" ? "Home" : name || "(unknown)", visitors: num(r, 0) };
    }),
  };
}
