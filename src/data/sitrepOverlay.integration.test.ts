import { describe, it, expect } from "vitest";
import {
  readinessMetrics,
  systemReadiness,
  kpiMetrics,
  operationsData,
  financialData,
} from "./siteData";
import { applySitrep, type SitrepDigest } from "./sitrepOverlay";

// Validates that the overlay's target field paths match the REAL siteData
// objects (a fixture-only unit test can't catch a shape drift between the two).
// Uses a far-future month so it is always newer than the live baseline.
describe("applySitrep against real siteData shapes", () => {
  it("rolls the real siteData objects to a newer month", () => {
    const future: SitrepDigest = {
      reportMonth: "December 2099",
      readiness: { infrastructure: "Amber", staffing: "Amber", financial: "Green", media: "Green" },
      permits: { issued: 7, period: "November 2099", type: "Levee Safety" },
      projects: [{ name: "Test Project", status: "Construction underway.", phase: "In Progress" }],
      inspections: {
        cpra: { status: "complete", note: "done" },
        usace: { status: "on-track", note: "on pace" },
        valves: { status: "on-track", completed: 50, total: 100, note: "50 of 100" },
      },
    };

    const res = applySitrep(future, {
      readinessMetrics,
      systemReadiness,
      kpiMetrics,
      operationsData,
      financialData,
    });

    expect(res.applied).toBe(true);
    expect(readinessMetrics.dataAsOf).toBe("2099-12-01");
    expect(readinessMetrics.cpraQuarterlyInspection.currentQuarterPercent).toBe(100);
    expect(readinessMetrics.valveExercises.percentComplete).toBe(50);
    expect(readinessMetrics.valveExercises.completed).toBe(50);
    expect(readinessMetrics.valveExercises.total).toBe(100);

    const infra = systemReadiness.categories.find((c) => c.name === "Infrastructure Readiness")!;
    expect(infra.status).toBe("AMBER");
    expect(infra.source).toBe("December 2099 SITREP");

    expect(kpiMetrics.permitsIssued.value).toBe(7);
    expect(kpiMetrics.permitsIssued.label).toBe("Permits Issued (November)");
    expect(operationsData.permitsIssued.at(-1)).toEqual({
      month: "November 2099",
      count: 7,
      source: "December 2099 SITREP",
    });

    expect(financialData.capitalProjects).toHaveLength(1);
    expect(financialData.capitalProjects[0].name).toBe("Test Project");
    expect(financialData.capitalProjects[0].status).toBe("In Progress");
  });
});
