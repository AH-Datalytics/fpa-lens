/**
 * Builds the Lakeshore Drive flood-risk alert email (subject + plain text +
 * styled HTML). Colored by risk level, shows current state AND direction
 * (trend). No em dashes, by direction.
 */
import type { RiskLevel } from "./lakefrontRisk";

type Trend = "improving" | "stable" | "worsening";

const LEVEL_META: Record<RiskLevel, { word: string; tag: string; color: string; bg: string }> = {
  GREEN: { word: "GREEN", tag: "Normal", color: "#16a34a", bg: "#f0fdf4" },
  YELLOW: { word: "YELLOW", tag: "Risk developing", color: "#d97706", bg: "#fffbeb" },
  ORANGE: { word: "ORANGE", tag: "Elevated risk", color: "#ea580c", bg: "#fff7ed" },
  RED: { word: "RED", tag: "High risk", color: "#dc2626", bg: "#fef2f2" },
};

const TREND_META: Record<Trend, { word: string; arrow: string; color: string }> = {
  improving: { word: "Improving", arrow: "↓", color: "#16a34a" }, // down arrow
  stable: { word: "Holding steady", arrow: "→", color: "#6b7280" }, // right arrow
  worsening: { word: "Worsening", arrow: "↑", color: "#dc2626" }, // up arrow
};

const ORDER: Record<RiskLevel, number> = { GREEN: 0, YELLOW: 1, ORANGE: 2, RED: 3 };

export interface RiskAlertEmailInput {
  current: RiskLevel;
  previous: RiskLevel | null;
  trending: Trend;
  action: string;
  description: string;
  factors: string[];
  dashboardUrl: string;
  sentAt: string; // ISO timestamp
}

export interface RiskAlertEmail {
  subject: string;
  text: string;
  html: string;
}

function changeLine(current: RiskLevel, previous: RiskLevel | null): string | null {
  if (!previous || previous === current) return null;
  const verb = ORDER[current] > ORDER[previous] ? "Up from" : "Down from";
  return `${verb} ${LEVEL_META[previous].word}`;
}

export function buildRiskAlertEmail(input: RiskAlertEmailInput): RiskAlertEmail {
  const { current, previous, trending, dashboardUrl, sentAt } = input;
  // No em dashes in alerts (by direction): collapse any em/en dash to a comma.
  const action = noDash(input.action);
  const description = noDash(input.description);
  const factors = input.factors.map(noDash);
  const lvl = LEVEL_META[current];
  const trend = TREND_META[trending];
  const isAllClear = current === "GREEN";
  const change = changeLine(current, previous);

  const subject = isAllClear
    ? "FPA Lens: All Clear, Lakeshore Drive flood risk normal"
    : `FPA Lens: Flood risk ${lvl.word} (${trend.word.toLowerCase()}), Lakeshore Drive`;

  // ---- plain-text fallback (no em dashes) ----
  const text = [
    isAllClear
      ? "The Lakeshore Drive flood risk has returned to normal."
      : "The Lakeshore Drive flood risk level has changed.",
    "",
    `Current level: ${lvl.word} (${lvl.tag})`,
    `Trend: ${trend.word}${change ? `, ${change}` : ""}`,
    "",
    `Recommended action: ${action}`,
    factors.length ? `\nContributing factors:\n${factors.map((f) => `  - ${f}`).join("\n")}` : "",
    "",
    `View live conditions: ${dashboardUrl}`,
    "",
    `Sent ${sentAt}. Generated automatically by FPA Lens.`,
  ].join("\n");

  // ---- styled HTML ----
  const factorsHtml = factors.length
    ? `<tr><td style="padding:16px 24px 0;">
         <div style="font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#6b7280;margin-bottom:8px;">Contributing factors</div>
         <ul style="margin:0;padding-left:18px;color:#374151;font-size:14px;line-height:1.6;">
           ${factors.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}
         </ul>
       </td></tr>`
    : "";

  const html = `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:92%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">

        <tr><td style="background:${lvl.color};padding:22px 24px;">
          <div style="color:rgba(255,255,255,.85);font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Lakeshore Drive Flood Risk</div>
          <div style="color:#ffffff;font-size:30px;font-weight:800;line-height:1.1;margin-top:6px;">
            ${isAllClear ? "All Clear" : lvl.word}
          </div>
          <div style="color:#ffffff;font-size:14px;margin-top:4px;opacity:.95;">${lvl.tag}</div>
        </td></tr>

        <tr><td style="padding:20px 24px 4px;">
          <span style="display:inline-block;background:${lvl.bg};color:${lvl.color};font-size:13px;font-weight:700;padding:5px 12px;border-radius:999px;">
            Level: ${lvl.word}
          </span>
          <span style="display:inline-block;background:#f9fafb;color:${trend.color};font-size:13px;font-weight:700;padding:5px 12px;border-radius:999px;margin-left:6px;">
            ${trend.arrow} ${trend.word}${change ? ` (${escapeHtml(change.toLowerCase())})` : ""}
          </span>
        </td></tr>

        <tr><td style="padding:14px 24px 0;color:#374151;font-size:14px;line-height:1.6;">${escapeHtml(description)}</td></tr>

        <tr><td style="padding:16px 24px 0;">
          <div style="background:${lvl.bg};border:1px solid ${lvl.color}33;border-radius:10px;padding:14px 16px;">
            <div style="font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${lvl.color};margin-bottom:4px;">Recommended action</div>
            <div style="color:#1f2937;font-size:14px;line-height:1.5;">${escapeHtml(action)}</div>
          </div>
        </td></tr>

        ${factorsHtml}

        <tr><td style="padding:22px 24px;">
          <a href="${dashboardUrl}" style="display:inline-block;background:#21355a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:11px 20px;border-radius:8px;">View live conditions</a>
        </td></tr>

        <tr><td style="padding:14px 24px 22px;border-top:1px solid #f3f4f6;color:#9ca3af;font-size:12px;line-height:1.5;">
          Sent ${escapeHtml(sentAt)}.<br/>Generated automatically by FPA Lens.
        </td></tr>

      </table>
    </td></tr>
  </table>
  </body></html>`;

  return { subject, text, html };
}

function noDash(s: string): string {
  return s.replace(/\s*[—–]\s*/g, ", ");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
