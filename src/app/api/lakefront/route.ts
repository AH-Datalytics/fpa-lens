/**
 * Lakefront Flood Risk API Route
 *
 * Aggregates data from NOAA CO-OPS and NWS, computes risk level,
 * and returns a single JSON payload for the environmental dashboard.
 *
 * Data sources:
 * - NOAA CO-OPS Station 8761927 (New Canal Station, Lake Pontchartrain)
 * - NWS API (grid LIX/67,92, observation station KNEW)
 *
 * Cached for 5 minutes via ISR revalidation on Vercel.
 */

import { NextResponse } from "next/server";
import {
  computeRiskLevel,
  cardinalToDegrees,
  degreesToCardinal,
  RISK_THRESHOLDS,
  type LakefrontConditions,
  type LakefrontData,
  type ForecastPoint,
  type NWSAlert,
  type WindReading,
  type WaterLevelReading,
  type PressureReading,
  type StructureGauge,
} from "@/lib/lakefrontRisk";
import { saveForecastSnapshot, getStoredForecasts } from "@/lib/forecastStore";

export const revalidate = 300; // 5-minute ISR cache

// ============================================================================
// CONSTANTS
// ============================================================================

const NOAA_BASE = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";
const STATION_ID = "8761927";
const STATION_NAME = "New Canal Station";
const FETCH_TIMEOUT = 10_000; // 10 seconds
const WIND_HISTORY_HOURS = RISK_THRESHOLDS.WIND_HISTORY_HOURS; // 3 hrs for risk engine persistence
const CHART_HISTORY_HOURS = 24; // 24 hrs of observed data for the chart

const NWS_HEADERS = {
  "User-Agent": "FPALens/1.0 (fpalens@floodauthority.org)",
  Accept: "application/geo+json",
};

// ============================================================================
// FETCH HELPERS
// ============================================================================

async function fetchWithTimeout(url: string, headers?: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers,
      next: { revalidate: 300 },
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

function buildNOAAUrl(product: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams({
    station: STATION_ID,
    product,
    units: "english",
    time_zone: "lst_ldt",
    format: "json",
    application: "fpa_lens",
    ...extra,
  });
  return `${NOAA_BASE}?${params}`;
}

// ============================================================================
// NOAA CO-OPS FETCHERS
// ============================================================================

interface NOAAWindEntry {
  t: string;
  s: string; // speed (knots)
  d: string; // direction (degrees)
  dr: string; // cardinal
  g: string; // gust (knots)
  f: string;
}

async function fetchCurrentWind(): Promise<WindReading> {
  const url = buildNOAAUrl("wind", { date: "latest" });
  const res = await fetchWithTimeout(url);
  const json = await res.json();
  const entry = json.data?.[0] as NOAAWindEntry | undefined;
  if (!entry) throw new Error("No wind data");
  return {
    speed: parseFloat(entry.s) || 0,
    direction: parseFloat(entry.d) || 0,
    gust: parseFloat(entry.g) || 0,
    cardinal: entry.dr || degreesToCardinal(parseFloat(entry.d) || 0),
    timestamp: entry.t,
  };
}

interface NOAAWaterEntry {
  t: string;
  v: string;
}

async function fetchWaterLevel(): Promise<{ level: number; timestamp: string }> {
  const url = buildNOAAUrl("water_level", { date: "latest", datum: "MLLW" });
  const res = await fetchWithTimeout(url);
  const json = await res.json();
  const entry = json.data?.[0] as NOAAWaterEntry | undefined;
  if (!entry) throw new Error("No water level data");
  return {
    level: parseFloat(entry.v) || 0,
    timestamp: entry.t,
  };
}

/**
 * Fetch recent water level history for the chart.
 * Uses CHART_HISTORY_HOURS (12) for a longer observed window.
 */
async function fetchWaterLevelHistory(hours: number = CHART_HISTORY_HOURS): Promise<{ level: number; timestamp: string }[]> {
  const url = buildNOAAUrl("water_level", {
    range: String(hours),
    datum: "MLLW",
  });
  const res = await fetchWithTimeout(url);
  const json = await res.json();
  const entries = (json.data || []) as NOAAWaterEntry[];
  if (entries.length === 0) throw new Error("No water level history data");

  return entries.map((e) => ({
    level: parseFloat(e.v) || 0,
    timestamp: e.t,
  }));
}

async function fetchPredictions(): Promise<{ predicted: number; timestamp: string }> {
  // Get today's predictions and find the one closest to now
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const url = buildNOAAUrl("predictions", {
    datum: "MLLW",
    begin_date: dateStr,
    end_date: dateStr,
    interval: "h", // hourly predictions
  });
  const res = await fetchWithTimeout(url);
  const json = await res.json();
  const predictions = (json.predictions || []) as NOAAWaterEntry[];
  if (predictions.length === 0) throw new Error("No prediction data");

  // Find prediction closest to current time
  const nowMs = now.getTime();
  let closest = predictions[0];
  let closestDiff = Infinity;
  for (const p of predictions) {
    const diff = Math.abs(new Date(p.t).getTime() - nowMs);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = p;
    }
  }

  return {
    predicted: parseFloat(closest.v) || 0,
    timestamp: closest.t,
  };
}

