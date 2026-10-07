import type { DensityProduct, DensitySource } from "./types";
import { cdtDateTime, formatCycle } from "./format";

/** Keep in step with BAND_EDGES / BAND_COLORS in ingest/gulfwatch/density.py. */
export const DENSITY_BANDS: { from: number; color: string }[] = [
  { from: 5, color: "#a9dcf2" },
  { from: 10, color: "#5db5e8" },
  { from: 20, color: "#2f7fd6" },
  { from: 30, color: "#3fae49" },
  { from: 40, color: "#9fd13f" },
  { from: 50, color: "#f3e23a" },
  { from: 60, color: "#f6b22d" },
  { from: 70, color: "#f17a24" },
  { from: 80, color: "#e2432a" },
  { from: 90, color: "#b5172b" },
];

export const DENSITY_SOURCE_LABEL: Record<DensitySource, string> = {
  gefs: "GFS ensemble",
  google: "Google DeepMind AI ensemble",
};

export const DENSITY_DISCLAIMER =
  "Shows where the storm's center may go, not where wind, surge or rain will reach.";

/** Google's Section 4(b) citation, verbatim (its spelling, not ours), split
 * so the terms URL can be a link. */
export const GOOGLE_CITATION_PARTS = {
  before:
    "Google Weather Lab. © 2024-6 Google LLC, whose machine learning models were used to create the experimental data made available under the following licence terms ",
  url: "https://storage.googleapis.com/weathernext-public/terms-of-use.pdf",
  after:
    ". This data is intended for experimental modelling only and is not intended, validated, or approved for real world use.",
};

function cycleLabel(cycle: string): string {
  const date = new Date(Date.UTC(+cycle.slice(0, 4), +cycle.slice(4, 6) - 1, +cycle.slice(6, 8)));
  const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
  return `${formatCycle(cycle)} ${day}`;
}

export function densityCaption(source: DensitySource, p: DensityProduct): string {
  const miles = Math.round((p.radiusKm * 0.621371) / 5) * 5;
  return (
    `Share of ${DENSITY_SOURCE_LABEL[source]} tracks whose center passes within about ${miles} miles ` +
    `(${p.radiusKm} km), ${cdtDateTime(p.start)} through ${cdtDateTime(p.end)}. ` +
    `${p.members} of ${p.expected} members, ${cycleLabel(p.cycle)} run.`
  );
}
