"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { LayerKey, LayerState, WindThreshold } from "@/lib/tropical/layers";
import { WIND_FIELD_BANDS, WIND_PROB_BANDS } from "@/lib/tropical/mapStyle";
import { cdtDateTime } from "@/lib/tropical/format";
import { radarAgeMinutes, RADAR_STALE_AFTER_MINUTES } from "@/lib/tropical/radar";
import { Kicker } from "./Kicker";
import { ModelLegend } from "./ModelLegend";

export interface LayersControlProps {
  layers: LayerState;
  onToggle: (key: LayerKey) => void;
  hasHistory: boolean;
  hasSatellite: boolean;
  satelliteLabel?: string;
  hasWindField: boolean;
  availableWindThresholds: WindThreshold[];
  windThreshold: WindThreshold;
  onWindThresholdChange: (threshold: WindThreshold) => void;
  visibleModels: Set<string>;
  onVisibleModelsChange: (next: Set<string>) => void;
  models?: GeoJSON.FeatureCollection | null;
  cycleLabel?: string;
  windProbLoading?: boolean;
  windProbError?: boolean;
  windFieldLoading?: boolean;
  windFieldError?: boolean;
  radarValid?: string;
  radarLoading?: boolean;
  radarError?: boolean;
  radarHistorical?: boolean;
  hasDiscussion: boolean;
  discussionOpen: boolean;
  onDiscussionToggle: () => void;
  hasIntensity: boolean;
  intensityOpen: boolean;
  onIntensityToggle: () => void;
}

const WIND_THRESHOLD_LABELS: Record<WindThreshold, string> = {
  39: "39 mph · tropical-storm force",
  58: "58 mph · damaging winds",
  74: "74 mph · hurricane force",
};

const CHECKBOX =
  "h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-[#21355a] focus:ring-1 focus:ring-[#21355a] disabled:cursor-not-allowed";
const STATUS_NOTE = "mt-0.5 pl-5 text-[11px] text-gray-500";
/** Shared section padding — tuned so the whole panel clears a 40rem map
 *  without an inner scrollbar on a laptop (Jeff, Aug 2026). */
const SECTION = "border-b border-gray-200 px-3.5 py-2.5";

function layerRowClass(disabled?: boolean): string {
  return `flex items-center gap-2 py-0.5 text-xs ${
    disabled ? "cursor-not-allowed text-gray-400" : "cursor-pointer text-gray-700"
  }`;
}

/** One map-options panel for forecast interpretation and weather overlays.
 * Technical model codes remain behind an advanced disclosure. */
