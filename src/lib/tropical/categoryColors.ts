import { CATEGORY_THRESHOLDS_MPH } from "./config";

/**
 * The standard Saffir-Simpson ramp — the one NHC's own track maps and every
 * news graphic use. Shared so the storm banner's category chip and the
 * intensity chart's bands agree: a storm shown as CAT 3 amber up top lands in
 * the amber band on the chart.
 */
export const CATEGORY_COLORS = {
  TD: "#c8d6e0",
  TS: "#5ebaff",
  C1: "#ffffb2",
  C2: "#ffe775",
  C3: "#ffc140",
  C4: "#ff8f20",
  C5: "#ff6060",
} as const;

/** Band fill for a given intensity, for the chip and the chart alike. */
export function categoryColor(mph: number): string {
  if (mph >= CATEGORY_THRESHOLDS_MPH.C5) return CATEGORY_COLORS.C5;
  if (mph >= CATEGORY_THRESHOLDS_MPH.C4) return CATEGORY_COLORS.C4;
  if (mph >= CATEGORY_THRESHOLDS_MPH.C3) return CATEGORY_COLORS.C3;
  if (mph >= CATEGORY_THRESHOLDS_MPH.C2) return CATEGORY_COLORS.C2;
  if (mph >= CATEGORY_THRESHOLDS_MPH.C1) return CATEGORY_COLORS.C1;
  if (mph >= CATEGORY_THRESHOLDS_MPH.TS) return CATEGORY_COLORS.TS;
  return CATEGORY_COLORS.TD;
}
