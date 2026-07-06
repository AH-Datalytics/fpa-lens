"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Wind,
  Waves,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Info,
  RefreshCw,
  ExternalLink,
  Download,
  Camera,
  Clock,
  Compass,
} from "lucide-react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { toPng } from "html-to-image";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import DataCard from "@/components/DataCard";
import { RiskIndicator } from "@/components/RiskBadge";
import RiskBadge from "@/components/RiskBadge";
import type { LakefrontData, RiskLevel } from "@/lib/lakefrontRisk";
import { RISK_THRESHOLDS } from "@/lib/lakefrontRisk";
import { usePageCopy } from "@/lib/usePageCopy";
import { ENVIRONMENT_DEFAULTS } from "@/globals/pages/environmentPage";

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

const RISK_COLORS: Record<RiskLevel, string> = {
  GREEN: "#16a34a",
  YELLOW: "#ca8a04",
  ORANGE: "#ea580c",
  RED: "#dc2626",
};

const TRENDING_ICONS = {
  improving: TrendingDown,
  stable: Minus,
  worsening: TrendingUp,
};

const TRENDING_LABELS = {
  improving: "Improving forecast",
  stable: "Stable forecast",
  worsening: "Worsening forecast",
};

const TRENDING_TOOLTIPS = {
  improving: "The risk indicator is expected to ease over the next ~6 hours based on NWS and NOAA forecasts.",
  stable: "The risk indicator is expected to stay at this level over the next ~6 hours based on NWS and NOAA forecasts.",
  worsening: "The risk indicator is expected to escalate over the next ~6 hours based on NWS and NOAA forecasts.",
};

const TRENDING_COLORS = {
  improving: "text-green-600",
  stable: "text-gray-500",
  worsening: "text-red-600",
};

const CENTRAL_TZ = "America/Chicago";

/**
 * Normalize a timestamp to a proper Date. NOAA timestamps come back
 * as "YYYY-MM-DD HH:MM" in Central Time (we request time_zone=lst_ldt)
 * but without timezone info. We append the Central offset so JS doesn't
 * misinterpret them as UTC. NWS timestamps already include offset (-05:00).
 */
function parseCentralTimestamp(ts: string): Date {
  // Already has timezone info (ISO 8601 with offset or Z)
  if (ts.includes("T") && (ts.includes("+") || ts.includes("Z") || ts.match(/-\d{2}:\d{2}$/))) {
    return new Date(ts);
  }
  // NOAA format: "YYYY-MM-DD HH:MM" — treat as Central Time.
  // Determine offset by checking if CDT or CST applies.
  // CDT (UTC-5) runs second Sunday of March through first Sunday of November.
  const d = new Date(ts + "Z"); // parse as UTC first to get the date
  const year = d.getUTCFullYear();
  const marchSecondSun = new Date(Date.UTC(year, 2, 8 + (7 - new Date(Date.UTC(year, 2, 8)).getUTCDay()) % 7, 8)); // 2am CDT = 8am UTC
  const novFirstSun = new Date(Date.UTC(year, 10, 1 + (7 - new Date(Date.UTC(year, 10, 1)).getUTCDay()) % 7, 7)); // 2am CDT = 7am UTC
  const isCDT = d >= marchSecondSun && d < novFirstSun;
  const offset = isCDT ? "-05:00" : "-06:00";
  return new Date(ts.replace(" ", "T") + ":00" + offset);
}

function formatDateTime(ts: string): string {
  try {
    return parseCentralTimestamp(ts).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: CENTRAL_TZ,
    });
  } catch {
    return ts;
  }
}

