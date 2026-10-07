/**
 * SITREP overlay. Rolls the SITREP-derived fields of siteData.ts to the latest
 * monthly SITREP, reading public/data/sitrep.json (produced weekly by the
 * SharePoint pipeline / extractSitrep.mjs). Mirrors the applyTurfCycles pattern
 * in grassCutting.ts: the curated baseline in siteData.ts is the fallback, and
 * this overlay only advances fields when the SITREP month is newer.
 *
 * applySitrep() mutates the passed-in siteData objects IN PLACE (rather than
 * deep-cloning) so the getters on siteConfig/systemReadiness/categories are
 * preserved. Every field is guarded: a null/missing SITREP value leaves the
 * curated baseline untouched, and a malformed digest is a full no-op. The pure
 * helpers are exported for unit testing.
 */

// ---------------------------------------------------------------------------
// Shapes we read from sitrep.json (loose — only the fields the overlay uses).
// ---------------------------------------------------------------------------
export type InspectionStatus =
  | "complete"
  | "on-track"
  | "behind"
  | "not-reported"
  | null;

export interface SitrepInspection {
  status?: InspectionStatus;
  completed?: number | null;
  total?: number | null;
  note?: string | null;
}

export interface SitrepProject {
  name: string;
  status: string;
  phase?: string;
}

export interface SitrepPermits {
  issued?: number | null;
  period?: string | null;
  type?: string | null;
}

export interface SitrepDigest {
  reportMonth?: string;
  executiveSummary?: string | null;
  readiness?: {
    infrastructure?: string | null;
    staffing?: string | null;
    financial?: string | null;
    media?: string | null;
  };
  permits?: SitrepPermits;
  /** Every month's permit count the pipeline has seen (accumulated across
   *  refreshes by extractSitrep.mjs); older digests only carry `permits`. */
  permitsHistory?: SitrepPermits[];
  projects?: SitrepProject[];
  inspections?: {
    cpra?: SitrepInspection;
    usace?: SitrepInspection;
    valves?: SitrepInspection;
  };
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests).
// ---------------------------------------------------------------------------
const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** "June 2026" -> "2026-06-01"; returns null if unparseable. */
export function parseReportMonthToISO(reportMonth: string | undefined): string | null {
  if (!reportMonth || typeof reportMonth !== "string") return null;
  const m = reportMonth.trim().toLowerCase().match(/^([a-z]+)\s+(\d{4})$/);
  if (!m) return null;
  const monthIdx = MONTHS.indexOf(m[1]);
  if (monthIdx < 0) return null;
  const mm = String(monthIdx + 1).padStart(2, "0");
  return `${m[2]}-${mm}-01`;
}

/** Comparable rank for an ISO date's year+month. */
export function monthRank(iso: string): number {
  const [y, m] = iso.split("-").map(Number);
  return y * 12 + (m - 1);
}

/** Short month label, e.g. "May 2026" -> "May". */
export function shortMonth(period: string | null | undefined): string | null {
  if (!period || typeof period !== "string") return null;
  return period.trim().split(/\s+/)[0];
}

/** SITREP color ("Green"/"Amber"/"Red") -> siteData StatusLevel; null if other. */
export function colorToStatus(color: string | null | undefined): "GREEN" | "AMBER" | "RED" | null {
  if (!color || typeof color !== "string") return null;
  const up = color.trim().toUpperCase();
  return up === "GREEN" || up === "AMBER" || up === "RED" ? up : null;
}

/** Straight-line expected progress (percent) for an as-of date. Local copy of
 *  the same formula used by readinessRollups / the infra+engineering pages so
 *  this module has no dependency cycle back into siteData. */
export function expectedPercent(
  monthlyRate: number,
  periodStartISO: string,
  asOfISO: string,
): number {
  const asOf = new Date(asOfISO + "T00:00:00").getTime();
  const start = new Date(periodStartISO + "T00:00:00").getTime();
  const months = (asOf - start) / (1000 * 60 * 60 * 24 * 30.4375);
  return Math.min(100, Math.max(0, monthlyRate * months));
}

/**
 * Resolve an inspection's display percent from the SITREP signal, keeping the
 * card's existing on-pace grading intact:
 *  - explicit count (e.g. valve 84/105) -> the real percent
 *  - "complete" -> 100
 *  - "on-track"/"not-reported"/unknown -> the report-date expected % (sits on
 *    the pace line -> Green), so narrative-only items read honestly as on pace
 *  - "behind" -> below expected (-> Amber)
 * Returns null only when there's nothing to apply (caller keeps the baseline).
 */
