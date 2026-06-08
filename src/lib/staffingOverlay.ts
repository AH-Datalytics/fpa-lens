import { staffingData } from "@/data/siteData";

type StaffingData = typeof staffingData;

export interface StaffingJson {
  asOf?: string | null;
  source?: string;
  headcount?: { total?: number; filled?: number; vacancies?: number };
  departments?: Record<string, { filled: number; vacant: number; total: number }>;
}

/**
 * Overlay the current filled counts from the monthly staffing workbook
 * (public/data/staffing.json) onto the curated staffing structure.
 *
 * Only `current` (filled) values and the headline headcount are refreshed.
 * Budgeted capacity (`full`) and the Green/Amber/Red thresholds are Director-set
 * policy and stay in code. Each unit's aggregate `current` is recomputed as the
 * sum of its departments so the aggregate-matches-sum invariant always holds.
 */
export function applyStaffingOverlay(base: StaffingData, json: StaffingJson | null): StaffingData {
  if (!json?.departments) return base;
  const deps = json.departments;

  const overlayDepts = <D extends { label: string; current: number | null }>(departments: readonly D[]): D[] =>
    departments.map((d) => (deps[d.label] ? { ...d, current: deps[d.label].filled } : d));

  const sumCurrent = (departments: { current: number | null }[]) =>
    departments.reduce((acc, d) => acc + (d.current ?? 0), 0);

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
      aggregate: { ...base.coreFPU.aggregate, current: sumCurrent(coreDepts) },
      departments: coreDepts,
    },
    adminFunctions: {
      ...base.adminFunctions,
      aggregate: { ...base.adminFunctions.aggregate, current: sumCurrent(adminDepts) },
      departments: adminDepts,
    },
  };
}
