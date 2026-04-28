"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { grassCuttingData } from "@/data/grassCutting";

interface MowingPolygonProps {
  name: string;
  zone: string;
  acres: number;
}

interface GeoJSONPolygonFeature {
  type: "Feature";
  properties: MowingPolygonProps;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

interface GeoJSONCollection {
  type: "FeatureCollection";
  features: GeoJSONPolygonFeature[];
}

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false },
);
const GeoJSON = dynamic(
  () => import("react-leaflet").then((mod) => mod.GeoJSON),
  { ssr: false },
);

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

// Light purple stands out clearly against the gray basemap and the 6
// confirmed zone colors; dashed outline reinforces "this is a question,
// not a confirmed mowing zone."
const UNASSIGNED_COLOR = "#a78bfa"; // violet-400

function zoneColor(zone: string): string {
  const z = grassCuttingData.zones.find((zz) => zz.name === zone);
  return z?.color ?? UNASSIGNED_COLOR;
}

export default function GrassCuttingMap() {
  const [data, setData] = useState<GeoJSONCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/old-mowing-areas.json")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load mowing-area polygons");
        return r.json();
      })
      .then((json: GeoJSONCollection) => setData(json))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-[500px] bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading map...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-[500px] bg-red-50 rounded-xl flex items-center justify-center">
        <p className="text-red-600">Error loading map: {error ?? "unknown"}</p>
      </div>
    );
  }

  return (
    <div className="relative h-[500px] rounded-xl overflow-hidden shadow-lg border border-gray-200">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <MapContainer
        center={[30.02, -90.02]}
        zoom={11}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <GeoJSON
          data={data}
          style={(feature) => {
            const props = feature?.properties as MowingPolygonProps | undefined;
            const isUnassigned = !props?.zone;
            const color = props ? zoneColor(props.zone) : UNASSIGNED_COLOR;
            return {
              color,
              weight: 3,
              opacity: 0.95,
              fillColor: color,
              fillOpacity: isUnassigned ? 0.25 : 0.5,
              // Dashed border signals the unassigned polygon is a question,
              // not a confirmed mowing zone.
              dashArray: isUnassigned ? "6 4" : undefined,
            };
          }}
          onEachFeature={(feature, layer) => {
            const props = feature.properties as MowingPolygonProps;
            const acres = props.acres > 0
              ? props.acres < 1
                ? `${props.acres.toFixed(2)} ac`
                : `${props.acres.toFixed(1)} ac`
              : "—";
            layer.bindPopup(`
              <div class="text-sm leading-snug">
                <strong>${escapeHtml(props.name || "(unnamed)")}</strong><br/>
                <span class="text-gray-600">Zone: ${escapeHtml(props.zone)}</span><br/>
                <span class="text-gray-600">Area: ${escapeHtml(acres)}</span>
              </div>
            `);
          }}
        />
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 z-[1000] max-w-[280px]">
        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
          Mowing zones
        </p>
        <ul className="space-y-1 text-xs">
          {grassCuttingData.zones.map((z) => (
            <li key={z.key} className="flex items-start gap-2">
              <span
                className="w-3 h-3 rounded-sm mt-0.5 flex-shrink-0"
                style={{ backgroundColor: z.color }}
                aria-hidden="true"
              />
              <span className="text-gray-700">
                {z.name}{" "}
                <span className="text-gray-400">· {z.acres} ac</span>
              </span>
            </li>
          ))}
          <li className="flex items-start gap-2 pt-1 border-t border-gray-100 mt-1">
            <span
              className="w-3 h-3 rounded-sm mt-0.5 flex-shrink-0 border border-dashed"
              style={{
                backgroundColor: UNASSIGNED_COLOR,
                opacity: 0.5,
                borderColor: UNASSIGNED_COLOR,
              }}
              aria-hidden="true"
            />
            <span className="text-gray-500 italic">
              Pending classification{" "}
              <span className="text-gray-400 not-italic">
                · {grassCuttingData.pendingClassification.acres} ac
              </span>
            </span>
          </li>
        </ul>
        <p className="text-[10px] text-gray-400 italic mt-2 leading-snug">
          Source: Orleans Levee District GIS, Apr 2026 (Kory).
        </p>
      </div>
    </div>
  );
}
