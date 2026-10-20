/**
 * Replay the Lakeshore Drive alert emails over a past window: fetch NOAA New
 * Canal (8761927) 6-minute observations, run computeRiskLevel() every 6 minutes
 * the way the 5-minute cron would, feed each level through decideRiskAlert(),
 * and list the emails that would have gone out.
 *
 * Limits: no archived NWS forecast, so the 6-hour forecast bump and the trend
 * are absent (trend shows "Holding steady"); the KNEW wind fallback is not used.
 *
 * Usage:
 *   npx tsx scripts/replay-risk-alerts.ts 2026-10-08 2026-10-11
 *   npx tsx scripts/replay-risk-alerts.ts 2026-10-08 2026-10-11 --floor ORANGE
 *   npx tsx scripts/replay-risk-alerts.ts 2026-10-08 2026-10-11 --json out.json   (every step + email, for charts)
 *   npx tsx scripts/replay-risk-alerts.ts 2026-10-08 2026-10-11 --send you@example.com [--pick 10-17]
 * --send needs RESEND_API_KEY (read from .env.vercel-prod when not set).
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { Resend } from "resend";
import {
  computeRiskLevel,
  degreesToCardinal,
  RISK_THRESHOLDS,
  type RiskLevel,
  type WindReading,
} from "../src/lib/lakefrontRisk";
import { decideRiskAlert, ALERT_FLOOR, type AlertKind, type AlertState } from "../src/lib/riskAlertDecision";
import { buildRiskAlertEmail } from "../src/lib/riskAlertEmail";
import { parseCentralTimestamp } from "../src/app/api/lakefront/centralTime";

const NOAA = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";
const STEP_MIN = 6;

const args = process.argv.slice(2);
const [startArg, endArg] = args;
if (!startArg || !endArg) {
  console.error("Usage: npx tsx scripts/replay-risk-alerts.ts YYYY-MM-DD YYYY-MM-DD [--floor ORANGE] [--send email]");
  process.exit(1);
}
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const floor = (flag("--floor")?.toUpperCase() as RiskLevel) || ALERT_FLOOR;
const sendTo = flag("--send");
const jsonOut = flag("--json");
// 1-based range of the listed emails to send, e.g. "10-17" or "3".
const pick = flag("--pick")?.split("-").map(Number);

async function noaa(product: string, extra: Record<string, string>) {
  const params = new URLSearchParams({
    station: "8761927",
    product,
    units: "english",
    time_zone: "lst_ldt",
    format: "json",
    application: "fpa_lens_replay",
    begin_date: startArg.replace(/-/g, ""),
    end_date: endArg.replace(/-/g, ""),
    ...extra,
  });
  const res = await fetch(`${NOAA}?${params}`);
  if (!res.ok) throw new Error(`NOAA ${product} HTTP ${res.status}`);
  return (await res.json()) as Record<string, { t: string; [k: string]: string }[]>;
}

function nearest<T extends { ms: number }>(rows: T[], ms: number, maxMin: number): T | null {
  let best: T | null = null;
  for (const r of rows) {
    if (r.ms > ms) break;
    best = r;
  }
  return best && ms - best.ms <= maxMin * 60_000 ? best : null;
}

async function main() {
  const [windJ, waterJ, predJ] = await Promise.all([
    noaa("wind", {}),
    noaa("water_level", { datum: "MLLW" }),
    noaa("predictions", { datum: "MLLW" }),
  ]);
  const wind = (windJ.data ?? []).map((e) => {
    const direction = parseFloat(e.d) || 0;
    return {
      ms: parseCentralTimestamp(e.t).getTime(),
      reading: {
        speed: parseFloat(e.s) || 0,
        direction,
        gust: parseFloat(e.g) || 0,
        cardinal: e.dr || degreesToCardinal(direction),
        timestamp: parseCentralTimestamp(e.t).toISOString(),
      } as WindReading,
    };
  });
  const water = (waterJ.data ?? []).map((e) => ({ ms: parseCentralTimestamp(e.t).getTime(), v: parseFloat(e.v) }));
  const pred = (predJ.predictions ?? []).map((e) => ({ ms: parseCentralTimestamp(e.t).getTime(), v: parseFloat(e.v) }));
  if (!wind.length || !water.length || !pred.length) throw new Error("NOAA returned no data for part of the window");

  const historyMs = RISK_THRESHOLDS.WIND_HISTORY_HOURS * 3_600_000;
  const startMs = wind[0].ms + historyMs;
  const endMs = wind[wind.length - 1].ms;

  let state: AlertState | null = null;
  const minutesAt: Record<RiskLevel, number> = { GREEN: 0, YELLOW: 0, ORANGE: 0, RED: 0 };
  const steps: { at: string; level: RiskLevel }[] = [];
  const alerts: {
    at: string;
    kind: AlertKind;
    previous: RiskLevel | null;
    level: RiskLevel;
    factors: string[];
    action: string;
    description: string;
  }[] = [];

  for (let ms = startMs; ms <= endMs; ms += STEP_MIN * 60_000) {
    const w = nearest(wind, ms, 30);
    const wl = nearest(water, ms, 30);
    const p = nearest(pred, ms, 30);
    if (!w || !wl || !p) continue;
    const history = wind.filter((r) => r.ms > ms - historyMs && r.ms <= ms).map((r) => r.reading);
    const risk = computeRiskLevel(
      {
        wind: w.reading,
        waterLevel: { level: wl.v, predicted: p.v, anomaly: wl.v - p.v, timestamp: new Date(ms).toISOString() },
        pressure: { value: 0, timestamp: new Date(ms).toISOString() },
      },
      [],
      history,
    );
    minutesAt[risk.level] += STEP_MIN;
    steps.push({ at: new Date(ms).toISOString(), level: risk.level });
    const now = new Date(ms);
    // First evaluated step seeds the state as the cron would hold it.
    if (state === null) {
      state = { level: risk.level, updatedAt: now.toISOString() };
      continue;
    }
    const d: ReturnType<typeof decideRiskAlert> = decideRiskAlert(state, risk.level, now, floor);
    if (d.send && d.kind) {
      alerts.push({
        at: now.toISOString(),
        kind: d.kind,
        previous: state.level,
        level: risk.level,
        factors: risk.factors,
        action: risk.action,
        description: risk.description,
      });
    }
    state = d.next;
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  console.log(`Replay ${startArg} to ${endArg}, alert floor ${floor}`);
  console.log(
    `Hours at each level: ${(["GREEN", "YELLOW", "ORANGE", "RED"] as RiskLevel[]).map((l) => `${l} ${(minutesAt[l] / 60).toFixed(1)}`).join(", ")}`,
  );
  console.log(`${alerts.length} email(s):`);
  for (const a of alerts) {
    console.log(`  ${fmt(a.at)}  ${a.kind.padEnd(12)} ${a.previous ?? "-"} -> ${a.level}  | ${a.factors.join("; ")}`);
  }

  if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ floor, steps, alerts }, null, 2));
  if (!sendTo) return;
  if (!process.env.RESEND_API_KEY && existsSync(".env.vercel-prod")) {
    const line = readFileSync(".env.vercel-prod", "utf-8").split(/\r?\n/).find((l) => l.startsWith("RESEND_API_KEY="));
    if (line) process.env.RESEND_API_KEY = line.slice("RESEND_API_KEY=".length).replace(/^"|"$/g, "");
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const chosen = pick ? alerts.slice(pick[0] - 1, pick[1] ?? pick[0]) : alerts;
  for (const [i, a] of chosen.entries()) {
    const email = buildRiskAlertEmail({
      current: a.level,
      previous: a.previous,
      kind: a.kind,
      trending: "stable",
      action: a.action,
      description: a.description,
      factors: a.factors,
      dashboardUrl: "https://fpalens.org/environment",
      sentAt: a.at,
      testNote: `TEST ${i + 1} of ${chosen.length}: replay of what FPA Lens would have sent at ${fmt(a.at)}, using NOAA New Canal observations. Not a live alert.`,
    });
    const { error } = await resend.emails.send({
      from: "FPA Lens Alerts <alerts@fpalens.org>",
      to: sendTo,
      subject: `[TEST] ${email.subject}`,
      text: email.text,
      html: email.html,
    });
    console.log(error ? `  send ${i + 1} FAILED: ${error.message}` : `  sent ${i + 1} to ${sendTo}`);
    await new Promise((r) => setTimeout(r, 600)); // Resend rate limit
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
