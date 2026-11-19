/**
 * Overlay Engineering's weekly river gate inspection log
 * (public/data/gate-inspections.json, from scripts/extractGateInspections.py)
 * onto readinessMetrics.riverGateInspections.
 *
 * The log only applies to the cycle the card is configured for: a total for
 * a different Oct-Dec cycle (e.g. next year's file before siteData rolls) is
 * ignored rather than graded against the wrong window. With no reported week,
 * the curated baseline stands and the card keeps its "Underway" state.
 *
 * Sets `dataAsOf` to the latest reported week, so the card and the home
 * rollup grade river gates on the log's own date instead of the monthly
 * SITREP date (which lags the weekly log by up to a month).
 */

export interface GateInspectionsJson {
  latestWeekEnding?: string | null;
  riverGates?: {
    periodStart: string;
    periodEnd: string;
    completed: number;
    weeksReported: number;
  } | null;
}

export interface RiverGateMetrics {
  total: number;
  completed: number;
  percentComplete: number;
  periodStart: string;
  periodEnd: string;
  source: string;
  dataAsOf?: string;
}

function weekLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function applyGateInspections<T extends RiverGateMetrics>(rg: T, json: GateInspectionsJson | null | undefined): T {
  const log = json?.riverGates;
  const asOf = json?.latestWeekEnding;
  if (!log || !asOf) return rg;
  if (log.periodStart !== rg.periodStart || log.periodEnd !== rg.periodEnd) return rg;
  if (typeof log.completed !== "number" || log.completed < 0) return rg;

  const completed = Math.min(log.completed, rg.total);
  rg.completed = completed;
  rg.percentComplete = rg.total > 0 ? Math.round((completed / rg.total) * 100) : 0;
  rg.dataAsOf = asOf;
  rg.source = `Weekly river gate inspection log (week ending ${weekLabel(asOf)})`;
  return rg;
}
