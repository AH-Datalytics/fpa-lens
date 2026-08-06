"use client";

import { useEffect, useState } from "react";
import { Wind, Gauge, Navigation, FileText, Clock } from "lucide-react";
import type { StormEntry } from "@/lib/tropical/types";
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

/** Red for hurricane strength, amber for anything weaker. */
function catChipClass(intensityMph: number): string {
  return /^\d$/.test(categoryFor(intensityMph))
    ? "bg-red-100 text-red-800"
    : "bg-amber-100 text-amber-800";
}

export interface StormHeaderProps {
  storm: StormEntry;
}

const ROW = "flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-b-0";
const LABEL = "flex-1 text-sm text-gray-500";

export function StormHeader({ storm }: StormHeaderProps) {
  const now = useNow(1000);

  return (
    <div>
      <h2 className="text-2xl font-bold leading-tight text-[#21355a]">
        {stormTypeLabel(storm.classification)} {storm.name}
      </h2>
      <span
        className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${catChipClass(
          storm.intensityMph
        )}`}
      >
        {catChipText(storm.intensityMph)}
      </span>

      <div className="mt-3">
        <div className={ROW}>
          <Wind className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          <span className={LABEL}>Winds</span>
          <b className="tabular-nums text-gray-900">
            {storm.intensityMph} <small className="font-normal text-gray-500">mph</small>
          </b>
        </div>
        <div className={ROW}>
          <Gauge className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          <span className={LABEL}>Pressure</span>
          <b className="tabular-nums text-gray-900">
            {storm.pressureMb} <small className="font-normal text-gray-500">mb</small>
          </b>
        </div>
        <div className={ROW}>
          <Navigation className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          <span className={LABEL}>Motion</span>
          <b className="tabular-nums text-gray-900">
            {storm.movementDir} at {storm.movementMph}{" "}
            <small className="font-normal text-gray-500">mph</small>
          </b>
        </div>
        <div className={`${ROW} items-start`}>
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          <span className={LABEL}>Advisory</span>
          <b className="max-w-[60%] text-right text-gray-900">
            {storm.advisoryNum} · {cdtDateTime(storm.advisoryTime)}
          </b>
        </div>
        <div className={ROW}>
          <Clock className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          <span className={LABEL}>Next update</span>
          <b className="text-gray-900" title={countdown(storm.nextAdvisoryTime, now)}>
            {cdtTime(storm.nextAdvisoryTime)}
          </b>
        </div>
      </div>
    </div>
  );
}
