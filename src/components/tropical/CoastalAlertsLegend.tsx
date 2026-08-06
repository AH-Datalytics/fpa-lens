"use client";

import { AlertTriangle } from "lucide-react";
import { WW_COLORS, WW_LEGEND_ITEMS, wwKind, type WWKind } from "@/lib/tropical/mapStyle";
import { nolaHasHurricaneWarning } from "@/lib/tropical/nhcWarnings";
import { Kicker } from "./Kicker";

/**
 * Which watch/warning kinds this advisory actually carries. Exported so the
 * summary strip can decide whether the section has anything to say *before*
 * laying out its columns — a section that renders nothing must not be handed a
 * column and a divider.
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

/** Map key for the NHC watch/warning segments drawn directly along the coast. */
export function CoastalAlertsLegend({ items, publicAdvisoryText }: CoastalAlertsLegendProps) {
  const nolaWarning = nolaHasHurricaneWarning(publicAdvisoryText);

  return (
    <section aria-labelledby="coastal-alert-legend-title">
      <Kicker id="coastal-alert-legend-title">Warning summary</Kicker>
      {nolaWarning && (
        <div className="mb-2 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          <div>
            <b className="block text-sm font-semibold text-red-900">New Orleans metro area</b>
            <span className="block text-xs text-red-800">Hurricane warning in effect</span>
          </div>
        </div>
      )}
      <p className="text-sm leading-relaxed text-gray-600">
        NHC coastal alerts for this advisory. Colors match the lines on the map.
      </p>
      <div className="mt-2 space-y-1">
        {items.map((item) => (
          <div key={item.kind} className="flex items-center gap-2">
            <i
              className="h-1 w-6 shrink-0 rounded-full"
              style={{ background: WW_COLORS[item.kind] }}
              aria-hidden="true"
            />
            <span className="text-xs text-gray-700">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
