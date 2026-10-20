/**
 * Builds the Lakeshore Drive flood-risk alert email (subject + plain text +
 * styled HTML). Colored by risk level, shows current state AND direction
 * (trend). No em dashes, by direction.
 */
import type { RiskLevel } from "./lakefrontRisk";
import type { AlertKind } from "./riskAlertDecision";

type Trend = "improving" | "stable" | "worsening";

// headerBg/headerText: the colored band (yellow needs dark text to read + look
// truly yellow, not orange). accent: a darker shade for text/borders on the
// light bg tints. tag: severity only (direction is shown separately as trend).
const LEVEL_META: Record<
  RiskLevel,
  { word: string; tag: string; headerBg: string; headerText: string; headerMuted: string; accent: string; bg: string }
> = {
  GREEN: { word: "GREEN", tag: "Normal", headerBg: "#16a34a", headerText: "#ffffff", headerMuted: "rgba(255,255,255,.85)", accent: "#15803d", bg: "#f0fdf4" },
  YELLOW: { word: "YELLOW", tag: "Moderate", headerBg: "#facc15", headerText: "#422006", headerMuted: "rgba(66,32,6,.72)", accent: "#a16207", bg: "#fefce8" },
  ORANGE: { word: "ORANGE", tag: "Elevated", headerBg: "#ea580c", headerText: "#ffffff", headerMuted: "rgba(255,255,255,.85)", accent: "#c2410c", bg: "#fff7ed" },
  RED: { word: "RED", tag: "High", headerBg: "#dc2626", headerText: "#ffffff", headerMuted: "rgba(255,255,255,.9)", accent: "#b91c1c", bg: "#fef2f2" },
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
  /** Why this email is going out. Omitted (preview) reads as a level change. */
  kind?: AlertKind;
  trending: Trend;
  action: string;
  description: string;
  factors: string[];
  dashboardUrl: string;
  sentAt: string; // ISO timestamp
  /** Shown as a banner above the alert; used for test sends and replays. */
  testNote?: string;
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
  const { current, previous, kind, trending, dashboardUrl, testNote } = input;
  const sentAt = formatCentral(input.sentAt);
  // No em dashes in alerts (by direction): collapse any em/en dash to a comma.
  const action = noDash(input.action);
  const description = noDash(input.description);
  const factors = input.factors.map(noDash);
  const lvl = LEVEL_META[current];
  const trend = TREND_META[trending];
  const isAllClear = current === "GREEN";
  const isReminder = kind === "reminder";
  const change = isReminder ? null : changeLine(current, previous);
  const isDrop = !!previous && ORDER[current] < ORDER[previous];

  const subject = isAllClear
    ? "FPA Lens: All Clear, Lakeshore Drive flood risk normal"
    : isReminder
      ? `FPA Lens: Lakeshore Drive flood risk still ${lvl.word} (24-hour update)`
      : `FPA Lens: Lakeshore Drive flood risk ${isDrop ? "down" : "up"} to ${lvl.word}`;

  const lead = isAllClear
    ? "The Lakeshore Drive flood risk has returned to normal. Reassess any closures in place."
    : isReminder
      ? `The Lakeshore Drive flood risk has stayed at ${lvl.word} for the past 24 hours.`
      : isDrop
        ? `The Lakeshore Drive flood risk has dropped from ${LEVEL_META[previous!].word} to ${lvl.word}. Reassess field conditions and any closures in place.`
        : `The Lakeshore Drive flood risk has risen to ${lvl.word}.`;

  const audience =
    "This alert goes to all Levee Police personnel. If you received it, it is for you: check current conditions.";

  // ---- plain-text fallback (no em dashes) ----
  const text = [
    testNote ? `${noDash(testNote)}\n` : "",
    lead,
    "",
    `Current level: ${lvl.word} (${lvl.tag})`,
    `Trend: ${trend.word}${change ? `, ${change}` : ""}`,
    "",
    `Recommended action: ${action}`,
    factors.length ? `\nContributing factors:\n${factors.map((f) => `  - ${f}`).join("\n")}` : "",
    "",
    `View live conditions: ${dashboardUrl}`,
    "",
    audience,
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

        ${testNote ? `<tr><td style="background:#1f2937;color:#ffffff;padding:10px 24px;font-size:13px;font-weight:600;line-height:1.5;">${escapeHtml(noDash(testNote))}</td></tr>` : ""}

        <tr><td style="background:${lvl.headerBg};padding:22px 24px;">
          <div style="color:${lvl.headerMuted};font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Lakeshore Drive Flood Risk</div>
          <div style="color:${lvl.headerText};font-size:30px;font-weight:800;line-height:1.1;margin-top:6px;">
            ${isAllClear ? "All Clear" : lvl.word}
          </div>
          <div style="color:${lvl.headerMuted};font-size:14px;margin-top:4px;">${lvl.tag}</div>
        </td></tr>

        <tr><td style="padding:20px 24px 4px;">
          <span style="display:inline-block;background:${lvl.bg};color:${lvl.accent};font-size:13px;font-weight:700;padding:5px 12px;border-radius:999px;">
            Level: ${lvl.word}
          </span>
          <span style="display:inline-block;background:#f9fafb;color:${trend.color};font-size:13px;font-weight:700;padding:5px 12px;border-radius:999px;margin-left:6px;">
            ${trend.arrow} ${trend.word}${change ? ` (${escapeHtml(change.toLowerCase())})` : ""}
          </span>
        </td></tr>

        <tr><td style="padding:14px 24px 0;color:#111827;font-size:15px;font-weight:600;line-height:1.5;">${escapeHtml(lead)}</td></tr>

        <tr><td style="padding:8px 24px 0;color:#374151;font-size:14px;line-height:1.6;">${escapeHtml(description)}</td></tr>

        <tr><td style="padding:16px 24px 0;">
          <div style="background:${lvl.bg};border:1px solid ${lvl.accent}33;border-radius:10px;padding:14px 16px;">
            <div style="font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${lvl.accent};margin-bottom:4px;">Recommended action</div>
            <div style="color:#1f2937;font-size:14px;line-height:1.5;">${escapeHtml(action)}</div>
          </div>
        </td></tr>

        ${factorsHtml}

        <tr><td style="padding:22px 24px;">
          <a href="${dashboardUrl}" style="display:inline-block;background:#21355a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:11px 20px;border-radius:8px;">View live conditions</a>
        </td></tr>

        <tr><td style="padding:0 24px 16px;color:#374151;font-size:13px;line-height:1.5;">${escapeHtml(audience)}</td></tr>

        <tr><td style="padding:14px 24px 22px;border-top:1px solid #f3f4f6;color:#9ca3af;font-size:12px;line-height:1.5;">
          Sent ${escapeHtml(sentAt)}.<br/>Generated automatically by FPA Lens.
        </td></tr>

      </table>
    </td></tr>
  </table>
  </body></html>`;

  return { subject, text, html };
}

function formatCentral(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
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
