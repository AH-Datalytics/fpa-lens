/**
 * Permit data layer: normalizes raw Vinformatix records into the shape the
 * Permit Overview page renders, and derives system-wide stage timing.
 *
 * The Vinformatix `PermitApplication` feed quirks this module hides from the UI:
 *   - `permitType` is always "Levee Safety" (useless); the real applicant
 *     taxonomy lives in `applicantType`.
 *   - `statusHistory` arrives as a JSON-ENCODED STRING (a string that itself
 *     contains the array), newest-entry-first.
 *   - ~270 records are unsubmitted drafts (status "None", null submit date,
 *     stuck at "Pre Review"); these are excluded from the public dashboard.
 *   - ~110 submitted records have a null `permitSubmitDate`; we fall back to
 *     `permitCreatedDate` for those.
 */

// ---------------------------------------------------------------------------
// Public vocabulary (what the UI speaks)
// ---------------------------------------------------------------------------

export const STAGES = [
  "Submitted",
  "FPA Review",
  "External Agency Review",
  "Awaiting Applicant",
  "Issued",
] as const;
export type Stage = (typeof STAGES)[number];

export const DISTRICTS = ["OLD", "EJLD", "LBBLD"] as const;
export type District = (typeof DISTRICTS)[number];

export const PERMIT_TYPES = ["Governmental", "Commercial", "Residential", "Other"] as const;
export type PermitType = (typeof PERMIT_TYPES)[number];

/** Terminal outcome of a closed permit (null while still active). */
export const OUTCOMES = ["Issued", "Expired", "Withdrawn", "Denied", "Not needed"] as const;
export type PermitOutcome = (typeof OUTCOMES)[number];

/** Which stages FPA controls vs. which wait on an outside party. */
export const STAGE_CONTROL: Record<Stage, "fpa" | "external"> = {
  Submitted: "fpa",
  "FPA Review": "fpa",
  "External Agency Review": "external",
  "Awaiting Applicant": "external",
  Issued: "fpa",
};

// ---------------------------------------------------------------------------
// Raw -> public mappings
// ---------------------------------------------------------------------------

/** Vinformatix `leveeDistrict` -> our short code. */
const DISTRICT_MAP: Record<string, District> = {
  "Orleans Levee District": "OLD",
  "East Jefferson Levee District": "EJLD",
  "Lake Borgne Levee District": "LBBLD",
  "Lake Borgne Basin Levee District": "LBBLD", // tolerate the "Basin" variant
};

/**
 * Vinformatix `permitStage` / history status -> our 5 pipeline buckets.
 * The real lifecycle (oldest -> newest):
 *   Pre Review -> Initial Review -> 3rd Party / Permitting Office review
 *   -> Applicant signature -> Permitting Office signature -> Pending Completion
 */
const STAGE_MAP: Record<string, Stage> = {
  "Pre Review": "Submitted",
  "With Permitting Office for Initial Review": "FPA Review",
  "Under Review - Permitting Office": "FPA Review",
  "With Permitting Office for Signature": "FPA Review",
  "Under Review - 3rd Party": "External Agency Review",
  "With Applicant or Agent for Signature": "Awaiting Applicant",
  "Pending Completion": "Issued",
};

/**
 * Vinformatix `applicantType` -> leadership's 3-type taxonomy, with everything
 * else (Non-profit, unspecified) folded into "Other".
 */
const TYPE_MAP: Record<string, PermitType> = {
  Government: "Governmental",
  "Commercial/Industrial": "Commercial",
  Residential: "Residential",
  "Non-profit": "Other",
};

/** permitStatus values that mean the permit has left the active pipeline. */
const CLOSED_STATUSES = new Set([
  "Approved",
  "Expired",
  "Cancelled",
  "Complete",
  "NotNeeded",
  "Denied",
]);
/** permitStatus values that mean the permit is still being worked. */
const ACTIVE_STATUSES = new Set(["UnderReview", "Submitted"]);
/** A permit that reached a positive outcome (issued / completed). */
const APPROVED_STATUSES = new Set(["Approved", "Complete"]);

