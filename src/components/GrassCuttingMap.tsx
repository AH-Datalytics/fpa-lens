"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { grassCuttingData } from "@/data/grassCutting";

interface MowingPolygonProps {
  // OLD polygons have name; LBBLD/EJLD polygons don't.
  name?: string;
  zone: string;
  // LBBLD/EJLD polygons carry an LPV reach code; OLD polygons don't.
  lpv?: string | null;
  acres: number;
  district: "OLD" | "LBBLD" | "EJLD";
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
const ZoomControl = dynamic(
  () => import("react-leaflet").then((mod) => mod.ZoomControl),
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

// Neutral light gray reads as "no classification yet" against the
// district color families; dashed outline reinforces "this is a
// question, not a confirmed mowing zone."
const UNASSIGNED_COLOR = "#9ca3af"; // gray-400

function zoneColor(
  district: "OLD" | "LBBLD" | "EJLD",
  zone: string,
): string {
  if (district === "LBBLD") {
    const z = grassCuttingData.lbbldZones.find((zz) => zz.name === zone);
    return z?.color ?? UNASSIGNED_COLOR;
  }
  if (district === "EJLD") {
    const z = grassCuttingData.ejldZones.find((zz) => zz.name === zone);
    return z?.color ?? UNASSIGNED_COLOR;
  }
  const z = grassCuttingData.zones.find((zz) => zz.name === zone);
  return z?.color ?? UNASSIGNED_COLOR;
}

interface RawFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: GeoJSONPolygonFeature["geometry"];
}
interface RawCollection {
  type: "FeatureCollection";
  features: RawFeature[];
}

function tagDistrict(
  raw: RawCollection,
  district: "OLD" | "LBBLD" | "EJLD",
): GeoJSONPolygonFeature[] {
  return raw.features.map((f) => {
    const p = f.properties ?? {};
    return {
      type: "Feature",
      geometry: f.geometry,
      properties: {
        name: typeof p.name === "string" ? p.name : undefined,
        zone: typeof p.zone === "string" ? p.zone : "",
        lpv: typeof p.lpv === "string" ? p.lpv : null,
        acres: typeof p.acres === "number" ? p.acres : Number(p.acres ?? 0),
        district,
      },
    };
  });
}

export type DistrictFilter = "ALL" | "OLD" | "EJLD" | "LBBLD";

export default function GrassCuttingMap({
  districtFilter = "ALL",
}: {
  districtFilter?: DistrictFilter;
}) {
  const [data, setData] = useState<GeoJSONCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/old-mowing-areas.json").then((r) => {
        if (!r.ok) throw new Error("Failed to load OLD mowing polygons");
        return r.json() as Promise<RawCollection>;
      }),
      fetch("/data/lbbld-mowing-areas.json").then((r) => {
        if (!r.ok) throw new Error("Failed to load LBBLD mowing polygons");
        return r.json() as Promise<RawCollection>;
      }),
      fetch("/data/ejld-mowing-areas.json").then((r) => {
        if (!r.ok) throw new Error("Failed to load EJLD mowing polygons");
        return r.json() as Promise<RawCollection>;
      }),
    ])
      .then(([old, lbbld, ejld]) => {
        setData({
          type: "FeatureCollection",
          features: [
            ...tagDistrict(old, "OLD"),
            ...tagDistrict(lbbld, "LBBLD"),
            ...tagDistrict(ejld, "EJLD"),
          ],
        });
      })
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

  // Filter features by selected district. Use a key on the GeoJSON layer
  // so react-leaflet remounts it when the filter changes (otherwise the
  // existing GeoJSON layer keeps its prior features).
  const filteredFeatures =
    districtFilter === "ALL"
      ? data.features
      : data.features.filter((f) => f.properties.district === districtFilter);
  const filteredData: GeoJSONCollection = {
    type: "FeatureCollection",
    features: filteredFeatures,
  };
  const showOld = districtFilter === "ALL" || districtFilter === "OLD";
  const showEjld = districtFilter === "ALL" || districtFilter === "EJLD";
  const showLbbld = districtFilter === "ALL" || districtFilter === "LBBLD";

  return (
    <div className="relative h-[500px] rounded-xl overflow-hidden shadow-lg border border-gray-200">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <MapContainer
        // Centered to include East Jefferson (west, ~-90.2), Orleans
        // (~-90.0), and the Lake Borgne basin (~-89.7) at zoom 10.
        center={[30.02, -89.97]}
        zoom={10}
        scrollWheelZoom={false}
        zoomControl={false}
        className="h-full w-full"
      >
        <ZoomControl position="topright" />
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <GeoJSON
          key={districtFilter}
          data={filteredData}
          style={(feature) => {
            const props = feature?.properties as MowingPolygonProps | undefined;
            const isUnassigned = !props?.zone;
            const color = props
              ? zoneColor(props.district, props.zone)
              : UNASSIGNED_COLOR;
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
            // OLD polygons have a per-polygon Name; LBBLD polygons don't,
            // so fall back to the LPV reach (or the zone label).
            const headline =
              props.name ||
              props.lpv ||
              props.zone ||
              "(unnamed)";
            const districtLabel =
              props.district === "OLD"
                ? "Orleans Levee District"
                : props.district === "LBBLD"
                  ? "Lake Borgne Basin Levee District"
                  : "East Jefferson Levee District";
            layer.bindPopup(`
              <div class="text-sm leading-snug">
                <strong>${escapeHtml(headline)}</strong><br/>
                <span class="text-gray-600">District: ${escapeHtml(districtLabel)}</span><br/>
                <span class="text-gray-600">Zone: ${escapeHtml(props.zone || "Unassigned")}</span><br/>
                <span class="text-gray-600">Area: ${escapeHtml(acres)}</span>
              </div>
            `);
          }}
        />
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 z-[1000] max-w-[300px] max-h-[460px] overflow-y-auto">
        {showOld && (
          <>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">
              Orleans Levee District
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
          </>
        )}
        {showEjld && (
          <>
            <p
              className={`text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1 ${showOld ? "mt-3 pt-2 border-t border-gray-200" : ""}`}
            >
              East Jefferson Levee District
            </p>
            <ul className="space-y-1 text-xs">
              {grassCuttingData.ejldZones.map((z) => (
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
            </ul>
          </>
        )}
        {showLbbld && (
          <>
            <p
              className={`text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1 ${showOld || showEjld ? "mt-3 pt-2 border-t border-gray-200" : ""}`}
            >
              Lake Borgne Basin Levee District
            </p>
            <ul className="space-y-1 text-xs">
              {grassCuttingData.lbbldZones.map((z) => (
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
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
