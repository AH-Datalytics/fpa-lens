/**
 * Weekly data-refresh orchestrator.
 *
 * For each wired category: fetch the newest source file from SharePoint, then
 * run that category's extractor against the downloaded file. The extractors
 * write the dashboard JSON in public/data/, which the workflow commits.
 *
 * Behavior designed for hands-off operation:
 *  - Each category is isolated; one bad file never blocks the others.
 *  - A category whose folder has files but none matching the naming convention
 *    is treated as a FAILURE (so a typo'd upload doesn't silently skip).
 *  - An empty folder (no file yet) is a normal skip, not a failure.
 *  - A per-run summary is written to refresh-summary.txt (used by the email).
 *  - Exit non-zero if any category failed, so the workflow marks the run failed
 *    and sends the alert email.
 *
 * Usage:
 *   node scripts/refresh-data.mjs            # all wired categories
 *   node scripts/refresh-data.mjs idiq       # only the named categories
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { inspectCategory, fetchCategory } from "./sharepoint/fetch.mjs";
import { loadLocalEnv } from "./sharepoint/graph.mjs";

// Category key (must match fetch.mjs CATEGORIES) -> Python extractor.
// The downloaded file path is passed as argv[1] to each extractor.
const WIRED = {
  finance: { script: "scripts/extractActualsData.py" },
  idiq: { script: "scripts/extractIdiqData.py" },
  // safety / sitrep / staffing / turf added as their extractors land.
};

loadLocalEnv(); // no-op in CI where SHAREPOINT_* come from secrets

const requested = process.argv.slice(2);
const keys = requested.length ? requested : Object.keys(WIRED);

const results = [];
for (const key of keys) {
  if (!WIRED[key]) {
    console.error(`! ${key}: not a wired category, skipping`);
    continue;
  }
  console.log(`\n=== ${key} ===`);
  try {
    const { newest, skipped } = await inspectCategory(key);
    if (!newest) {
      if (skipped.length) {
        throw new Error(`files present but none match the naming convention: ${skipped.join(", ")}`);
      }
      console.log("  no file in SharePoint yet — skipping");
      results.push({ key, status: "skipped", detail: "no file uploaded yet" });
      continue;
    }
    const fetched = await fetchCategory(key);
    console.log(`  fetched ${fetched.name}`);
    execFileSync("python3", [WIRED[key].script, fetched.dest], { stdio: "inherit" });
    results.push({ key, status: "refreshed", detail: fetched.name });
  } catch (e) {
    console.error(`  FAILED: ${e.message}`);
    results.push({ key, status: "failed", detail: e.message });
  }
}

const summary = results
  .map((r) => `${r.status.toUpperCase().padEnd(9)} ${r.key}: ${r.detail}`)
  .join("\n");
writeFileSync("refresh-summary.txt", summary + "\n");

const counts = {
  refreshed: results.filter((r) => r.status === "refreshed").length,
  skipped: results.filter((r) => r.status === "skipped").length,
  failed: results.filter((r) => r.status === "failed").length,
};
console.log(`\n${summary}`);
console.log(`\n${counts.refreshed} refreshed, ${counts.skipped} skipped, ${counts.failed} failed.`);

if (counts.failed) process.exit(1);
