import type { ExpressionSpecification } from "maplibre-gl";
import type { RainSummary } from "./types";

/** WPC-style rainfall colors, light green to deep red, one per amount (inches)
 * the map draws. WPC's own bands in between (1.25, 1.75, 2.5) take the color
 * of the band below. Bands under 0.1 in are not drawn (ingest/gulfwatch/rain.py). */
export const RAIN_BANDS: { from: number; color: string }[] = [
  { from: 0.1, color: "#b4e3a6" },
  { from: 0.25, color: "#7fc97f" },
  { from: 0.5, color: "#3a9e47" },
  { from: 0.75, color: "#1f7a34" },
  { from: 1, color: "#63b8e8" },
  { from: 1.5, color: "#2f80d1" },
  { from: 2, color: "#1a4fa3" },
  { from: 3, color: "#7b4fc4" },
  { from: 4, color: "#b03fbf" },
  { from: 5, color: "#e0479a" },
  { from: 7, color: "#e8603a" },
  { from: 10, color: "#b51f1f" },
];

export function rainColorExpression(): ExpressionSpecification {
  const [first, ...rest] = RAIN_BANDS;
  return ["step", ["get", "qpf"], first.color, ...rest.flatMap((b) => [b.from, b.color])] as ExpressionSpecification;
}

const inches = (v: number) => `${v.toFixed(1)} in`;

/** The New Orleans rain row: a middle estimate and a range, never one bare
 * number (on Oct 8 2026 WPC's single forecast was 0.6 in while its own middle
 * estimate was 2.5 in). */
export function rainRow(s: RainSummary): { middle: string; range: string; help: string } {
  const range = `${s.lowIn.toFixed(1)}–${inches(s.highIn)}`;
  const lowOdds = Math.round(100 / s.lowPct);
  const highOdds = Math.round(100 / (100 - s.highPct));
  return {
    middle: inches(s.midIn),
    range,
    help:
      "WPC rainfall forecast for New Orleans. Estimate: the middle of the forecast range, as likely to be more as less. " +
      `Range: a 1-in-${lowOdds} chance of less than ${inches(s.lowIn)} and a 1-in-${highOdds} chance of more than ${inches(s.highIn)}.`,
  };
}
