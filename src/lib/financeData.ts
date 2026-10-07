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
 * Louisiana fiscal year bounds: FY<N> runs Jul 1 of N-1 through Jun 30 of N.
 * Derived from the actuals' own `fiscalYear` so the "% of fiscal year elapsed"
 * bars roll with the data instead of living as hard-coded FY26 dates (which
 * clamped both the home card and /finance to "100% through fiscal year" once
 * FY27 data arrived).
 */
export function fiscalYearBounds(fiscalYear: number): { start: Date; end: Date } {
  return {
    start: new Date(fiscalYear - 1, 6, 1), // July 1
    end: new Date(fiscalYear, 5, 30), // June 30
  };
}

/** Whole-number percent of the fiscal year elapsed at an ISO data date, clamped 0-100. */
export function fiscalYearElapsedPct(lastUpdatedISO: string, fiscalYear: number): number {
  const { start, end } = fiscalYearBounds(fiscalYear);
  const dataDate = new Date(lastUpdatedISO + "T00:00:00");
  const pct = ((dataDate.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

/** "FY27" style label for the actuals' fiscal year. */
export function fiscalYearLabel(fiscalYear: number): string {
  return `FY${String(fiscalYear % 100).padStart(2, "0")}`;
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
  /** Fiscal year the actuals belong to (FY27 = Jul 2026 - Jun 2027). */
  fiscalYear: number;
  /** Percent of that fiscal year elapsed at omDataDate. */
  fyElapsedPct: number;
}

export function getOmSummary(): OmSummary {
  const om = actuals.entities.wholeEntity.expenses.operations.total;
  return {
    omActual: om.ytdActual,
    omAnnualBudget: om.totalBudget,
    omDataDate: actuals.lastUpdated,
    fiscalYear: actuals.fiscalYear,
    fyElapsedPct: fiscalYearElapsedPct(actuals.lastUpdated, actuals.fiscalYear),
  };
}
