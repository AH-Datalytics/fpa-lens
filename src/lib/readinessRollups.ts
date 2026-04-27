/**
 * Compute roll-up statuses for the Infrastructure Readiness card on the
 * home page. The same per-inspection statuses are used on the deeper
 * `/our-system` page (where they're computed inline). This module gives
 * the home page a consolidated summary.
 *
 * Status grading mirrors `/our-system`: actual progress is compared to
 * straight-line expected progress for the report date, and the resulting
 * ratio is bucketed as GREEN >= 90, AMBER >= 80, RED < 80.
 */

import { readinessMetrics } from "@/data/siteData";
import { grassCuttingData } from "@/data/grassCutting";

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
  complete: number;
  total: number;
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

  // River Gates: in-season Jun to Dec. Out of season: GREEN if prior cycle
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

  // Valve exercises: ongoing quarterly. Currently graded against raw percent
  // since there's no period in data; treat as on-pace until that gets the
  // same time-relative refit as CPRA/USACE.
  const ve = readinessMetrics.valveExercises;
  inspections.push({
    key: "valve-exercises",
    label: "Quarterly Valve Exercises",
    status: statusFromRatio(ve.percentComplete),
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

  // Grass cutting rollup
  const gcZones = grassCuttingData.zones;
  const gcComplete = gcZones.filter(
    (z) => z.currentCycle.status === "COMPLETE",
  ).length;
  const gcTotal = gcZones.length;
  const gcExpectedPct =
    grassCuttingData.currentCycle.workingDaysExpected > 0
      ? (grassCuttingData.currentCycle.workingDayElapsed /
          grassCuttingData.currentCycle.workingDaysExpected) *
        100
      : 0;
  const gcActualPct = gcTotal > 0 ? (gcComplete / gcTotal) * 100 : 0;
  const gcStatus: StatusColor =
    gcExpectedPct > 0
      ? statusFromRatio((gcActualPct / gcExpectedPct) * 100)
      : "NEUTRAL";

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
      status: gcStatus,
    },
  };
}
