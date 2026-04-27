"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { grassCuttingData } from "@/data/grassCutting";

interface GeoJSONFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
}

interface GeoJSONCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
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

type ZoneKey =
  | "BLACK"
  | "GREEN"
  | "LIGHT_BLUE"
  | "NAVY_BLUE"
  | "YELLOW"
  | "ORANGE";

function getZoneColor(zone: ZoneKey | null): string | null {
  if (!zone) return null;
  const z = grassCuttingData.zones.find((z) => z.key === zone);
  return z?.color ?? null;
}

function getZoneName(zone: ZoneKey | null): string | null {
  if (!zone) return null;
  const z = grassCuttingData.zones.find((z) => z.key === zone);
  return z?.name ?? null;
}

export default function GrassCuttingMap() {
  const [levees, setLevees] = useState<GeoJSONCollection | null>(null);
  const [zoneMap, setZoneMap] = useState<Record<string, ZoneKey> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/levee-centerline.json").then((r) => {
        if (!r.ok) throw new Error("Failed to load levee data");
        return r.json();
      }),
      fetch("/data/grass-cutting-zones.json").then((r) => {
        if (!r.ok) throw new Error("Failed to load zone mapping");
        return r.json();
      }),
    ])
      .then(([leveeData, mapping]) => {
        setLevees(leveeData);
        setZoneMap(mapping);
      })
      .catch((err) => setError(err.message))
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

  if (error) {
    return (
      <div className="h-[500px] bg-red-50 rounded-xl flex items-center justify-center">
        <p className="text-red-600">Error loading map: {error}</p>
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
        center={[29.99, -90.0]}
        zoom={11}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {levees && zoneMap && (
          <GeoJSON
            data={levees}
            style={(feature) => {
              const hidden = { color: "#000", weight: 0, opacity: 0, fillOpacity: 0 };
              if (!feature) return hidden;
              const props = feature.properties as Record<string, unknown>;
              const oid = props.OBJECTID_1 as number | undefined;
              if (oid === undefined) return hidden;
              const zone = zoneMap[String(oid)] as ZoneKey | undefined;
              const color = getZoneColor(zone ?? null);
              if (!color) return hidden;
              return { color, weight: 5, opacity: 0.85 };
            }}
            onEachFeature={(feature, layer) => {
              const props = feature.properties;
              const oid = props.OBJECTID_1 as number | undefined;
              if (oid === undefined) return;
              const zone = zoneMap[String(oid)] as ZoneKey | undefined;
              if (zone) {
                const name = getZoneName(zone);
                const type = props.FloodwallF === "Y" ? "Floodwall" : "Levee";
                layer.bindPopup(`
                  <div class="text-sm">
                    <strong>${name} zone</strong><br/>
                    <span class="text-gray-600">${type} segment</span>
                  </div>
                `);
              }
            }}
          />
        )}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-[1000] max-w-[280px]">
        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
          Zones
        </p>
        <ul className="space-y-1 text-xs">
          {grassCuttingData.zones.map((z) => (
            <li key={z.key} className="flex items-start gap-2">
              <span
                className="w-3 h-3 rounded-sm mt-0.5 flex-shrink-0"
                style={{ backgroundColor: z.color }}
                aria-hidden="true"
              />
              <span className="text-gray-700">{z.name}</span>
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-gray-400 italic mt-2 leading-snug">
          Zone boundaries are best-guess approximations to be confirmed by the
          maintenance team.
        </p>
      </div>
    </div>
  );
}
