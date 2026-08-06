// Unified map-layers control state (v2 addendum Round 2) — lifted to
// page.tsx per the task brief ("Layer states lift to page.tsx") and passed
// down to StormMap/LayersControl. Pure, framework-free so it's unit
// testable without rendering anything.

export type LayerKey = "cone" | "history" | "satellite" | "models" | "windField" | "windProb" | "rain" | "radar";
export type WindThreshold = 39 | 58 | 74;

export interface LayerState {
  /** Forecast cone (track uncertainty polygon). */
  cone: boolean;
  /** Observed path before the current advisory/forecast begins. */
  history: boolean;
  /** Time-matched, georeferenced weather-satellite image when available. */
  satellite: boolean;
  /** Model spaghetti — the master on/off switch; ModelLegend's per-model
   *  checkboxes still control WHICH models show once this is on. */
  models: boolean;
  /** NHC-analyzed wind radii at the advisory time (34/50/64 kt). */
  windField: boolean;
  /** Shaded wind-speed-probability field (34kt/TS-force threshold), when
   *  the selected storm carries the real NHC WSP shapefile — see
   *  types.ts's StormEntry.files.windprob. Redesigned mid-build from an
   *  earlier point-marker "pill" per direct user feedback ("I don't like
   *  either pill of the wind chances, not needed... can the wind
   *  probability selector match [NHC's own shaded graphics]?"). */
  windProb: boolean;
  /** Rainfall/QPF — always unavailable today (no ingested QPF product
   *  exists yet for any storm, live or historical; see
   *  ingest/scripts/build_ida_sample.py's module docstring). Kept in the
   *  layer-state shape/UI now so the control surface is ready for it. */
  rain: boolean;
  /** NEXRAD radar overlay (was a standalone floating button before Round 2;
   *  now one row in the unified Layers control). */
  radar: boolean;
}

// There was also a `graphs` layer toggling the intensity chart from the map
// options panel. It was removed (Aug 2026): a "map option" that revealed a
// panel *below* the map read as neither, and reviewers could not tell what
// the button had done. The chart is now simply always present in active mode.

export const DEFAULT_LAYER_STATE: LayerState = {
  cone: true,
  history: true,
  satellite: false,
  models: true,
  windField: false,
  windProb: true,
  rain: false,
  radar: false,
};

/** Historical demos open with a quiet, readable forecast view. Technical
 * guidance remains available in Layers, but the cone is the only optional
 * overlay enabled on first load. */
export const DEMO_LAYER_STATE: LayerState = {
  cone: true,
  history: true,
  satellite: false,
  models: false,
  windField: false,
  windProb: false,
  rain: false,
  radar: false,
};

/** Pure toggle: flips one layer's boolean, returning a new LayerState
 *  (never mutates `state`). */
export function toggleLayer(state: LayerState, key: LayerKey): LayerState {
  return { ...state, [key]: !state[key] };
}
