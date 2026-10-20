import { describe, it, expect } from "vitest";
import {
  decideRiskAlert,
  REMINDER_HOURS,
  STEP_DOWN_HOLD_MINUTES,
  type AlertState,
} from "./riskAlertDecision";
import type { RiskLevel } from "./lakefrontRisk";

const T0 = new Date("2026-10-09T12:00:00Z");
const at = (min: number) => new Date(T0.getTime() + min * 60_000);
const state = (level: RiskLevel, updatedMin = -60, lowerSinceMin?: number): AlertState => ({
  level,
  updatedAt: at(updatedMin).toISOString(),
  lowerSince: lowerSinceMin === undefined ? null : at(lowerSinceMin).toISOString(),
});

/** Run a sequence of (minute, level) readings and return the emails sent. */
function run(readings: [number, RiskLevel][], floor?: RiskLevel, start: AlertState | null = state("GREEN")) {
  let s = start;
  const emails: string[] = [];
  for (const [min, level] of readings) {
    const d = decideRiskAlert(s, level, at(min), floor);
    if (d.send) emails.push(`${d.kind}:${level}`);
    s = d.next;
  }
  return emails;
}

describe("decideRiskAlert (floor YELLOW)", () => {
  it("seeds silently on first run while normal", () => {
    expect(decideRiskAlert(null, "GREEN", T0).send).toBe(false);
  });

  it("alerts on first run if already elevated (lost state)", () => {
    expect(decideRiskAlert(null, "RED", T0)).toMatchObject({ send: true, kind: "escalation" });
  });

  it("sends every rise immediately", () => {
    expect(run([[0, "YELLOW"], [6, "ORANGE"], [12, "RED"]])).toEqual([
      "escalation:YELLOW",
      "escalation:ORANGE",
      "escalation:RED",
    ]);
  });

  it("does not suppress a rise on forecast trend (the Oct 9 miss)", () => {
    expect(decideRiskAlert(state("GREEN"), "RED", T0).send).toBe(true);
  });

  it("holds a drop until it lasts STEP_DOWN_HOLD_MINUTES", () => {
    const h = STEP_DOWN_HOLD_MINUTES;
    expect(run([[0, "ORANGE"], [h - 6, "ORANGE"]], undefined, state("RED"))).toEqual([]);
    expect(run([[0, "ORANGE"], [h, "ORANGE"]], undefined, state("RED"))).toEqual(["deescalation:ORANGE"]);
  });

  it("a RED<->ORANGE flip-flop sends nothing while RED keeps returning", () => {
    expect(run([[0, "ORANGE"], [6, "RED"], [12, "ORANGE"], [18, "RED"], [24, "ORANGE"], [30, "RED"]], undefined, state("RED"))).toEqual([]);
  });

  it("walks the full ladder down, one email per held step", () => {
    const h = STEP_DOWN_HOLD_MINUTES;
    expect(
      run([[0, "ORANGE"], [h, "ORANGE"], [h + 6, "YELLOW"], [2 * h + 6, "YELLOW"], [2 * h + 12, "GREEN"], [3 * h + 12, "GREEN"]], undefined, state("RED")),
    ).toEqual(["deescalation:ORANGE", "deescalation:YELLOW", "all-clear:GREEN"]);
  });

  it("a drop that keeps falling during the hold announces the level reached", () => {
    expect(run([[0, "ORANGE"], [30, "GREEN"], [60, "GREEN"]], undefined, state("RED"))).toEqual(["all-clear:GREEN"]);
  });

  it("reminds every REMINDER_HOURS while elevated, never while normal", () => {
    const r = REMINDER_HOURS * 60;
    expect(decideRiskAlert(state("ORANGE", -r + 6), "ORANGE", T0).send).toBe(false);
    expect(decideRiskAlert(state("ORANGE", -r), "ORANGE", T0)).toMatchObject({ send: true, kind: "reminder" });
    expect(decideRiskAlert(state("GREEN", -10 * r), "GREEN", T0).send).toBe(false);
  });
});

describe("decideRiskAlert (floor ORANGE)", () => {
  it("ignores GREEN<->YELLOW", () => {
    expect(run([[0, "YELLOW"], [6, "GREEN"], [120, "GREEN"]], "ORANGE")).toEqual([]);
  });

  it("YELLOW->ORANGE->RED and back down to YELLOW", () => {
    const h = STEP_DOWN_HOLD_MINUTES;
    expect(
      run([[0, "YELLOW"], [6, "ORANGE"], [12, "RED"], [18, "ORANGE"], [18 + h, "ORANGE"], [24 + h, "YELLOW"], [24 + 2 * h, "YELLOW"]], "ORANGE", state("YELLOW")),
    ).toEqual(["escalation:ORANGE", "escalation:RED", "deescalation:ORANGE", "all-clear:YELLOW"]);
  });
});
