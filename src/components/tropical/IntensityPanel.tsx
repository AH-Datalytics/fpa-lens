"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { CATEGORY_THRESHOLDS_MPH } from "@/lib/tropical/config";
import { cdtTickLabel } from "@/lib/tropical/format";
import { landfallTau } from "@/lib/tropical/landfall";
import { DEFAULT_MODEL_COLOR, MODEL_COLORS, modelDescription } from "@/lib/tropical/modelColors";
import type { IntensitySeries, StormEntry } from "@/lib/tropical/types";

export interface IntensityPanelProps {
  intensity: IntensitySeries;
  storm: StormEntry;
  track?: GeoJSON.FeatureCollection;
  visibleModels: Set<string>;
  /** Closes the pop-out (same as toggling "Intensity graph" in map options). */
  onClose: () => void;
}

// Series with no map-toggle checkbox in ModelLegend (they're intensity-only
// statistical/consensus guidance with no forecast track to draw) — these
// always render here regardless of `visibleModels`, same as OFCL, because
// there's no other UI for a user to ever make them visible otherwise. IVCN
// (Intensity Consensus) structurally has no ATCF position either (see
// ingest/gulfwatch/adeck.py's INTENSITY_ONLY).
const ALWAYS_ON_MODELS = new Set(["OFCL", "DSHP", "LGEM", "IVCN"]);

// A band whose visible slice (after clamping to yMax) is thinner than this
// many mph renders as an unreadable sliver whose right-edge label collides
// with its neighbor's — e.g. a mild TS-strength forecast puts yMax at 75,
// leaving only 1 mph of CAT1 band (74-75) visible, which put "CAT 1" and "TS"
// literally on top of each other. Bands under the threshold are dropped
// entirely rather than rendered unreadably.
const MIN_VISIBLE_BAND_MPH = 8;

// Chart chrome, matching the FPA Lens palette used by the other Recharts
// dashboards (environment, finance): gray-200 rules, gray-500 tick labels,
// navy for the official track, warm orange for the landfall marker.
const RULE = "#e5e7eb";
const TICK = "#6b7280";
const ACCENT = "#21355a";
const ACCENT_2 = "#c2703d";

// The standard Saffir-Simpson color ramp (the one NHC's own track maps and
// every news graphic use): cyan for tropical-storm force climbing through
// yellow and orange to red at Category 5. An earlier pale-blue-to-warm wash
// was too low-contrast to tell the bands apart — feedback from Jeff and Ben,
// Aug 2026. These run at full saturation with a modest fill opacity so the
// boundaries stay crisp while the model lines still read on top.
const CATEGORY_BANDS = [
  { lower: CATEGORY_THRESHOLDS_MPH.TS, upper: CATEGORY_THRESHOLDS_MPH.C1, label: "TS", color: "#5ebaff" },
  { lower: CATEGORY_THRESHOLDS_MPH.C1, upper: CATEGORY_THRESHOLDS_MPH.C2, label: "CAT 1", color: "#ffffb2" },
  { lower: CATEGORY_THRESHOLDS_MPH.C2, upper: CATEGORY_THRESHOLDS_MPH.C3, label: "CAT 2", color: "#ffe775" },
  { lower: CATEGORY_THRESHOLDS_MPH.C3, upper: CATEGORY_THRESHOLDS_MPH.C4, label: "CAT 3", color: "#ffc140" },
  { lower: CATEGORY_THRESHOLDS_MPH.C4, upper: CATEGORY_THRESHOLDS_MPH.C5, label: "CAT 4", color: "#ff8f20" },
  { lower: CATEGORY_THRESHOLDS_MPH.C5, upper: Infinity, label: "CAT 5", color: "#ff6060" },
] as const;

function addHoursIso(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * 3600_000).toISOString();
}

/** [0, top] where top is the smallest multiple of 25 that clears max(series mph) + a half-band of padding. */
function yDomain(series: IntensitySeries["series"]): [number, number] {
  let max = 0;
  for (const s of series) for (const p of s.points) max = Math.max(max, p.mph);
  const padded = Math.max(max, CATEGORY_THRESHOLDS_MPH.TS) + 15;
  const top = Math.ceil(padded / 25) * 25;
  return [0, top];
}

function maxTau(series: IntensitySeries["series"]): number {
  let max = 0;
  for (const s of series) for (const p of s.points) max = Math.max(max, p.tauH);
  return max;
}

/** Y-axis ticks every 25 mph from 0 to yMax inclusive (yMax is itself always
 *  a multiple of 25 — see yDomain above). */