/** permitStatus -> public outcome label for closed permits. */
const OUTCOME_MAP: Record<string, PermitOutcome> = {
  Approved: "Issued",
  Complete: "Issued",
  Expired: "Expired",
  Cancelled: "Withdrawn",
  Denied: "Denied",
  NotNeeded: "Not needed",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RawPermit {
  permitId: string;
  permitSubmitDate: string | null;
  permitCreatedDate: string | null;
  permitStatusDate: string | null;
  permitType: string | null;
  permitStatus: string | null;
  permitStage: string | null;
  leveeDistrict: string | null;
  applicantType: string | null;
  projectDescription: string | null;
  lnoDate: string | null;
  infoRequestedDate: string | null;
  statusHistory: string | StatusHistoryEntry[] | null;
}

export interface StatusHistoryEntry {
  status: string;
  date: string;
}

export interface NormalizedPermit {
  id: string;
  district: District;
  permitType: PermitType;
  /** Active pipeline bucket, or "Closed" once it leaves the pipeline. */
  stage: Stage | "Closed";
  isActive: boolean;
  isClosed: boolean;
  isApproved: boolean;
  isDenied: boolean;
  /** Terminal outcome for closed permits; null while active. */
  outcome: PermitOutcome | null;
  /** ISO submit date (falls back to created date), or null. */
  submitDate: string | null;
  /** "YYYY-MM" of the submit date, or null. */
  submitMonthKey: string | null;
  /** Submit -> decision days, for issued permits only; null otherwise. */
  processingDays: number | null;
}

export interface PermitsResponse {
  asOf: string; // ISO timestamp the feed was fetched
  windowStart: string; // YYYY-MM-DD lower bound requested upstream
  windowEnd: string; // YYYY-MM-DD upper bound requested upstream
  count: number;
  stageTiming: Record<Stage, number>; // system-wide avg days in each stage
  permits: NormalizedPermit[];
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/**
 * Parse the double-encoded statusHistory string into chronological (oldest-first)
 * order. The feed delivers entries strictly newest-first, and multiple entries
 * commonly share a date, so we must REVERSE the delivered order to recover true
 * sequence (a plain date sort would keep same-date ties in newest-first order
 * and mis-attribute stage durations). The trailing stable sort by date only
 * corrects any stray out-of-order entry while preserving same-date sequence.
 */
export function parseStatusHistory(raw: RawPermit["statusHistory"]): StatusHistoryEntry[] {
  if (!raw) return [];
  let arr: unknown = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return (arr as StatusHistoryEntry[])
    .filter((e) => e && typeof e.status === "string" && typeof e.date === "string")
    .reverse() // delivered newest-first -> oldest-first
    .sort((a, b) => a.date.localeCompare(b.date)); // stable: keep same-date ties in chronological order
}

function toDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso.slice(0, 10));
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7); // "YYYY-MM"
}

/** "2026-04" -> "Apr '26" */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const name = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];
  return `${name} '${String(y).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/** True for unsubmitted drafts that should never reach the public dashboard. */
export function isDraft(raw: RawPermit): boolean {
  const status = raw.permitStatus ?? "None";
  return status === "None" && !raw.permitSubmitDate;
}

/**
 * Convert a raw record into the UI shape. Returns null for drafts (callers
 * filter these out).
 */
export function normalizePermit(raw: RawPermit): NormalizedPermit | null {
  if (isDraft(raw)) return null;

  const status = raw.permitStatus ?? "";
  const isClosed = CLOSED_STATUSES.has(status);
  const isActive = ACTIVE_STATUSES.has(status);
  const isApproved = APPROVED_STATUSES.has(status);
  const isDenied = status === "Denied";

  const district = DISTRICT_MAP[raw.leveeDistrict ?? ""] ?? "OLD";
  const permitType = TYPE_MAP[raw.applicantType ?? ""] ?? "Other";

  const stage: Stage | "Closed" = isClosed
    ? "Closed"
    : STAGE_MAP[raw.permitStage ?? ""] ?? "Submitted";

  const submitIso = raw.permitSubmitDate ?? raw.permitCreatedDate ?? null;
  const submitMonthKey = submitIso ? monthKeyOf(submitIso) : null;

  let processingDays: number | null = null;
  if (isApproved) {
    const start = toDate(submitIso);
    const end = toDate(raw.permitStatusDate);
    if (start && end && end >= start) processingDays = daysBetween(start, end);
  }

  return {
    id: raw.permitId,
    district,
    permitType,
    stage,
    isActive,
    isClosed,
    isApproved,
    isDenied,
    outcome: isClosed ? OUTCOME_MAP[status] ?? null : null,
    submitDate: submitIso,
    submitMonthKey,
    processingDays,
  };
}

/**
 * System-wide average days a permit spends in each pipeline stage, derived from
 * statusHistory transitions across all (non-draft) permits. The last (newest)
 * history entry runs to `permitStatusDate`.
 */
export function computeStageTiming(raws: RawPermit[]): Record<Stage, number> {
  const sums: Record<Stage, number> = {
    Submitted: 0,
    "FPA Review": 0,
    "External Agency Review": 0,
    "Awaiting Applicant": 0,
    Issued: 0,
  };
  const counts: Record<Stage, number> = { ...sums };

  for (const raw of raws) {
    if (isDraft(raw)) continue;
    const hist = parseStatusHistory(raw.statusHistory);
    if (!hist.length) continue;
    const end = toDate(raw.permitStatusDate);

    for (let i = 0; i < hist.length; i++) {
      const start = toDate(hist[i].date);
      if (!start) continue;
      const nextIso = i + 1 < hist.length ? hist[i + 1].date : raw.permitStatusDate;
      const next = i + 1 < hist.length ? toDate(nextIso) : end;
      if (!next) continue;
      const dur = daysBetween(start, next);
      if (dur < 0) continue;
      const bucket = STAGE_MAP[hist[i].status];
      if (!bucket) continue;
      sums[bucket] += dur;
      counts[bucket] += 1;
    }
  }

  const avg = {} as Record<Stage, number>;
  for (const s of STAGES) avg[s] = counts[s] ? Math.round(sums[s] / counts[s]) : 0;
  return avg;
}
