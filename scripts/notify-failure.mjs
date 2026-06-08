/**
 * Send a data-refresh failure email via the Resend HTTP API (no npm deps).
 * The workflow runs this only when the refresh step fails. Failing to send the
 * email must not mask the original failure, so this always exits 0.
 *
 * Env: RESEND_API_KEY (required to actually send), RUN_URL (link to the logs).
 */
import { readFileSync, existsSync } from "node:fs";

const KEY = process.env.RESEND_API_KEY;
const RUN_URL = process.env.RUN_URL || "(local run)";

// Internal data-ops recipients (NOT the public/ops alert list).
const RECIPIENTS = ["oboochever@ahdatalytics.com", "lwilliams@slfpae.gov"];

const summary = existsSync("refresh-summary.txt")
  ? readFileSync("refresh-summary.txt", "utf8").trim()
  : "(no summary captured — the run failed before any category completed)";

if (!KEY) {
  console.error("No RESEND_API_KEY set; cannot send failure email.");
  process.exit(0);
}

const text = [
  "The weekly FPA Lens data refresh ran into a problem, so the dashboard may not",
  "reflect the latest upload(s).",
  "",
  "Per-category result:",
  summary,
  "",
  `Full logs: ${RUN_URL}`,
  "",
  "Common causes: a source file was renamed off-convention, a workbook's tabs or",
  "columns changed, or SharePoint was briefly unreachable. The categories marked",
  "REFRESHED above did update normally.",
  "",
  "--",
  "Automated message from the FPA Lens data pipeline.",
].join("\n");

try {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "FPA Lens Alerts <alerts@fpalens.org>",
      to: RECIPIENTS,
      subject: "FPA Lens: weekly data refresh failed",
      text,
    }),
  });
  if (!res.ok) {
    console.error(`Resend send failed: ${res.status} ${await res.text()}`);
  } else {
    console.log("Failure notification email sent to:", RECIPIENTS.join(", "));
  }
} catch (e) {
  console.error(`Failure notification error: ${e.message}`);
}
process.exit(0);
