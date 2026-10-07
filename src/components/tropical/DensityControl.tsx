"use client";

import { Check } from "lucide-react";
import { DENSITY_SOURCE_LABEL } from "@/lib/tropical/density";
import type { DensityChoice } from "@/lib/tropical/layers";
import type { DensitySource } from "@/lib/tropical/types";
import { Kicker } from "./Kicker";

export interface DensityControlProps {
  choice: DensityChoice;
  onChange: (choice: DensityChoice) => void;
  available: Partial<Record<DensitySource, boolean>>;
}

const SOURCES: DensitySource[] = ["gefs", "google"];

function choiceClass(selected: boolean, disabled: boolean): string {
  if (disabled) {
    return "flex w-full items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-left cursor-not-allowed opacity-50";
  }
  return `flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left ${
    selected ? "border-[#21355a] bg-[#21355a]/5" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
  }`;
}

/** Which ensemble's track density to draw. Options without an image for this
 * storm stay visible but disabled, so the choice never silently vanishes. */
export function DensityControl({ choice, onChange, available }: DensityControlProps) {
  return (
    <section className="border-b border-gray-200 px-3.5 py-2.5" aria-labelledby="track-density-heading">
      <Kicker id="track-density-heading">Track density</Kicker>
      <div className="space-y-1">
        <button
          type="button"
          className={choiceClass(choice === "off", false)}
          onClick={() => onChange("off")}
          aria-pressed={choice === "off"}
        >
          <b className="text-xs font-semibold text-gray-900">Off</b>
          {choice === "off" && <Check className="h-4 w-4 shrink-0 text-[#21355a]" aria-hidden="true" />}
        </button>
        {SOURCES.map((source) => {
          const ok = Boolean(available[source]);
          return (
            <button
              key={source}
              type="button"
              disabled={!ok}
              className={choiceClass(choice === source, !ok)}
              onClick={() => onChange(source)}
              aria-pressed={choice === source}
            >
              <span>
                <b className="block text-xs font-semibold text-gray-900">{DENSITY_SOURCE_LABEL[source]}</b>
                {!ok && <small className="block text-[11px] text-gray-500">Not available for this storm</small>}
              </span>
              {choice === source && <Check className="h-4 w-4 shrink-0 text-[#21355a]" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
