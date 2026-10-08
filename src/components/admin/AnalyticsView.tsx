import type { AdminViewServerProps } from "payload";
import { DefaultTemplate } from "@payloadcms/next/templates";
import { Gutter } from "@payloadcms/ui";
import { redirect } from "next/navigation";
import React from "react";
import {
  PERIODS,
  gaReportsUrl,
  getAnalyticsReport,
  getPageList,
  getRealtime,
  isTrafficConfigured,
  resolveRange,
  type AnalyticsReport,
  type Kpis,
  type Realtime,
} from "@/lib/ga4";
import { DevicesChart, TrafficChart } from "./AnalyticsCharts";

/**
 * /admin/analytics — full site-traffic page (GA4 Data API, see src/lib/ga4.ts).
 * Registered as a custom root view in payload.config.ts. Payload does NOT wrap
 * new custom views in the admin chrome or guard them, so this view does both:
 * redirect when signed out, then render inside DefaultTemplate.
 *
 * Controls are plain links / a GET form (?period=, ?start=, ?end=, ?page=), so
 * the whole page renders on the server; only the two charts are client-side.
 */

const fmt = new Intl.NumberFormat("en-US");
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function duration(seconds: number): string {
  const s = Math.round(seconds);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : Array.isArray(v) && typeof v[0] === "string" ? v[0] : undefined;
}

function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (!prev) return <span className="fpa-an__delta">No prior data</span>;
  const change = (cur - prev) / prev;
  const up = change >= 0;
  return (
    <span className={`fpa-an__delta ${up ? "fpa-an__delta--up" : "fpa-an__delta--down"}`}>
      {up ? "▲" : "▼"} {Math.abs(change * 100).toFixed(1)}% vs prior
    </span>
  );
}

function Kpi({ label, value, cur, prev, hint }: { label: string; value: string; cur: number; prev: number; hint?: string }) {
  return (
    <div className="fpa-an__kpi" title={hint}>
      <span className="fpa-an__kpi-label">{label}</span>
      <span className="fpa-an__kpi-value">{value}</span>
      <Delta cur={cur} prev={prev} />
    </div>
  );
}

function Card({ title, hint, children, wide }: { title: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className={`fpa-an__card${wide ? " fpa-an__card--wide" : ""}`}>
      <h2 className="fpa-an__card-title">{title}</h2>
      {hint && <p className="fpa-an__card-hint">{hint}</p>}
      {children}
    </section>
  );
}

