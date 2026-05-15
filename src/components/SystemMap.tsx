"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

/**
 * Escape user-controlled strings before they're concatenated into a
 * Leaflet popup. The popup content is bound as raw HTML, so any field
 * coming from a GeoJSON `properties` blob has to be escaped at the
 * boundary even though our current sources are trusted internal files.
 */
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
  floodgates: GeoJSONCollection | null;
  valves: GeoJSONCollection | null;
}

interface LayerVisibility {
  floodgates: boolean;
  valves: boolean;
}

type GateStatuses = Record<string, string>;

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
  // Leaflet's main entry touches `window` on import, so we lazy-require
  // it here instead of at the top of the module to keep SSR working.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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
  // Leaflet's main entry touches `window` on import, so we lazy-require
  // it here instead of at the top of the module to keep SSR working.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require("leaflet");
  const svgSize = size + 6;
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

const createSquareIcon = (color: string, size: number = 10) => {
  if (typeof window === "undefined") return undefined;
  // Leaflet's main entry touches `window` on import, so we lazy-require
  // it here instead of at the top of the module to keep SSR working.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require("leaflet");
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background-color: ${color};
      width: ${size}px;
      height: ${size}px;
      border: 1.5px solid white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      opacity: 0.85;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createDiamondIcon = (color: string, size: number = 10) => {
  if (typeof window === "undefined") return undefined;
  // Leaflet's main entry touches `window` on import, so we lazy-require
  // it here instead of at the top of the module to keep SSR working.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require("leaflet");
  const svgSize = size + 4;
  return L.divIcon({
    className: "custom-marker",
    html: `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}" style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3)); opacity: 0.85;">
      <rect
        x="${svgSize/2 - size/2}"
        y="${svgSize/2 - size/2}"
        width="${size}"
        height="${size}"
        fill="${color}"
        stroke="white"
        stroke-width="1.5"
        transform="rotate(45 ${svgSize/2} ${svgSize/2})"
      />
    </svg>`,
    iconSize: [svgSize, svgSize],
    iconAnchor: [svgSize / 2, svgSize / 2],
  });
};

interface MapLegendProps {
  pccpCount: number;
  structureCount: number;
  floodgateCount: number;
  valveCount: number;
  layerVisibility: LayerVisibility;
  onToggleLayer: (layer: keyof LayerVisibility) => void;
}

function MapLegend({
  pccpCount,
  structureCount,
  floodgateCount,
  valveCount,
  layerVisibility,
  onToggleLayer,
}: MapLegendProps) {
  return (
    <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
      <h4 className="font-semibold text-sm text-gray-800 mb-3">Map Legend</h4>
      <div className="space-y-2 text-sm">
        {/* Always-on layers */}
        <div className="flex items-center gap-2">
          <div className="w-5 flex-shrink-0 flex justify-center">
            <div className="w-5 h-1 bg-[#21355a] rounded"></div>
          </div>
          <span className="text-gray-600">Levees & Floodwalls</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 flex-shrink-0 flex justify-center">
            <svg width="16" height="14" viewBox="0 0 16 14" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}>
              <polygon
                points="8,1 15,13 1,13"
                fill="#3b82f6"
                stroke="white"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-gray-600">PCCP Stations ({pccpCount})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 flex-shrink-0 flex justify-center">
            <div className="w-4 h-4 bg-[#f59e0b] rounded-full border-2 border-white shadow"></div>
          </div>
          <span className="text-gray-600">Navigable Floodgates ({structureCount})</span>
        </div>

        {/* Toggleable layers */}
        <div className="border-t border-gray-200 pt-2 mt-2">
          <p className="text-xs text-gray-400 mb-2">Toggle layers</p>

          {/* Floodgates — colored by live CPRA gate status */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500">Floodgates</span>
              <button
                onClick={() => onToggleLayer("floodgates")}
                className={`relative w-9 h-5 rounded-full transition-colors ${
                  layerVisibility.floodgates ? "bg-[#65bc7b]" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    layerVisibility.floodgates ? "translate-x-4" : ""
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-1 pl-1">
              <div className="w-5 flex-shrink-0 flex justify-center">
                <div className="w-[10px] h-[10px] bg-[#22c55e] border-[1.5px] border-white shadow"></div>
              </div>
              <span className={`flex-1 ${layerVisibility.floodgates ? "text-gray-600" : "text-gray-400"}`}>Open</span>
            </div>
            <div className="flex items-center gap-2 pl-1">
              <div className="w-5 flex-shrink-0 flex justify-center">
                <div className="w-[10px] h-[10px] bg-[#ef4444] border-[1.5px] border-white shadow"></div>
              </div>
              <span className={`flex-1 ${layerVisibility.floodgates ? "text-gray-600" : "text-gray-400"}`}>Closed</span>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer mt-2">
            <div className="w-5 flex-shrink-0 flex justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}>
                <rect
                  x="3" y="3" width="8" height="8"
                  fill="#8b5cf6"
                  stroke="white"
                  strokeWidth="2"
                  transform="rotate(45 7 7)"
                />
              </svg>
            </div>
            <span className={`flex-1 ${layerVisibility.valves ? "text-gray-600" : "text-gray-400"}`}>
              Valves ({valveCount})
            </span>
            <button
              onClick={() => onToggleLayer("valves")}
              className={`relative w-9 h-5 rounded-full transition-colors ${
                layerVisibility.valves ? "bg-[#65bc7b]" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  layerVisibility.valves ? "translate-x-4" : ""
                }`}
              />
            </button>
          </label>
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
    floodgates: null,
    valves: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    floodgates: false,
    valves: false,
  });
  const [gateStatus, setGateStatus] = useState<GateStatuses>({});

  const toggleLayer = (layer: keyof LayerVisibility) => {
    setLayerVisibility((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [leveesRes, structuresRes, pccpsRes, floodgatesRes, valvesRes] =
          await Promise.all([
            fetch("/data/levee-centerline.json"),
            fetch("/data/complex-structures.json"),
            fetch("/data/pccps.json"),
            fetch("/data/floodgates.json"),
            fetch("/data/valves.json"),
          ]);

        if (
          !leveesRes.ok ||
          !structuresRes.ok ||
          !pccpsRes.ok ||
          !floodgatesRes.ok ||
          !valvesRes.ok
        ) {
          throw new Error("Failed to load map data");
        }

        const [levees, structures, pccps, floodgates, valves] =
          await Promise.all([
            leveesRes.json(),
            structuresRes.json(),
            pccpsRes.json(),
            floodgatesRes.json(),
            valvesRes.json(),
          ]);

        setMapData({ levees, structures, pccps, floodgates, valves });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load map");
      } finally {
        setLoading(false);
      }
    }

    async function loadGateStatus() {
      try {
        const res = await fetch("/api/gate-status");
        if (res.ok) {
          const { statuses } = await res.json();
          setGateStatus(statuses ?? {});
        }
      } catch {
        // Best-effort — map still works without live status
      }
    }

    loadData();
    loadGateStatus();
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
        scrollWheelZoom={false}
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
              const conSubType = props.ConSubType ? String(props.ConSubType) : "N/A";
              const jurisdiction = props.Jurisdict ? String(props.Jurisdict) : "Unknown";
              layer.bindPopup(`
                <div class="text-sm">
                  <strong>${escapeHtml(type)}</strong><br/>
                  <span class="text-gray-600">Type: ${escapeHtml(conSubType)}</span><br/>
                  <span class="text-gray-600">Jurisdiction: ${escapeHtml(jurisdiction)}</span>
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
              icon={createCircleIcon("#f59e0b", 24)}
              zIndexOffset={1000}
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
              icon={createTriangleIcon("#3b82f6", 24)}
              zIndexOffset={1000}
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

        {/* Floodgates (toggleable, colored by live CPRA gate status) */}
        {layerVisibility.floodgates &&
          mapData.floodgates?.features.map((feature, index) => {
            const coords = feature.geometry.coordinates as [number, number];
            const props = feature.properties;
            const gateCode = String(props.GateCode);
            const status = gateStatus[gateCode];
            const color =
              status === "Open" ? "#22c55e" :
              status === "Closed" ? "#ef4444" :
              "#3b82f6";
            return (
              <Marker
                key={`floodgate-${index}`}
                position={[coords[1], coords[0]]}
                icon={createSquareIcon(color, 10)}
              >
                <Popup>
                  <div className="text-sm">
                    <strong className="text-[#21355a]">
                      Floodgate {gateCode}
                    </strong>
                    <p className="text-gray-600">
                      {String(props.OperatingAuthority)}
                    </p>
                    {status && (
                      <p className={`font-medium mt-1 ${status === "Open" ? "text-green-600" : "text-red-600"}`}>
                        {status}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Valves (toggleable) */}
        {layerVisibility.valves &&
          mapData.valves?.features.map((feature, index) => {
            const coords = feature.geometry.coordinates as [number, number];
            const props = feature.properties;
            return (
              <Marker
                key={`valve-${index}`}
                position={[coords[1], coords[0]]}
                icon={createDiamondIcon("#8b5cf6", 11)}
              >
                <Popup>
                  <div className="text-sm">
                    <strong className="text-[#21355a]">
                      Valve {String(props.GateCode)}
                    </strong>
                    <p className="text-gray-600">
                      {String(props.OperatingAuthority)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
      <MapLegend
        pccpCount={mapData.pccps?.features.length || 0}
        structureCount={mapData.structures?.features.length || 0}
        floodgateCount={mapData.floodgates?.features.length || 0}
        valveCount={mapData.valves?.features.length || 0}
        layerVisibility={layerVisibility}
        onToggleLayer={toggleLayer}
      />

    </div>
  );
}