function buildYTicks(yMax: number): number[] {
  const ticks: number[] = [];
  for (let v = 0; v <= yMax; v += 25) ticks.push(v);
  return ticks;
}

/** 5 evenly-spaced tick hours across [0, maxTauH], deduped for tiny ranges. */
function buildTicks(maxTauH: number): number[] {
  if (maxTauH <= 0) return [0];
  const steps = 4;
  const ticks = Array.from({ length: steps + 1 }, (_, i) => Math.round((i * maxTauH) / steps));
  return Array.from(new Set(ticks));
}

function modelColor(model: string): string {
  return MODEL_COLORS[model] ?? DEFAULT_MODEL_COLOR;
}

function categoryLabel(mph: number): string {
  if (mph >= CATEGORY_THRESHOLDS_MPH.C5) return "Category 5";
  if (mph >= CATEGORY_THRESHOLDS_MPH.C4) return "Category 4";
  if (mph >= CATEGORY_THRESHOLDS_MPH.C3) return "Category 3";
  if (mph >= CATEGORY_THRESHOLDS_MPH.C2) return "Category 2";
  if (mph >= CATEGORY_THRESHOLDS_MPH.C1) return "Category 1";
  if (mph >= CATEGORY_THRESHOLDS_MPH.TS) return "Tropical storm";
  return "Below tropical-storm force";
}

interface IntensityTooltipProps extends TooltipContentProps {
  advisoryTime: string;
}

function IntensityTooltip({ active, payload, label, advisoryTime }: IntensityTooltipProps) {
  if (!active || !payload || payload.length === 0 || typeof label !== "number") return null;
  const entries = payload.filter((p) => p.value != null);
  if (entries.length === 0) return null;

  const tauLabel = label === 0 ? "NOW" : cdtTickLabel(addHoursIso(advisoryTime, label));

  return (
    <div className="rounded-md border border-gray-200 bg-white/95 px-2.5 py-2 text-xs shadow-lg backdrop-blur">
      <div className="mb-1 font-semibold text-gray-900">{tauLabel}</div>
      {entries.map((p) => (
        <div className="flex items-center gap-1.5 text-gray-600" key={String(p.dataKey)}>
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: p.color }}
            aria-hidden="true"
          />
          <span>{p.name}</span>
          <b className="ml-auto pl-2 font-semibold tabular-nums text-gray-900">
            {Math.round(Number(p.value))} mph
          </b>
        </div>
      ))}
    </div>
  );
}

/**
 * Intensity guidance — each model's max-sustained-wind forecast plotted
 * against the Saffir-Simpson category ladder.
 *
 * A pop-out over the map, opened from "Intensity graph" in map options, same
 * as the forecast discussion. It briefly lived as a section below the map
 * instead; that made the map-options button confusing, because clicking
 * "Open" scrolled nothing into view. Over the map, "Open" does something you
 * can see immediately.
 *
 * The caller positions it: staying clear of the map options panel and of the
 * advisory scrubber (which only exists during a replay) is knowledge the page
 * has and this component does not.
 */
