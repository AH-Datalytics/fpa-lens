import { GULF_BOX } from "./config";

/**
 * The "watch" tier between all-clear and an active storm: an NHC genesis area
 * that reaches the Gulf box with at least a medium (40%+) seven-day formation
 * chance. Without it the quiet-mode banner read "No active Gulf systems" with a
 * green dot while NHC was giving a southwestern Gulf disturbance 90% odds and
 * telling the northern Gulf Coast to monitor it (AL92, Oct 6 2026) -- true to
 * the letter, misleading in effect.
 */
export interface GulfWatch {
  prob2day: number | null;
  prob7day: number;
}

function pct(raw: unknown): number | null {
  const match = /(\d+)/.exec(String(raw ?? ""));
  return match ? Number(match[1]) : null;
}

function inBox([lon, lat]: GeoJSON.Position): boolean {
  return (
    lon >= GULF_BOX.lonMin && lon <= GULF_BOX.lonMax && lat >= GULF_BOX.latMin && lat <= GULF_BOX.latMax
  );
}

function positions(geometry: GeoJSON.Geometry | null): GeoJSON.Position[] {
  if (!geometry) return [];
  switch (geometry.type) {
    case "Point":
      return [geometry.coordinates];
    case "MultiPoint":
    case "LineString":
      return geometry.coordinates;
    case "Polygon":
    case "MultiLineString":
      return geometry.coordinates.flat();
    case "MultiPolygon":
      return geometry.coordinates.flat(2);
    default:
      return [];
  }
}

/**
 * Highest-odds genesis area touching the Gulf box (any vertex or the
 * representative point inside it), or null. RISK7DAY is already normalized to
 * low/medium/high by the ingest (outlook.py: <40 low, 40-60 medium, >60 high).
 */
export function gulfWatch(outlook: GeoJSON.FeatureCollection | null | undefined): GulfWatch | null {
  let best: GulfWatch | null = null;
  for (const feature of outlook?.features ?? []) {
    const risk = String(feature.properties?.RISK7DAY ?? "").toLowerCase();
    if (risk !== "medium" && risk !== "high") continue;
    if (!positions(feature.geometry).some(inBox)) continue;
    const prob7day = pct(feature.properties?.PROB7DAY);
    if (prob7day === null) continue;
    if (!best || prob7day > best.prob7day) {
      best = { prob2day: pct(feature.properties?.PROB2DAY), prob7day };
    }
  }
  return best;
}
