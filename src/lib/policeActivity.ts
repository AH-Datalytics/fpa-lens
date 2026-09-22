/**
 * Monthly Levee District Police activity series for the Protection page.
 *
 * Source: public/data/police-activity.json, produced by
 * scripts/extractPoliceData.py from the monthly officer-stats workbooks the
 * Police Department uploads to SharePoint (twice-weekly refresh). The JSON is
 * agency + per-district totals for the thirteen infrastructure-protection
 * activity types only; nothing platoon-level and no enforcement rows.
 *
 * This module turns that series into the period views the page renders:
 * fiscal years (Louisiana FY = July 1 - June 30) plus a trailing-12-month
 * window, with totals per activity type, per category, and per district.
 */
import policeJson from "../../public/data/police-activity.json";

export type ActivityKey =
  | "gateChecks"
  | "pumpStationChecks"
  | "riverBattureChecks"
  | "polderChecks"
  | "gaugeReadings"
  | "bayouBienvenueChecks"
  | "leveeInspections"
  | "shelterChecks"
  | "marinaChecks"
  | "facilityChecks"
  | "neighborhoodPatrol"
  | "trafficControl"
  | "fpaEscorts";

export type DistrictKey = "EJLDPD" | "OLDPD";

export type Counts = Record<ActivityKey, number>;

export interface MonthRecord {
  month: string; // "YYYY-MM"
  label: string; // "July 2025"
  source: string;
  total: number;
  agency: Counts;
  districts: Record<DistrictKey, Counts>;
}

export interface PoliceActivityData {
  generatedAt: string;
  source: string;
  sourceModified: string | null;
  latestMonth: string;
  fiscalYearStartMonth: number;
  fields: { key: ActivityKey; label: string }[];
  months: MonthRecord[];
  warnings: string[];
}

export const policeActivity = policeJson as unknown as PoliceActivityData;

export const DISTRICT_NAMES: Record<DistrictKey, string> = {
  EJLDPD: "East Jefferson Levee District PD",
  OLDPD: "Orleans Levee District PD",
};

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parts(month: string): { y: number; m: number } {
  const [y, m] = month.split("-").map(Number);
  return { y, m };
}

/** "Jul 2025" */
export function shortMonthLabel(month: string): string {
  const { y, m } = parts(month);
  return `${MONTH_SHORT[m - 1]} ${y}`;
}

/** Number of calendar days in a "YYYY-MM" month. */
export function daysInMonth(month: string): number {
  const { y, m } = parts(month);
  return new Date(y, m, 0).getDate();
}

/** Fiscal year a month belongs to (FY named for the calendar year it ends in). */
export function fiscalYearOf(month: string, startMonth = policeActivity.fiscalYearStartMonth): number {
  const { y, m } = parts(month);
  return m >= startMonth ? y + 1 : y;
}

export interface Period {
  key: string;
  /** Short label for the selector pill, e.g. "FY 2026". */
  label: string;
  /** Range for prose, e.g. "Jul 2025 – Jun 2026". */
  range: string;
  /** True when the period's months are all present (12 of 12). */
  complete: boolean;
  months: MonthRecord[];
}

/**
 * Selectable periods, newest first: one per fiscal year in the series (marked
 * "to date" when it is still filling in) plus a trailing-12-month window when
 * that window differs from the newest fiscal year.
 */
export function buildPeriods(data: PoliceActivityData = policeActivity): Period[] {
  const months = [...data.months].sort((a, b) => a.month.localeCompare(b.month));
  if (months.length === 0) return [];

  const byFy = new Map<number, MonthRecord[]>();
  for (const rec of months) {
    const fy = fiscalYearOf(rec.month, data.fiscalYearStartMonth);
    byFy.set(fy, [...(byFy.get(fy) ?? []), rec]);
  }

  const periods: Period[] = [...byFy.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([fy, recs]) => {
      const complete = recs.length === 12;
      const first = recs[0].month;
      const last = recs[recs.length - 1].month;
      return {
        key: `fy${fy}`,
        label: complete ? `FY ${fy}` : `FY ${fy} to date`,
        range: `${shortMonthLabel(first)} – ${shortMonthLabel(last)}`,
        complete,
        months: recs,
      };
    });

  const trailing = months.slice(-12);
  const newestFy = periods[0];
  const sameAsFy =
    newestFy.months.length === trailing.length &&
    newestFy.months.every((r, i) => r.month === trailing[i].month);
  if (!sameAsFy && trailing.length >= 2) {
    periods.splice(1, 0, {
      key: "trailing12",
      label: trailing.length === 12 ? "Last 12 months" : `Last ${trailing.length} months`,
      range: `${shortMonthLabel(trailing[0].month)} – ${shortMonthLabel(trailing[trailing.length - 1].month)}`,
      complete: trailing.length === 12,
      months: trailing,
    });
  }
  return periods;
}

/** Sum one activity type across a set of months (agency or one district). */
export function sumKey(months: MonthRecord[], key: ActivityKey, district?: DistrictKey): number {
  return months.reduce((acc, m) => acc + ((district ? m.districts[district] : m.agency)[key] ?? 0), 0);
}

/** Sum several activity types across a set of months. */
export function sumKeys(months: MonthRecord[], keys: ActivityKey[], district?: DistrictKey): number {
  return keys.reduce((acc, k) => acc + sumKey(months, k, district), 0);
}

/** Total of every tracked activity across a set of months. */
export function sumAll(months: MonthRecord[], district?: DistrictKey): number {
  const keys = policeActivity.fields.map((f) => f.key);
  return sumKeys(months, keys, district);
}

/** Calendar days covered by a set of months. */
export function daysCovered(months: MonthRecord[]): number {
  return months.reduce((acc, m) => acc + daysInMonth(m.month), 0);
}
