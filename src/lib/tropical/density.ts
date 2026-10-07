import type { DensityProduct, DensitySource } from "./types";
import { cdtDateTime, formatRun } from "./format";

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
  ecmwf: "Euro ensemble",
  aifs: "Euro AI ensemble",
  google: "Google DeepMind AI ensemble",
};

const DENSITY_ORDER: DensitySource[] = ["gefs", "ecmwf", "aifs", "google"];

/** Dropdown options in display order. Google is listed only once its layer
 * exists (it is off until Google agrees to the terms; Jeff, 2026-10-07); the
 * others stay listed, disabled when a storm has no image, so they never
 * silently vanish. */
export function densityOptions(cycles: Partial<Record<DensitySource, string>>): DensitySource[] {
  return DENSITY_ORDER.filter((source) => source !== "google" || Boolean(cycles.google));
}

export const DENSITY_DISCLAIMER =
  "Shows where the storm's center may go, not where wind, surge or rain will reach.";

/** ECMWF open data is CC BY 4.0: credit the source and say the image is
 * derived from it. */
export const ECMWF_CREDIT =
  "Euro tracks: European Centre for Medium-Range Weather Forecasts (ECMWF), www.ecmwf.int, CC BY 4.0. Track shares computed by FPA Lens.";

/** Google's Section 4(b) citation, verbatim (its spelling, not ours), split
 * so the terms URL can be a link. */
export const GOOGLE_CITATION_PARTS = {
  before:
    "Google Weather Lab. © 2024-6 Google LLC, whose machine learning models were used to create the experimental data made available under the following licence terms ",
  url: "https://storage.googleapis.com/weathernext-public/terms-of-use.pdf",
  after:
    ". This data is intended for experimental modelling only and is not intended, validated, or approved for real world use.",
};

export function densityCaption(source: DensitySource, p: DensityProduct): string {
  const miles = Math.round((p.radiusKm * 0.621371) / 5) * 5;
  return (
    `Share of ${DENSITY_SOURCE_LABEL[source]} tracks whose center passes within about ${miles} miles ` +
    `(${p.radiusKm} km), ${cdtDateTime(p.start)} through ${cdtDateTime(p.end)}. ` +
    `${p.members} of ${p.expected} members, ${formatRun(p.cycle)} run.`
  );
}
