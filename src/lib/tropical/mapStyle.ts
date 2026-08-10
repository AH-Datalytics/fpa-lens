// Self-contained MapLibre cartography for the tropical weather map. The
// basemap is real satellite imagery (Esri World Imagery raster tiles + an Esri
// reference-label overlay). Colors come from MAP_COLORS below, except the
// watch/warning line colors, which are four fixed NHC-adjacent hex values.

import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";

/** New Orleans marker location (fixed point of reference on both maps). */
export const NOLA_LNGLAT: [number, number] = [-90.07, 29.95];

/** Initial Gulf view: east Texas sits near the western edge while the
 * central Gulf and the Cuba-to-Louisiana corridor remain the visual focus. */
export const INITIAL_BOUNDS: [[number, number], [number, number]] = [
  [-95.5, 19],
  [-80, 32],
];

// Esri World Imagery (satellite/terrain) + reference labels overlay, per the
// v2 addendum. Attribution is rendered manually (StormMap.tsx's
// .map-attribution overlay) since the map itself has attributionControl:
// false.
export const ESRI_IMAGERY_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const ESRI_LABELS_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
export const ESRI_ATTRIBUTION = "Esri, Maxar, Earthstar Geographics";

// ---------------------------------------------------------------------------
// Design tokens (single light theme)
// ---------------------------------------------------------------------------

export interface ModeColors {
  accent: string;
  accent2: string;
  warnHw: string;
  warnSsw: string;
  warnTsw: string;
  outlookLow: string;
  outlookHigh: string;
}

/**
 * Cartography palette, tuned to the FPA Lens design system: `accent` is the
 * site navy (#21355a) used for the official forecast track and the New
 * Orleans reference point, `accent2` the warm contrast used for landfall
 * markers.
 *
 * In the standalone Gulf Watch these values were read off `<html>` with
 * getComputedStyle so a quiet/active theme swap could repaint the map. That
 * swap no longer exists (both modes resolved to the same tokens), and reading
 * :root here would have meant leaking nine generically-named custom properties
 * (--grid, --accent, ...) into FPA Lens's global stylesheet for one route. A
 * plain constant does the same job with no global surface.
 */
const MAP_COLORS: ModeColors = {
  accent: "#21355a",
  accent2: "#c2703d",
  warnHw: "#c0392b",
  warnSsw: "#8e44ad",
  warnTsw: "#2f6fae",
  outlookLow: "#d97b29",
  outlookHigh: "#b3402e",
};

/** The map cartography palette. */
export function readModeColors(): ModeColors {
  return MAP_COLORS;
}

// ---------------------------------------------------------------------------
// Watch/warning line colors — fixed per the task brief, independent of mode.
// ---------------------------------------------------------------------------

export const WW_COLORS = {
  hurricaneWarning: "#d94141",
  hurricaneWatch: "#e8a1a1",
  tsWarning: "#4a7fd4",
  tsWatch: "#9dbdf0",
  surge: "#b04fd6",
} as const;

export type WWKind = keyof typeof WW_COLORS;

export const WW_LEGEND_ITEMS: ReadonlyArray<{ kind: WWKind; label: string }> = [
  { kind: "hurricaneWarning", label: "Hurricane warning" },
  { kind: "hurricaneWatch", label: "Hurricane watch" },
  { kind: "tsWarning", label: "Tropical storm warning" },
  { kind: "tsWatch", label: "Tropical storm watch" },
  { kind: "surge", label: "Storm surge watch/warning" },
];

/**
 * Classifies a wwlines feature's TCWW code into a line color.
 *
 * Real NHC wwlin data uses 3-letter codes (confirmed against a live fetch of
 * storms/al022026/wwlines.geojson and ingest/tests/test_shp.py): HWR/HWA =
 * Hurricane Warning/Watch, TWR/TWA = Tropical Storm Warning/Watch. The demo
 * fixture (web/public/demo/wwlines.geojson) instead uses short codes "HU",
 * "SS", "TR" with no explicit watch/warning letter. Both are handled by the
 * same starts-with/ends-with heuristic: codes starting "S" are storm surge;
 * "H..." is hurricane-tier; anything else is treated as tropical-storm-tier;
 * a code ending "A" (...Watch) gets the paler shade, everything else
 * (ending "R"/"U"/other) is treated as the warning-tier color.
 */