export function inspectionPercent(
  insp: SitrepInspection | undefined,
  cfg: { monthlyRate: number; periodStart: string; dataAsOf: string },
): number | null {
  if (insp && insp.completed != null && insp.total != null && insp.total > 0) {
    return Math.round((insp.completed / insp.total) * 100);
  }
  const expected = expectedPercent(cfg.monthlyRate, cfg.periodStart, cfg.dataAsOf);
  const status: InspectionStatus = insp?.status ?? "not-reported";
  switch (status) {
    case "complete":
      return 100;
    case "behind":
      return Math.round(expected * 0.85); // ratio ~85% -> Amber
    case "on-track":
    case "not-reported":
    case null:
    default:
      return Math.round(expected); // on the pace line -> Green
  }
}

/** Calendar quarter containing an ISO month: label, ISO start/end dates. */
export function quarterBounds(iso: string): { quarter: number; label: string; start: string; end: string } {
  const [y, m] = iso.split("-").map(Number);
  const quarter = Math.floor((m - 1) / 3) + 1;
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const endDay = new Date(y, endMonth, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    quarter,
    label: `Q${quarter} ${y}`,
    start: `${y}-${pad(startMonth)}-01`,
    end: `${y}-${pad(endMonth)}-${pad(endDay)}`,
  };
}

/** Fiscal half containing an ISO month (Jan-Jun / Jul-Dec). */
export function halfBounds(iso: string): { start: string; end: string } {
  const [y, m] = iso.split("-").map(Number);
  return m <= 6
    ? { start: `${y}-01-01`, end: `${y}-06-30` }
    : { start: `${y}-07-01`, end: `${y}-12-31` };
}

/**
 * Find a stated "Qn field inspections ... N% complete" figure for the given
 * quarter in any of the supplied texts. Returns the percent and the sentence
 * it came from, or null when nothing matches that quarter.
 */
export function statedQuarterPercent(
  texts: Array<string | null | undefined>,
  quarter: number,
): { percent: number; sentence: string } | null {
  for (const text of texts) {
    if (!text || typeof text !== "string") continue;
    for (const sentence of text.split(/(?<=[.;])\s+/)) {
      const m = sentence.match(/\bQ([1-4])\s+field inspections?\b[^.%]*?(\d{1,3})\s*%/i);
      if (m && Number(m[1]) === quarter) {
        const percent = Math.min(100, Math.max(0, Number(m[2])));
        return { percent, sentence: sentence.trim().replace(/[.;]$/, "") };
      }
    }
  }
  return null;
}

/** Minimal shape check: a digest we can safely act on. */
export function isUsableDigest(d: unknown): d is SitrepDigest {
  if (!d || typeof d !== "object") return false;
  const rm = (d as SitrepDigest).reportMonth;
  return typeof rm === "string" && parseReportMonthToISO(rm) !== null;
}

// ---------------------------------------------------------------------------
// Target field shapes (the slices of siteData this overlay mutates).
// ---------------------------------------------------------------------------
interface InspectionCfg {
  periodStart: string;
  periodEnd?: string;
  monthlyRate: number;
  source: string;
  currentQuarterStatus?: string;
}
interface ReadinessMetricsLike {
  dataAsOf: string;
  cpraQuarterlyInspection: InspectionCfg & {
    currentQuarterPercent: number;
    currentQuarter?: string;
    reported?: boolean;
    note?: string | null;
  };
  usaceSemiAnnualInspection: InspectionCfg & {
    currentHalfPercent: number;
    status?: string;
    percentIsEstimate?: boolean;
  };
  valveExercises: InspectionCfg & {
    percentComplete: number;
    completed?: number;
    total?: number;
    currentQuarterStatus?: string;
  };
}
interface CategoryLike {
  name: string;
  status: string;
  source: string;
}
interface SystemReadinessLike {
  categories: CategoryLike[];
}
interface KpiEntryLike {
  label?: string;
  value?: unknown;
  source?: string;
}
interface KpiMetricsLike {
  systemReadiness: KpiEntryLike;
  pccpPumps: KpiEntryLike;
  floodgateInspections: KpiEntryLike;
  permitsIssued: KpiEntryLike & { label: string; value: number };
}
interface PermitEntryLike {
  month: string;
  count: number;
  source: string;
}
interface OperationsDataLike {
  permitsIssued: PermitEntryLike[];
}
interface CapitalProjectLike {
  name: string;
  status: string;
  description: string;
  source: string;
}
interface FinancialDataLike {
  capitalProjects: CapitalProjectLike[];
}

