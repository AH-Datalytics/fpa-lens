import React from "react";
import { getTrafficSummary, isTrafficConfigured } from "@/lib/ga4";

/**
 * "Site traffic — last 30 days" panel on the admin dashboard, read from the
 * GA4 Data API (src/lib/ga4.ts, cached 1h). Shown to every signed-in user.
 * Degrades to a one-line note when GA isn't configured or the API fails, so the
 * dashboard itself never breaks on an analytics problem.
 */

const fmt = new Intl.NumberFormat("en-US");

function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="fpa-dash__section-hint">{children}</p>;
}

export async function SiteTraffic() {
  let body: React.ReactNode;

  if (!isTrafficConfigured()) {
    body = <Note>Traffic reporting isn&rsquo;t connected yet.</Note>;
  } else {
    let data: Awaited<ReturnType<typeof getTrafficSummary>> = null;
    try {
      data = await getTrafficSummary();
    } catch (err) {
      console.error("[SiteTraffic] GA4 report failed:", err);
    }

    if (!data) {
      body = <Note>Traffic data is temporarily unavailable. Try again later.</Note>;
    } else {
      body = (
        <>
          <div className="fpa-dash__stats">
            <div className="fpa-dash__stat">
              <span className="fpa-dash__stat-label">Visitors</span>
              <span className="fpa-dash__stat-value">{fmt.format(data.visitors)}</span>
            </div>
            <div className="fpa-dash__stat">
              <span className="fpa-dash__stat-label">Page views</span>
              <span className="fpa-dash__stat-value">{fmt.format(data.pageViews)}</span>
            </div>
            <div className="fpa-dash__stat" title="Average engagement time per visitor">
              <span className="fpa-dash__stat-label">Avg time</span>
              <span className="fpa-dash__stat-value">{formatDuration(data.avgEngagementSeconds)}</span>
            </div>
          </div>

          <div className="fpa-dash__toppages">
            <table>
              <thead>
                <tr>
                  <th scope="col">Top pages</th>
                  <th scope="col">Views</th>
                </tr>
              </thead>
              <tbody>
                {data.topPages.length === 0 ? (
                  <tr>
                    <td colSpan={2}>No page views recorded yet.</td>
                  </tr>
                ) : (
                  data.topPages.map((p) => (
                    <tr key={p.path}>
                      <td>
                        {p.title}
                        <span className="fpa-dash__toppages-path">{p.path}</span>
                      </td>
                      <td>{fmt.format(p.views)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <a
              className="fpa-dash__toppages-link"
              href={`https://analytics.google.com/analytics/web/#/p${data.propertyId}/reports/intelligenthome`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open full reports in Google Analytics →
            </a>
          </div>
        </>
      );
    }
  }

  return (
    <section className="fpa-dash__section">
      <h2 className="fpa-dash__section-title">Site traffic &mdash; last 30 days</h2>
      {body}
    </section>
  );
}
