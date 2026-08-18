/**
 * Send a digest email for a data-refresh run via the Resend HTTP API (no npm
 * deps). Consolidates what used to be two conditional emails (failure alert +
 * SITREP-roll heads-up) into a single message.
 *
 * Sends only when the run is worth reading about — data actually published, a
 * source failed, or the run was triggered by hand (see `shouldSend`). The job
 * runs Tuesdays and Fridays; emailing every run would mean mostly-empty "no
 * changes" messages, which trains you to ignore the one that matters.
 *
 * It reports three things:
 *   1. Data changes published this run (finance period rolled, turf month
 *      advanced, SITREP rolled, etc.) — derived by diffing the working tree
 *      against HEAD, so this MUST run after the refresh step and BEFORE commit.
 *   2. Per-source pull status (REFRESHED / SKIPPED / FAILED) from
 *      refresh-summary.txt, written by refresh-data.mjs.
 *   3. Any failures, including a hard run error that aborted before a summary
 *      was written (passed in via REFRESH_OUTCOME).
 *
 * Sending must never fail the run, so this always exits 0. The pure helpers are
 * exported for unit testing (scripts/notify-digest.test.mjs).
 *
 * Env: RESEND_API_KEY (required to actually send), RUN_URL (link to the logs),
 *      REFRESH_OUTCOME ("success"/"failure" of the refresh step), SITE_URL,
 *      FORCE_DIGEST ("1" to send even on a quiet run — set for manual runs).
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const SUMMARY_PATH = "refresh-summary.txt";
// Output files the refresh writes; used to detect what actually changed.
const TRACKED_OUTPUTS = ["public/data", "src/data/turfCycles.json"];
const RECIPIENTS = ["oboochever@ahdatalytics.com"];

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests).
// ---------------------------------------------------------------------------

/** Parse refresh-summary.txt into [{status, key, detail}]. */
export function parseSummary(text) {
  if (!text || typeof text !== "string") return [];
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(REFRESHED|SKIPPED|FAILED)\s+([^:]+):\s*(.*)$/);
      return m ? { status: m[1], key: m[2].trim(), detail: m[3].trim() } : null;
    })
    .filter(Boolean);
}

/**
 * Human one-liner describing how a single output file changed. `oldObj` is the
 * committed (HEAD) JSON (null for a brand-new file); `newObj` is the working
 * tree JSON. Best-effort with a generic fallback so an unrecognized or
 * unparseable file still produces a line rather than throwing.
 */
export function summarizeChange(path, oldObj, newObj) {
  const base = path.split("/").pop();
  try {
    if (base === "actuals-fy26.json") {
      const o = oldObj?.period;
      const n = newObj?.period;
      if (o && n && o !== n) return `Finance: ${o} → ${n}`;
      return `Finance: budget vs actuals updated${n ? ` (${n})` : ""}`;
    }
    if (base === "turfCycles.json") {
      const o = oldObj?.reportingMonth?.label;
      const n = newObj?.reportingMonth?.label;
      if (o && n && o !== n) return `Turf maintenance: reporting month ${o} → ${n}`;
      return `Turf maintenance: cutting percentages updated${n ? ` (${n})` : ""}`;
    }
    if (base === "sitrep.json") {
      const o = oldObj?.reportMonth;
      const n = newObj?.reportMonth;
      if (o && n && o !== n) return `SITREP: dashboard rolled ${o} → ${n}`;
      return `SITREP: ${n ?? "digest"} re-parsed`;
    }
    if (base === "staffing.json") {
      const vac = (x) => x?.summary?.vacancies ?? x?.vacancies ?? null;
      const o = vac(oldObj);
      const n = vac(newObj);
      const asOf = newObj?.asOf ? ` (${newObj.asOf})` : "";
      if (o != null && n != null && o !== n) return `Staffing: ${o} → ${n} vacancies${asOf}`;
      return `Staffing: figures updated${asOf}`;
    }
    if (base === "idiq-contracts.json") {
      const count = (x) =>
        Array.isArray(x) ? x.length : x?.contracts?.length ?? x?.summary?.contracts ?? null;
      const n = count(newObj);
      return n != null
        ? `IDIQ: contract tracker updated (${n} contracts)`
        : "IDIQ: contract tracker updated";
    }
    if (base === "safety-events.json") {
      return "Safety: event log updated";
    }
  } catch {
    // fall through to the generic line
  }
  return `${base}: updated`;
}

/**
 * Is this run worth an email? Yes when data published, when a source failed or
 * the run errored outright, or when a human triggered it and wants the
 * confirmation. A clean run that found nothing new stays silent.
 */
