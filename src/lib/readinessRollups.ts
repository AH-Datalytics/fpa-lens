/**
 * Compute roll-up statuses for the Infrastructure Readiness card on the
 * home page. The same per-inspection statuses are used on the deeper
 * `/infrastructure` page (where they're computed inline). This module gives
 * the home page a consolidated summary.
 *
 * Status grading mirrors `/infrastructure`: actual progress is compared to
 * straight-line expected progress for the report date, and the resulting
 * ratio is bucketed as GREEN >= 90, AMBER >= 80, RED < 80.
 */

import { readinessMetrics } from "@/data/siteData";
import { grassCuttingData } from "@/data/grassCutting";
import { computeSystemTurfRollup, type AnyZone } from "@/lib/turfMaintenance";

export type StatusColor = "GREEN" | "AMBER" | "RED" | "NEUTRAL";

function expectedFromRate(
  monthlyRate: number,
  periodStart: Date,
  asOf: Date,
  target?: number,
): number {
  const ms =
    (asOf.getTime() - periodStart.getTime()) /
    (1000 * 60 * 60 * 24 * 30.4375);
  const exp = Math.max(0, monthlyRate * ms);
  return target !== undefined ? Math.min(exp, target) : exp;
}

function statusFromRatio(ratio: number): StatusColor {
  if (ratio >= 90) return "GREEN";
  if (ratio >= 80) return "AMBER";
  return "RED";
}

interface InspectionStatus {
  key: string;
  label: string;
  status: StatusColor;
  active: boolean;
}

interface InspectionsRollup {
  active: InspectionStatus[];
  total: number;
  greenCount: number;
  worstStatus: StatusColor;
}

interface GrassCuttingRollup {
  /** Zones on pace this month. */
  complete: number;
  /** Zones that have reported this month (the denominator). */
  total: number;
  /** Zones with no weekly entry yet, excluded from the ratio. */
  awaiting: number;
  status: StatusColor;
}

export interface ReadinessRollups {
  inspections: InspectionsRollup;
  grassCutting: GrassCuttingRollup;
}

export function computeReadinessRollups(asOfDate?: string): ReadinessRollups {
  const asOf = new Date(
    (asOfDate ?? readinessMetrics.dataAsOf) + "T00:00:00",
  );

  const inspections: InspectionStatus[] = [];

  // Hurricane Gates: in-season Jan to May
  const hg = readinessMetrics.hurricaneGateInspections;
  const hgStart = new Date(hg.periodStart + "T00:00:00");
  const hgEnd = new Date(hg.periodEnd + "T00:00:00");
  const hgInSeason = asOf >= hgStart && asOf <= hgEnd;
  const hgExpected = expectedFromRate(hg.monthlyRate, hgStart, asOf, hg.total);
  const hgRatio = hgExpected > 0 ? (hg.completed / hgExpected) * 100 : 100;
  inspections.push({
    key: "hurricane-gates",
    label: "Hurricane Floodgate Inspections",
    status: hgInSeason ? statusFromRatio(hgRatio) : "NEUTRAL",
    active: hgInSeason,
  });

  // River Gates: in-season Oct to Dec. Out of season: GREEN if prior cycle
  // was completed (so the rollup still counts this as a healthy signal).
  const rg = readinessMetrics.riverGateInspections;
  const rgStart = new Date(rg.periodStart + "T00:00:00");
  const rgEnd = new Date(rg.periodEnd + "T00:00:00");
  const rgInSeason = asOf >= rgStart && asOf <= rgEnd;
  const rgPriorCycleComplete = !rgInSeason && rg.lastCycleCompleted === true;
  const rgExpected = expectedFromRate(rg.monthlyRate, rgStart, asOf, rg.total);
  const rgRatio = rgExpected > 0 ? (rg.completed / rgExpected) * 100 : 100;
  const rgStatus: StatusColor = rgInSeason
    ? statusFromRatio(rgRatio)
    : rgPriorCycleComplete
      ? "GREEN"
      : "NEUTRAL";
  inspections.push({
    key: "river-gates",
    label: "River Floodgate Inspections",
    status: rgStatus,
    active: rgInSeason || rgPriorCycleComplete,
  });

  // Valve exercises: ongoing quarterly, graded time-relative like CPRA/USACE
  // (percent vs straight-line expected for the report date).
  const ve = readinessMetrics.valveExercises;
  const veExpected = expectedFromRate(
    ve.monthlyRate,
    new Date(ve.periodStart + "T00:00:00"),
    asOf,
    100,
  );
  const veRatio = veExpected > 0 ? (ve.percentComplete / veExpected) * 100 : 100;
  inspections.push({
    key: "valve-exercises",
    label: "Quarterly Valve Exercises",
    status: statusFromRatio(veRatio),
    active: true,
  });

  // CPRA Quarterly Inspection
  const cpra = readinessMetrics.cpraQuarterlyInspection;
  const cpraExpected = expectedFromRate(
    cpra.monthlyRate,
    new Date(cpra.periodStart + "T00:00:00"),
    asOf,
    100,
  );
  const cpraRatio =
    cpraExpected > 0 ? (cpra.currentQuarterPercent / cpraExpected) * 100 : 100;
  inspections.push({
    key: "cpra-quarterly",
    label: "CPRA Quarterly Inspection",
    status: statusFromRatio(cpraRatio),
    active: true,
  });

  // USACE Semi-Annual Inspection
  const usace = readinessMetrics.usaceSemiAnnualInspection;
  const usaceExpected = expectedFromRate(
    usace.monthlyRate,
    new Date(usace.periodStart + "T00:00:00"),
    asOf,
    100,
  );
  const usaceRatio =
    usaceExpected > 0
      ? (usace.currentHalfPercent / usaceExpected) * 100
      : 100;
  inspections.push({
    key: "usace-semi-annual",
    label: "USACE Semi-Annual Inspection",
    status: statusFromRatio(usaceRatio),
    active: true,
  });

  const active = inspections.filter((i) => i.active);
  const greenCount = active.filter((i) => i.status === "GREEN").length;
  const worstStatus: StatusColor = active.some((i) => i.status === "RED")
    ? "RED"
    : active.some((i) => i.status === "AMBER")
      ? "AMBER"
      : "GREEN";

  // Turf maintenance rollup, shared with the infrastructure card and the turf
  // page via computeSystemTurfRollup: on-pace zones over zones that have
  // reported this month; zones awaiting their weekly update are excluded
  // rather than read as Behind. Null level (nothing reported yet) -> NEUTRAL.
  const gcZonesAll: AnyZone[] = [
    ...grassCuttingData.zones,
    ...grassCuttingData.ejldZones,
    ...grassCuttingData.lbbldZones,
  ];
  const gc = computeSystemTurfRollup(gcZonesAll, grassCuttingData.reportingMonth);
  const gcComplete = gc.onPace;
  const gcTotal = gc.reporting;
  const gcStatus: StatusColor = gc.level === null ? "NEUTRAL" : statusFromRatio(gc.ratio);

  return {
    inspections: {
      active,
      total: active.length,
      greenCount,
      worstStatus: active.length === 0 ? "NEUTRAL" : worstStatus,
    },
    grassCutting: {
      complete: gcComplete,
      total: gcTotal,
      awaiting: gc.awaiting,
      status: gcStatus,
    },
  };
}
