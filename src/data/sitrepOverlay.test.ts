import { describe, it, expect } from "vitest";
import {
  applySitrep,
  parseReportMonthToISO,
  monthRank,
  shortMonth,
  colorToStatus,
  expectedPercent,
  inspectionPercent,
  isUsableDigest,
  type SitrepTargets,
  type SitrepDigest,
} from "./sitrepOverlay";

// A May-2026 baseline mirroring the SITREP-derived slices of siteData.ts.
// applySitrep() should roll this to June from the fixture below.
function mayBaseline(): SitrepTargets {
  return {
    readinessMetrics: {
      dataAsOf: "2026-05-01",
      cpraQuarterlyInspection: {
        periodStart: "2026-04-01",
        monthlyRate: 33.33,
        currentQuarterPercent: 40,
        source: "May 2026 SITREP",
      },
      usaceSemiAnnualInspection: {
        periodStart: "2026-01-01",
        monthlyRate: 16.67,
        currentHalfPercent: 70,
        status: "All LPV inspections complete",
        source: "May 2026 SITREP",
      },
      valveExercises: {
        periodStart: "2026-04-01",
        monthlyRate: 33.33,
        percentComplete: 92,
        completed: 96,
        total: 104,
        currentQuarterStatus: "Q1 2026 complete",
        source: "Apr 2026 SITREP",
      },
    },
    systemReadiness: {
      categories: [
        { name: "Infrastructure Readiness", status: "GREEN", source: "May 2026 SITREP" },
        { name: "Staffing Readiness", status: "AMBER", source: "May 2026 staffing data" },
        { name: "Financial Readiness", status: "GREEN", source: "May 2026 SITREP" },
        { name: "Media Coverage", status: "GREEN", source: "May 2026 SITREP" },
      ],
    },
    kpiMetrics: {
      systemReadiness: { label: "System Readiness", value: "GREEN", source: "May 2026 SITREP" },
      pccpPumps: { label: "PCCP Pumps Available", value: 17, source: "May 2026 SITREP" },
      floodgateInspections: { label: "Hurricane Gate Inspections", value: 100, source: "May 2026 SITREP" },
      permitsIssued: { label: "Permits Issued (Apr)", value: 27, source: "May 2026 SITREP" },
    },
    operationsData: {
      permitsIssued: [
        { month: "March 2026", count: 27, source: "Apr 2026 SITREP" },
        { month: "April 2026", count: 27, source: "May 2026 SITREP" },
      ],
    },
    financialData: {
      capitalProjects: [
        { name: "Old Project", status: "Awarded", description: "old", source: "Apr 2026 SITREP" },
      ],
    },
  };
}

// June 2026 SITREP digest with the extended inspections + project phases.
const JUNE: SitrepDigest = {
  reportMonth: "June 2026",
  readiness: { infrastructure: "Green", staffing: "Amber", financial: "Green", media: "Green" },
  permits: { issued: 19, period: "May 2026", type: "Levee Safety" },
  projects: [
    { name: "Foreshore Erosion Repair", status: "USACE determined a revised path forward; award pending.", phase: "Pre-Award" },
    { name: "West Return Wall Splash Pad", status: "Construction substantially complete; closeout.", phase: "In Progress" },
    { name: "LPV Access Bridge", status: "Construction has begun; contractor mobilizing.", phase: "In Progress" },
    { name: "Orpheum Slope Paving", status: "Construction has begun; contractor mobilized.", phase: "In Progress" },
    { name: "Franklin Ave. Vault 4 Generator Replacement", status: "Bid opened May 26, 2026.", phase: "In Bidding" },
    { name: "London Avenue Canal Erosion Mitigation (Phase 1)", status: "95% plans and specs submitted.", phase: "In Design" },
    { name: "40 Arpent Sheet Pile Rehabilitation (Phase 2)", status: "Task order negotiation ongoing.", phase: "In Progress" },
    { name: "Franklin Herbicide Vehicle Containment", status: "Informal bid request; bid opening June 4.", phase: "In Bidding" },
    { name: "Lakeshore Drive Flooding Warning Signs", status: "Sign systems reviewed, selected, and ordered.", phase: "In Progress" },
  ],
  inspections: {
    cpra: { status: "on-track", note: "Q2 field inspections nearing completion" },
    usace: { status: "complete", note: "All LPV, PCCP, and Complex Structures inspections complete with no significant findings" },
    valves: { status: "on-track", completed: 84, total: 105, note: "84 of 105 valves inspected in Q2 rotational testing" },
  },
};

