import { describe, it, expect } from "vitest";
import { applyStaffingOverlay, thresholdsForCapacity } from "./staffingOverlay";
import { staffingData } from "../data/siteData";
import { computeZoneLevel } from "./staffingZones";
import staffingJson from "../../public/data/staffing.json";

describe("thresholdsForCapacity", () => {
  it("reproduces the hand-derived curated cut-offs", () => {
    // Core policy (Green >= 85%, Red < 75%) on the May capacities in siteData.
    expect(thresholdsForCapacity(148, { redPct: 75, amberPct: 85 })).toEqual({ amberMax: 125, redMax: 110 });
    expect(thresholdsForCapacity(64, { redPct: 75, amberPct: 85 })).toEqual({ amberMax: 54, redMax: 47 });
    // Admin policy (Green >= 75%, Red < 50%).
    expect(thresholdsForCapacity(11, { redPct: 50, amberPct: 75 })).toEqual({ amberMax: 8, redMax: 5 });
  });
});

describe("applyStaffingOverlay with the published workbook", () => {
  const data = applyStaffingOverlay(staffingData, staffingJson);
  const dept = (label: string) =>
    [...data.coreFPU.departments, ...data.adminFunctions.departments].find((d) => d.label === label)!;
  const level = (d: { current: number | null; thresholds: { amberMax: number; redMax: number } }) =>
    computeZoneLevel(d.current, d.thresholds);

  it("takes capacity from the workbook so no department can exceed 100%", () => {
    for (const d of [...data.coreFPU.departments, ...data.adminFunctions.departments]) {
      expect(d.current ?? 0).toBeLessThanOrEqual(d.full);
    }
  });

  it("keeps the aggregates equal to the sum of their departments", () => {
    for (const unit of [data.coreFPU, data.adminFunctions]) {
      const sum = (pick: (d: (typeof unit.departments)[number]) => number) =>
        unit.departments.reduce((s, d) => s + pick(d), 0);
      expect(unit.aggregate.full).toBe(sum((d) => d.full));
      expect(unit.aggregate.current).toBe(sum((d) => d.current ?? 0));
      expect(unit.aggregate.thresholds.amberMax).toBe(sum((d) => d.thresholds.amberMax));
      expect(unit.aggregate.thresholds.redMax).toBe(sum((d) => d.thresholds.redMax));
    }
    // Card denominators now add up to the headline total.
    expect(data.coreFPU.aggregate.full + data.adminFunctions.aggregate.full).toBe(data.headcount.total);
  });

  it("grades each department on the workbook capacity under the Director's percentage policy", () => {
    for (const d of [...data.coreFPU.departments, ...data.adminFunctions.departments]) {
      const pct = ((d.current ?? 0) / d.full) * 100;
      const expected = pct < d.policyThresholds.redPct ? "RED" : pct < d.policyThresholds.amberPct ? "AMBER" : "GREEN";
      expect(level(d), `${d.label} ${d.current}/${d.full}`).toBe(expected);
    }
  });

  it("matches the October 2026 outcomes the Director accepted", () => {
    // Guard against the test silently passing on a future workbook: only
    // assert the specific colours while the October file is what's published.
    if (staffingJson.asOf !== "October 2026") return;
    expect(dept("Police").full).toBe(79);
    expect(level(dept("Police"))).toBe("RED");
    expect(level(dept("Engineering"))).toBe("AMBER");
    expect(dept("Executive").full).toBe(14);
    expect(level(dept("Executive"))).toBe("GREEN");
    expect(data.coreFPU.aggregate.full).toBe(267);
    expect(computeZoneLevel(data.coreFPU.aggregate.current, data.coreFPU.aggregate.thresholds)).toBe("GREEN");
    expect(computeZoneLevel(data.adminFunctions.aggregate.current, data.adminFunctions.aggregate.thresholds)).toBe("GREEN");
  });
});
