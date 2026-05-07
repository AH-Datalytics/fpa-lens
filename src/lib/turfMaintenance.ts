/**
 * Per-zone monthly progress helpers for the Turf Maintenance page.
 *
 * The page reports against a "reporting month" (e.g. April 2026). Each zone
 * has a monthly target in acres (zone acres × cycles per month). Progress is
 * the sum of reach acreage weighted by reach-level cumulative cycle %
 * complete from the maintenance team's weekly workbook.
 *
 * KPI is pace-adjusted: when the month is in flight, expected progress is
 * scaled by elapsed-fraction-of-month so a zone reads on-pace if it's
 * keeping up with the calendar, not red on day 5 and green on day 30.
 */
import type {
  OldGrassCuttingZone,
  OtherDistrictZone,
  Reach,
  ReportingMonth,
} from "@/data/grassCutting";

export type AnyZone = OldGrassCuttingZone | OtherDistrictZone;
export type KpiLevel = "green" | "amber" | "red";

export function monthlyTargetAcres(zone: AnyZone): number {
  return Math.round(zone.acres * zone.monthlyFrequency);
}

export function reachContribution(reach: Reach): number {
  return reach.acres * (reach.cycle1Pct + (reach.cycle2Pct ?? 0));
}

export function monthAcresDone(zone: AnyZone): number {
  return Math.round(zone.reaches.reduce((s, r) => s + reachContribution(r), 0));
}

/**
 * Position 0..1 of the Cycle 1 milestone on the monthly progress bar.
 * For 1×/mo zones returns null (no intermediate tick — the full bar is the cycle).
 */
export function cycle1TickPosition(zone: AnyZone): number | null {
  if (zone.monthlyFrequency <= 1) return null;
  return 1 / zone.monthlyFrequency;
}

/**
 * Today's elapsed fraction of the reporting month (0..1). Used to scale
 * the expected target when the month is still in flight.
 */
function elapsedFraction(month: ReportingMonth, today: Date): number {
  const monthStart = new Date(month.year, month.month - 1, 1);
  const monthEnd = new Date(month.year, month.month, 0); // last day of month
  const totalDays = monthEnd.getDate();
  if (today < monthStart) return 0;
  if (today > monthEnd) return 1;
  const elapsedDays = today.getDate();
  return Math.min(1, elapsedDays / totalDays);
}

export interface MonthlyKpi {
  done: number;
  target: number;
  /** Raw fraction of monthly target completed (0..1+). */
  progressFraction: number;
  /** Pace-adjusted fraction (done / expected-by-today). null when month complete. */
  paceFraction: number | null;
  level: KpiLevel;
  badgeLabel: string;
}

export function computeMonthlyKpi(
  zone: AnyZone,
  reportingMonth: ReportingMonth,
  today: Date = new Date(),
): MonthlyKpi {
  const target = monthlyTargetAcres(zone);
  const done = monthAcresDone(zone);
  const progressFraction = target > 0 ? done / target : 0;

  // When the month is complete, compare to full target. When in flight,
  // compare to where we should be by today's date.
  let paceFraction: number | null;
  let assessFraction: number;
  if (reportingMonth.isComplete) {
    paceFraction = null;
    assessFraction = progressFraction;
  } else {
    const elapsed = elapsedFraction(reportingMonth, today);
    const expected = elapsed > 0 ? elapsed : 1;
    paceFraction = progressFraction / expected;
    assessFraction = paceFraction;
  }

  let level: KpiLevel;
  let badgeLabel: string;
  if (assessFraction >= 0.9) {
    level = "green";
    badgeLabel = "On pace";
  } else if (assessFraction >= 0.8) {
    level = "amber";
    badgeLabel = "At risk";
  } else {
    level = "red";
    badgeLabel = "Behind";
  }

  return { done, target, progressFraction, paceFraction, level, badgeLabel };
}