export function LayersControl({
  layers,
  onToggle,
  hasHistory,
  hasSatellite,
  satelliteLabel,
  hasWindField,
  availableWindThresholds = [],
  windThreshold,
  onWindThresholdChange,
  visibleModels,
  onVisibleModelsChange,
  models,
  cycleLabel,
  windProbLoading,
  windProbError,
  windFieldLoading,
  windFieldError,
  radarValid,
  radarLoading,
  radarError,
  radarHistorical,
  hasDiscussion,
  discussionOpen,
  onDiscussionToggle,
  hasIntensity,
  intensityOpen,
  onIntensityToggle,
}: LayersControlProps) {
  // Collapsed on small screens: an open panel would cover most of the map.
  const [open, setOpen] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 768
  );
  const hasWindProb = availableWindThresholds.length > 0;

  return (
    <div className="flex max-h-full w-64 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
      <button
        type="button"
        className="flex w-full shrink-0 items-center justify-between gap-2 bg-[#21355a] px-3.5 py-2 text-left text-white"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">Map options</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "" : "-rotate-90"}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="min-h-0 overflow-y-auto">
          {models && (
            <ModelLegend
              visibleModels={visibleModels}
              onChange={onVisibleModelsChange}
              enabled={layers.models}
              onEnabledChange={(enabled) => {
                if (enabled !== layers.models) onToggle("models");
              }}
              cycleLabel={cycleLabel}
              models={models}
            />
          )}

          <section className={SECTION} aria-labelledby="weather-overlays-heading">
            <Kicker id="weather-overlays-heading">Weather overlays</Kicker>
            <label className={layerRowClass()}>
              <input
                type="checkbox"
                className={CHECKBOX}
                checked={layers.cone}
                onChange={() => onToggle("cone")}
              />
              Forecast cone
            </label>
            {hasHistory && (
              <label className={layerRowClass()}>
                <input
                  type="checkbox"
                  className={CHECKBOX}
                  checked={layers.history}
                  onChange={() => onToggle("history")}
                />
                Past track <small className="text-[9px] uppercase text-gray-400">observed</small>
              </label>
            )}
            {hasSatellite && (
              <>
                <label className={layerRowClass()}>
                  <input
                    type="checkbox"
                    className={CHECKBOX}
                    checked={layers.satellite}
                    onChange={() => onToggle("satellite")}
                  />
                  Satellite imagery
                </label>
                {layers.satellite && (
                  <div className={STATUS_NOTE}>GOES-16 · {satelliteLabel}</div>
                )}
              </>
            )}
            <label className={layerRowClass(!hasWindField)}>
              <input
                type="checkbox"
                className={CHECKBOX}
                checked={layers.windField}
                disabled={!hasWindField}
                onChange={() => onToggle("windField")}
              />
              Wind field
            </label>
            {hasWindField && layers.windField && (
              <div className="mt-1 pl-5">
                <div className="text-[11px] text-gray-500">Current analyzed wind extent</div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1" aria-label="Wind field thresholds">
                  {WIND_FIELD_BANDS.map((band) => (
                    <span key={band.knots} className="flex items-center gap-1 text-[11px] text-gray-600">
                      <i
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ background: band.color }}
                        aria-hidden="true"
                      />
                      {band.mph} mph
                    </span>
                  ))}
                </div>
                {windFieldLoading && <div className="mt-1 text-[11px] text-gray-500">Loading wind field…</div>}
                {windFieldError && (
                  <div className="mt-1 text-[11px] text-amber-700">Wind field unavailable</div>
                )}
              </div>
            )}
            <label className={layerRowClass(!hasWindProb)}>
              <input
                type="checkbox"
                className={CHECKBOX}
                checked={layers.windProb}
                disabled={!hasWindProb}
                onChange={() => onToggle("windProb")}
              />
              Wind probability
            </label>
            {hasWindProb && layers.windProb && (
              <div className="mt-1 pl-5">
                <label htmlFor="wind-speed-threshold" className="block text-[11px] text-gray-500">
                  Winds reaching at least
                </label>
                <select
                  id="wind-speed-threshold"
                  value={windThreshold}
                  onChange={(event) =>
                    onWindThresholdChange(Number(event.target.value) as WindThreshold)
                  }
                  className="mt-1 w-full rounded border border-gray-200 bg-white px-1.5 py-1 text-[11px] text-gray-700"
                >
                  {availableWindThresholds.map((threshold) => (
                    <option value={threshold} key={threshold}>
                      {WIND_THRESHOLD_LABELS[threshold]}
                    </option>
                  ))}
                </select>
                {windProbLoading && (
                  <div className="mt-1 text-[11px] text-gray-500">Loading probability map…</div>
                )}
                {windProbError && (
                  <div className="mt-1 text-[11px] text-amber-700">Probability map unavailable</div>
                )}
                <div className="mt-1.5">
                  <div className="flex h-2 overflow-hidden rounded-sm">
                    {WIND_PROB_BANDS.map((band) => (
                      <span key={band.label} className="flex-1" style={{ background: band.color }} />
                    ))}
                  </div>
                  <div className="mt-0.5 flex justify-between text-[10px] text-gray-500">
                    <span>&lt;5%</span>
                    <span>Probability</span>
                    <span>&gt;90%</span>
                  </div>
                </div>
              </div>
            )}
            <label className={layerRowClass()}>
              <input
                type="checkbox"
                className={CHECKBOX}
                checked={layers.radar}
                onChange={() => onToggle("radar")}
              />
              Radar
            </label>
            {layers.radar && (
              <RadarFreshness
                valid={radarValid}
                loading={radarLoading}
                error={radarError}
                historical={radarHistorical}
              />
            )}
          </section>

          <section className="px-3.5 py-2.5" aria-labelledby="forecast-details-heading">
            <Kicker id="forecast-details-heading">Forecast details</Kicker>
            <div className="space-y-1">
              <MapActionButton
                label="Intensity graph"
                state={hasIntensity ? (intensityOpen ? "Close" : "Open") : "Unavailable"}
                active={intensityOpen}
                disabled={!hasIntensity}
                pressed={intensityOpen}
                onClick={onIntensityToggle}
              />
              <MapActionButton
                label="Forecast discussion"
                state={discussionOpen ? "Close" : "Open"}
                active={discussionOpen}
                disabled={!hasDiscussion}
                pressed={discussionOpen}
                onClick={onDiscussionToggle}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function MapActionButton({
  label,
  state,
  active,
  disabled,
  pressed,
  onClick,
}: {
  label: string;
  state: string;
  active: boolean;
  disabled: boolean;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs ${
        disabled
          ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
          : active
            ? "border-[#21355a] bg-[#21355a]/5 text-gray-900"
            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
      }`}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={pressed}
    >
      <span>{label}</span>
      <small className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        {state}
      </small>
    </button>
  );
}

function RadarFreshness({
  valid,
  loading,
  error,
  historical,
}: {
  valid?: string;
  loading?: boolean;
  error?: boolean;
  historical?: boolean;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const dot = <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" />;

  if (historical) {
    if (loading) return <div className={STATUS_NOTE}>Loading historical radar...</div>;
    if (error || !valid) {
      return <div className={`${STATUS_NOTE} text-amber-700`}>Historical radar unavailable</div>;
    }
    return (
      <div className={`${STATUS_NOTE} flex items-center gap-1.5`}>
        {dot}
        Historical radar · {cdtDateTime(valid)}
      </div>
    );
  }

  const age = valid ? radarAgeMinutes(valid, now) : null;
  const stale = age !== null && age > RADAR_STALE_AFTER_MINUTES;

  if (loading) return <div className={STATUS_NOTE}>Checking radar time...</div>;
  if (error || !valid) {
    return (
      <div className={`${STATUS_NOTE} text-amber-700`}>
        Radar time unavailable; image may be delayed
      </div>
    );
  }

  return (
    <div className={`${STATUS_NOTE} flex items-center gap-1.5 ${stale ? "text-amber-700" : ""}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${stale ? "bg-amber-500" : "bg-green-500"}`}
        aria-hidden="true"
      />
      {stale ? "Radar delayed" : "Latest image"} · {cdtDateTime(valid)} ·{" "}
      {age === 0 ? "less than a minute old" : `${age} min old`}
    </div>
  );
}
