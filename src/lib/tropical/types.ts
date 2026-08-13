// Mirrors the manifest contract exactly. See .superpowers/sdd/shared-contracts.md.

export type Mode = "quiet" | "active";

export interface StormEntry {
  id: string;
  name: string;
  classification: string;
  intensityMph: number;
  pressureMb: number;
  movementDir: string;
  movementMph: number;
  lat: number;
  lon: number;
  advisoryNum: string;
  advisoryTime: string;
  nextAdvisoryTime: string;
  inGulfBox: boolean;
  modelCycle: string;
  /** The forecast cycle the wind-probability field actually came from, read
   * from the product's own shapefile names by the ingest.
   *
   * Every other storm layer is fetched from an advisory-numbered url and so
   * matches the cone by construction. This one is not: it is a basin-wide,
   * cycle-stamped product, and NHC posts a cycle roughly 20 minutes AFTER the
   * advisory it belongs to. So the map can legitimately hold a fresh cone
   * beside the previous cycle's probabilities, and says which cycle it has
   * rather than implying they match. Absent when unknown. */
  windprobCycle?: string;
  /** How many 6-hourly cycles `windprobCycle` lags the current advisory.
   * Omitted when paired (the normal case) or unknown; positive means the
   * probabilities predate the advisory, negative means they are newer. */
  windprobCyclesBehind?: number;
  files: Record<"cone" | "track" | "text" | "probs", string> & {
    /** Model guidance, from the a-deck. Absent for a freshly-formed storm with
     * no a-deck yet, or when that fetch failed -- the key is omitted rather
     * than pointing at a blob that was never written. */
    models?: string;
    intensity?: string;
    /** Coastal watch/warning lines. NHC publishes a storm's WW product only
     * while watches or warnings are actually in effect, so a storm with none
     * omits the key rather than pointing at a blob that was never written. */
    wwlines?: string;
    /** Observed/pre-advisory storm path, when available. Kept separate from
     * the forecast track so the map can distinguish history from guidance. */
    history?: string;
    /** Real NHC GIS wind-speed-probability shapefile (34kt/TS-force
     *  threshold) converted to GeoJSON — 11 graduated probability-percentage
     *  polygons ("<5%".."90%"), used by the map's shaded Wind probability
     *  layer. Optional/new: only the Ida historical sample carries this
     *  today (see ingest/scripts/build_ida_sample.py); bertha/live entries
     *  simply omit the key, and the map layer disables gracefully. */
    windprob?: string;
    /** 50kt (~58 mph) and 64kt (~74 mph) WSP probability polygons. */
    windprob50?: string;
    windprob64?: string;
    /** NHC current/initial analyzed 34, 50, and 64 kt wind radii. */
    windfield?: string;
  };
  /** Archived weather-satellite image for the advisory period. This is
   * intentionally a pop-out image, not a georeferenced map layer. */
  satellite?: {
    image: string;
    issued: string;
    sourceLabel: string;
    sourceUrl: string;
    bounds: [[number, number], [number, number]];
  };
  /** Archived NEXRAD mosaic cropped to the Gulf for historical replay. */
  radar?: {
    image: string;
    issued: string;
    sourceLabel: string;
    sourceUrl: string;
    bounds: [[number, number], [number, number]];
  };
  /** Optional historical snapshots for in-place advisory replay. Live
   * manifests omit this and continue using the top-level storm fields. */
  advisories?: StormEntry[];
}

export interface Manifest {
  generated: string;
  mode: Mode;
  storms: StormEntry[];
  outlook: { geojson: string; text: string; issued: string };
  errors: { product: string; message: string }[];
}

export interface IntensityPoint {
  tauH: number;
  mph: number;
}

export interface IntensitySeriesEntry {
  model: string;
  label: string;
  kind: "official" | "physics" | "ai" | "consensus";
  points: IntensityPoint[];
}

export interface IntensitySeries {
  cycle: string;
  series: IntensitySeriesEntry[];
}

/** One row of storms/{id}/probs.json — 120h (full-period) cumulative wind
 *  speed probabilities for a named Gulf Watch point, parsed from the NHC PWS
 *  text product. */
export interface ProbsEntry {
  point: string;
  ts34: number;
  kt50: number;
  hurricane64: number;
}

/** One product in storms/{id}/text.json — a plain-text NHC product, lightly
 *  cleaned (WMO/AWIPS header stripped, body kept). */
export interface TextProduct {
  issued: string;
  text: string;
}

export interface StormTextProducts {
  discussion: TextProduct;
  publicAdvisory: TextProduct;
}