export function wwKind(tcww: string | undefined | null): WWKind {
  const code = (tcww ?? "").toUpperCase();
  if (code.startsWith("S")) return "surge";
  const isWatch = code.endsWith("A");
  if (code.startsWith("H")) return isWatch ? "hurricaneWatch" : "hurricaneWarning";
  return isWatch ? "tsWatch" : "tsWarning";
}

export function wwColor(tcww: string | undefined | null): string {
  return WW_COLORS[wwKind(tcww)];
}

/**
 * Outlook genesis-area fill color from NHC gtwo RISK7DAY, mode-aware (matches
 * the quiet mockup's orange/red hatch exactly). Uses the dedicated
 * --outlook-low/--outlook-high tokens, NOT --warn-ssw/--warn-hw: those are
 * watch/warning severity colors (Alerts.tsx), a different semantic axis that
 * happens to share quiet-mode hex values but diverges in active mode
 * (--warn-ssw is storm-surge purple there) — reusing them previously made a
 * low-risk genesis area render in storm-surge purple. "low" -> outlookLow;
 * "medium" and "high" both -> outlookHigh (the mockup renders its 60%/medium
 * area in the same red as its notional "high").
 */
export function outlookColor(risk7day: string | undefined | null, colors: ModeColors): string {
  return (risk7day ?? "").toLowerCase() === "low" ? colors.outlookLow : colors.outlookHigh;
}

/** Injects a `_color` property into each feature via `colorFor`, for data-driven paint (`["get","_color"]`). */
export function withColor<T extends GeoJSON.FeatureCollection>(
  fc: T | undefined | null,
  colorFor: (props: GeoJSON.GeoJsonProperties) => string
): GeoJSON.FeatureCollection {
  if (!fc) return { type: "FeatureCollection", features: [] };
  return {
    type: "FeatureCollection",
    features: fc.features.map((f) => ({
      ...f,
      properties: { ...f.properties, _color: colorFor(f.properties) },
    })),
  };
}

/**
 * Strips `kind === "official"` features from a models FeatureCollection
 * before it's drawn as spaghetti. The official NHC track already has its own
 * always-on white 2.2px line + circle points, drawn from track.geojson (see
 * LAYER_IDS.trackLine/trackPoints) — plotting OFCL a second time as
 * toggleable spaghetti would duplicate that line and, worse, make the
 * official track vanish entirely if a user happened to uncheck OFCL. OFCL is
 * therefore not toggleable at all: it's removed from the spaghetti data here,
 * before visibleModels filtering ever runs.
 */
export function excludeOfficialModel(
  fc: GeoJSON.FeatureCollection | undefined | null
): GeoJSON.FeatureCollection {
  if (!fc) return { type: "FeatureCollection", features: [] };
  return {
    type: "FeatureCollection",
    features: fc.features.filter((f) => f.properties?.kind !== "official"),
  };
}

/** The four legend/layer-control groups a model track can belong to. */
export type ModelGroup = "official" | "deterministic" | "consensus" | "ensemble";

/**
 * Resolves a models.geojson feature's legend/layer-control group.
 *
 * Round 2 (v2 addendum) added an explicit `group` property to
 * models.geojson features (see ingest/gulfwatch/adeck.py) so the frontend
 * doesn't have to re-derive deterministic/consensus/ensemble from `kind`
 * alone. Older committed fixtures (bertha, the live production blob store
 * until its next ingest redeploy) predate that property, so this function
 * falls back to a kind-based default when `group` is absent — the
 * "backward compatible" contract the addendum requires: kind "official" ->
 * group "official", kind "consensus" -> group "consensus", anything else
 * (kind "physics" or "ai") -> group "deterministic". A real "ensemble"
 * group value only ever comes from the explicit property (no old fixture
 * has ever carried ensemble-member features), never from this fallback.
 */
export function resolveGroup(props: GeoJSON.GeoJsonProperties): ModelGroup {
  const explicit = props?.group;
  if (explicit === "official" || explicit === "deterministic" || explicit === "consensus" || explicit === "ensemble") {
    return explicit;
  }
  const kind = props?.kind;
  if (kind === "official") return "official";
  if (kind === "consensus") return "consensus";
  return "deterministic";
}