describe("pure helpers", () => {
  it("parseReportMonthToISO", () => {
    expect(parseReportMonthToISO("June 2026")).toBe("2026-06-01");
    expect(parseReportMonthToISO("December 2025")).toBe("2025-12-01");
    expect(parseReportMonthToISO("Junk 2026")).toBeNull();
    expect(parseReportMonthToISO(undefined)).toBeNull();
  });
  it("monthRank orders months", () => {
    expect(monthRank("2026-06-01")).toBeGreaterThan(monthRank("2026-05-01"));
    expect(monthRank("2026-01-01")).toBeGreaterThan(monthRank("2025-12-01"));
  });
  it("shortMonth + colorToStatus", () => {
    expect(shortMonth("May 2026")).toBe("May");
    expect(colorToStatus("Green")).toBe("GREEN");
    expect(colorToStatus("amber")).toBe("AMBER");
    expect(colorToStatus("Blue")).toBeNull();
  });
  it("inspectionPercent: explicit count wins", () => {
    expect(inspectionPercent({ status: "on-track", completed: 84, total: 105 }, { monthlyRate: 33.33, periodStart: "2026-04-01", dataAsOf: "2026-06-01" })).toBe(80);
  });
  it("inspectionPercent: complete -> 100", () => {
    expect(inspectionPercent({ status: "complete" }, { monthlyRate: 16.67, periodStart: "2026-01-01", dataAsOf: "2026-06-01" })).toBe(100);
  });
  it("inspectionPercent: on-track -> on the pace line", () => {
    const exp = Math.round(expectedPercent(33.33, "2026-04-01", "2026-06-01"));
    expect(inspectionPercent({ status: "on-track" }, { monthlyRate: 33.33, periodStart: "2026-04-01", dataAsOf: "2026-06-01" })).toBe(exp);
  });
  it("inspectionPercent: behind -> below pace (Amber band)", () => {
    const exp = expectedPercent(33.33, "2026-04-01", "2026-06-01");
    const pct = inspectionPercent({ status: "behind" }, { monthlyRate: 33.33, periodStart: "2026-04-01", dataAsOf: "2026-06-01" })!;
    const ratio = (pct / exp) * 100;
    expect(ratio).toBeGreaterThanOrEqual(80);
    expect(ratio).toBeLessThan(90);
  });
});

describe("applySitrep guards", () => {
  it("malformed digest is a no-op", () => {
    const t = mayBaseline();
    expect(applySitrep({}, t).applied).toBe(false);
    expect(applySitrep(null, t).applied).toBe(false);
    expect(t.readinessMetrics.dataAsOf).toBe("2026-05-01"); // untouched
  });
  it("older/equal month is a no-op", () => {
    const t = mayBaseline();
    const may: SitrepDigest = { ...JUNE, reportMonth: "May 2026" };
    expect(applySitrep(may, t).applied).toBe(false);
    expect(t.readinessMetrics.dataAsOf).toBe("2026-05-01");
  });
  it("isUsableDigest", () => {
    expect(isUsableDigest(JUNE)).toBe(true);
    expect(isUsableDigest({ reportMonth: "nope" })).toBe(false);
  });
});

describe("applySitrep regression: May baseline -> June roll", () => {
  it("reproduces the manual June roll's invariants", () => {
    const t = mayBaseline();
    const res = applySitrep(JUNE, t);
    expect(res.applied).toBe(true);
    expect(res.reportMonth).toBe("June 2026");

    // dataAsOf / footer
    expect(t.readinessMetrics.dataAsOf).toBe("2026-06-01");

    // Inspections: colors must be Green (on pace or better)
    const rm = t.readinessMetrics;
    const cpraExp = expectedPercent(rm.cpraQuarterlyInspection.monthlyRate, rm.cpraQuarterlyInspection.periodStart, "2026-06-01");
    expect((rm.cpraQuarterlyInspection.currentQuarterPercent / cpraExp) * 100).toBeGreaterThanOrEqual(90);
    expect(rm.usaceSemiAnnualInspection.currentHalfPercent).toBe(100);
    expect(rm.valveExercises.percentComplete).toBe(80);
    expect(rm.valveExercises.completed).toBe(84);
    expect(rm.valveExercises.total).toBe(105);
    expect(rm.valveExercises.source).toBe("June 2026 SITREP");

    // Readiness colors + sources
    const cats = Object.fromEntries(t.systemReadiness.categories.map((c) => [c.name, c]));
    expect(cats["Infrastructure Readiness"].status).toBe("GREEN");
    expect(cats["Infrastructure Readiness"].source).toBe("June 2026 SITREP");
    expect(cats["Staffing Readiness"].status).toBe("AMBER");
    expect(cats["Staffing Readiness"].source).toBe("June 2026 SITREP");

    // Permits
    expect(t.kpiMetrics.permitsIssued.label).toBe("Permits Issued (May)");
    expect(t.kpiMetrics.permitsIssued.value).toBe(19);
    expect(t.kpiMetrics.permitsIssued.source).toBe("June 2026 SITREP");
    const last = t.operationsData.permitsIssued.at(-1)!;
    expect(last).toEqual({ month: "May 2026", count: 19, source: "June 2026 SITREP" });

    // KPI source relabels
    expect(t.kpiMetrics.systemReadiness.source).toBe("June 2026 SITREP");
    expect(t.kpiMetrics.pccpPumps.source).toBe("June 2026 SITREP");

    // Capital projects
    expect(t.financialData.capitalProjects).toHaveLength(9);
    expect(t.financialData.capitalProjects[0]).toEqual({
      name: "Foreshore Erosion Repair",
      status: "Pre-Award",
      description: "USACE determined a revised path forward; award pending.",
      source: "June 2026 SITREP",
    });
  });

  it("does not re-roll when run twice (June over June is a no-op)", () => {
    const t = mayBaseline();
    applySitrep(JUNE, t);
    const before = JSON.stringify(t);
    const res2 = applySitrep(JUNE, t);
    expect(res2.applied).toBe(false);
    expect(JSON.stringify(t)).toBe(before);
  });
});