export interface SitrepTargets {
  readinessMetrics: ReadinessMetricsLike;
  systemReadiness: SystemReadinessLike;
  kpiMetrics: KpiMetricsLike;
  operationsData: OperationsDataLike;
  financialData: FinancialDataLike;
}

export interface ApplyResult {
  applied: boolean;
  reportMonth: string | null;
  changes: string[];
}

const CATEGORY_TO_READINESS_KEY: Record<string, keyof NonNullable<SitrepDigest["readiness"]>> = {
  "Infrastructure Readiness": "infrastructure",
  "Staffing Readiness": "staffing",
  "Financial Readiness": "financial",
  "Media Coverage": "media",
};

/**
 * Overlay the SITREP digest onto siteData targets IN PLACE. No-op (returns
 * applied:false) when the digest is malformed or its month is not strictly
 * newer than the baseline's dataAsOf. Each field is guarded against nulls.
 */
export function applySitrep(digest: unknown, targets: SitrepTargets): ApplyResult {
  if (!isUsableDigest(digest)) {
    return { applied: false, reportMonth: null, changes: [] };
  }
  const iso = parseReportMonthToISO(digest.reportMonth)!;
  if (monthRank(iso) <= monthRank(targets.readinessMetrics.dataAsOf)) {
    return { applied: false, reportMonth: digest.reportMonth ?? null, changes: [] };
  }

  const month = digest.reportMonth!; // e.g. "June 2026"
  const sitrepSource = `${month} SITREP`;
  const changes: string[] = [];
  const rm = targets.readinessMetrics;

  // 1. Report date -> footer + every derived month label.
  rm.dataAsOf = iso;
  changes.push(`Reporting month -> ${month} (dataAsOf ${iso})`);

  // 2. Inspections — set percentComplete from the SITREP (count or status),
  //    using the NEW dataAsOf so pace and date roll together. The CPRA
  //    quarter and USACE half roll to the period containing the report month
  //    first, so a September report is graded against Q3 / Jul-Dec rather than
  //    the baseline's Q2 / Jan-Jun (which had read "Q2 2026 · 100%" in October).
  const insp = digest.inspections ?? {};
  const cpraCfg = rm.cpraQuarterlyInspection;
  const q = quarterBounds(iso);
  cpraCfg.currentQuarter = q.label;
  cpraCfg.periodStart = q.start;
  cpraCfg.periodEnd = q.end;
  const usaceCfg = rm.usaceSemiAnnualInspection;
  const h = halfBounds(iso);
  usaceCfg.periodStart = h.start;
  usaceCfg.periodEnd = h.end;

  // CPRA: prefer a stated figure. SITREPs phrase the quarterly CPRA work as
  // "Qn field inspections approximately N% complete", often in the executive
  // summary or filed under the USACE note by the extractor, so look there
  // before falling back to the status word. A SITREP that says nothing about
  // CPRA marks the card "not reported" rather than synthesizing a percent.
  const stated = statedQuarterPercent(
    [digest.executiveSummary, insp.cpra?.note, insp.usace?.note],
    q.quarter,
  );
  const cpraHasCount = insp.cpra?.completed != null && insp.cpra?.total != null && insp.cpra.total > 0;
  if (stated) {
    cpraCfg.currentQuarterPercent = stated.percent;
    cpraCfg.note = stated.sentence;
    cpraCfg.reported = true;
    cpraCfg.source = sitrepSource;
    changes.push(`CPRA inspection -> ${stated.percent}% (stated)`);
  } else if (cpraHasCount || (insp.cpra?.status && insp.cpra.status !== "not-reported")) {
    const cpraPct = inspectionPercent(insp.cpra, {
      monthlyRate: cpraCfg.monthlyRate,
      periodStart: cpraCfg.periodStart,
      dataAsOf: iso,
    });
    if (cpraPct != null) {
      cpraCfg.currentQuarterPercent = cpraPct;
      cpraCfg.note = insp.cpra?.note ?? null;
      cpraCfg.reported = true;
      cpraCfg.source = sitrepSource;
      changes.push(`CPRA inspection -> ${cpraPct}%`);
    }
  } else {
    cpraCfg.reported = false;
    cpraCfg.note = null;
    cpraCfg.source = sitrepSource;
    changes.push("CPRA inspection -> not reported");
  }

  const usacePct = inspectionPercent(insp.usace, {
    monthlyRate: usaceCfg.monthlyRate,
    periodStart: usaceCfg.periodStart,
    dataAsOf: iso,
  });
  if (usacePct != null) {
    const usaceHasCount = insp.usace?.completed != null && insp.usace?.total != null && insp.usace.total > 0;
    usaceCfg.currentHalfPercent = usacePct;
    usaceCfg.percentIsEstimate = !usaceHasCount && insp.usace?.status !== "complete";
    usaceCfg.source = sitrepSource;
    if (insp.usace?.note) usaceCfg.status = insp.usace.note;
    changes.push(`USACE inspection -> ${usacePct}%${usaceCfg.percentIsEstimate ? " (pace estimate)" : ""}`);
  }
  const valvePct = inspectionPercent(insp.valves, {
    monthlyRate: rm.valveExercises.monthlyRate,
    periodStart: rm.valveExercises.periodStart,
    dataAsOf: iso,
  });
  if (valvePct != null) {
    rm.valveExercises.percentComplete = valvePct;
    rm.valveExercises.source = sitrepSource;
    if (insp.valves?.completed != null) rm.valveExercises.completed = insp.valves.completed;
    if (insp.valves?.total != null) rm.valveExercises.total = insp.valves.total;
    if (insp.valves?.note) rm.valveExercises.currentQuarterStatus = insp.valves.note;
    // When the SITREP reports the cycle complete without an explicit count, sync
    // the completed count to the total so the progress bar reads full instead of
    // showing "100% complete" alongside a stale partial count (e.g. 84 of 105).
    if (valvePct === 100 && insp.valves?.completed == null && rm.valveExercises.total != null) {
      rm.valveExercises.completed = rm.valveExercises.total;
    }
    changes.push(`Valve testing -> ${valvePct}%`);
  }

  // 3. Readiness colors + sources on the System Readiness card. Staffing COLOR
  //    only — the vacancy count stays from the staffing workbook (conflict
  //    policy: dedicated workbooks win).
  for (const cat of targets.systemReadiness.categories) {
    const key = CATEGORY_TO_READINESS_KEY[cat.name];
    if (!key) continue;
    const status = colorToStatus(digest.readiness?.[key]);
    if (status) {
      cat.status = status;
      cat.source = sitrepSource;
    }
  }
  if (digest.readiness) {
    changes.push(
      `Readiness: infra ${digest.readiness.infrastructure}, staffing ${digest.readiness.staffing}, ` +
        `financial ${digest.readiness.financial}, media ${digest.readiness.media}`,
    );
  }

  // 4. KPI cards — relabel sources confirmed by the SITREP; roll permits.
  for (const k of ["systemReadiness", "pccpPumps", "floodgateInspections"] as const) {
    if (targets.kpiMetrics[k].source) targets.kpiMetrics[k].source = sitrepSource;
  }
  // Every month the pipeline has seen goes into the trend (older digests only
  // carried the latest month, which silently dropped July 2026 when August
  // arrived). The latest month also drives the KPI label.
  const history = (digest.permitsHistory && digest.permitsHistory.length > 0
    ? digest.permitsHistory
    : [digest.permits]
  ).filter((p): p is SitrepPermits => !!p && p.issued != null && !!p.period);
  const trend = targets.operationsData.permitsIssued;
  for (const p of history) {
    const existing = trend.find((e) => e.month === p.period);
    if (existing) {
      existing.count = p.issued as number;
      existing.source = sitrepSource;
    } else {
      trend.push({ month: p.period as string, count: p.issued as number, source: sitrepSource });
    }
  }
  trend.sort((a, b) => {
    const ra = parseReportMonthToISO(a.month);
    const rb = parseReportMonthToISO(b.month);
    return (ra ? monthRank(ra) : 0) - (rb ? monthRank(rb) : 0);
  });
  const permits = digest.permits;
  if (permits && permits.issued != null && permits.period) {
    const sm = shortMonth(permits.period);
    targets.kpiMetrics.permitsIssued.label = `Permits Issued (${sm})`;
    targets.kpiMetrics.permitsIssued.value = permits.issued;
    targets.kpiMetrics.permitsIssued.source = sitrepSource;
    changes.push(`Permits (${permits.period}): ${permits.issued}${history.length > 1 ? ` (+${history.length - 1} prior months from history)` : ""}`);
  }

  // 5. Capital projects — replace with the SITREP's current list.
  if (Array.isArray(digest.projects) && digest.projects.length > 0) {
    targets.financialData.capitalProjects = digest.projects.map((p) => ({
      name: p.name,
      status: p.phase ?? "In Progress",
      description: p.status,
      source: sitrepSource,
    }));
    changes.push(`Capital projects: ${digest.projects.length}`);
  }

  return { applied: true, reportMonth: month, changes };
}