/**
 * One row per unique model code present in `models` (models.geojson),
 * excluding group==="official" (OFCL is always drawn as the solid white
 * official track, never a toggleable legend row — see excludeOfficialModel).
 * Used to build the ModelLegend's deterministic/consensus checkbox rows AND
 * to count the ensemble group's member codes — entirely data-driven so the
 * legend adapts to whatever models a given storm/demo actually carries
 * (the historical Ida sample's model set is completely different from a
 * live storm's) rather than a fixed hardcoded whitelist.
 */
export interface ModelRow {
  code: string;
  label: string;
  kind: string;
  group: ModelGroup;
}

export function modelRows(models: GeoJSON.FeatureCollection | null | undefined): ModelRow[] {
  if (!models) return [];
  const seen = new Map<string, ModelRow>();
  for (const f of models.features) {
    const code = String(f.properties?.model ?? "");
    if (!code || seen.has(code)) continue;
    const group = resolveGroup(f.properties);
    if (group === "official") continue;
    seen.set(code, {
      code,
      label: String(f.properties?.label ?? code),
      kind: String(f.properties?.kind ?? ""),
      group,
    });
  }
  return Array.from(seen.values());
}

/** Every non-official model code present in `models` — the natural "all
 *  models on" default for a freshly loaded storm/demo (see page.tsx). */
export function allModelCodes(models: GeoJSON.FeatureCollection | null | undefined): string[] {
  return modelRows(models).map((r) => r.code);
}

/**
 * True iff `models` (models.geojson) actually carries at least one
 * kind==="ai" feature. N9 (final review): ModelLegend.tsx's "AI Guidance"
 * group must only render when there's real AI-model data to toggle — the
 * demo Solene fixture carries AIFS features, but the real live feed and the
 * ?demo=bertha archive replay never do (AIFS is stubbed to always return
 * [], see ingest/gulfwatch/aifs.py), so showing an always-empty group there
 * would be misleading UI.
 */
export function hasAiGuidance(models: GeoJSON.FeatureCollection | null | undefined): boolean {
  if (!models) return false;
  return models.features.some((f) => f.properties?.kind === "ai");
}

/**
 * Merges a list of possibly-undefined FeatureCollections (e.g. one cone per
 * non-selected storm, B2 final review) into a single FeatureCollection for
 * one shared MapLibre source — every other storm's cone renders with the
 * same styling as the selected storm's, so one source/layer pair is enough.
 */
export function mergeFeatureCollections(
  fcs: (GeoJSON.FeatureCollection | undefined | null)[]
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: fcs.flatMap((fc) => fc?.features ?? []),
  };
}

// ---------------------------------------------------------------------------
// Track point labels — real NHC track.geojson pts fields vs. demo fixture
// ---------------------------------------------------------------------------

const CATEGORY_MPH = { C5: 157, C4: 130, C3: 111, C2: 96, C1: 74 };
const KT_TO_MPH = 1.15078;

function categoryFromMph(mph: number): 1 | 2 | 3 | 4 | 5 {
  if (mph >= CATEGORY_MPH.C5) return 5;
  if (mph >= CATEGORY_MPH.C4) return 4;
  if (mph >= CATEGORY_MPH.C3) return 3;
  if (mph >= CATEGORY_MPH.C2) return 2;
  return 1;
}

/**
 * Builds a track point label like "CAT 2 · WED 1PM".
 *
 * Handles two shapes seen in practice:
 * - demo fixture (web/public/demo/track.geojson): `category` ("2"/"1"/"TS")
 *   and `label` ("WED 4A") given directly.
 * - real NHC track.geojson (confirmed via a live fetch of
 *   storms/al022026/track.geojson): no `category`/`label` fields at all —
 *   instead `STORMTYPE` ("TS"/"TD"/"STD"/"HU"/"MH"), `MAXWIND` in knots,
 *   and `DATELBL` ("4:00 AM Thu"). Hurricane labels use the category derived
 *   from MAXWIND so viewers never have to decode the NHC's "MH" abbreviation.
 */
export function trackPointLabel(props: GeoJSON.GeoJsonProperties): string {
  if (!props) return "";
  const dateText = String(props.DATELBL ?? props.label ?? "").trim();

  let classText = "";
  if (props.category != null) {
    const c = String(props.category);
    classText = /^\d+$/.test(c) ? `CAT ${c}` : c;
  } else if (props.STORMTYPE) {
    const stype = String(props.STORMTYPE);
    if (stype === "HU" || stype === "MH") {
      const kt = Number(props.MAXWIND) || 0;
      classText = `CAT ${categoryFromMph(Math.round(kt * KT_TO_MPH))}`;
    } else {
      classText = stype;
    }
  }

  return [classText, dateText].filter(Boolean).join(" · ");
}