export function shouldSend({ changes = [], results = [], runFailed = false, force = false }) {
  if (force) return true;
  if (runFailed) return true;
  if (changes.length > 0) return true;
  return results.some((r) => r.status === "FAILED");
}

/** Compose the digest {subject, text} from parsed results and change lines. */
export function buildDigest({
  results = [],
  changes = [],
  runFailed = false,
  runUrl = "(local run)",
  siteUrl = "https://fpalens.org",
}) {
  const failed = results.filter((r) => r.status === "FAILED");
  const hardFail = runFailed && failed.length === 0;
  const isFailure = failed.length > 0 || runFailed;
  const plural = (n) => (n === 1 ? "" : "s");

  let subject;
  let statusPhrase;
  if (failed.length > 0) {
    subject = `FPA Lens data refresh: ⚠ ${failed.length} source${plural(failed.length)} failed`;
    statusPhrase = `with ${failed.length} source failure${plural(failed.length)}`;
  } else if (hardFail) {
    subject = "FPA Lens data refresh: ⚠ run errored";
    statusPhrase = "with an error";
  } else if (changes.length > 0) {
    subject = `FPA Lens data refresh: ${changes.length} update${plural(changes.length)} published`;
    statusPhrase = `— ${changes.length} update${plural(changes.length)} published`;
  } else {
    subject = "FPA Lens data refresh: all sources current";
    statusPhrase = "— no changes";
  }

  const lines = [`FPA Lens data refresh completed ${statusPhrase}.`, ""];

  lines.push("Updates published this run:");
  if (changes.length > 0) {
    for (const c of changes) lines.push(`  • ${c}`);
  } else {
    lines.push("  • None — every source was already current.");
  }
  lines.push("");

  lines.push("Source pull status:");
  if (results.length > 0) {
    for (const r of results) {
      lines.push(`  ${r.status.padEnd(10)} ${r.key.padEnd(9)} ${r.detail}`);
    }
  } else {
    lines.push("  (no per-source summary was captured)");
  }

  if (isFailure) {
    lines.push("", "Needs attention:");
    if (failed.length > 0) {
      for (const f of failed) lines.push(`  ${f.key}: ${f.detail}`);
    }
    if (hardFail) {
      lines.push(
        "  The refresh step errored before a per-source summary was written.",
        "  See the run logs below.",
      );
    }
  }

  lines.push(
    "",
    `Live dashboard: ${siteUrl}`,
    `Run logs: ${runUrl}`,
    "",
    "--",
    "Automated digest from the FPA Lens data pipeline. Reply if anything looks off.",
  );

  return { subject, text: lines.join("\n") };
}

// ---------------------------------------------------------------------------
// Side-effecting runner (only when invoked directly, not on import).
// ---------------------------------------------------------------------------

/** Files under TRACKED_OUTPUTS that changed vs HEAD (modified or new). */
function changedOutputFiles() {
  try {
    const out = execFileSync("git", ["status", "--porcelain", "--", ...TRACKED_OUTPUTS], {
      encoding: "utf8",
    });
    return out
      .split("\n")
      .map((l) => l.slice(3).trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function headJson(path) {
  try {
    return JSON.parse(execFileSync("git", ["show", `HEAD:${path}`], { encoding: "utf8" }));
  } catch {
    return null; // new file, or unparseable
  }
}

function workingJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  const results = parseSummary(
    existsSync(SUMMARY_PATH) ? readFileSync(SUMMARY_PATH, "utf8") : "",
  );
  const runFailed = process.env.REFRESH_OUTCOME === "failure";

  const changes = changedOutputFiles().map((f) =>
    summarizeChange(f, headJson(f), workingJson(f)),
  );

  const { subject, text } = buildDigest({
    results,
    changes,
    runFailed,
    runUrl: process.env.RUN_URL || "(local run)",
    siteUrl: process.env.SITE_URL || "https://fpalens.org",
  });

  if (!shouldSend({ changes, results, runFailed, force: process.env.FORCE_DIGEST === "1" })) {
    console.log("Quiet run (no changes, no failures); digest not sent.");
    process.exit(0);
  }

  const KEY = process.env.RESEND_API_KEY;
  if (!KEY) {
    console.log(`No RESEND_API_KEY set; digest not sent. Preview:\n\nSubject: ${subject}\n\n${text}`);
    process.exit(0);
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "FPA Lens Alerts <alerts@fpalens.org>",
        to: RECIPIENTS,
        subject,
        text,
      }),
    });
    if (!res.ok) {
      console.error(`Resend send failed: ${res.status} ${await res.text()}`);
    } else {
      console.log("Digest sent to:", RECIPIENTS.join(", "));
    }
  } catch (e) {
    console.error(`Digest send error: ${e.message}`);
  }
  process.exit(0);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main();
}
