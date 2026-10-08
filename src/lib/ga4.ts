/**
 * Google Analytics 4 for FPA Lens.
 *
 * GA_MEASUREMENT_ID is the public tag ID (G-...) rendered on the frontend; it
 * is public by design, so it lives here rather than in an env var. null = no tag.
 * The admin dashboard's "Site traffic" panel reads the GA4 Data API with a
 * read-only service account:
 *   - GA_PROPERTY_ID           numeric property ID (Admin -> Property details)
 *   - GA_SERVICE_ACCOUNT_JSON  the service account's JSON key, stored ONLY as a
 *                              Vercel env var (never commit it; repo is public)
 * The service account holds the Viewer role on the GA property and nothing else.
 * Token minting is a hand-rolled RS256 JWT so no Google SDK is needed.
 */
import { createSign } from "node:crypto";
import { unstable_cache } from "next/cache";

export const GA_MEASUREMENT_ID: string | null = "G-X2R4DRZMEY";

export type TrafficSummary = {
  visitors: number;
  pageViews: number;
  avgEngagementSeconds: number;
  topPages: { title: string; path: string; views: number }[];
  propertyId: string;
};

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

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

async function getAccessToken(sa: ServiceAccount): Promise<string> {
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
  return ((await res.json()) as { access_token: string }).access_token;
}

type ReportRow = { dimensionValues?: { value: string }[]; metricValues: { value: string }[] };

async function runReport(propertyId: string, token: string, body: object): Promise<ReportRow[]> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(`GA runReport failed: ${res.status}`);
  return ((await res.json()) as { rows?: ReportRow[] }).rows ?? [];
}

// Every page title ends in " | FPA Lens" (or is the full site title on home).
function cleanTitle(title: string, path: string): string {
  if (path === "/") return "Home";
  return title.replace(/\s*\|\s*(FPA Lens|Southeast Louisiana Flood Protection Authority).*$/i, "").trim() || path;
}

async function fetchTrafficSummary(): Promise<TrafficSummary | null> {
  const config = readConfig();
  if (!config) return null;
  const { propertyId, sa } = config;
  const token = await getAccessToken(sa);
  const dateRanges = [{ startDate: "30daysAgo", endDate: "today" }];

  const [totals, pages] = await Promise.all([
    runReport(propertyId, token, {
      dateRanges,
      metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }, { name: "userEngagementDuration" }],
    }),
    runReport(propertyId, token, {
      dateRanges,
      dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
      metrics: [{ name: "screenPageViews" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 10,
    }),
  ]);

  const [users, views, engagement] = (totals[0]?.metricValues ?? []).map((m) => Number(m.value) || 0);
  return {
    visitors: users ?? 0,
    pageViews: views ?? 0,
    avgEngagementSeconds: users ? (engagement ?? 0) / users : 0,
    topPages: pages.map((r) => {
      const path = r.dimensionValues?.[0]?.value ?? "";
      return {
        path,
        title: cleanTitle(r.dimensionValues?.[1]?.value ?? "", path),
        views: Number(r.metricValues[0]?.value) || 0,
      };
    }),
    propertyId,
  };
}

/** Last-30-day traffic, cached for an hour (the Data API has per-property quotas). */
export const getTrafficSummary = unstable_cache(fetchTrafficSummary, ["ga4-traffic-summary"], {
  revalidate: 3600,
});