async function fetchPressure(): Promise<PressureReading> {
  const url = buildNOAAUrl("air_pressure", { date: "latest" });
  const res = await fetchWithTimeout(url);
  const json = await res.json();
  const entry = json.data?.[0] as { t: string; v: string } | undefined;
  if (!entry) throw new Error("No pressure data");
  return {
    value: parseFloat(entry.v) || 0,
    timestamp: entry.t,
  };
}

/**
 * Fetch recent wind history (12 hours of 6-minute observations).
 *
 * Full 12-hour window powers the observed data on the chart.
 * The last 3 hours are sliced separately for the risk engine's
 * duration gating (sustained onshore wind analysis).
 *
 * On failure, returns null — risk engine falls back to
 * instantaneous-only behavior (no duration gating).
 */
async function fetchWindHistory(hours: number = CHART_HISTORY_HOURS): Promise<WindReading[]> {
  const url = buildNOAAUrl("wind", {
    range: String(hours),
  });
  const res = await fetchWithTimeout(url);
  const json = await res.json();
  const entries = (json.data || []) as NOAAWindEntry[];
  if (entries.length === 0) throw new Error("No wind history data");

  return entries.map((e) => ({
    speed: parseFloat(e.s) || 0,
    direction: parseFloat(e.d) || 0,
    gust: parseFloat(e.g) || 0,
    cardinal: e.dr || degreesToCardinal(parseFloat(e.d) || 0),
    timestamp: e.t,
  }));
}

async function fetchOFSForecast(): Promise<ForecastPoint[]> {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const endStr = `${endDate.getFullYear()}${String(endDate.getMonth() + 1).padStart(2, "0")}${String(endDate.getDate()).padStart(2, "0")}`;

  const url = buildNOAAUrl("ofs_water_level", {
    datum: "MLLW",
    begin_date: dateStr,
    end_date: endStr,
  });
  const res = await fetchWithTimeout(url);
  const json = await res.json();
  const entries = (json.data || []) as NOAAWaterEntry[];

  return entries.map((e) => ({
    timestamp: e.t,
    windSpeed: null,
    windDirection: null,
    windGust: null,
    windCardinal: null,
    waterLevel: parseFloat(e.v) || null,
  }));
}

// ============================================================================
// NWS FETCHERS
// ============================================================================

interface NWSHourlyPeriod {
  startTime: string;
  windSpeed: string; // e.g. "10 mph"
  windDirection: string; // cardinal
}

function parseMphToKnots(windSpeedStr: string): number {
  const match = windSpeedStr.match(/(\d+)/);
  if (!match) return 0;
  return parseFloat(match[1]) / 1.151;
}

async function fetchNWSHourlyForecast(): Promise<ForecastPoint[]> {
  const url = "https://api.weather.gov/gridpoints/LIX/67,92/forecast/hourly";
  const res = await fetchWithTimeout(url, NWS_HEADERS);
  const json = await res.json();
  const periods = (json.properties?.periods || []) as NWSHourlyPeriod[];

  // Limit to 48 hours
  const cutoff = Date.now() + 48 * 60 * 60 * 1000;

  return periods
    .filter((p) => new Date(p.startTime).getTime() <= cutoff)
    .map((p) => {
      const degrees = cardinalToDegrees(p.windDirection);
      return {
        timestamp: p.startTime,
        windSpeed: parseMphToKnots(p.windSpeed),
        windDirection: degrees,
        windGust: null,
        windCardinal: p.windDirection,
        waterLevel: null,
      };
    });
}

interface NWSAlertFeature {
  properties: {
    headline: string;
    severity: string;
    event: string;
    description: string;
    onset: string;
    expires: string;
  };
}

