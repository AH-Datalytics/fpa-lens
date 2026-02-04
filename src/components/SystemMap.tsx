"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Types for GeoJSON
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

interface MapData {
  levees: GeoJSONCollection | null;
  structures: GeoJSONCollection | null;
  pccps: GeoJSONCollection | null;
}

// Dynamically import map to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import("react-leaflet").then((mod) => mod.GeoJSON),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

// Custom marker icons
const createCircleIcon = (color: string, size: number = 24) => {
  if (typeof window === "undefined") return undefined;
  const L = require("leaflet");
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background-color: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      opacity: 0.85;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createTriangleIcon = (color: string, size: number = 28) => {
  if (typeof window === "undefined") return undefined;
  const L = require("leaflet");
  // Using SVG for cleaner triangle with white outline
  const svgSize = size + 6; // Add padding for stroke
  return L.divIcon({
    className: "custom-marker",
    html: `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3)); opacity: 0.85;">
      <polygon
        points="${svgSize/2},3 ${svgSize-3},${svgSize-3} 3,${svgSize-3}"
        fill="${color}"
        stroke="white"
        stroke-width="2"
        stroke-linejoin="round"
      />
    </svg>`,
    iconSize: [svgSize, svgSize],
    iconAnchor: [svgSize / 2, svgSize / 2],
  });
};

function MapLegend({ pccpCount, structureCount }: { pccpCount: number; structureCount: number }) {
  return (
    <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
      <h4 className="font-semibold text-sm text-gray-800 mb-3">Map Legend</h4>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-1 bg-[#21355a] rounded"></div>
          <span className="text-gray-600">Levees & Floodwalls</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="18" height="16" viewBox="0 0 18 16">
            <polygon
              points="9,1 17,15 1,15"
              fill="#65bc7b"
              stroke="white"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-gray-600">PCCP Stations ({pccpCount})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#f59e0b] rounded-full border-2 border-white shadow"></div>
          <span className="text-gray-600">Complex Structures ({structureCount})</span>
        </div>
      </div>
    </div>
  );
}

export default function SystemMap() {
  const [mapData, setMapData] = useState<MapData>({
    levees: null,
    structures: null,
    pccps: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [leveesRes, structuresRes, pccpsRes] = await Promise.all([
          fetch("/data/levee-centerline.json"),
          fetch("/data/complex-structures.json"),
          fetch("/data/pccps.json"),
        ]);

        if (!leveesRes.ok || !structuresRes.ok || !pccpsRes.ok) {
          throw new Error("Failed to load map data");
        }

        const [levees, structures, pccps] = await Promise.all([
          leveesRes.json(),
          structuresRes.json(),
          pccpsRes.json(),
        ]);

        setMapData({ levees, structures, pccps });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load map");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="h-[500px] bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading map data...</span>
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

  // Center on New Orleans area
  const center: [number, number] = [29.97, -90.0];
  const zoom = 11;

  return (
    <div className="relative h-[500px] rounded-xl overflow-hidden shadow-lg">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Levee Centerlines */}
        {mapData.levees && (
          <GeoJSON
            data={mapData.levees}
            style={() => ({
              color: "#21355a",
              weight: 3,
              opacity: 0.8,
            })}
            onEachFeature={(feature, layer) => {
              const props = feature.properties;
              const type = props.FloodwallF === "Y" ? "Floodwall" : "Levee";
              const jurisdiction = props.Jurisdict || "Unknown";
              layer.bindPopup(`
                <div class="text-sm">
                  <strong>${type}</strong><br/>
                  <span class="text-gray-600">Type: ${props.ConSubType || "N/A"}</span><br/>
                  <span class="text-gray-600">Jurisdiction: ${jurisdiction}</span>
                </div>
              `);
            }}
          />
        )}

        {/* Complex Structures */}
        {mapData.structures?.features.map((feature, index) => {
          const coords = feature.geometry.coordinates as [number, number];
          const props = feature.properties;
          return (
            <Marker
              key={`structure-${index}`}
              position={[coords[1], coords[0]]}
              icon={createCircleIcon("#f59e0b", 20)}
            >
              <Popup>
                <div className="text-sm min-w-[200px]">
                  <strong className="text-[#21355a]">{String(props.FloodGate)}</strong>
                  {typeof props.About === "string" && props.About && (
                    <div className="mt-2">
                      <a
                        href={props.About}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Learn more
                      </a>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* PCCP Stations */}
        {mapData.pccps?.features.map((feature, index) => {
          const coords = feature.geometry.coordinates as [number, number];
          const props = feature.properties;
          return (
            <Marker
              key={`pccp-${index}`}
              position={[coords[1], coords[0]]}
              icon={createTriangleIcon("#65bc7b", 20)}
            >
              <Popup>
                <div className="text-sm">
                  <strong className="text-[#21355a]">PCCP Station</strong>
                  <p className="text-gray-600">{props.Location_N as string}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      <MapLegend
        pccpCount={mapData.pccps?.features.length || 0}
        structureCount={mapData.structures?.features.length || 0}
      />
    </div>
  );
}