export function IntensityPanel({ intensity, storm, track, visibleModels, onClose }: IntensityPanelProps) {
  const displayedSeries = useMemo(() => {
    const filtered = intensity.series.filter(
      (s) => ALWAYS_ON_MODELS.has(s.model) || visibleModels.has(s.model)
    );
    // OFCL drawn last so its line stacks on top of the spaghetti.
    return [...filtered.filter((s) => s.model !== "OFCL"), ...filtered.filter((s) => s.model === "OFCL")];
  }, [intensity.series, visibleModels]);

  const [, yMax] = useMemo(() => yDomain(intensity.series), [intensity.series]);
  const maxTauH = useMemo(() => maxTau(intensity.series), [intensity.series]);
  const ticks = useMemo(() => buildTicks(maxTauH), [maxTauH]);
  const yTicks = useMemo(() => buildYTicks(yMax), [yMax]);
  const landfall = useMemo(() => landfallTau(track, intensity), [track, intensity]);
  const officialPeak = useMemo(() => {
    const official = intensity.series.find((series) => series.model === "OFCL");
    return official ? Math.max(...official.points.map((point) => point.mph)) : null;
  }, [intensity.series]);

  const chartData = useMemo(() => {
    const taus = Array.from(new Set(displayedSeries.flatMap((s) => s.points.map((p) => p.tauH)))).sort(
      (a, b) => a - b
    );
    return taus.map((tauH) => {
      const row: Record<string, number> = { tauH };
      for (const s of displayedSeries) {
        const point = s.points.find((p) => p.tauH === tauH);
        if (point) row[s.model] = point.mph;
      }
      return row;
    });
  }, [displayedSeries]);

  const visibleBands = CATEGORY_BANDS.filter(
    (b) => Math.min(b.upper, yMax) - b.lower >= MIN_VISIBLE_BAND_MPH
  );

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white/95 shadow-xl backdrop-blur">
      <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-2.5">
        <div>
          <div className="text-sm font-semibold text-[#21355a]">Intensity forecast</div>
          <div className="text-xs text-gray-500">
            Maximum sustained winds · next {maxTauH} hours
          </div>
        </div>
        {officialPeak != null && (
          <div className="text-right">
            <span className="block text-[10px] uppercase tracking-wide text-gray-400">
              Official peak
            </span>
            <b className="block text-sm font-semibold tabular-nums text-gray-900">
              {Math.round(officialPeak)} mph
            </b>
            <small className="block text-[11px] text-gray-500">{categoryLabel(officialPeak)}</small>
          </div>
        )}
        <button
          type="button"
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close intensity forecast"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="h-52 px-2 pt-2 sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 46, bottom: 4, left: 4 }}>
            <XAxis
              dataKey="tauH"
              type="number"
              domain={[0, maxTauH || 1]}
              ticks={ticks}
              tickFormatter={(value: number) =>
                value === 0 ? "Now" : cdtTickLabel(addHoursIso(storm.advisoryTime, value))
              }
              stroke={RULE}
              tick={{ fill: TICK, fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              domain={[0, yMax]}
              ticks={yTicks}
              tickFormatter={(value: number) => `${value}`}
              width={44}
              axisLine={false}
              tickLine={false}
              tick={{ fill: TICK, fontSize: 12 }}
              label={{
                value: "mph",
                angle: -90,
                position: "insideLeft",
                fill: TICK,
                fontSize: 11.5,
              }}
            />
            <CartesianGrid horizontal vertical={false} stroke={RULE} strokeDasharray="3 3" />
            {visibleBands.map((b) => (
              <ReferenceArea
                key={b.label}
                y1={b.lower}
                y2={Math.min(b.upper, yMax)}
                fill={b.color}
                fillOpacity={0.55}
                // A hairline in the band's own color separates neighbours
                // cleanly instead of letting two washes blur together.
                stroke={b.color}
                strokeOpacity={0.9}
                ifOverflow="visible"
                label={{
                  value: b.label,
                  position: "insideTopRight",
                  fill: "#3f4a52",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            ))}
            {landfall != null && (
              <ReferenceLine
                x={landfall}
                stroke={ACCENT_2}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                ifOverflow="visible"
                label={{
                  // "top" — above the plot area entirely (in the enlarged top
                  // margin), not "insideTopRight": the category bands' own
                  // right-edge labels live inside the plot at the same corner,
                  // and when the landfall tau lands at (or near) the chart's
                  // rightmost edge the two would otherwise collide.
                  value: "Landfall",
                  position: "top",
                  fill: ACCENT_2,
                  fontSize: 11.5,
                  fontWeight: 600,
                }}
              />
            )}
            {displayedSeries.map((s) => (
              <Line
                key={s.model}
                dataKey={s.model}
                name={s.label}
                stroke={modelColor(s.model)}
                strokeWidth={s.model === "OFCL" ? 2.8 : 1.6}
                strokeDasharray={s.kind === "ai" ? "5 4" : undefined}
                dot={s.model === "OFCL" ? { r: 3.5, fill: ACCENT, strokeWidth: 0 } : false}
                activeDot={{ r: 3.5 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
            <Tooltip
              content={(props) => <IntensityTooltip {...props} advisoryTime={storm.advisoryTime} />}
              cursor={{ stroke: RULE }}
              wrapperStyle={{ outline: "none" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-200 px-4 py-2"
        aria-label="Visible intensity guidance"
      >
        <span className="text-[11px] text-gray-400">Hover a model for what it is:</span>
        {displayedSeries.map((series) => (
          <span
            key={series.model}
            title={modelDescription(series.model, series.label)}
            className={`flex cursor-help items-center gap-1.5 text-[11px] ${
              series.model === "OFCL" ? "font-semibold text-gray-900" : "text-gray-600"
            }`}
          >
            <i
              className="h-0.5 w-3.5 rounded-full"
              style={{ background: modelColor(series.model) }}
              aria-hidden="true"
            />
            {series.model === "OFCL" ? "Official NHC" : series.label}
          </span>
        ))}
      </div>
    </div>
  );
}