export type StormSymbolKind = "td" | "ts" | "hu";

/** Map NHC and demo classifications to the standard tropical-cyclone symbols. */
export function stormSymbolKind(props: GeoJSON.GeoJsonProperties): StormSymbolKind {
  const stormType = String(props?.STORMTYPE ?? props?.stormType ?? "").toUpperCase();
  if (["HU", "MH"].includes(stormType)) return "hu";
  if (["TS", "SS", "STS"].includes(stormType)) return "ts";
  if (["TD", "SD", "STD"].includes(stormType)) return "td";

  const category = String(props?.category ?? "").toUpperCase();
  if (/^[1-5]$/.test(category) || ["HU", "MH"].includes(category)) return "hu";
  if (["TS", "SS", "STS"].includes(category)) return "ts";
  if (["TD", "SD", "STD"].includes(category)) return "td";

  // A named current storm with incomplete classification data is most safely
  // represented by the hollow tropical-storm symbol, not a hurricane symbol.
  return "ts";
}

/** Genesis-area label like "60% · 7-DAY" from NHC gtwo outlook properties. */
export function outlookAreaLabel(props: GeoJSON.GeoJsonProperties): string {
  if (!props) return "";
  const pct = props.PROB7DAY ?? "";
  return pct ? `${pct} · 7-DAY` : "";
}

/** Rough centroid (vertex average) of a polygon's exterior ring — fine for label placement. */
export function polygonLabelPoint(geometry: GeoJSON.Geometry): [number, number] | null {
  const ring: GeoJSON.Position[] | undefined =
    geometry.type === "Polygon"
      ? geometry.coordinates[0]
      : geometry.type === "MultiPolygon"
        ? geometry.coordinates[0]?.[0]
        : undefined;
  if (!ring || ring.length === 0) return null;
  let lon = 0;
  let lat = 0;
  for (const [x, y] of ring) {
    lon += x;
    lat += y;
  }
  return [lon / ring.length, lat / ring.length];
}

// ---------------------------------------------------------------------------
// Style construction
// ---------------------------------------------------------------------------

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export const RADAR_TILE_URL =
  "https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=nexrad-n0q&STYLES=&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=true";

export const LAYER_IDS = {
  imagery: "gw-imagery",
  satellite: "gw-weather-satellite",
  labels: "gw-labels",
  outlookFill: "gw-outlook-fill",
  outlookLine: "gw-outlook-line",
  coneFill: "gw-cone-fill",
  coneLineCasing: "gw-cone-line-casing",
  coneLine: "gw-cone-line",
  otherConesFill: "gw-other-cones-fill",
  otherConesLineCasing: "gw-other-cones-line-casing",
  otherConesLine: "gw-other-cones-line",
  historyLineCasing: "gw-history-line-casing",
  historyLine: "gw-history-line",
  historyPoints: "gw-history-points",
  wwlines: "gw-wwlines",
  windFieldFill: "gw-windfield-fill",
  windProbFill: "gw-windprob-fill",
  windProbLine: "gw-windprob-line",
  modelsEnsemble: "gw-models-ensemble",
  modelsSolid: "gw-models-solid",
  modelsDashed: "gw-models-dashed",
  trackLineCasing: "gw-track-line-casing",
  trackLine: "gw-track-line",
  trackPoints: "gw-track-points",
  radar: "gw-radar",
  radarArchive: "gw-radar-archive",
} as const;

export const SOURCE_IDS = {
  imagery: "gw-imagery",
  satellite: "gw-weather-satellite",
  labels: "gw-labels",
  outlook: "gw-outlook",
  cone: "gw-cone",
  otherCones: "gw-other-cones",
  history: "gw-history",
  wwlines: "gw-wwlines",
  windField: "gw-windfield",
  windProb: "gw-windprob",
  models: "gw-models",
  track: "gw-track",
  radar: "gw-radar",
  radarArchive: "gw-radar-archive",
} as const;

