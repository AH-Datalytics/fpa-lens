/**
 * Weekly data-refresh orchestrator.
 *
 * For each wired category: fetch the newest source file from SharePoint, then
 * run that category's extractor against the downloaded file. The extractors
 * write the dashboard JSON in public/data/, which the workflow commits.
 *
 * Each category is isolated in its own try/catch so one bad file doesn't sink
 * the rest. If ANY category errors, the process exits non-zero so the GitHub
 * scheduled run is marked failed (which emails the maintainer).
 *
 * Usage:
 *   node scripts/refresh-data.mjs            # all wired categories
 *   node scripts/refresh-data.mjs idiq       # only the named categories
 */
import { execFileSync } from "node:child_process";
import { fetchCategory } from "./sharepoint/fetch.mjs";
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

let failures = 0;
let refreshed = 0;

for (const key of keys) {
  const wired = WIRED[key];
  if (!wired) {
    console.error(`! ${key}: not a wired category, skipping`);
    continue;
  }
  console.log(`\n=== ${key} ===`);
  try {
    const fetched = await fetchCategory(key);
    if (!fetched) {
      console.log("  no file in SharePoint yet — skipping");
      continue;
    }
    console.log(`  fetched ${fetched.name}`);
    execFileSync("python3", [wired.script, fetched.dest], { stdio: "inherit" });
    refreshed++;
  } catch (e) {
    console.error(`  FAILED: ${e.message}`);
    failures++;
  }
}

console.log(`\nDone. ${refreshed} refreshed, ${failures} failed.`);
if (failures) process.exit(1);
