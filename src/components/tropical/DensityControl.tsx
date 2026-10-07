"use client";

import { DENSITY_SOURCE_LABEL } from "@/lib/tropical/density";
import type { DensityChoice } from "@/lib/tropical/layers";
import type { DensitySource } from "@/lib/tropical/types";

export interface DensityControlProps {
  choice: DensityChoice;
  onChange: (choice: DensityChoice) => void;
  /** Run time label ("06Z") per ensemble that has an image; absent = unavailable. */
  cycles: Partial<Record<DensitySource, string>>;
}

const SOURCES: DensitySource[] = ["gefs", "ecmwf", "google"];

/** Which ensemble's track density to draw, as a dropdown under "Forecast
 * model tracks" (Jeff, 2026-10-07). Options without an image for this storm
 * stay listed but disabled, so the choice never silently vanishes. The chosen
 * ensemble's run time sits beside the label in gray. */
export function DensityControl({ choice, onChange, cycles }: DensityControlProps) {
  const chosenCycle = choice === "off" ? undefined : cycles[choice];
  return (
    <label className="block rounded-md border border-gray-200 bg-white px-2.5 py-1.5">
      <span className="block text-xs">
        <b className="font-semibold text-gray-900">Ensemble paths</b>
        {chosenCycle && <span className="ml-1 text-gray-400">({chosenCycle})</span>}
      </span>
      <select
        className="mt-1 block w-full rounded border border-gray-200 bg-white py-0.5 pl-1.5 pr-6 text-[11px] text-gray-700 focus:border-[#21355a] focus:ring-1 focus:ring-[#21355a]"
        value={choice}
        onChange={(event) => onChange(event.target.value as DensityChoice)}
      >
        <option value="off">Off</option>
        {SOURCES.map((source) => (
          <option key={source} value={source} disabled={!cycles[source]}>
            {DENSITY_SOURCE_LABEL[source]}
            {cycles[source] ? ` (${cycles[source]})` : " (not available)"}
          </option>
        ))}
      </select>
    </label>
  );
}
