"use client";

import { AlertTriangle } from "lucide-react";
import { WW_COLORS, WW_LEGEND_ITEMS, wwKind, type WWKind } from "@/lib/tropical/mapStyle";
import { nolaHasHurricaneWarning } from "@/lib/tropical/nhcWarnings";

/**
 * Which watch/warning kinds this advisory actually carries. Exported so the
 * banner can skip the whole run when there are none, rather than printing a
 * heading with nothing under it.
 */
export function coastalLegendItems(
  warnings?: GeoJSON.FeatureCollection | null
): ReadonlyArray<{ kind: WWKind; label: string }> {
  const present = new Set(
    (warnings?.features ?? []).map((feature) => wwKind(feature.properties?.TCWW as string | undefined))
  );
  return WW_LEGEND_ITEMS.filter((item) => present.has(item.kind));
}

export interface CoastalAlertsLegendProps {
  items: ReadonlyArray<{ kind: WWKind; label: string }>;
  publicAdvisoryText?: string | null;
}

/**
 * Key for the NHC watch/warning segments drawn along the coast, as an inline
 * run of colored labels — it is a map legend, so it should cost one line, not
 * a column.
 */
export function CoastalAlertsLegend({ items, publicAdvisoryText }: CoastalAlertsLegendProps) {
  const nolaWarning = nolaHasHurricaneWarning(publicAdvisoryText);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#21355a]">
        In effect
        <span className="ml-1.5 font-normal normal-case tracking-normal text-gray-500">
          matches the coastal lines on the map
        </span>
      </span>
      {items.map((item) => (
        <span key={item.kind} className="flex items-center gap-1.5">
          <i
            className="h-1 w-5 shrink-0 rounded-full"
            style={{ background: WW_COLORS[item.kind] }}
            aria-hidden="true"
          />
          <span className="whitespace-nowrap text-xs text-gray-700">{item.label}</span>
        </span>
      ))}
      {nolaWarning && (
        <span className="flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-900">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600" aria-hidden="true" />
          Hurricane warning for the New Orleans metro area
        </span>
      )}
    </div>
  );
}
