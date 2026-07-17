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
    exts: ["pdf", "docx"], // SITREPs arrive as either PDF or Word
    cadence: "monthly",
    // The Regional Director frequently uploads SITREPs under a human-readable
    // name that doesn't match the sitrep_YYYY-MM convention (e.g.
    // "2026.07_Regional Director's SITREP - July 2026.pdf"), and the pipeline's
    // SharePoint app is read-only so it can't rename them. Rather than skip
    // those files, resolve the month from anywhere in the name and canonicalize
    // the saved filename. The SITREP folder holds only SITREPs, so this loose
    // match is safe here without loosening the other (strict) categories.
    flexibleMonth: true,
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

/** Escaped, alternation-grouped extension pattern (supports cat.exts). */
function extPat(cat) {
  const es = (cat.exts ?? [cat.ext]).map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return es.length > 1 ? `(?:${es.join("|")})` : es[0];
}

const MONTHS_LC = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/**
 * Resolve a { yyyy, mm } from anywhere in a filename, tolerating the shapes a
 * SITREP actually arrives in: "sitrep_2026-07.pdf", "2026.07_Regional
 * Director's SITREP - July 2026.pdf", "...July 2026.pdf", "07-2026.pdf".
 * Returns null when no month is resolvable. Used for `flexibleMonth` categories
 * only; every other category stays on the strict descriptor_YYYY-MM regex.
 */
export function flexibleMonth(name) {
  // 1. YYYY<sep?>MM anywhere (e.g. 2026-07, 2026.07, 202607). Bounded by
  //    non-digits so it doesn't grab a slice of a longer number.
  let m = name.match(/(?<!\d)(20\d{2})[-._ ]?(0[1-9]|1[0-2])(?!\d)/);
  if (m) return { yyyy: m[1], mm: m[2] };
  // 2. MonthName YYYY (e.g. "July 2026").
  m = name.match(new RegExp(`(${MONTHS_LC.join("|")})[ ,._-]*(20\\d{2})`, "i"));
  if (m) return { yyyy: m[2], mm: String(MONTHS_LC.indexOf(m[1].toLowerCase()) + 1).padStart(2, "0") };
  // 3. MM<sep>YYYY (e.g. 07-2026).
  m = name.match(/(?<!\d)(0[1-9]|1[0-2])[-._ ](20\d{2})(?!\d)/);
  if (m) return { yyyy: m[2], mm: m[1] };
  return null;
}

/** Build the filename regex for a category. */
function nameRegex(cat) {
  const date =
    cat.cadence === "weekly" ? "(\\d{4})-(\\d{2})-(\\d{2})"
    : cat.monthOptional ? "(\\d{4})(?:-(\\d{2}))?"
    : "(\\d{4})-(\\d{2})";
  const esc = cat.descriptor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const ext = extPat(cat);
  // Tolerate an accidentally doubled extension (e.g. "...xlsm.xlsm"); we can't
  // rely on uploaders fixing typos. The saved name is normalized on download.
  return new RegExp(`^${esc}_${date}\\.${ext}(?:\\.${ext})?$`, "i");
}

/**
 * Canonical local filename. For `flexibleMonth` categories this rewrites an
 * off-convention SITREP name to descriptor_YYYY-MM.ext; otherwise it just
 * collapses a doubled extension, e.g. foo.xlsm.xlsm -> foo.xlsm.
 */
export function normalizeName(name, cat) {
  if (cat.flexibleMonth) {
    const fm = flexibleMonth(name);
    if (!fm) return name;
    const ext = name.toLowerCase().split(".").pop();
    return `${cat.descriptor}_${fm.yyyy}-${fm.mm}.${ext}`;
  }
  const ext = extPat(cat);
  return name.replace(new RegExp(`(\\.${ext})\\.${ext}$`, "i"), "$1");
}

/** Parse the date in a filename into a sortable integer (YYYYMMDD), or null. */
export function dateKey(name, cat) {
  if (cat.flexibleMonth) {
    const fm = flexibleMonth(name);
    return fm ? Number(`${fm.yyyy}${fm.mm}01`) : null;
  }
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
          console.log(`    ⚠ off-convention name "${newest.name}" -> will save as ${newest.normalizedName}`);
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
