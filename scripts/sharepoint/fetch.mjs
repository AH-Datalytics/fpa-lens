/**
 * Locate and download the newest source file per category from SharePoint,
 * following the `descriptor_YYYY-MM.ext` (monthly) / `descriptor_YYYY-MM-DD.ext`
 * (weekly) naming convention agreed with FPA.
 *
 * The "newest" file is chosen by the date encoded in its NAME (not last-modified),
 * so re-uploading an older month never wins. Files that don't match the
 * convention exactly are skipped and reported (this defends against typos like
 * the `budget-actuals_2026-05.xlsm.xlsm` double extension).
 *
 * CLI:
 *   node scripts/sharepoint/fetch.mjs list            # report newest + skipped per category
 *   node scripts/sharepoint/fetch.mjs fetch <cat>     # download newest for one category
 */
import { loadLocalEnv, listFolderFiles, downloadTo } from "./graph.mjs";

const ROOT = "FPA Lens Data";

/**
 * Per-category config.
 *   folder      SharePoint path under the library root
 *   descriptor  filename prefix before the date
 *   ext         expected extension (no dot)
 *   cadence     "monthly" (YYYY-MM) or "weekly" (YYYY-MM-DD)
 *   dest        local path to download into (the path the extractor expects).
 *               {name} is replaced with the original SharePoint filename.
 */
export const CATEGORIES = {
  finance: {
    folder: `${ROOT}/Finance`,
    descriptor: "budget-actuals",
    ext: "xlsm",
    cadence: "monthly",
    dest: "data/sources/budget/{name}",
  },
  idiq: {
    folder: `${ROOT}/Finance/IDIQ`,
    descriptor: "idiq-contracts",
    ext: "xlsx",
    cadence: "monthly",
    dest: "data/sources/idiq/{name}",
  },
  safety: {
    folder: `${ROOT}/Safety`,
    descriptor: "safety-events",
    ext: "xlsx",
    cadence: "monthly",
    dest: "data/sources/safety-event-logs/{name}",
  },
  staffing: {
    folder: `${ROOT}/Staffing`,
    descriptor: "staffing",
    ext: "xlsx",
    cadence: "monthly",
    dest: "data/sources/staffing/{name}",
  },
  sitrep: {
    folder: `${ROOT}/SITREP`,
    descriptor: "sitrep",
    ext: "pdf",
    cadence: "monthly",
    dest: "data/sources/sitreps/{name}",
  },
  turf: {
    folder: `${ROOT}/Turf`,
    descriptor: "turf-maintenance",
    ext: "xlsx",
    cadence: "monthly",
    monthOptional: true, // one workbook with monthly tabs: turf-maintenance_YYYY[-MM].xlsx
    dest: "data/sources/turf/{name}",
  },
};

/** Build the filename regex for a category. */
function nameRegex(cat) {
  const date =
    cat.cadence === "weekly" ? "(\\d{4})-(\\d{2})-(\\d{2})"
    : cat.monthOptional ? "(\\d{4})(?:-(\\d{2}))?"
    : "(\\d{4})-(\\d{2})";
  const esc = cat.descriptor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const ext = cat.ext.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Tolerate an accidentally doubled extension (e.g. "...xlsm.xlsm"); we can't
  // rely on uploaders fixing typos. The saved name is normalized on download.
  return new RegExp(`^${esc}_${date}\\.${ext}(?:\\.${ext})?$`, "i");
}

/** Collapse a doubled extension, e.g. foo.xlsm.xlsm -> foo.xlsm. */
function normalizeName(name, cat) {
  const ext = cat.ext.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return name.replace(new RegExp(`(\\.${ext})\\.${ext}$`, "i"), "$1");
}

/** Parse the date in a filename into a sortable integer (YYYYMMDD), or null. */
function dateKey(name, cat) {
  const m = name.match(nameRegex(cat));
  if (!m) return null;
  const y = m[1];
  const mo = m[2] ?? "00";
  const d = cat.cadence === "weekly" ? m[3] : "01";
  return Number(`${y}${mo}${d}`);
}

/** Return { newest, matched, skipped } for a category. */
export async function inspectCategory(key) {
  const cat = CATEGORIES[key];
  if (!cat) throw new Error(`Unknown category: ${key}`);
  const files = await listFolderFiles(cat.folder);
  const matched = [];
  const skipped = [];
  for (const f of files) {
    const dk = dateKey(f.name, cat);
    if (dk === null) skipped.push(f.name);
    else matched.push({ ...f, dateKey: dk, normalizedName: normalizeName(f.name, cat) });
  }
  matched.sort((a, b) =>
    b.dateKey - a.dateKey ||
    String(b.lastModified).localeCompare(String(a.lastModified)),
  );
  return { cat, newest: matched[0] ?? null, matched, skipped };
}

/** Download the newest file for a category to its local dest. Returns the path, or null. */
export async function fetchCategory(key) {
  const { cat, newest } = await inspectCategory(key);
  if (!newest) return null;
  const dest = cat.dest.replace("{name}", newest.normalizedName);
  await downloadTo(newest, dest);
  return { name: newest.name, dest };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  loadLocalEnv();
  const [cmd, arg] = process.argv.slice(2);

  if (cmd === "list" || !cmd) {
    for (const key of Object.keys(CATEGORIES)) {
      try {
        const { newest, skipped } = await inspectCategory(key);
        const line = newest
          ? `newest = ${newest.name}  (${(newest.size / 1024).toFixed(0)}kb, mod ${newest.lastModified?.slice(0, 10)})`
          : "newest = (none yet)";
        console.log(`• ${key.padEnd(9)} ${line}`);
        if (newest && newest.name !== newest.normalizedName) {
          console.log(`    ⚠ doubled extension "${newest.name}" -> will save as ${newest.normalizedName}`);
        }
        if (skipped.length) console.log(`    ⚠ skipped (bad name): ${skipped.join(", ")}`);
      } catch (e) {
        console.log(`• ${key.padEnd(9)} ERROR: ${e.message}`);
      }
    }
  } else if (cmd === "fetch") {
    if (!arg) throw new Error("usage: fetch <category>");
    const result = await fetchCategory(arg);
    console.log(result ? `Downloaded ${result.name} -> ${result.dest}` : `No file found for ${arg}`);
  } else {
    throw new Error(`Unknown command: ${cmd}`);
  }
}