export default function EnvironmentalPage() {
  const copy = usePageCopy("environment-page", ENVIRONMENT_DEFAULTS);
  const [data, setData] = useState<LakefrontData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [historyHours, setHistoryHours] = useState(24);
  const [renderedHours, setRenderedHours] = useState(24); // tracks what the current data was fetched for
  const [showForecastOverlay, setShowForecastOverlay] = useState(false);
  const [rangeLoading, setRangeLoading] = useState(false);

  // Chart refs for PNG export — wrap the full DataCard so screenshots
  // include title, chart, legend, and source footer.
  const windCardRef = useRef<HTMLDivElement>(null);
  const waterCardRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async (manual = false, range?: number) => {
    if (manual) setRefreshing(true);
    try {
      const params = range ? `?range=${range}` : "";
      const res = await fetch(`/api/lakefront${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
      if (range) setRenderedHours(range);
      setError(null);
    } catch {
      if (!data) setError("Unable to load environmental data.");
    } finally {
      if (manual) setRefreshing(false);
      setRangeLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData(false, historyHours);
    const interval = setInterval(() => fetchData(false, historyHours), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData, historyHours]);

  // Wrap range changes to surface a loading state, so the chart does not
  // render stale data against the new subtitle/axis during the brief
  // in-flight window between click and fetch resolution.
  const handleRangeChange = useCallback((h: number) => {
    if (h === historyHours) return;
    setRangeLoading(true);
    setHistoryHours(h);
  }, [historyHours]);

  // Loading state
  if (!data && !error) {
    return (
      <div className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-96 flex items-center justify-center text-gray-500">
            Loading environmental data...
          </div>
        </div>
      </div>
    );
  }

  // Error state (no data at all)
  if (!data && error) {
    return (
      <div className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-96 flex flex-col items-center justify-center gap-4 text-gray-500">
            <p>{error}</p>
            <button
              onClick={() => fetchData(true)}
              className="px-4 py-2 bg-[#21355a] text-white rounded-lg text-sm hover:bg-[#2c3859] transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { risk, current, forecast, alerts, structureGauges, windHistory, waterLevelHistory, storedForecasts, dataGaps = [] } = data;
  const TrendIcon = TRENDING_ICONS[risk.trending];

  // Build combined chart: 12 hrs observed (past) + 48 hrs forecast (future)
  const now = Date.now();

  // Format chart axis label: time only, but include date on midnight/noon boundaries
  function formatChartTime(ts: string): string {
    const d = parseCentralTimestamp(ts);
    const h = d.toLocaleString("en-US", { hour: "numeric", hour12: true, timeZone: CENTRAL_TZ });
    return h;
  }
  function formatChartLabel(ts: string): string {
    const d = parseCentralTimestamp(ts);
    const month = d.toLocaleString("en-US", { month: "short", timeZone: CENTRAL_TZ });
    const day = d.toLocaleString("en-US", { day: "numeric", timeZone: CENTRAL_TZ });
    const time = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: CENTRAL_TZ });
    return `${month} ${day}, ${time}`;
  }

  // Index water level history by timestamp for easy lookup
  const waterHistoryMap = new Map(
    (waterLevelHistory || []).map((w) => [w.timestamp, w.level])
  );

  // Build stored forecast lookup: array of { time (ms), wind, water }
  // sorted by time for efficient closest-match searching.
  const storedEntries: { time: number; wind: number | null; water: number | null }[] = [];
  if (storedForecasts) {
    for (const [ts, snap] of Object.entries(storedForecasts)) {
      storedEntries.push({ time: parseCentralTimestamp(ts).getTime(), wind: snap.wind, water: snap.water });
    }
    storedEntries.sort((a, b) => a.time - b.time);
  }
  function findClosestStored(targetMs: number) {
    let best: (typeof storedEntries)[0] | null = null;
    let bestDiff = Infinity;
    for (const entry of storedEntries) {
      const diff = Math.abs(entry.time - targetMs);
      if (diff < bestDiff) { bestDiff = diff; best = entry; }
      if (entry.time > targetMs) break; // sorted, won't get closer
    }
    return bestDiff <= 30 * 60 * 1000 ? best : null; // within 30 min
  }

  // Observed history — sample interval scales with the time range so shorter
  // windows are more granular and longer windows don't overwhelm the chart.
  // NOAA provides 6-minute readings, so step=N means every N*6 minutes.
  const thinningStep =
    renderedHours <= 6 ? 2 :    // ~12 min
    renderedHours <= 12 ? 3 :   // ~18 min
    renderedHours <= 24 ? 5 :   // ~30 min
    renderedHours <= 48 ? 8 :   // ~48 min
    10;                         // ~60 min (hourly)
  // Build history points from wind data (primary) or water level data (fallback
  // when wind sensor is offline). This ensures the water level chart still shows
  // observed data even when wind observations are unavailable.
  const hasWindHistory = windHistory && windHistory.length > 0;
  const historyPoints = hasWindHistory
    ? windHistory
        .filter((_, i) => i % thinningStep === 0)
        .map((w) => {
          let closestWater: number | null = null;
          const wTime = parseCentralTimestamp(w.timestamp).getTime();
          for (const [ts, level] of waterHistoryMap) {
            if (Math.abs(parseCentralTimestamp(ts).getTime() - wTime) < 10 * 60 * 1000) {
              closestWater = Math.round(level * 100) / 100;
              break;
            }
          }
          const stored = findClosestStored(wTime);
          return {
            time: formatChartTime(w.timestamp),
            fullTime: formatChartLabel(w.timestamp),
            ts: wTime,
            observedWind: Math.round(w.speed * 10) / 10,
            forecastWind: null as number | null,
            storedWind: stored?.wind != null ? Math.round(stored.wind * 10) / 10 : null,
            observedWater: closestWater,
            forecastWater: null as number | null,
            storedWater: stored?.water != null ? Math.round(stored.water * 100) / 100 : null,
          };
        })
    : (waterLevelHistory || [])
        .filter((_, i) => i % thinningStep === 0)
        .map((w) => {
          const wTime = parseCentralTimestamp(w.timestamp).getTime();
          const stored = findClosestStored(wTime);
          return {
            time: formatChartTime(w.timestamp),
            fullTime: formatChartLabel(w.timestamp),
            ts: wTime,
            observedWind: null as number | null,
            forecastWind: null as number | null,
            storedWind: stored?.wind != null ? Math.round(stored.wind * 10) / 10 : null,
            observedWater: Math.round(w.level * 100) / 100,
            forecastWater: null as number | null,
            storedWater: stored?.water != null ? Math.round(stored.water * 100) / 100 : null,
          };
        });

  // Forecast — every hourly point, starting from the later of the last displayed
  // observed point or now. Using the displayed point (after thinning) avoids a
  // visual gap; using now prevents showing forecast for times that already passed.
  const lastDisplayedTime = historyPoints.length > 0
    ? historyPoints[historyPoints.length - 1].ts
    : now;
  const forecastStart = Math.max(lastDisplayedTime, now);
  const futureForecasts = forecast.filter(
    (p) => parseCentralTimestamp(p.timestamp).getTime() >= forecastStart
  );
  const lastBothIdx = futureForecasts.reduce(
    (last, p, i) => (p.windSpeed !== null && p.waterLevel !== null ? i : last),
    -1
  );
  const forecastPoints = futureForecasts
    .slice(0, lastBothIdx + 1)
    .filter((p) => p.windSpeed !== null || p.waterLevel !== null)
    .map((p) => ({
      time: formatChartTime(p.timestamp),
      fullTime: formatChartLabel(p.timestamp),
      ts: parseCentralTimestamp(p.timestamp).getTime(),
      observedWind: null as number | null,
      forecastWind: p.windSpeed !== null ? Math.round(p.windSpeed * 10) / 10 : null,
      storedWind: null as number | null,
      observedWater: null as number | null,
      forecastWater: p.waterLevel !== null ? Math.round(p.waterLevel * 100) / 100 : null,
      storedWater: null as number | null,
    }));

  const chartData = [...historyPoints, ...forecastPoints];

  // Download helpers
  function downloadPng(ref: React.RefObject<HTMLDivElement | null>, filename: string) {
    if (!ref.current) return;
    toPng(ref.current, {
      backgroundColor: "#ffffff",
      pixelRatio: 2,
      // Hide the camera/download icon cluster inside the card so the exported
      // PNG shows only the title, chart, legend, and source footer.
      filter: (node) => !(node instanceof HTMLElement && node.hasAttribute("data-screenshot-hide")),
    })
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = filename;
        link.href = dataUrl;
        link.click();
      });
  }

  function downloadCsv(fields: { key: string; label: string }[], filename: string) {
    const header = ["Timestamp", ...fields.map((f) => f.label)].join(",");
    const rows = chartData
      .filter((d) => fields.some((f) => d[f.key as keyof typeof d] != null))
      .map((d) => {
        const values = fields.map((f) => {
          const v = d[f.key as keyof typeof d];
          return v != null ? v : "";
        });
        return [d.fullTime, ...values].join(",");
      });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.download = filename;
    link.href = URL.createObjectURL(blob);
    link.click();
  }

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title={copy.pageTitle}
          subtitle={copy.pageSubtitle}
          source={`NOAA Station ${data.stationId} (${data.stationName}) & NWS`}
        />

        {/* Stale data warning */}
        {error && data && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>Data may be stale. Last successful update: {formatDateTime(data.lastUpdated)}</span>
          </div>
        )}

        {/* Sensor offline banner */}
        {dataGaps.length > 0 && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">Some station sensors are currently offline: </span>
              <span>{dataGaps.join(", ")}. </span>
              <span className="text-amber-600">Affected readings are marked below. Forecast data from NWS remains available.</span>
            </div>
          </div>
        )}

        {/* Hero Risk Indicator */}
        <section className="mb-12">
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
              <div className="flex-1">
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                  {copy.heroHeading}
                </h2>
                <RiskIndicator level={risk.level} action={risk.action} />
              </div>
              <div className="flex flex-col items-end gap-3">
                <span
                  className="relative group/trend cursor-help inline-flex items-center gap-2"
                  tabIndex={0}
                  aria-label={TRENDING_TOOLTIPS[risk.trending]}
                >
                  <TrendIcon className={`h-4 w-4 ${TRENDING_COLORS[risk.trending]}`} aria-hidden="true" />
                  <span className={`text-sm font-medium border-b border-dashed border-gray-300 ${TRENDING_COLORS[risk.trending]}`}>
                    {TRENDING_LABELS[risk.trending]}
                  </span>
                  <span
                    role="tooltip"
                    className="invisible group-hover/trend:visible group-focus-within/trend:visible absolute right-0 top-full mt-2 w-64 rounded-lg bg-gray-800 text-white text-xs font-normal p-2.5 leading-relaxed shadow-lg z-50 whitespace-normal text-left pointer-events-none"
                  >
                    {TRENDING_TOOLTIPS[risk.trending]}
                  </span>
                </span>
                <div className="flex flex-col items-end gap-0.5">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>Updated {formatDateTime(data.lastUpdated)}</span>
                    <button
                      onClick={() => fetchData(true)}
                      disabled={refreshing}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="Refresh now"
                    >
                      <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 italic">
                    Auto-refreshes every 5 minutes while open
                  </p>
                </div>
              </div>
            </div>

            {/* Contributing Factors */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                {copy.contributingFactorsHeading}
              </h3>
              <ul className="space-y-1">
                {risk.factors.map((factor, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: RISK_COLORS[risk.level] }}
                    />
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Plain-English explainer: what makes the risk go up */}
        <section className="mb-12">
          <SectionSubheader
            title={copy.drivesTitle}
            subtitle={copy.drivesSubtitle}
          />
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <p className="text-base text-gray-700 leading-relaxed mb-6">
              {copy.drivesIntro}
            </p>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-5">
                <div className="flex items-center gap-2 mb-2 text-[#21355a]">
                  <Compass className="h-5 w-5" aria-hidden="true" />
                  <h3 className="font-semibold text-sm uppercase tracking-wide">
                    {copy.windDirectionHeading}
                  </h3>
                </div>
                <p className="text-2xl font-bold text-[#21355a] mb-1">{copy.windDirectionValue}</p>
                <p className="text-sm text-gray-700 leading-snug">
                  {copy.windDirectionText}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-5">
                <div className="flex items-center gap-2 mb-2 text-[#21355a]">
                  <Wind className="h-5 w-5" aria-hidden="true" />
                  <h3 className="font-semibold text-sm uppercase tracking-wide">
                    {copy.windStrengthHeading}
                  </h3>
                </div>
                <p className="text-2xl font-bold text-[#21355a] mb-1">{copy.windStrengthValue}</p>
                <p className="text-sm text-gray-700 leading-snug">
                  {copy.windStrengthText}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-5">
                <div className="flex items-center gap-2 mb-2 text-[#21355a]">
                  <Waves className="h-5 w-5" aria-hidden="true" />
                  <h3 className="font-semibold text-sm uppercase tracking-wide">
                    {copy.lakeLevelHeading}
                  </h3>
                </div>
                <p className="text-2xl font-bold text-[#21355a] mb-1">{copy.lakeLevelValue}</p>
                <p className="text-sm text-gray-700 leading-snug">
                  {copy.lakeLevelText}
                </p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-green-200 bg-green-50/60 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden="true" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-green-800">
                    {copy.normalConditionsHeading}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-snug">
                  {copy.normalConditionsText}
                </p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    {copy.elevatedConditionsHeading}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-snug">
                  {copy.elevatedConditionsText}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              See the <a href="#thresholds" className="underline hover:text-[#21355a]">risk
              level thresholds</a> below for the exact wind and water-level cutoffs that
              the model uses.
            </p>
          </div>
        </section>

        {/* Current Conditions */}
        <section className="mb-12">
          <SectionSubheader title={copy.currentConditionsTitle} />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Wind */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Wind
                </span>
                <Wind className="h-6 w-6 text-[#21355a]" />
              </div>
              {dataGaps.includes("wind") ? (
                <>
                  <span className="text-2xl font-semibold text-gray-300">Unavailable</span>
                  <p className="text-xs text-amber-600 mt-2">
                    Wind sensor offline at {data.stationName}
                  </p>
                </>
              ) : data.windSource?.fallback ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-[#21355a]">
                      {current.wind.speed.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500">kt {current.wind.cardinal}</span>
                  </div>
                  <p className="text-xs text-amber-600 mt-2">
                    {data.stationName} offline
                    {data.windSource.primaryStaleMinutes != null
                      ? ` for ${data.windSource.primaryStaleMinutes} min`
                      : ""}
                    . Using backup: {data.windSource.name}.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-[#21355a]">
                      {current.wind.speed.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500">kt from {current.wind.cardinal}</span>
                  </div>
                  {current.wind.gust > current.wind.speed && (
                    <p className="text-xs text-gray-500 mt-1">
                      Gusts to {current.wind.gust.toFixed(1)} kt
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {risk.isOnshore ? "Onshore (pushing toward Lakeshore Dr.)" : "Offshore (away from shore)"}
                  </p>
                  {risk.windPersistence && risk.windPersistence.hoursAnalyzed > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-gray-500">Onshore Persistence</span>
                        <span className={`text-xs font-semibold ${risk.windPersistence.isSustained ? "text-amber-600" : "text-gray-400"}`}>
                          {risk.windPersistence.isSustained ? "Sustained" : risk.isOnshore ? "Not yet sustained" : "Offshore"}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            risk.windPersistence.sustainedFraction >= 0.7
                              ? "bg-amber-500"
                              : risk.windPersistence.sustainedFraction >= 0.4
                                ? "bg-yellow-400"
                                : "bg-gray-300"
                          }`}
                          style={{ width: `${Math.max(Math.min(risk.windPersistence.sustainedFraction * 100, 100), 2)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400">
                        {risk.windPersistence.effectiveHours > 0
                          ? `~${risk.windPersistence.effectiveHours} of ${risk.windPersistence.hoursAnalyzed} hrs onshore above threshold (need 70%)`
                          : `No onshore wind in last ${risk.windPersistence.hoursAnalyzed} hrs (currently ${risk.isOnshore ? "onshore" : "offshore"}, ${current.wind.cardinal})`}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Lake Level */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Lake Level
                </span>
                <Waves className="h-6 w-6 text-[#21355a]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#21355a]">
                  {current.waterLevel.level.toFixed(2)}
                </span>
                <span className="text-sm text-gray-500">ft MLLW</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Tide prediction: {current.waterLevel.predicted.toFixed(2)} ft
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Actual water height at the station
              </p>
            </div>

            {/* Surge Anomaly */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Surge Anomaly
                </span>
                <TrendingUp className="h-6 w-6 text-[#21355a]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${
                  current.waterLevel.anomaly >= RISK_THRESHOLDS.SURGE_ORANGE
                    ? "text-orange-600"
                    : current.waterLevel.anomaly >= RISK_THRESHOLDS.SURGE_YELLOW
                      ? "text-yellow-600"
                      : "text-[#21355a]"
                }`}>
                  {current.waterLevel.anomaly > 0 ? "+" : ""}
                  {current.waterLevel.anomaly.toFixed(2)}
                </span>
                <span className="text-sm text-gray-500">ft</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {copy.surgeAnomalyExplainer}
              </p>
            </div>

            {/* Mississippi River */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Mississippi River
                </span>
                <Activity className="h-6 w-6 text-[#21355a]" />
              </div>
              {data?.riverLevel?.level != null ? (() => {
                const rl = data.riverLevel!;
                const level = rl.level!;
                const flood = rl.floodStage;
                const barMax = flood + 3;
                const pct = Math.min((level / barMax) * 100, 100);
                const floodPct = (flood / barMax) * 100;
                const isAboveFlood = level >= flood;
                return (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-[#21355a]">{level.toFixed(1)}</span>
                      <span className="text-sm text-gray-500">ft at Carrollton</span>
                    </div>
                    <p className={`text-xs mt-1 ${isAboveFlood ? "text-red-600 font-medium" : "text-green-600"}`}>
                      {isAboveFlood ? "Above flood stage" : "Below flood stage"}
                    </p>
                    <div className="mt-3 relative">
                      <div className="h-2 bg-gray-200 rounded-full w-full">
                        <div
                          className={`h-2 rounded-full ${isAboveFlood ? "bg-red-400" : "bg-[#65bc7b]"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div
                        className="absolute top-0 w-px h-2 bg-red-400"
                        style={{ left: `${floodPct}%` }}
                      />
                      <div className="flex justify-between mt-1">
                        <span className="text-[9px] text-gray-400">0 ft</span>
                        <span className="text-[9px] text-red-400">{flood} ft flood stage</span>
                      </div>
                    </div>
                  </>
                );
              })() : (
                <p className="text-sm text-gray-400 mt-2">Unavailable</p>
              )}
              <a
                href="https://water.noaa.gov/gauges/norl1"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] text-blue-500 hover:underline mt-1 inline-block"
              >
                NOAA Carrollton Gauge
              </a>
            </div>
          </div>
        </section>

        {/* Forecast Timeline */}
        {chartData.length > 0 && (
          <section className="mb-12">
            <SectionSubheader
              title={copy.timelineTitle}
              subtitle={`${historyHours} hours observed & 2-day forecast`}
            />
            {/* Chart controls */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Observed:</span>
                {[6, 12, 24, 48, 72].map((h) => (
                  <button
                    key={h}
                    onClick={() => handleRangeChange(h)}
                    disabled={rangeLoading}
                    className={`px-2.5 py-1 text-xs rounded transition-colors ${
                      historyHours === h
                        ? "bg-[#21355a] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-60"
                    }`}
                  >
                    {h}h
                  </button>
                ))}
                {rangeLoading && (
                  <RefreshCw className="h-3 w-3 text-gray-400 animate-spin ml-1" />
                )}
              </div>
              {historyPoints.some((p) => p.storedWind != null || p.storedWater != null) && (
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showForecastOverlay}
                    onChange={(e) => setShowForecastOverlay(e.target.checked)}
                    className="rounded border-gray-300 text-[#21355a] focus:ring-[#21355a]"
                  />
                  Show original forecast over observed
                </label>
              )}
            </div>

            {/* Wind Speed Chart */}
            <div ref={windCardRef}>
            <DataCard
              title="Wind Speed"
              source={
                data.windSource?.fallback
                  ? `Observed from ${data.windSource.name} (Station ${data.windSource.id}) via NWS METAR, with ${data.stationName} as primary source (currently offline). NWS Forecast. Wind speed in knots (kt).`
                  : `NOAA Observed at ${data.stationName} (Station ${data.stationId}) & NWS Forecast. Wind speed in knots (kt) measured at standard 10-meter anemometer height.`
              }
            >
              <div className="flex items-center justify-end gap-1 mb-2" data-screenshot-hide>
                <button onClick={() => downloadPng(windCardRef, "wind-speed.png")} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" title="Download PNG">
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => downloadCsv([{ key: "observedWind", label: "Observed (kt)" }, { key: "storedWind", label: "Historic Forecast (kt)" }, { key: "forecastWind", label: "Future Forecast (kt)" }], "wind-speed.csv")} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" title="Download CSV">
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="h-56 relative">
                {rangeLoading && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded" data-screenshot-hide>
                    <RefreshCw className="h-5 w-5 text-gray-400 animate-spin" />
                  </div>
                )}
                {dataGaps.includes("wind") && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                    <div className="bg-white/80 rounded-lg px-4 py-2 text-center">
                      <p className="text-sm font-medium text-gray-500">Wind sensor offline</p>
                      <p className="text-xs text-gray-400">No observed data available. NWS forecast shown.</p>
                    </div>
                  </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="ts"
                      type="number"
                      scale="time"
                      domain={["dataMin", "dataMax"]}
                      tickCount={11}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      tick={(props: any) => {
                        const { x, y, payload } = props;
                        const d = new Date(payload.value);
                        const hours = d.toLocaleString("en-US", { hour: "numeric", hour12: true, timeZone: CENTRAL_TZ });
                        const dayLabel = d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: CENTRAL_TZ });
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text x={0} y={0} dy={12} textAnchor="middle" fontSize={10} fill="#6b7280">{hours}</text>
                            <text x={0} y={0} dy={24} textAnchor="middle" fontSize={8} fill="#9ca3af">{dayLabel}</text>
                          </g>
                        );
                      }}
                      height={40}
                    />
                    <YAxis
                      domain={[0, (max: number) => Math.max(Math.ceil(max + 2), RISK_THRESHOLDS.WIND_YELLOW + 5)]}
                      allowDataOverflow={false}
                      tick={{ fontSize: 11 }}
                      label={{ value: "Wind (kt)", angle: -90, position: "insideLeft", style: { fontSize: 11 } }}
                    />
                    <Tooltip
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime || ""}
                      formatter={(value, name) => {
                        const labels: Record<string, string> = { observedWind: "Observed", forecastWind: "Forecast", storedWind: "Original forecast" };
                        return [`${value} kt`, labels[name as string] || String(name)];
                      }}
                    />
                    <ReferenceLine y={RISK_THRESHOLDS.WIND_YELLOW} stroke="#ca8a04" strokeDasharray="4 4" strokeWidth={1} label={{ value: "15 kt \u2014 Yellow risk threshold", position: "insideTopRight", fontSize: 10, fill: "#ca8a04" }} />
                    <ReferenceLine y={RISK_THRESHOLDS.WIND_ORANGE} stroke="#ea580c" strokeDasharray="4 4" strokeWidth={1} label={{ value: "25 kt \u2014 Orange risk threshold", position: "insideTopRight", fontSize: 10, fill: "#ea580c" }} />
                    <Line type="monotone" dataKey="observedWind" stroke="#21355a" strokeWidth={2.5} dot={false} name="observedWind" connectNulls />
                    <Line type="monotone" dataKey="forecastWind" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 3" dot={false} name="forecastWind" connectNulls />
                    {showForecastOverlay && (
                      <Line type="monotone" dataKey="storedWind" stroke="#d4d4d8" strokeWidth={2} strokeDasharray="4 4" dot={false} name="storedWind" connectNulls />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-[#21355a]" />
                  <span className="text-xs text-gray-600">Observed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 border-t-2 border-dashed border-[#94a3b8]" />
                  <span className="text-xs text-gray-400">Forecast</span>
                </div>
                {showForecastOverlay && (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 border-t-2 border-dashed border-[#d4d4d8]" />
                    <span className="text-xs text-gray-400">Original forecast</span>
                  </div>
                )}
              </div>
            </DataCard>
            </div>

            {/* Water Level Chart */}
            <div ref={waterCardRef} className="mt-4">
            <DataCard title="Water Level at New Canal Station" source="NOAA Observed & NGOFS2 Model. Datum: MLLW (Mean Lower Low Water) — height relative to average low tide, where 0.0 ft = typical low tide level.">
              <div className="flex items-center justify-end gap-1 mb-2" data-screenshot-hide>
                <button onClick={() => downloadPng(waterCardRef, "water-level.png")} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" title="Download PNG">
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => downloadCsv([{ key: "observedWater", label: "Observed (ft)" }, { key: "storedWater", label: "Historic Forecast (ft)" }, { key: "forecastWater", label: "Future Forecast (ft)" }], "water-level.csv")} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors" title="Download CSV">
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="h-56 relative">
                {rangeLoading && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded" data-screenshot-hide>
                    <RefreshCw className="h-5 w-5 text-gray-400 animate-spin" />
                  </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="ts"
                      type="number"
                      scale="time"
                      domain={["dataMin", "dataMax"]}
                      tickCount={11}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      tick={(props: any) => {
                        const { x, y, payload } = props;
                        const d = new Date(payload.value);
                        const hours = d.toLocaleString("en-US", { hour: "numeric", hour12: true, timeZone: CENTRAL_TZ });
                        const dayLabel = d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: CENTRAL_TZ });
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text x={0} y={0} dy={12} textAnchor="middle" fontSize={10} fill="#6b7280">{hours}</text>
                            <text x={0} y={0} dy={24} textAnchor="middle" fontSize={8} fill="#9ca3af">{dayLabel}</text>
                          </g>
                        );
                      }}
                      height={40}
                    />
                    <YAxis
                      domain={[(min: number) => Math.floor((min - 0.2) * 10) / 10, "auto"]}
                      tick={{ fontSize: 11 }}
                      label={{ value: "Water Level (ft)", angle: -90, position: "insideLeft", style: { fontSize: 11 } }}
                    />
                    <Tooltip
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime || ""}
                      formatter={(value, name) => {
                        const labels: Record<string, string> = { observedWater: "Observed", forecastWater: "Forecast", storedWater: "Original forecast" };
                        return [`${value} ft`, labels[name as string] || String(name)];
                      }}
                    />
                    <Area type="monotone" dataKey="observedWater" fill="#2563eb" fillOpacity={0.2} stroke="#2563eb" strokeWidth={2.5} name="observedWater" connectNulls />
                    <Area type="monotone" dataKey="forecastWater" fill="#93c5fd" fillOpacity={0.15} stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3" name="forecastWater" connectNulls />
                    {showForecastOverlay && (
                      <Line type="monotone" dataKey="storedWater" stroke="#d4d4d8" strokeWidth={2} strokeDasharray="4 4" dot={false} name="storedWater" connectNulls />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-3 bg-[#2563eb] rounded-sm opacity-40" />
                  <span className="text-xs text-gray-600">Observed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-3 rounded-sm opacity-40" style={{ background: "#3b82f6", border: "1px dashed #3b82f6" }} />
                  <span className="text-xs text-gray-400">Forecast</span>
                </div>
                {showForecastOverlay && (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 border-t-2 border-dashed border-[#d4d4d8]" />
                    <span className="text-xs text-gray-400">Original forecast</span>
                  </div>
                )}
              </div>
            </DataCard>
            </div>
          </section>
        )}

        {/* Active NWS Alerts */}
        {alerts.length > 0 && (
          <section className="mb-12">
            <SectionSubheader title={copy.alertsTitle} />
            <div className="space-y-4">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`bg-white rounded-r-lg p-4 shadow-sm border-l-4 ${
                    alert.severity === "Extreme" || alert.severity === "Severe"
                      ? "border-red-500"
                      : alert.severity === "Moderate"
                        ? "border-orange-400"
                        : "border-amber-400"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{alert.event}</h3>
                      <p className="text-sm text-gray-700 mt-1">{alert.headline}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                      alert.severity === "Extreme" || alert.severity === "Severe"
                        ? "bg-red-100 text-red-700"
                        : alert.severity === "Moderate"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-amber-100 text-amber-700"
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                  {alert.expires && (
                    <p className="text-xs text-gray-400 mt-2">
                      Expires: {formatDateTime(alert.expires)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Threshold Reference */}
        <section id="thresholds" className="mb-12 scroll-mt-24">
          <SectionSubheader title={copy.thresholdsTitle} />
          <DataCard title={copy.thresholdsCardTitle} source="SLFPA-E Operational Thresholds">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 font-semibold text-gray-700">Wind (onshore)</th>
                    <th className="text-left py-3 font-semibold text-gray-700">Surge Anomaly</th>
                    <th className="text-left py-3 font-semibold text-gray-700">Recommended Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 bg-green-50/50">
                    <td className="py-3"><RiskBadge level="GREEN" size="sm" /></td>
                    <td className="py-3 text-gray-600">&lt; 15 kt or offshore</td>
                    <td className="py-3 text-gray-600">&lt; 0.75 ft</td>
                    <td className="py-3 text-gray-600">No action</td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-yellow-50/50">
                    <td className="py-3"><RiskBadge level="YELLOW" size="sm" /></td>
                    <td className="py-3 text-gray-600">
                      15 - 25 kt
                      <span className="block text-xs text-gray-400">sustained ~{Math.round(RISK_THRESHOLDS.WIND_SUSTAINED_FRACTION * RISK_THRESHOLDS.WIND_HISTORY_HOURS * 10) / 10}+ hrs</span>
                    </td>
                    <td className="py-3 text-gray-600">0.75 - 1.0 ft</td>
                    <td className="py-3 text-gray-600">Monitor conditions</td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-orange-50/50">
                    <td className="py-3"><RiskBadge level="ORANGE" size="sm" /></td>
                    <td className="py-3 text-gray-600">
                      25 - 35 kt
                      <span className="block text-xs text-gray-400">sustained ~{Math.round(RISK_THRESHOLDS.WIND_SUSTAINED_FRACTION * RISK_THRESHOLDS.WIND_HISTORY_HOURS * 10) / 10}+ hrs</span>
                    </td>
                    <td className="py-3 text-gray-600">1.0 - 1.5 ft</td>
                    <td className="py-3 text-gray-600">Stage barricades</td>
                  </tr>
                  <tr className="bg-red-50/50">
                    <td className="py-3"><RiskBadge level="RED" size="sm" /></td>
                    <td className="py-3 text-gray-600">
                      &gt; 35 kt
                      <span className="block text-xs text-gray-400">immediate (no duration req.)</span>
                    </td>
                    <td className="py-3 text-gray-600">&gt; 1.5 ft</td>
                    <td className="py-3 text-gray-600">Close roadway</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Wind thresholds apply when wind direction is onshore (roughly NW through N to NE, 315-045 degrees),
              which pushes Lake Pontchartrain water toward the south shore and Lakeshore Drive.
              The risk level is the <strong>higher</strong> of the wind-based and surge-based assessments.
              If the forecast shows worse conditions within 6 hours, the current level is escalated by one tier.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              <strong>Duration gating:</strong> Yellow and Orange wind levels require sustained onshore winds
              (at least 70% of readings over the previous {RISK_THRESHOLDS.WIND_HISTORY_HOURS} hours).
              Red triggers immediately regardless of duration.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              <strong>Surge gating:</strong> Surge above predicted only signals flood risk when wind is currently
              onshore or has been onshore in the last {RISK_THRESHOLDS.WIND_HISTORY_HOURS} hours
              (at least {Math.round(RISK_THRESHOLDS.SURGE_RECENT_ONSHORE_FRACTION * 100)}% of readings).
              On calm days with offshore wind, elevated surge is usually rain runoff, river inflow, or pressure
              noise rather than wind-driven flood risk, so it is suppressed.
            </p>
            <p className="text-xs text-gray-600 italic mt-2">
              {copy.thresholdsPreliminaryNote}
            </p>
          </DataCard>
        </section>

        {/* Structure Gauges - Secondary Reference */}
        {structureGauges && structureGauges.length > 0 && (
          <section className="mb-12">
            <SectionSubheader title={copy.structureGaugesTitle} />
            <DataCard
              title={copy.structureGaugesCardTitle}
              source="USGS Water Services"
            >
              <p className="text-sm text-gray-600 mb-4">
                {copy.structureGaugesIntro}
              </p>
              <div className="grid sm:grid-cols-3 gap-4 mb-4">
                {structureGauges.map((gauge) => (
                  <div key={gauge.siteId} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{gauge.name}</span>
                      <Activity className="h-4 w-4 text-gray-400" />
                    </div>
                    {gauge.level !== null ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-[#21355a]">
                            {gauge.level.toFixed(2)}
                          </span>
                          <span className="text-xs text-gray-500">ft</span>
                        </div>
                        {gauge.timestamp && (
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDateTime(gauge.timestamp)}
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">Unavailable</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 space-y-1">
                <p>
                  <strong>How to read these:</strong> Seabrook sits where Lake Pontchartrain
                  meets the Inner Harbor Navigation Canal. Rising levels there during onshore
                  wind events are direct evidence of wind-driven surge. The Surge Barrier and
                  Bayou Dupre gauges show conditions farther east along the HSDRRS. If all three
                  are rising while the risk indicator is elevated, conditions are consistent with
                  active wind setup.
                </p>
                <p>
                  {copy.structureGaugesNormalNote}
                </p>
              </div>
              <p className="text-xs text-amber-600 mt-3">
                {copy.structureGaugesConfirmationNote}
              </p>
            </DataCard>
          </section>
        )}

        {/* Data Sources */}
        <section>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-gray-500 space-y-1">
                <p>
                  Current conditions from{" "}
                  <a
                    href="https://tidesandcurrents.noaa.gov/stationhome.html?id=8761927"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#21355a] underline inline-flex items-center gap-0.5"
                  >
                    NOAA CO-OPS Station 8761927 (New Canal Station)
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  , updated every 6 minutes.
                </p>
                <p>
                  {copy.dataSourcesForecast}
                </p>
                <p>
                  {copy.dataSourcesStructureGauges}
                </p>
                <p>
                  {copy.dataSourcesDisclaimer}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
