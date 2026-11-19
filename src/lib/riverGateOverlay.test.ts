import { describe, it, expect } from "vitest";
import { applyGateInspections, type RiverGateMetrics } from "./riverGateOverlay";

const base = (): RiverGateMetrics => ({
  total: 84,
  completed: 0,
  percentComplete: 0,
  periodStart: "2026-10-01",
  periodEnd: "2026-12-31",
  source: "FY26 schedule",
});

const log = (completed: number, periodStart = "2026-10-01", periodEnd = "2026-12-31") => ({
  latestWeekEnding: "2026-11-12",
  riverGates: { periodStart, periodEnd, completed, weeksReported: 6 },
});

describe("applyGateInspections", () => {
  it("sets the cycle count, percent and log date", () => {
    const rg = applyGateInspections(base(), log(45));
    expect(rg.completed).toBe(45);
    expect(rg.percentComplete).toBe(54);
    expect(rg.dataAsOf).toBe("2026-11-12");
    expect(rg.source).toContain("Nov 12, 2026");
  });

  it("is a no-op with no reported week", () => {
    const rg = applyGateInspections(base(), { latestWeekEnding: null, riverGates: null });
    expect(rg).toEqual(base());
  });

  it("ignores a log for a different cycle", () => {
    const rg = applyGateInspections(base(), log(30, "2027-10-01", "2027-12-31"));
    expect(rg.completed).toBe(0);
    expect(rg.dataAsOf).toBeUndefined();
  });

  it("caps at the gate total", () => {
    const rg = applyGateInspections(base(), log(90));
    expect(rg.completed).toBe(84);
    expect(rg.percentComplete).toBe(100);
  });
});
