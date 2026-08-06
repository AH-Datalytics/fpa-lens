"use client";

import { useEffect, useState } from "react";
import type { StormEntry } from "@/lib/tropical/types";
import { categoryColor } from "@/lib/tropical/categoryColors";
import { categoryFor, cdtDateTime, cdtTime, countdown, stormTypeLabel } from "@/lib/tropical/format";

/** Ticks once a second so the advisory countdown stays live without a page reload. */
function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** "Category 2" for numeric categories, "TS"/"TD" as-is otherwise. */
function catChipText(intensityMph: number): string {
  const cat = categoryFor(intensityMph);
  return /^\d$/.test(cat) ? `Category ${cat}` : cat;
}

/** One inline figure: small label over a large value. */
function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500">
        {label}
      </div>
      <div className="text-lg font-semibold leading-tight tabular-nums text-gray-900">
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-gray-500">{unit}</span>}
      </div>
    </div>
  );
}

export interface StormHeaderProps {
  storm: StormEntry;
}

/**
 * The storm's headline figures as one horizontal band: name and category on
 * the left, the live numbers running across, advisory timing on the right.
 *
 * Deliberately not a card of stacked label/value rows — that shape forced a
 * tall column beside much shorter neighbours and left the strip full of dead
 * space. Inline groups that wrap keep it to a couple of lines at any width.
 */
export function StormHeader({ storm }: StormHeaderProps) {
  const now = useNow(1000);

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
      <div className="flex items-center gap-3">
        <span
          className="h-10 w-1.5 shrink-0 rounded-full"
          style={{ background: categoryColor(storm.intensityMph) }}
          aria-hidden="true"
        />
        <div>
          <h2 className="text-xl font-bold leading-tight text-[#21355a] sm:text-2xl">
            {stormTypeLabel(storm.classification)} {storm.name}
          </h2>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {catChipText(storm.intensityMph)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <Stat label="Winds" value={String(storm.intensityMph)} unit="mph" />
        <Stat label="Pressure" value={String(storm.pressureMb)} unit="mb" />
        <Stat label="Moving" value={`${storm.movementDir} ${storm.movementMph}`} unit="mph" />
      </div>

      <div className="ml-auto text-xs leading-relaxed text-gray-500">
        <div>
          Advisory <b className="font-semibold text-gray-700">{storm.advisoryNum}</b> ·{" "}
          {cdtDateTime(storm.advisoryTime)}
        </div>
        <div title={countdown(storm.nextAdvisoryTime, now)}>
          Next update{" "}
          <b className="font-semibold text-gray-700">{cdtTime(storm.nextAdvisoryTime)}</b>
        </div>
      </div>
    </div>
  );
}
