/**
 * Pull NOAA conditions for Apr 24 morning (Jeff's complaint window) and run
 * them through the risk model to see what it would have output.
 */

import {
  computeRiskLevel,
  RISK_THRESHOLDS,
  degreesToCardinal,
  type WindReading,
  type LakefrontConditions,
} from "../src/lib/lakefrontRisk";

const STATION_ID = "8761927";
const NOAA_BASE = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";
const TARGET_DATE = "2026-04-24"; // Friday Jeff complained about

function buildUrl(product: string, begin: string, end: string, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({
    station: STATION_ID,
    product,
    units: "english",
    time_zone: "lst_ldt",
    format: "json",
    application: "fpa_lens_check",
    begin_date: begin,
    end_date: end,
    ...extra,
  });
  return `${NOAA_BASE}?${params}`;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

async function fetchJson(url: string): Promise<unknown> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`NOAA fetch failed: ${r.status}`);
  return r.json();
}

interface NOAAWind { t: string; s: string; d: string; g: string; }
interface NOAAVal { t: string; v: string; }

async function main() {
  const target = new Date(TARGET_DATE + "T00:00:00");
  const start = new Date(target.getTime() - 24 * 3600 * 1000);
  const end = new Date(target.getTime() + 24 * 3600 * 1000);

  console.log(`Fetching NOAA data for ${TARGET_DATE} window...`);

  const [windData, waterData, predData] = await Promise.all([
    fetchJson(buildUrl("wind", ymd(start), ymd(end))) as Promise<{ data?: NOAAWind[] }>,
    fetchJson(buildUrl("water_level", ymd(start), ymd(end), { datum: "MLLW" })) as Promise<{ data?: NOAAVal[] }>,
    fetchJson(buildUrl("predictions", ymd(start), ymd(end), { datum: "MLLW", interval: "h" })) as Promise<{ predictions?: NOAAVal[] }>,
  ]);

  const winds: WindReading[] = (windData.data ?? []).map((w) => ({
    speed: parseFloat(w.s) || 0,
    direction: parseFloat(w.d) || 0,
    gust: parseFloat(w.g) || 0,
    cardinal: degreesToCardinal(parseFloat(w.d) || 0),
    timestamp: w.t,
  }));
  const waters = (waterData.data ?? []).map((w) => ({ t: w.t, v: parseFloat(w.v) || 0 }));
  const preds = (predData.predictions ?? []).map((w) => ({ t: w.t, v: parseFloat(w.v) || 0 }));

  console.log(`Got ${winds.length} wind, ${waters.length} water, ${preds.length} predictions`);
  console.log(`\nThresholds: WIND_YELLOW=${RISK_THRESHOLDS.WIND_YELLOW} ORANGE=${RISK_THRESHOLDS.WIND_ORANGE} RED=${RISK_THRESHOLDS.WIND_RED}`);
  console.log(`            SURGE_YELLOW=${RISK_THRESHOLDS.SURGE_YELLOW} ORANGE=${RISK_THRESHOLDS.SURGE_ORANGE} RED=${RISK_THRESHOLDS.SURGE_RED}`);
  console.log(`            WIND_SUSTAINED_FRACTION=${RISK_THRESHOLDS.WIND_SUSTAINED_FRACTION} (over ${RISK_THRESHOLDS.WIND_HISTORY_HOURS}h)\n`);

  const findClosest = <T extends { t: string }>(arr: T[], targetMs: number): T | null => {
    let best: T | null = null;
    let bestDiff = Infinity;
    for (const e of arr) {
      const d = Math.abs(new Date(e.t).getTime() - targetMs);
      if (d < bestDiff) { bestDiff = d; best = e; }
    }
    return bestDiff <= 60 * 60 * 1000 ? best : null;
  };

  console.log("Hourly model output for Apr 24 morning (Central Time):");
  console.log("Time          Wind (kt) Dir   Anomaly   Sustained?  Risk     Factors");

  // Run hourly from 00:00 to 14:00 CDT
  for (let h = 0; h <= 14; h++) {
    const sliceEnd = new Date(`${TARGET_DATE}T${String(h).padStart(2, "0")}:00:00-05:00`);
    const sliceMs = sliceEnd.getTime();

    // Latest wind reading at or before slice end
    const recentWinds = winds.filter(r => new Date(r.timestamp).getTime() <= sliceMs);
    const w = recentWinds.slice(-1)[0];
    if (!w) continue;

    const water = findClosest(waters, sliceMs);
    const pred = findClosest(preds, sliceMs);
    const waterLvl = water?.v ?? 0;
    const predLvl = pred?.v ?? 0;
    const anomaly = waterLvl - predLvl;

    // 3-hour wind history window for sustained-wind gating
    const historyWindow = winds.filter(r => {
      const t = new Date(r.timestamp).getTime();
      return t <= sliceMs && t >= sliceMs - 3 * 3600 * 1000;
    });

    const conditions: LakefrontConditions = {
      wind: w,
      waterLevel: { level: waterLvl, predicted: predLvl, anomaly, timestamp: water?.t ?? w.timestamp },
      pressure: { value: 0, timestamp: w.timestamp },
    };

    const result = computeRiskLevel(conditions, [], historyWindow);

    const onshoreSpeeds = historyWindow.filter(r => {
      const dir = r.direction;
      return (dir >= 315 || dir <= 45) && r.speed >= RISK_THRESHOLDS.WIND_YELLOW;
    });
    const sustainedFrac = historyWindow.length > 0 ? onshoreSpeeds.length / historyWindow.length : 0;
    const sustainedNote = `${(sustainedFrac * 100).toFixed(0)}%`;

    console.log(
      `${sliceEnd.toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour12: false }).slice(0, 5)} CDT     ${w.speed.toFixed(1).padStart(5)}  ${w.cardinal.padEnd(4)} ${anomaly.toFixed(2).padStart(7)} ft  ${sustainedNote.padEnd(10)} ${result.level.padEnd(7)}  ${(result.factors ?? []).join(" / ")}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
