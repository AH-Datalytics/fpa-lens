"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { WW_COLORS, WW_LEGEND_ITEMS, wwKind } from "@/lib/tropical/mapStyle";
import { nolaHasHurricaneWarning } from "@/lib/tropical/nhcWarnings";
import { Kicker } from "./Kicker";

export interface CoastalAlertsLegendProps {
  warnings?: GeoJSON.FeatureCollection | null;
  publicAdvisoryText?: string | null;
}

/** Map key for the NHC watch/warning segments drawn directly along the coast. */
export function CoastalAlertsLegend({ warnings, publicAdvisoryText }: CoastalAlertsLegendProps) {
  const items = useMemo(() => {
    const present = new Set(
      (warnings?.features ?? []).map((feature) => wwKind(feature.properties?.TCWW as string | undefined))
    );
    return WW_LEGEND_ITEMS.filter((item) => present.has(item.kind));
  }, [warnings]);
  const nolaWarning = useMemo(
    () => nolaHasHurricaneWarning(publicAdvisoryText),
    [publicAdvisoryText]
  );

  if (items.length === 0) return null;

  return (
    <section className="border-b border-gray-200 py-4" aria-labelledby="coastal-alert-legend-title">
      <Kicker id="coastal-alert-legend-title">Warning summary</Kicker>
      <p className="text-sm font-semibold text-gray-900">NHC coastal alerts for this advisory.</p>
      {nolaWarning && (
        <div className="mt-2 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          <div>
            <b className="block text-sm font-semibold text-red-900">New Orleans metro area</b>
            <span className="block text-xs text-red-800">Hurricane warning in effect</span>
          </div>
        </div>
      )}
      <p className="mt-2 text-xs text-gray-500">Colors match the coastal lines on the map.</p>
      {/* One column on a phone: at 350px the four watch/warning labels wrap
          mid-phrase in two columns. */}
      <div className="mt-2 grid grid-cols-1 gap-x-3 gap-y-1.5 min-[420px]:grid-cols-2">
        {items.map((item) => (
          <div key={item.kind} className="flex items-center gap-2">
            <i
              className="h-1 w-6 shrink-0 rounded-full"
              style={{ background: WW_COLORS[item.kind] }}
              aria-hidden="true"
            />
            <span className="text-xs text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