// ---------------------------------------------------------------------------
// Wind-probability shaded layer (Round 2, v2 addendum — replaces an earlier
// point-marker "pill" design, dropped mid-build per user feedback in favor
// of a shaded probability field like NHC's own "wind_probs_34"/
// "most_likely_toa_34" graphics: https://www.nhc.noaa.gov/gis/ archives a
// real per-cycle GIS shapefile for exactly this — a graduated-percentage
// polygon set (11 bands, "<5%".."90%") — which converts through the same
// gulfwatch.shp.zip_to_geojson pure-shapefile tooling as cone/track/ww.
// ---------------------------------------------------------------------------

/** Sequential light-yellow -> deep-purple ramp, one stop per NHC WSP
 *  percentage band (real property values confirmed against the Hurricane
 *  Ida archive's 2021082718_wsp34knt120hr_5km shapefile). */
const WIND_PROB_COLORS: Record<string, string> = {
  "<5%": "#ffe14d",
  "5-10%": "#ffc93d",
  "10-20%": "#ffae33",
  "20-30%": "#ff8f2e",
  "30-40%": "#fa722f",
  "40-50%": "#f0532f",
  "50-60%": "#df3838",
  "60-70%": "#c22350",
  "70-80%": "#9c1e6b",
  "80-90%": "#761c82",
  ">90%": "#4f1a7a",
};

/** Maps a WSP polygon's PERCENTAGE property to its fill color; unrecognized/
 *  missing values fall back to a neutral mid-tone rather than throwing. */
export function windProbColor(percentage: string | undefined | null): string {
  return WIND_PROB_COLORS[percentage ?? ""] ?? "#8a94a3";
}

/** Ordered [label, color] pairs for the wind-probability legend
 *  (LayersControl.tsx) — same 11 bands/colors as windProbColor, just as a
 *  renderable list rather than a lookup map. */
export const WIND_PROB_BANDS: { label: string; color: string }[] = Object.entries(WIND_PROB_COLORS).map(
  ([label, color]) => ({ label, color })
);

/** NHC initial-wind-radii thresholds. Stronger winds form progressively
 * smaller nested extents inside the 39 mph field. */
export const WIND_FIELD_BANDS = [
  { knots: 34, mph: 39, color: "#f2cf5b" },
  { knots: 50, mph: 58, color: "#ee8b3a" },
  { knots: 64, mph: 74, color: "#d84c4c" },
] as const;

const WIND_FIELD_COLOR: ExpressionSpecification = [
  "match",
  ["to-number", ["get", "RADII"]],
  34, WIND_FIELD_BANDS[0].color,
  50, WIND_FIELD_BANDS[1].color,
  64, WIND_FIELD_BANDS[2].color,
  "#8a94a3",
];

/** Builds the initial (empty dynamic-source) MapLibre style. Every layer defined
 * here paints from constants, so there is nothing to re-sync after construction. */
