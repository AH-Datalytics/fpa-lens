import { staffingData } from "@/data/siteData";

type StaffingData = typeof staffingData;

export interface StaffingJson {
  asOf?: string | null;
  source?: string;
  headcount?: { total?: number; filled?: number; vacancies?: number };
  departments?: Record<string, { filled: number; vacant: number; total: number }>;
}

interface PolicyThresholds {
  redPct: number;
  amberPct: number;
}

/**
 * Integer zone cut-offs for a capacity under the Director's percentage policy.
 * amberMax is the highest filled count that still reads Amber (so Green starts
 * at ceil(amberPct% × full)); redMax likewise for Red. Same formula the curated
 * thresholds in siteData.ts were hand-derived with.
 */
export function thresholdsForCapacity(full: number, policy: PolicyThresholds): { amberMax: number; redMax: number } {
  return {
    amberMax: Math.max(0, Math.ceil((policy.amberPct / 100) * full) - 1),
    redMax: Math.max(0, Math.ceil((policy.redPct / 100) * full) - 1),
  };
}

/**
 * Overlay the monthly staffing workbook (public/data/staffing.json) onto the
 * curated staffing structure.
 *
 * Each department takes the workbook's `filled` as `current` and, per the
 * Regional Director (Oct 7 2026: "use the updated staffing totals, as we have
 * eliminated some positions even though they were budgeted for"), the
 * workbook's `total` as `full`, with the Green/Amber/Red cut-offs recomputed
 * from the department's percentage policy. Until then capacity stayed frozen
 * at the May 2026 values, which had Executive reading "12 of 11 (109%)" and
 * the cards summing to 302 positions under a 312 headline.
 *
 * Each unit's aggregate is the sum of its departments (full, current, and
 * both thresholds) so the aggregate-matches-sum invariant always holds.
 * Departments missing from the workbook keep their curated values.
 */
export function applyStaffingOverlay(base: StaffingData, json: StaffingJson | null): StaffingData {
  if (!json?.departments) return base;
  const deps = json.departments;

  type Dept = StaffingData["coreFPU"]["departments"][number];
  const overlayDepts = (departments: readonly Dept[]): Dept[] =>
    departments.map((d) => {
      const wb = deps[d.label];
      if (!wb) return d;
      const full = typeof wb.total === "number" && wb.total > 0 ? wb.total : d.full;
      return {
        ...d,
        full,
        current: wb.filled,
        thresholds: full === d.full ? d.thresholds : thresholdsForCapacity(full, d.policyThresholds),
      };
    });

  const sum = (departments: Dept[], pick: (d: Dept) => number) =>
    departments.reduce((acc, d) => acc + pick(d), 0);
  const aggregateFrom = <A extends { full: number; current: number | null; thresholds: { amberMax: number; redMax: number } }>(
    aggregate: A,
    departments: Dept[],
  ): A => ({
    ...aggregate,
    full: sum(departments, (d) => d.full),
    current: sum(departments, (d) => d.current ?? 0),
    thresholds: {
      amberMax: sum(departments, (d) => d.thresholds.amberMax),
      redMax: sum(departments, (d) => d.thresholds.redMax),
    },
  });

  const coreDepts = overlayDepts(base.coreFPU.departments);
  const adminDepts = overlayDepts(base.adminFunctions.departments);

  return {
    ...base,
    asOfDate: json.asOf ?? base.asOfDate,
    source: json.asOf ? `Staffing headcount workbook (${json.asOf})` : base.source,
    headcount: {
      total: json.headcount?.total ?? base.headcount.total,
      vacancies: json.headcount?.vacancies ?? base.headcount.vacancies,
    },
    coreFPU: {
      ...base.coreFPU,
      aggregate: aggregateFrom(base.coreFPU.aggregate, coreDepts),
      departments: coreDepts,
    },
    adminFunctions: {
      ...base.adminFunctions,
      aggregate: aggregateFrom(base.adminFunctions.aggregate, adminDepts),
      departments: adminDepts,
    },
  };
}
