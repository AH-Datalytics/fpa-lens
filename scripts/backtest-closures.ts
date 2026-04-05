/**
 * Backtest the lakefront risk engine against historical Lakeshore Drive closures.
 *
 * For each closure date, fetches NOAA historical data (wind, water level, tide
 * predictions) and runs computeRiskLevel() hourly across a 48-hour window to
 * see what risk level the engine would have assigned.
 *
 * Usage: npx tsx scripts/backtest-closures.ts
 *
 * Output:
 *   data/backtest-results.json   -- full hourly timeline per event
 *   data/backtest-summary.json   -- one row per closure + false positive analysis
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import {
  computeRiskLevel,
  degreesToCardinal,
  RISK_THRESHOLDS,
  type WindReading,
  type LakefrontConditions,
  type RiskLevel,
} from "../src/lib/lakefrontRisk";

// ============================================================================
// CONFIG
// ============================================================================

const NOAA_BASE = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";
const STATION_ID = "8761927";
const WINDOW_HOURS_BEFORE = 24;
const WINDOW_HOURS_AFTER = 24;
const REQUEST_DELAY_MS = 500; // rate-limit NOAA requests

// Non-closure control days for false positive analysis (winter weekdays with no closure)
const CONTROL_DAYS = [
  "2025-12-01", "2025-12-08", "2025-12-10", "2025-12-17", "2025-12-22",
  "2026-01-06", "2026-01-13", "2026-01-20", "2026-01-27",
  "2026-02-10", "2026-02-17", "2026-03-03", "2026-03-10", "2026-03-24",
];

// ============================================================================
// NOAA FETCH HELPERS
// ============================================================================

interface NOAAWindEntry {
  t: string;
  s: string;
  d: string;
  dr: string;
  g: string;
  f: string;
}

interface NOAAWaterEntry {
  t: string;
  v: string;
}

function buildNOAAUrl(product: string, extra: Record<string, string>): string {
  const params = new URLSearchParams({
    station: STATION_ID,
    product,
    units: "english",
    time_zone: "lst_ldt",
    format: "json",
    application: "fpa_lens_backtest",
    ...extra,
  });
  return `${NOAA_BASE}?${params}`;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJSON(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchWindData(beginDate: string, endDate: string): Promise<WindReading[]> {
  const url = buildNOAAUrl("wind", { begin_date: beginDate, end_date: endDate });
  const json = (await fetchJSON(url)) as { data?: NOAAWindEntry[] };
  return (json.data || []).map((e) => ({
    speed: parseFloat(e.s) || 0,
    direction: parseFloat(e.d) || 0,
    gust: parseFloat(e.g) || 0,
    cardinal: e.dr || degreesToCardinal(parseFloat(e.d) || 0),
    timestamp: e.t,
  }));
}

async function fetchWaterData(beginDate: string, endDate: string): Promise<{ level: number; timestamp: string }[]> {
  const url = buildNOAAUrl("water_level", { begin_date: beginDate, end_date: endDate, datum: "MLLW" });
  const json = (await fetchJSON(url)) as { data?: NOAAWaterEntry[] };
  return (json.data || []).map((e) => ({
    level: parseFloat(e.v) || 0,
    timestamp: e.t,
  }));
}

async function fetchPredictions(beginDate: string, endDate: string): Promise<{ predicted: number; timestamp: string }[]> {
  const url = buildNOAAUrl("predictions", { begin_date: beginDate, end_date: endDate, datum: "MLLW", interval: "h" });
  const json = (await fetchJSON(url)) as { predictions?: NOAAWaterEntry[] };
  return (json.predictions || []).map((e) => ({
    predicted: parseFloat(e.v) || 0,
    timestamp: e.t,
  }));
}

// ============================================================================
// BACKTEST LOGIC
// ============================================================================

interface HourlyResult {
  timestamp: string;
  windSpeed: number;
  windDirection: number;
  windCardinal: string;
  windGust: number;
  waterLevel: number;
  tidePrediction: number;
  surgeAnomaly: number;
  riskLevel: RiskLevel;
  isOnshore: boolean;
  factors: string[];
  windSustained: boolean;
  sustainedFraction: number;
}

interface EventResult {
  closureDate: string;
  isClosure: boolean; // true = actual closure, false = control day
  peakRisk: RiskLevel;
  peakRiskTimestamp: string;
  hoursAtYellowOrAbove: number;
  hoursAtOrangeOrAbove: number;
  firstYellowTimestamp: string | null;
  firstOrangeTimestamp: string | null;
  hoursBeforeClosureAtYellow: number | null;
  hoursBeforeClosureAtOrange: number | null;
  peakWindSpeed: number;
  peakSurgeAnomaly: number;
  timeline: HourlyResult[];
}

function findClosest<T extends { timestamp: string }>(entries: T[], targetMs: number): T | null {
  let best: T | null = null;
  let bestDiff = Infinity;
  for (const entry of entries) {
    const diff = Math.abs(new Date(entry.timestamp).getTime() - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = entry;
    }
  }
  return bestDiff <= 60 * 60 * 1000 ? best : null; // within 1 hour
}

const RISK_ORDER: Record<RiskLevel, number> = { GREEN: 0, YELLOW: 1, ORANGE: 2, RED: 3 };

async function backtestEvent(date: string, isClosure: boolean): Promise<EventResult> {
  const closureDate = new Date(`${date}T12:00:00`); // assume midday
  const windowStart = new Date(closureDate.getTime() - WINDOW_HOURS_BEFORE * 60 * 60 * 1000);
  const windowEnd = new Date(closureDate.getTime() + WINDOW_HOURS_AFTER * 60 * 60 * 1000);

  const beginDate = formatDate(windowStart);
  const endDate = formatDate(windowEnd);

  // Fetch all data for the window
  const [windData, waterData, predData] = await Promise.all([
    fetchWindData(beginDate, endDate),
    fetchWaterData(beginDate, endDate),
    fetchPredictions(beginDate, endDate),
  ]);

  await sleep(REQUEST_DELAY_MS);

  // Simulate hourly risk assessments
  const timeline: HourlyResult[] = [];
  const hoursInWindow = WINDOW_HOURS_BEFORE + WINDOW_HOURS_AFTER;

  for (let h = 0; h <= hoursInWindow; h++) {
    const evalTime = new Date(windowStart.getTime() + h * 60 * 60 * 1000);
    const evalMs = evalTime.getTime();

    // Find closest wind reading
    const closestWind = findClosest(windData, evalMs);
    if (!closestWind) continue;

    // Find closest water level
    const closestWater = findClosest(waterData, evalMs);
    if (!closestWater) continue;

    // Find closest tide prediction
    const closestPred = findClosest(predData, evalMs);
    const predicted = closestPred?.predicted ?? 0;
    const surgeAnomaly = closestWater.level - predicted;

    // Build 3-hour wind history for duration gating
    const historyStart = evalMs - RISK_THRESHOLDS.WIND_HISTORY_HOURS * 60 * 60 * 1000;
    const windHistory = windData.filter((w) => {
      const wMs = new Date(w.timestamp).getTime();
      return wMs >= historyStart && wMs <= evalMs;
    });

    // Construct current conditions
    const current: LakefrontConditions = {
      wind: closestWind,
      waterLevel: {
        level: closestWater.level,
        predicted,
        anomaly: surgeAnomaly,
        timestamp: closestWater.timestamp,
      },
      pressure: { value: 1013, timestamp: closestWind.timestamp }, // placeholder
    };

    // Run risk engine (no forecast -- backtesting observed conditions only)
    const assessment = computeRiskLevel(current, [], windHistory);

    timeline.push({
      timestamp: evalTime.toISOString(),
      windSpeed: closestWind.speed,
      windDirection: closestWind.direction,
      windCardinal: closestWind.cardinal,
      windGust: closestWind.gust,
      waterLevel: closestWater.level,
      tidePrediction: predicted,
      surgeAnomaly: Math.round(surgeAnomaly * 100) / 100,
      riskLevel: assessment.level,
      isOnshore: assessment.isOnshore,
      factors: assessment.factors,
      windSustained: assessment.windPersistence?.isSustained ?? false,
      sustainedFraction: assessment.windPersistence?.sustainedFraction ?? 0,
    });
  }

  // Compute summary metrics
  const peakEntry = timeline.reduce(
    (best, t) => (RISK_ORDER[t.riskLevel] > RISK_ORDER[best.riskLevel] ? t : best),
    timeline[0]
  );

  const closureDateMs = closureDate.getTime();

  const firstYellow = timeline.find((t) => RISK_ORDER[t.riskLevel] >= 1);
  const firstOrange = timeline.find((t) => RISK_ORDER[t.riskLevel] >= 2);

  return {
    closureDate: date,
    isClosure,
    peakRisk: peakEntry?.riskLevel ?? "GREEN",
    peakRiskTimestamp: peakEntry?.timestamp ?? "",
    hoursAtYellowOrAbove: timeline.filter((t) => RISK_ORDER[t.riskLevel] >= 1).length,
    hoursAtOrangeOrAbove: timeline.filter((t) => RISK_ORDER[t.riskLevel] >= 2).length,
    firstYellowTimestamp: firstYellow?.timestamp ?? null,
    firstOrangeTimestamp: firstOrange?.timestamp ?? null,
    hoursBeforeClosureAtYellow: firstYellow
      ? Math.round((closureDateMs - new Date(firstYellow.timestamp).getTime()) / (60 * 60 * 1000))
      : null,
    hoursBeforeClosureAtOrange: firstOrange
      ? Math.round((closureDateMs - new Date(firstOrange.timestamp).getTime()) / (60 * 60 * 1000))
      : null,
    peakWindSpeed: Math.max(...timeline.map((t) => t.windSpeed), 0),
    peakSurgeAnomaly: Math.max(...timeline.map((t) => t.surgeAnomaly), 0),
    timeline,
  };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const dataDir = resolve(new URL(".", import.meta.url).pathname, "../data");
  const closures: { date: string }[] = JSON.parse(
    readFileSync(resolve(dataDir, "sources/closures/closure-history.json"), "utf-8")
  );

  console.log(`\nBacktesting ${closures.length} closure events + ${CONTROL_DAYS.length} control days\n`);
  console.log("=".repeat(90));

  const results: EventResult[] = [];

  // Process closure events
  for (const closure of closures) {
    process.stdout.write(`  ${closure.date} (closure)  ...  `);
    try {
      const result = await backtestEvent(closure.date, true);
      results.push(result);
      const emoji = RISK_ORDER[result.peakRisk] >= 1 ? "DETECTED" : "MISSED";
      console.log(
        `${emoji}  peak=${result.peakRisk}  wind=${result.peakWindSpeed.toFixed(1)}kt  surge=${result.peakSurgeAnomaly.toFixed(2)}ft  yellow=${result.hoursAtYellowOrAbove}h  orange=${result.hoursAtOrangeOrAbove}h`
      );
    } catch (err) {
      console.log(`ERROR: ${(err as Error).message}`);
    }
  }

  console.log("-".repeat(90));

  // Process control (non-closure) days
  for (const day of CONTROL_DAYS) {
    process.stdout.write(`  ${day} (control)  ...  `);
    try {
      const result = await backtestEvent(day, false);
      results.push(result);
      const label = RISK_ORDER[result.peakRisk] >= 1 ? "FALSE ALARM" : "CORRECT";
      console.log(
        `${label}  peak=${result.peakRisk}  wind=${result.peakWindSpeed.toFixed(1)}kt  surge=${result.peakSurgeAnomaly.toFixed(2)}ft`
      );
    } catch (err) {
      console.log(`ERROR: ${(err as Error).message}`);
    }
  }

  console.log("=".repeat(90));

  // Compute overall metrics
  const closureResults = results.filter((r) => r.isClosure);
  const controlResults = results.filter((r) => !r.isClosure);

  const detected = closureResults.filter((r) => RISK_ORDER[r.peakRisk] >= 1).length;
  const missed = closureResults.filter((r) => RISK_ORDER[r.peakRisk] === 0).length;
  const falseAlarms = controlResults.filter((r) => RISK_ORDER[r.peakRisk] >= 1).length;
  const trueNegatives = controlResults.filter((r) => RISK_ORDER[r.peakRisk] === 0).length;

  const sensitivity = closureResults.length > 0 ? detected / closureResults.length : 0;
  const falseAlarmRate = controlResults.length > 0 ? falseAlarms / controlResults.length : 0;

  console.log(`\nSUMMARY`);
  console.log(`  Closures:  ${detected}/${closureResults.length} detected (${(sensitivity * 100).toFixed(0)}% sensitivity)`);
  console.log(`  Missed:    ${missed} closures where engine stayed GREEN`);
  console.log(`  Controls:  ${falseAlarms}/${controlResults.length} false alarms (${(falseAlarmRate * 100).toFixed(0)}% false alarm rate)`);
  console.log(`  True neg:  ${trueNegatives} correctly stayed GREEN\n`);

  // Save results
  const summary = {
    generated: new Date().toISOString(),
    thresholds: RISK_THRESHOLDS,
    metrics: {
      totalClosures: closureResults.length,
      detected,
      missed,
      sensitivity,
      totalControlDays: controlResults.length,
      falseAlarms,
      trueNegatives,
      falseAlarmRate,
    },
    events: results.map(({ timeline, ...rest }) => rest),
  };

  writeFileSync(resolve(dataDir, "backtest/backtest-results.json"), JSON.stringify(results, null, 2));
  writeFileSync(resolve(dataDir, "backtest/backtest-summary.json"), JSON.stringify(summary, null, 2));

  console.log(`  Wrote data/backtest-results.json (${results.length} events, full timelines)`);
  console.log(`  Wrote data/backtest-summary.json (summary metrics)\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