export function buildInitialStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      [SOURCE_IDS.imagery]: {
        type: "raster",
        tiles: [ESRI_IMAGERY_TILE_URL],
        tileSize: 256,
        attribution: ESRI_ATTRIBUTION,
      },
      [SOURCE_IDS.satellite]: {
        type: "image",
        url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg==",
        coordinates: [
          [-95.5, 32],
          [-80, 32],
          [-80, 19],
          [-95.5, 19],
        ],
      },
      [SOURCE_IDS.labels]: {
        type: "raster",
        tiles: [ESRI_LABELS_TILE_URL],
        tileSize: 256,
        attribution: ESRI_ATTRIBUTION,
      },
      [SOURCE_IDS.outlook]: { type: "geojson", data: EMPTY_FC },
      [SOURCE_IDS.cone]: { type: "geojson", data: EMPTY_FC },
      [SOURCE_IDS.otherCones]: { type: "geojson", data: EMPTY_FC },
      [SOURCE_IDS.history]: { type: "geojson", data: EMPTY_FC },
      [SOURCE_IDS.wwlines]: { type: "geojson", data: EMPTY_FC },
      [SOURCE_IDS.windField]: { type: "geojson", data: EMPTY_FC },
      [SOURCE_IDS.windProb]: { type: "geojson", data: EMPTY_FC },
      [SOURCE_IDS.models]: { type: "geojson", data: EMPTY_FC },
      [SOURCE_IDS.track]: { type: "geojson", data: EMPTY_FC },
      [SOURCE_IDS.radar]: {
        type: "raster",
        tiles: [RADAR_TILE_URL],
        tileSize: 256,
        attribution: "IEM / NEXRAD",
      },
    },
    layers: [
      {
        id: LAYER_IDS.imagery,
        type: "raster",
        source: SOURCE_IDS.imagery,
        paint: {
          "raster-brightness-max": 0.7,
          "raster-saturation": -0.28,
          "raster-contrast": 0.18,
        },
      },
      {
        id: LAYER_IDS.satellite,
        type: "raster",
        source: SOURCE_IDS.satellite,
        layout: { visibility: "none" },
        paint: {
          "raster-opacity": 0.9,
          "raster-fade-duration": 0,
          "raster-contrast": 0.08,
        },
      },
      {
        id: LAYER_IDS.labels,
        type: "raster",
        source: SOURCE_IDS.labels,
      },
      {
        id: LAYER_IDS.outlookFill,
        type: "fill",
        source: SOURCE_IDS.outlook,
        paint: { "fill-color": ["get", "_color"], "fill-opacity": 0.35 },
      },
      {
        id: LAYER_IDS.outlookLine,
        type: "line",
        source: SOURCE_IDS.outlook,
        paint: {
          "line-color": ["get", "_color"],
          "line-width": 1.5,
          "line-dasharray": [5, 4],
        },
      },
      // Cone fill is a plain white haze (reads as a highlighted region over
      // ANY satellite imagery brightness, unlike a navy fill which nearly
      // vanished into the imagery's own dark-blue water) with a dark-cased
      // white dashed outline — the same casing technique as the track line
      // below, so the cone stays legible over open water, cloud, and land.
      {
        id: LAYER_IDS.coneFill,
        type: "fill",
        source: SOURCE_IDS.cone,
        paint: { "fill-color": "#ffffff", "fill-opacity": 0.22 },
      },
      {
        id: LAYER_IDS.coneLineCasing,
        type: "line",
        source: SOURCE_IDS.cone,
        paint: { "line-color": "#1c2024", "line-width": 3.4, "line-opacity": 0.55 },
      },
      {
        id: LAYER_IDS.coneLine,
        type: "line",
        source: SOURCE_IDS.cone,
        paint: {
          "line-color": "#ffffff",
          "line-width": 1.6,
          "line-dasharray": [6, 4],
        },
      },
      // Other (non-selected) storms' cones — same styling as the selected
      // storm's cone above (B2, final review: "v1: show all cones, detail
      // for strongest Gulf threat").
      {
        id: LAYER_IDS.otherConesFill,
        type: "fill",
        source: SOURCE_IDS.otherCones,
        paint: { "fill-color": "#ffffff", "fill-opacity": 0.15 },
      },
      {
        id: LAYER_IDS.otherConesLineCasing,
        type: "line",
        source: SOURCE_IDS.otherCones,
        paint: { "line-color": "#1c2024", "line-width": 2.6, "line-opacity": 0.45 },
      },
      {
        id: LAYER_IDS.otherConesLine,
        type: "line",
        source: SOURCE_IDS.otherCones,
        paint: {
          "line-color": "#ffffff",
          "line-width": 1.2,
          "line-dasharray": [6, 4],
        },
      },
      {
        id: LAYER_IDS.historyLineCasing,
        type: "line",
        source: SOURCE_IDS.history,
        filter: ["==", ["geometry-type"], "LineString"],
        paint: { "line-color": "rgba(4, 25, 42, 0.9)", "line-width": 4.4 },
      },
      {
        id: LAYER_IDS.historyLine,
        type: "line",
        source: SOURCE_IDS.history,
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": "#5cc7ef",
          "line-width": 2.2,
          "line-dasharray": [2, 2],
        },
      },
      {
        id: LAYER_IDS.historyPoints,
        type: "circle",
        source: SOURCE_IDS.history,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-color": "#5cc7ef",
          "circle-radius": 3.2,
          "circle-stroke-color": "#071f31",
          "circle-stroke-width": 1.1,
        },
      },
      // Current analyzed wind field. This is separate from probability:
      // these are the advisory-time 34/50/64 kt radii reported by NHC.
      {
        id: LAYER_IDS.windFieldFill,
        type: "fill",
        source: SOURCE_IDS.windField,
        layout: {
          visibility: "none",
          // Draw stronger wind radii last: yellow 34 kt, orange 50 kt,
          // then red 64 kt on top at the storm's core.
          "fill-sort-key": ["to-number", ["get", "RADII"]],
        },
        paint: { "fill-color": WIND_FIELD_COLOR, "fill-opacity": 0.7 },
      },
      // Wind-probability shaded field (Round 2, v2 addendum) — a graduated
      // fill (11 percentage bands) under everything else drawn above it
      // (cone/track/ww/models), matching NHC's own shaded wind-probability
      // graphics rather than a point marker.
      {
        id: LAYER_IDS.windProbFill,
        type: "fill",
        source: SOURCE_IDS.windProb,
        paint: { "fill-color": ["get", "_color"], "fill-opacity": 0.55 },
      },
      {
        id: LAYER_IDS.windProbLine,
        type: "line",
        source: SOURCE_IDS.windProb,
        paint: { "line-color": ["get", "_color"], "line-width": 0.6, "line-opacity": 0.7 },
      },
      {
        id: LAYER_IDS.wwlines,
        type: "line",
        source: SOURCE_IDS.wwlines,
        paint: { "line-color": ["get", "_color"], "line-width": 3.5, "line-opacity": 0.95 },
      },
      // Ensemble members (GEFS/ECMWF, Round 2 full-spaghetti expansion) draw
      // BELOW the named deterministic/consensus/AI lines — there can be
      // 60+ of them, so they're deliberately thin and faint (a soft white
      // haze showing the guidance envelope, same "white reads over any
      // imagery brightness" technique as the track/cone) rather than
      // competing visually with the handful of named model lines on top.
      // A blue-gray tone was tried first and read as a muddy smear where it
      // blended into the basemap's own blue water color (user feedback
      // while reviewing the running dev server: "kinda weirdly blended") —
      // white avoids that regardless of what's underneath.
      {
        id: LAYER_IDS.modelsEnsemble,
        type: "line",
        source: SOURCE_IDS.models,
        filter: ["==", ["get", "kind"], "ensemble"],
        paint: {
          "line-color": ["get", "_color"],
          "line-width": 1,
          "line-opacity": 0.58,
        },
      },
      {
        id: LAYER_IDS.modelsSolid,
        type: "line",
        source: SOURCE_IDS.models,
        filter: ["all", ["!=", ["get", "kind"], "ai"], ["!=", ["get", "kind"], "ensemble"]],
        paint: {
          "line-color": ["get", "_color"],
          "line-width": 2.35,
          "line-opacity": 1,
        },
      },
      {
        id: LAYER_IDS.modelsDashed,
        type: "line",
        source: SOURCE_IDS.models,
        filter: ["==", ["get", "kind"], "ai"],
        paint: {
          "line-color": ["get", "_color"],
          "line-width": 2.5,
          "line-opacity": 1,
          "line-dasharray": [2, 2],
        },
      },
      // Dark casing under the white official track — satellite imagery's
      // brightness varies a lot (open water vs. cloud vs. land), so a plain
      // white line alone can wash out over bright cloud tops; a thin dark
      // outline underneath keeps it readable everywhere, the same
      // "casing" technique real map apps use for a route line over imagery.
      {
        id: LAYER_IDS.trackLineCasing,
        type: "line",
        source: SOURCE_IDS.track,
        filter: ["==", ["geometry-type"], "LineString"],
        paint: { "line-color": "#1c2024", "line-width": 4.2 },
      },
      {
        id: LAYER_IDS.trackLine,
        type: "line",
        source: SOURCE_IDS.track,
        filter: ["==", ["geometry-type"], "LineString"],
        paint: { "line-color": "#ffffff", "line-width": 2.2 },
      },
      {
        id: LAYER_IDS.trackPoints,
        type: "circle",
        source: SOURCE_IDS.track,
        filter: [
          "all",
          ["==", ["geometry-type"], "Point"],
          ["!=", ["to-number", ["coalesce", ["get", "TAU"], 0]], 0],
        ],
        paint: {
          "circle-color": "#ffffff",
          "circle-radius": 4.5,
          "circle-stroke-color": "#1c2024",
          "circle-stroke-width": 1.2,
        },
      },
      {
        id: LAYER_IDS.radar,
        type: "raster",
        source: SOURCE_IDS.radar,
        layout: { visibility: "none" },
        paint: { "raster-opacity": 0.75 },
      },
    ],
  };
}

// The standalone build also exported applyModeColors(map), which re-read the
// CSS tokens and repainted map layers whenever the quiet/active theme
// swapped. MAP_COLORS is a constant now, so buildInitialStyle() already paints
// every layer its final color and there is nothing left to re-sync.