async function fetchNWSAlerts(): Promise<NWSAlert[]> {
  const url = "https://api.weather.gov/alerts/active?point=30.03,-90.09";
  const res = await fetchWithTimeout(url, NWS_HEADERS);
  const json = await res.json();
  const features = (json.features || []) as NWSAlertFeature[];

  return features.map((f) => ({
    headline: f.properties.headline || "",
    severity: f.properties.severity || "Unknown",
    event: f.properties.event || "",
    description: f.properties.description || "",
    onset: f.properties.onset || "",
    expires: f.properties.expires || "",
  }));
}

// ============================================================================
// USGS STRUCTURE GAUGE FETCHERS
// ============================================================================

/**
 * USGS flood control structure gauges monitored by FPA operations.
 * These are the same gauges shown on info.floodauthority.org/gages.htm
 * in the EOC. Used as secondary corroboration of lakefront conditions.
 *
 * Station IDs identified from the FPA depth gauge page. Subject to
 * confirmation with the Regional Director's team.
 *
 * Data source: USGS Water Services (waterservices.usgs.gov)
 * Parameter 00065 = gauge height (feet)
 */
const USGS_STRUCTURE_GAUGES = [
  { siteId: "073802332", name: "Seabrook" },
  { siteId: "073802339", name: "Surge Barrier" },
  { siteId: "073745235", name: "Bayou Dupre" },
] as const;

interface USGSTimeSeriesValue {
  value: string;
  dateTime: string;
}

interface USGSTimeSeries {
  sourceInfo: { siteCode: { value: string }[] };
  values: { value: USGSTimeSeriesValue[] }[];
}