/** Ranked list with an inline proportional bar. */
function BarList({ rows, empty }: { rows: { label: React.ReactNode; value: number; display?: string }[]; empty: string }) {
  if (rows.length === 0) return <p className="fpa-an__empty">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="fpa-an__bars">
      {rows.map((r, i) => (
        <li key={i}>
          <div className="fpa-an__bars-row">
            <span className="fpa-an__bars-label">{r.label}</span>
            <span className="fpa-an__bars-value">{r.display ?? fmt.format(r.value)}</span>
          </div>
          <div className="fpa-an__bars-track">
            <div className="fpa-an__bars-fill" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Controls({ period, start, end, page, pages }: { period: string; start: string; end: string; page: string | null; pages: { path: string; title: string }[] }) {
  const link = (p: string) => {
    const q = new URLSearchParams({ period: p });
    if (page) q.set("page", page);
    return `?${q}`;
  };
  return (
    <div className="fpa-an__controls">
      <nav className="fpa-an__periods" aria-label="Date range">
        {PERIODS.filter((p) => p.key !== "custom").map((p) => (
          <a key={p.key} href={link(p.key)} className={period === p.key ? "is-active" : undefined} aria-current={period === p.key ? "true" : undefined}>
            {p.label}
          </a>
        ))}
      </nav>
      <form method="get" className="fpa-an__filters">
        <input type="hidden" name="period" value="custom" />
        <label>
          From <input type="date" name="start" defaultValue={start} required />
        </label>
        <label>
          To <input type="date" name="end" defaultValue={end} required />
        </label>
        <label>
          Page{" "}
          <select name="page" defaultValue={page ?? ""}>
            <option value="">All pages</option>
            {pages.map((p) => (
              <option key={p.path} value={p.path}>
                {p.title} ({p.path})
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Apply</button>
        {(period === "custom" || page) && (
          <a href="?period=30d" className="fpa-an__reset">
            Reset
          </a>
        )}
      </form>
    </div>
  );
}

function RealtimeStrip({ rt }: { rt: Realtime | null }) {
  if (!rt) return null;
  return (
    <div className="fpa-an__live">
      <span className="fpa-an__live-dot" aria-hidden="true" />
      <strong>{fmt.format(rt.activeNow)}</strong>&nbsp;{rt.activeNow === 1 ? "visitor" : "visitors"} on the site in the last 30 minutes
      {rt.pages.length > 0 && (
        <span className="fpa-an__live-pages">
          {" · "}
          {rt.pages.map((p) => `${p.name} (${p.visitors})`).join(", ")}
        </span>
      )}
    </div>
  );
}

function Report({ r }: { r: AnalyticsReport }) {
  const c: Kpis = r.current;
  const p: Kpis = r.prior;
  const channelRows = r.channels.map((x) => ({ label: x.name, value: x.sessions }));
  const refRows = r.referrers.map((x) => ({ label: x.name === "(direct)" ? "Direct / typed URL" : x.name, value: x.sessions }));

  return (
    <>
      <div className="fpa-an__kpis">
        <Kpi label="Visitors" value={fmt.format(c.visitors)} cur={c.visitors} prev={p.visitors} />
        <Kpi label="New visitors" value={fmt.format(c.newVisitors)} cur={c.newVisitors} prev={p.newVisitors} />
        <Kpi label="Page views" value={fmt.format(c.pageViews)} cur={c.pageViews} prev={p.pageViews} />
        <Kpi label="Visits" value={fmt.format(c.sessions)} cur={c.sessions} prev={p.sessions} hint="Sessions: a visit ends after 30 minutes of inactivity" />
        <Kpi label="Avg time on site" value={duration(c.avgEngagementSeconds)} cur={c.avgEngagementSeconds} prev={p.avgEngagementSeconds} hint="Average engagement time per visitor (page in focus)" />
        <Kpi label="Engaged visits" value={pct(c.engagementRate)} cur={c.engagementRate} prev={p.engagementRate} hint="Visits lasting 10+ seconds, viewing 2+ pages, or converting" />
      </div>

      <Card title="Visitors over time" wide>
        <TrafficChart data={r.daily} />
      </Card>

      <Card title="Top pages" hint="Most-viewed pages in the selected range." wide>
        {r.topPages.length === 0 ? (
          <p className="fpa-an__empty">No page views in this range.</p>
        ) : (
          <table className="fpa-an__table">
            <thead>
              <tr>
                <th scope="col">Page</th>
                <th scope="col">Views</th>
                <th scope="col">Visitors</th>
                <th scope="col">Avg time</th>
              </tr>
            </thead>
            <tbody>
              {r.topPages.map((pg) => {
                const max = r.topPages[0].views || 1;
                return (
                  <tr key={pg.path}>
                    <td>
                      <a href={`?period=30d&page=${encodeURIComponent(pg.path)}`} title="Filter the whole page to this page">
                        {pg.title}
                      </a>
                      <span className="fpa-an__path">{pg.path}</span>
                      <div className="fpa-an__bars-track fpa-an__bars-track--thin">
                        <div className="fpa-an__bars-fill" style={{ width: `${(pg.views / max) * 100}%` }} />
                      </div>
                    </td>
                    <td>{fmt.format(pg.views)}</td>
                    <td>{fmt.format(pg.visitors)}</td>
                    <td>{duration(pg.avgSeconds)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <div className="fpa-an__grid">
        <Card title="How people find the site" hint="Visits by channel.">
          <BarList rows={channelRows} empty="No visits in this range." />
        </Card>
        <Card title="Top referring sites" hint="Where visits came from.">
          <BarList rows={refRows} empty="No referrals in this range." />
        </Card>
        <Card
          title="Where visitors are"
          hint={r.louisianaShare !== null ? `${pct(r.louisianaShare)} of visitors are in Louisiana.` : undefined}
        >
          <BarList
            rows={r.cities.map((x) => ({
              label: x.city === "(not set)" ? `Unknown city${x.region && x.region !== "(not set)" ? `, ${x.region}` : ""}` : `${x.city}, ${x.region}`,
              value: x.visitors,
            }))}
            empty="No location data in this range."
          />
        </Card>
        <Card title="Devices" hint="Visitors by device type.">
          <DevicesChart data={r.devices} />
        </Card>
        <Card title="File downloads" hint="Documents downloaded from the site.">
          <BarList rows={r.downloads.map((x) => ({ label: x.file, value: x.count }))} empty="No downloads in this range." />
        </Card>
        <Card title="Outbound links" hint="Clicks to other websites.">
          <BarList rows={r.outbound.map((x) => ({ label: x.domain, value: x.count }))} empty="No outbound clicks in this range." />
        </Card>
      </div>
    </>
  );
}

export async function AnalyticsView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, locale, permissions, visibleEntities } = initPageResult;
  if (!req.user) redirect("/admin/login?redirect=%2Fadmin%2Fanalytics");

  const sp = (searchParams ?? {}) as Record<string, unknown>;
  const { period, range } = resolveRange(str(sp.period), str(sp.start), str(sp.end));
  const page = str(sp.page) || null;
  const propertyId = process.env.GA_PROPERTY_ID?.trim() ?? "";

  let body: React.ReactNode;
  let pages: { path: string; title: string }[] = [];
  let realtime: Realtime | null = null;

  if (!isTrafficConfigured()) {
    body = <p className="fpa-an__empty">Traffic reporting isn&rsquo;t connected yet.</p>;
  } else {
    let report: AnalyticsReport | null = null;
    [report, pages, realtime] = await Promise.all([
      getAnalyticsReport(range.start, range.end, range.priorStart, range.priorEnd, page).catch((err) => {
        console.error("[AnalyticsView] GA4 report failed:", err);
        return null;
      }),
      getPageList().catch(() => []),
      getRealtime().catch(() => null),
    ]);
    if (!report) {
      body = <p className="fpa-an__empty">Traffic data is temporarily unavailable. Try again in a few minutes.</p>;
    } else {
      body = <Report r={report} />;
    }
  }

  const pageTitle = page ? pages.find((p) => p.path === page)?.title ?? page : null;

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <Gutter>
        <div className="fpa-an">
          <header className="fpa-an__header">
            <div>
              <h1 className="fpa-an__title">Site analytics</h1>
              <p className="fpa-an__subtitle">
                {range.label}
                {pageTitle && (
                  <>
                    {" · "}
                    <strong>{pageTitle}</strong> only
                  </>
                )}
                {" · compared with the previous period of equal length"}
              </p>
            </div>
            {propertyId && (
              <a className="fpa-an__ga-link" href={gaReportsUrl(propertyId)} target="_blank" rel="noopener noreferrer">
                Open in Google Analytics ↗
              </a>
            )}
          </header>

          <RealtimeStrip rt={realtime} />
          <Controls period={period} start={range.start} end={range.end} page={page} pages={pages} />
          {body}

          <p className="fpa-an__footnote">
            Source: Google Analytics. Standard reports can lag a few hours behind; the live count above updates on every
            page load. Tracking began October 8, 2026, and covers the public site only (not this portal).
          </p>
        </div>
      </Gutter>
    </DefaultTemplate>
  );
}

export default AnalyticsView;
