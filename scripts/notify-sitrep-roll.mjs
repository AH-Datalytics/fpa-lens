/**
 * Send a "SITREP rolled" summary email via the Resend HTTP API (no npm deps).
 *
 * Because the SITREP -> siteData roll is fully automatic (no PR to review), this
 * gives the data-ops contact a heads-up whenever a new monthly SITREP advances
 * the dashboard to a new report month. It compares the freshly-written
 * public/data/sitrep.json (working tree) against the committed HEAD version, so
 * it must run AFTER the refresh step and BEFORE the commit step.
 *
 * Sends only on an actual month advance; a same-month re-parse is silent.
 * Failing to send must never fail the run, so this always exits 0.
 *
 * Env: RESEND_API_KEY (required to actually send), SITE_URL (optional).
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

// Roll-summary recipients. Add addresses here as the audience grows.
const RECIPIENTS = ["oboochever@ahdatalytics.com"];

const SITREP_PATH = "public/data/sitrep.json";
const SITE_URL = process.env.SITE_URL || "https://fpalens.org";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** "June 2026" -> comparable rank, or null if unparseable. */
function monthRank(reportMonth) {
  if (!reportMonth || typeof reportMonth !== "string") return null;
  const m = reportMonth.trim().toLowerCase().match(/^([a-z]+)\s+(\d{4})$/);
  if (!m) return null;
  const idx = MONTHS.indexOf(m[1]);
  if (idx < 0) return null;
  return Number(m[2]) * 12 + idx;
}

function readJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

if (!existsSync(SITREP_PATH)) {
  console.log("No sitrep.json present; nothing to summarize.");
  process.exit(0);
}

const now = readJson(readFileSync(SITREP_PATH, "utf8"));
const nowRank = monthRank(now?.reportMonth);
if (!now || nowRank == null) {
  console.log("sitrep.json missing or has no parseable reportMonth; skipping.");
  process.exit(0);
}

// Compare against the previously committed version (HEAD). This step runs
// before the commit step, so HEAD is still the prior month.
let prevRank = null;
let prevMonth = null;
try {
  const prev = readJson(execFileSync("git", ["show", `HEAD:${SITREP_PATH}`], { encoding: "utf8" }));
  prevRank = monthRank(prev?.reportMonth);
  prevMonth = prev?.reportMonth ?? null;
} catch {
  // No prior committed version (first run) — treat as a roll.
}

if (prevRank != null && nowRank <= prevRank) {
  console.log(`SITREP still ${now.reportMonth} (was ${prevMonth}); no roll, not emailing.`);
  process.exit(0);
}

// --- Build the summary ---
const r = now.readiness || {};
const insp = now.inspections || {};
const inspLine = (label, x) => {
  if (!x) return `${label}: not reported`;
  if (x.completed != null && x.total != null) return `${label}: ${x.completed} of ${x.total} (${x.status ?? "n/a"})`;
  return `${label}: ${x.status ?? "not reported"}`;
};

const lines = [
  `The monthly SITREP advanced the FPA Lens dashboard from ${prevMonth ?? "(no prior)"} to ${now.reportMonth}.`,
  "",
  "What rolled automatically:",
  `- Reporting month / "Data last updated": ${now.reportMonth}`,
  `- Readiness: infrastructure ${r.infrastructure ?? "?"}, staffing ${r.staffing ?? "?"}, financial ${r.financial ?? "?"}, media ${r.media ?? "?"}`,
  now.permits?.issued != null
    ? `- Permits issued (${now.permits.period ?? "latest"}): ${now.permits.issued}`
    : "- Permits: not reported",
  `- Capital projects: ${Array.isArray(now.projects) ? now.projects.length : 0}`,
  `- ${inspLine("CPRA inspection", insp.cpra)}`,
  `- ${inspLine("USACE inspection", insp.usace)}`,
  `- ${inspLine("Valve testing", insp.valves)}`,
  "",
  "Note: staffing headcount/vacancy figures stay sourced from the staffing",
  "workbook, not the SITREP. Inspection cards keep their on-pace grading.",
  "",
  `Live: ${SITE_URL}`,
  "",
  "--",
  "Automated summary from the FPA Lens data pipeline. Reply if anything looks off.",
];
const text = lines.join("\n");

const KEY = process.env.RESEND_API_KEY;
if (!KEY) {
  console.error("No RESEND_API_KEY set; cannot send roll summary. Summary was:\n" + text);
  process.exit(0);
}

try {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "FPA Lens Alerts <alerts@fpalens.org>",
      to: RECIPIENTS,
      subject: `FPA Lens: dashboard rolled to ${now.reportMonth} SITREP`,
      text,
    }),
  });
  if (!res.ok) {
    console.error(`Resend send failed: ${res.status} ${await res.text()}`);
  } else {
    console.log("SITREP roll summary sent to:", RECIPIENTS.join(", "));
  }
} catch (e) {
  console.error(`Roll summary send error: ${e.message}`);
}
process.exit(0);