async function fetchStructureGauges(): Promise<StructureGauge[]> {
  const siteIds = USGS_STRUCTURE_GAUGES.map((g) => g.siteId).join(",");
  const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${siteIds}&parameterCd=00065&siteStatus=all`;
  const res = await fetchWithTimeout(url);
  const json = await res.json();

  const timeSeries = (json.value?.timeSeries || []) as USGSTimeSeries[];

  return USGS_STRUCTURE_GAUGES.map((gauge) => {
    // Find matching time series for this site
    const series = timeSeries.find((ts) =>
      ts.sourceInfo?.siteCode?.some((sc) => sc.value === gauge.siteId)
    );
    const latest = series?.values?.[0]?.value?.slice(-1)?.[0];

    const parsed = latest ? parseFloat(latest.value) : NaN;
    return {
      siteId: gauge.siteId,
      name: gauge.name,
      level: isNaN(parsed) ? null : parsed,
      timestamp: latest?.dateTime || "",
    };
  });
}

// ============================================================================
// FORECAST MERGING
// ============================================================================

/**
 * Merge NGOFS2 water level forecast with NWS wind forecast
 * into a unified timeline, using the NWS hourly timestamps as
 * the primary timeline and filling in water levels from the
 * closest OFS data point.
 */
function mergeForecasts(
  ofsForecast: ForecastPoint[],
  nwsForecast: ForecastPoint[]
): ForecastPoint[] {
  if (nwsForecast.length === 0) return ofsForecast;

  return nwsForecast.map((nws) => {
    const nwsTime = new Date(nws.timestamp).getTime();

    // Find closest OFS water level
    let closestWater: number | null = null;
    let closestDiff = Infinity;
    for (const ofs of ofsForecast) {
      const diff = Math.abs(new Date(ofs.timestamp).getTime() - nwsTime);
      if (diff < closestDiff && ofs.waterLevel !== null) {
        closestDiff = diff;
        closestWater = ofs.waterLevel;
      }
    }

    // Only use OFS data if within 2 hours of the NWS timestamp
    const waterLevel = closestDiff <= 2 * 60 * 60 * 1000 ? closestWater : null;

    return {
      ...nws,
      waterLevel,
    };
  });
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function GET(request: Request) {
  // Allow client to request more or less observed history for the chart.
  // Defaults to CHART_HISTORY_HOURS (24). Clamped to 6-168 (1 week max).
  const url = new URL(request.url);
  const rangeParam = url.searchParams.get("range");
  const chartHours = rangeParam
    ? Math.max(6, Math.min(168, parseInt(rangeParam, 10) || CHART_HISTORY_HOURS))
    : CHART_HISTORY_HOURS;

  try {
    // Fetch all data sources in parallel; partial failures are handled gracefully.
    // Wind history (8th fetch) powers duration gating; if it fails, risk engine
    // falls back to instantaneous-only behavior.
    const [windResult, waterResult, predResult, pressureResult, ofsResult, nwsForecastResult, alertsResult, windHistoryResult, gaugesResult, waterHistoryResult] =
      await Promise.allSettled([
        fetchCurrentWind(),
        fetchWaterLevel(),
        fetchPredictions(),
        fetchPressure(),
        fetchOFSForecast(),
        fetchNWSHourlyForecast(),
        fetchNWSAlerts(),
        fetchWindHistory(chartHours),
        fetchStructureGauges(),
        fetchWaterLevelHistory(chartHours),
      ]);

    // Extract values with fallbacks
    const wind: WindReading = windResult.status === "fulfilled"
      ? windResult.value
      : { speed: 0, direction: 0, gust: 0, cardinal: "N/A", timestamp: "" };

    const water = waterResult.status === "fulfilled"
      ? waterResult.value
      : { level: 0, timestamp: "" };

    const prediction = predResult.status === "fulfilled"
      ? predResult.value
      : { predicted: 0, timestamp: "" };

    const pressure: PressureReading = pressureResult.status === "fulfilled"
      ? pressureResult.value
      : { value: 0, timestamp: "" };

    const ofsForecast = ofsResult.status === "fulfilled" ? ofsResult.value : [];
    const nwsForecast = nwsForecastResult.status === "fulfilled" ? nwsForecastResult.value : [];
    const alerts = alertsResult.status === "fulfilled" ? alertsResult.value : [];

    // Wind history for duration gating. null = unavailable, risk engine
    // will fall back to instantaneous-only assessment.
    const windHistory = windHistoryResult.status === "fulfilled"
      ? windHistoryResult.value
      : null;

    // USGS structure gauges for secondary corroboration
    const structureGauges = gaugesResult.status === "fulfilled"
      ? gaugesResult.value
      : [];

    // Observed water level history for the chart
    const waterLevelHistory = waterHistoryResult.status === "fulfilled"
      ? waterHistoryResult.value
      : [];

    // Build current conditions
    const waterLevel: WaterLevelReading = {
      level: water.level,
      predicted: prediction.predicted,
      anomaly: water.level - prediction.predicted,
      timestamp: water.timestamp,
    };

    const current: LakefrontConditions = {
      wind,
      waterLevel,
      pressure,
    };

    // Merge forecasts
    const forecast = mergeForecasts(ofsForecast, nwsForecast);

    // Slice the last 3 hours of wind history for the risk engine's
    // duration gating (~30 readings at 6-min intervals).
    // Full 12-hour history goes to the chart.
    const readingsFor3Hours = Math.ceil((WIND_HISTORY_HOURS * 60) / 6);
    const recentWindHistory = windHistory
      ? windHistory.slice(-readingsFor3Hours)
      : null;
    const risk = computeRiskLevel(current, forecast, recentWindHistory);

    // Track which sources failed
    const dataGaps: string[] = [];
    if (windResult.status === "rejected") dataGaps.push("wind");
    if (waterResult.status === "rejected") dataGaps.push("water level");
    if (predResult.status === "rejected") dataGaps.push("predictions");
    if (pressureResult.status === "rejected") dataGaps.push("pressure");
    if (ofsResult.status === "rejected") dataGaps.push("OFS forecast");
    if (nwsForecastResult.status === "rejected") dataGaps.push("NWS forecast");
    if (windHistoryResult.status === "rejected") dataGaps.push("wind history");
    if (gaugesResult.status === "rejected") dataGaps.push("structure gauges");

    if (dataGaps.length > 0) {
      risk.factors.push(`Note: Some data sources unavailable (${dataGaps.join(", ")})`);
    }

    // Store forecast snapshots for historical accuracy comparison.
    // Only the first forecast seen for each target hour is saved.
    if (forecast.length > 0) {
      await saveForecastSnapshot(forecast);
    }
    const storedForecasts = await getStoredForecasts();

    const response: LakefrontData = {
      risk,
      current,
      windHistory: windHistory || [],
      waterLevelHistory,
      forecast,
      storedForecasts,
      alerts,
      structureGauges,
      dataGaps,
      lastUpdated: new Date().toISOString(),
      stationId: STATION_ID,
      stationName: STATION_NAME,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Lakefront API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch lakefront data" },
      { status: 500 }
    );
  }
}
