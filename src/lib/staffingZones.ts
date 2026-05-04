/**
 * Staffing zone helpers.
 *
 * Zone model (per Austin/Metoyer/Foster, Apr 1 2026):
 *   GREEN  — current headcount between (amberMax, full]
 *   AMBER  — current headcount in (redMax, amberMax]
 *   RED    — current headcount in [0, redMax]
 *
 * Boundary convention: amberMax and redMax are the TOP of their respective
 * zones, so the transition happens at headcount <= threshold.
 */

export type ZoneLevel = "GREEN" | "AMBER" | "RED";

export interface ZoneThresholds {
  amberMax: number;
  redMax: number;
}

export interface ZoneGroup {
  key: string;
  label: string;
  full: number;
  current: number | null;
  thresholds: ZoneThresholds;
  // When set, percent-mode bar segments and tick labels snap to these exact
  // policy percentages instead of being computed from the integer thresholds.
  policyThresholds?: { redPct: number; amberPct: number };
}

export function computeZoneLevel(
  current: number | null,
  thresholds: ZoneThresholds,
): ZoneLevel | null {
  if (current === null) return null;
  if (current <= thresholds.redMax) return "RED";
  if (current <= thresholds.amberMax) return "AMBER";
  return "GREEN";
}

export function zoneColor(level: ZoneLevel | null): {
  border: string;
  bg: string;
  text: string;
  marker: string;
} {
  if (level === "RED") {
    return {
      border: "border-red-500",
      bg: "bg-red-50",
      text: "text-red-600",
      marker: "bg-red-600",
    };
  }
  if (level === "AMBER") {
    return {
      border: "border-amber-500",
      bg: "bg-amber-50",
      text: "text-amber-600",
      marker: "bg-amber-600",
    };
  }
  if (level === "GREEN") {
    return {
      border: "border-green-500",
      bg: "bg-green-50",
      text: "text-green-600",
      marker: "bg-green-600",
    };
  }
  // level === null (no current data)
  return {
    border: "border-gray-300",
    bg: "bg-gray-50",
    text: "text-gray-500",
    marker: "bg-gray-400",
  };
}

export function zoneLabel(level: ZoneLevel | null): string {
  if (level === "RED") return "Red";
  if (level === "AMBER") return "Amber";
  if (level === "GREEN") return "Green";
  return "Awaiting data";
}

/**
 * Position of a headcount value along the zone bar, expressed as a percentage
 * of `full`. Clamped to [0, 100].
 */
export function positionPercent(value: number, full: number): number {
  if (full <= 0) return 0;
  return Math.min(100, Math.max(0, (value / full) * 100));
}

/**
 * Dev-only consistency check: warn if the aggregate thresholds diverge from
 * the sum of per-department thresholds. Darren's team defined them both ways,
 * and they match today (151+34+17=202, 136+26+13=175, 71+16+8=95). If they
 * ever drift, we want to notice.
 */
export function assertAggregateMatchesSum(
  aggregate: ZoneGroup,
  departments: ZoneGroup[],
): void {
  if (process.env.NODE_ENV === "production") return;
  const sumFull = departments.reduce((s, d) => s + d.full, 0);
  const sumAmber = departments.reduce((s, d) => s + d.thresholds.amberMax, 0);
  const sumRed = departments.reduce((s, d) => s + d.thresholds.redMax, 0);
  const mismatches: string[] = [];
  if (sumFull !== aggregate.full) {
    mismatches.push(`full: aggregate=${aggregate.full} vs sum=${sumFull}`);
  }
  if (sumAmber !== aggregate.thresholds.amberMax) {
    mismatches.push(
      `amberMax: aggregate=${aggregate.thresholds.amberMax} vs sum=${sumAmber}`,
    );
  }
  if (sumRed !== aggregate.thresholds.redMax) {
    mismatches.push(
      `redMax: aggregate=${aggregate.thresholds.redMax} vs sum=${sumRed}`,
    );
  }
  if (mismatches.length > 0) {
    console.warn(
      `[staffingZones] aggregate thresholds diverge from sum of departments: ${mismatches.join(", ")}`,
    );
  }
}
