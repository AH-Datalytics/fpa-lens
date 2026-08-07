"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { DEMO_BASE } from "@/lib/tropical/config";
import { cdtDateTime } from "@/lib/tropical/format";
import type { StormEntry } from "@/lib/tropical/types";

export interface AdvisoryPlaybackProps {
  advisories: StormEntry[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

const FRAME_MS = 1800;

export function AdvisoryPlayback({
  advisories,
  currentIndex,
  onSelect,
}: AdvisoryPlaybackProps) {
  const [playing, setPlaying] = useState(false);
  const lastIndex = advisories.length - 1;
  const current = advisories[currentIndex];

  // Warm the browser cache one frame ahead so a playing replay changes all
  // essential map products together. Do not preload before Play: the large
  // optional wind-probability and satellite files made the initial Ida view
  // compete with an advisory the viewer had not requested yet.
  useEffect(() => {
    if (!playing) return;
    const next = advisories[currentIndex + 1];
    if (!next) return;
    const paths = [
      ...Object.values(next.files),
      ...(next.satellite ? [next.satellite.image] : []),
      ...(next.radar ? [next.radar.image] : []),
    ];
    for (const path of paths) {
      void fetch(`${DEMO_BASE}/${path}`, { cache: "force-cache" }).catch(() => undefined);
    }
  }, [advisories, currentIndex, playing]);

  useEffect(() => {
    if (!playing || currentIndex >= lastIndex) return;
    const timeout = window.setTimeout(() => {
      const nextIndex = currentIndex + 1;
      onSelect(nextIndex);
      if (nextIndex === lastIndex) setPlaying(false);
    }, FRAME_MS);
    return () => window.clearTimeout(timeout);
  }, [currentIndex, lastIndex, onSelect, playing]);

  if (!current || advisories.length < 2) return null;

  const choose = (index: number) => {
    setPlaying(false);
    onSelect(index);
  };

  const togglePlayback = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (currentIndex === lastIndex) onSelect(0);
    setPlaying(true);
  };

  const stepClass =
    "rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <section
      // Right edge stops short of the map options panel (w-64 + its own 0.75rem
      // inset) on screens wide enough to show that panel expanded.
      className="pointer-events-auto absolute bottom-3 left-3 right-3 z-10 rounded-lg border border-gray-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur md:right-[17.75rem]"
      aria-label="Hurricane Ida advisory replay"
    >
      <div className="flex flex-wrap items-baseline gap-x-2" aria-live="polite">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#21355a]">
          Ida forecast replay
        </span>
        <b className="text-sm font-semibold text-gray-900">Advisory {current.advisoryNum}</b>
        {/* The full timestamp is the first thing to go on a phone — the
            advisory number already identifies the frame. */}
        <time dateTime={current.advisoryTime} className="hidden text-[11px] text-gray-500 sm:inline">
          {cdtDateTime(current.advisoryTime)}
        </time>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <button
          type="button"
          className={stepClass}
          onClick={() => choose(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          aria-label="Previous advisory"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded-full bg-[#21355a] p-2 text-white hover:bg-[#2c3859]"
          onClick={togglePlayback}
          aria-label={playing ? "Pause advisory replay" : "Play advisory replay"}
          aria-pressed={playing}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={lastIndex}
            step={1}
            value={currentIndex}
            onChange={(event) => choose(Number(event.target.value))}
            aria-label="Choose an advisory"
            aria-valuetext={`Advisory ${current.advisoryNum}, ${cdtDateTime(current.advisoryTime)}`}
            className="w-full accent-[#21355a]"
          />
          <div className="flex justify-between text-[10px] text-gray-500" aria-hidden="true">
            <span>Adv {advisories[0].advisoryNum}</span>
            <b className="font-semibold text-gray-700">
              {currentIndex + 1} of {advisories.length}
            </b>
            <span>Adv {advisories[lastIndex].advisoryNum}</span>
          </div>
        </div>
        <button
          type="button"
          className={stepClass}
          onClick={() => choose(Math.min(lastIndex, currentIndex + 1))}
          disabled={currentIndex === lastIndex}
          aria-label="Next advisory"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
