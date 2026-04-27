/**
 * Single source of truth for FY26 actuals.
 *
 * Imported statically from `public/data/actuals-fy26.json` so Next.js
 * bundles the JSON at build time. This avoids the home/finance pages
 * drifting against each other - both surfaces hit this loader, and a
 * refresh of the JSON triggers a single coordinated rebuild.
 *
 * The JSON stays in `public/data/` so the workbook export script keeps
 * its existing path; the loader just reaches into that folder.
 */

import actualsJson from "../../public/data/actuals-fy26.json";

export interface ActualsLineItem {
  name: string;
  ytdActual: number;
  ytdBudget: number;
  variancePct: number | "unbudgeted";
  totalBudget: number;
}

export interface ActualsEntity {
  label: string;
  revenue: { categories: ActualsLineItem[]; total: ActualsLineItem };
  expenses: {
    operations: { categories: ActualsLineItem[]; total: ActualsLineItem };
    projects: { categories: ActualsLineItem[]; total: ActualsLineItem };
    grandTotal: ActualsLineItem;
  };
  sourcesUses: ActualsLineItem;
  netChange: ActualsLineItem;
  departments: ActualsLineItem[];
}

export interface ActualsData {
  period: string;
  periodLabel: string;
  lastUpdated: string;
  fiscalYear: number;
  entities: Record<string, ActualsEntity>;
}

const actuals = actualsJson as unknown as ActualsData;

export function getActuals(): ActualsData {
  return actuals;
}

/**
 * Compact summary used by the home Financial Readiness card. Keeps
 * the home page off raw JSON and guarantees it tracks whatever the
 * finance page is showing.
 */
export interface OmSummary {
  /** YTD operations & maintenance actual spend (Whole Entity). */
  omActual: number;
  /** Annual O&M budget (Whole Entity). */
  omAnnualBudget: number;
  /** ISO date string (YYYY-MM-DD) the actuals are reported through. */
  omDataDate: string;
}

export function getOmSummary(): OmSummary {
  const om = actuals.entities.wholeEntity.expenses.operations.total;
  return {
    omActual: om.ytdActual,
    omAnnualBudget: om.totalBudget,
    omDataDate: actuals.lastUpdated,
  };
}
