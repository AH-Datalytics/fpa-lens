import { describe, it, expect } from "vitest";
import {
  applySitrep,
  halfBounds,
  isUnlabeledQuarterlyNote,
  quarterBounds,
  statedQuarterPercent,
  type SitrepTargets,
} from "./sitrepOverlay";

/** Minimal baseline mirroring the June 2026 curated values in siteData.ts. */
function baseline(): SitrepTargets {
  return {
    readinessMetrics: {
      dataAsOf: "2026-06-01",
      cpraQuarterlyInspection: {
        currentQuarter: "Q2 2026",
        currentQuarterPercent: 90,
        periodStart: "2026-04-01",
        periodEnd: "2026-06-30",
        monthlyRate: 33.33,
        reported: true,
        note: null,
        source: "June 2026 SITREP",
      },
      usaceSemiAnnualInspection: {
        currentHalfPercent: 92,
        periodStart: "2026-01-01",
        periodEnd: "2026-06-30",
        monthlyRate: 16.67,
        percentIsEstimate: false,
        status: "All inspections complete",
        source: "June 2026 SITREP",
      },
      valveExercises: {
        percentComplete: 80,
        completed: 84,
        total: 105,
        periodStart: "2026-04-01",
        monthlyRate: 33.33,
        source: "June 2026 SITREP",
      },
    },
    systemReadiness: { categories: [] },
    kpiMetrics: {
      systemReadiness: {},
      pccpPumps: {},
      floodgateInspections: {},
      permitsIssued: { label: "Permits Issued (May)", value: 19 },
    },
    operationsData: {
      permitsIssued: [
        { month: "April 2026", count: 27, source: "May 2026 SITREP" },
        { month: "May 2026", count: 19, source: "June 2026 SITREP" },
        { month: "July 2026", count: 33, source: "August 2026 SITREP" },
      ],
    },
    financialData: { capitalProjects: [] },
  };
}

/** Shape of the live September 2026 digest (public/data/sitrep.json). */
const septemberDigest = {
  reportMonth: "September 2026",
  executiveSummary:
    "The Authority remains operationally ready for the 2026 hurricane season. Q3 field inspections are approximately 95% complete, and all PCCP stations and complex structures remain operational and mission ready.",
  permits: { issued: 29, period: "August 2026", type: "Levee Safety" },
  inspections: {
    cpra: { status: "not-reported", note: null },
    usace: {
      status: "on-track",
      note: "Q3 field inspections approximately 95% complete; all annual complex structure inspections completed with no findings impacting system readiness",
    },
    valves: { status: "complete", completed: null, total: null, note: "Q3 valve inspections complete" },
  },
};

describe("period helpers", () => {
  it("quarterBounds places a month in its calendar quarter", () => {
    expect(quarterBounds("2026-09-01")).toEqual({ quarter: 3, label: "Q3 2026", start: "2026-07-01", end: "2026-09-30" });
    expect(quarterBounds("2026-10-01")).toEqual({ quarter: 4, label: "Q4 2026", start: "2026-10-01", end: "2026-12-31" });
    expect(quarterBounds("2026-02-01").end).toBe("2026-03-31");
  });

  it("halfBounds splits Jan-Jun / Jul-Dec", () => {
    expect(halfBounds("2026-06-01")).toEqual({ start: "2026-01-01", end: "2026-06-30" });
    expect(halfBounds("2026-09-01")).toEqual({ start: "2026-07-01", end: "2026-12-31" });
  });

  it("statedQuarterPercent finds a stated figure for the matching quarter only", () => {
    const texts = [septemberDigest.executiveSummary, null, septemberDigest.inspections.usace.note];
    expect(statedQuarterPercent(texts, 3)?.percent).toBe(95);
    expect(statedQuarterPercent(texts, 3)?.sentence).toMatch(/^Q3 field inspections are approximately 95% complete/);
    expect(statedQuarterPercent(texts, 2)).toBeNull();
    expect(statedQuarterPercent(["Routine maintenance continued."], 3)).toBeNull();
  });
});

describe("applySitrep with a September digest", () => {
  it("rolls CPRA to Q3 and uses the stated 95% instead of a synthesized pace figure", () => {
    const t = baseline();
    const res = applySitrep(septemberDigest, t);
    expect(res.applied).toBe(true);
    const cpra = t.readinessMetrics.cpraQuarterlyInspection;
    expect(cpra.currentQuarter).toBe("Q3 2026");
    expect(cpra.periodStart).toBe("2026-07-01");
    expect(cpra.periodEnd).toBe("2026-09-30");
    expect(cpra.currentQuarterPercent).toBe(95);
    expect(cpra.reported).toBe(true);
    expect(cpra.note).toMatch(/95% complete/);
  });

  it("marks CPRA not reported when the digest says nothing about it", () => {
    const t = baseline();
    const digest = {
      ...septemberDigest,
      executiveSummary: "Nothing about inspections here.",
      inspections: { ...septemberDigest.inspections, usace: { status: "on-track", note: "LPV inspections continue" } },
    };
    applySitrep(digest, t);
    const cpra = t.readinessMetrics.cpraQuarterlyInspection;
    expect(cpra.reported).toBe(false);
    expect(cpra.currentQuarter).toBe("Q3 2026");
    expect(cpra.source).toBe("September 2026 SITREP");
  });

  it("treats a quarter-labeled note filed under usace as CPRA's, leaving USACE not reported", () => {
    const t = baseline();
    applySitrep(septemberDigest, t);
    const usace = t.readinessMetrics.usaceSemiAnnualInspection;
    expect(usace.reported).toBe(false);
    expect(usace.status).toBe("Not covered in the September 2026 SITREP");
  });

  it("rolls USACE to the Jul-Dec half and flags a status-only percent as an estimate", () => {
    const t = baseline();
    const digest = {
      ...septemberDigest,
      inspections: { ...septemberDigest.inspections, usace: { status: "on-track", note: "USACE LPV inspections underway" } },
    };
    applySitrep(digest, t);
    const usace = t.readinessMetrics.usaceSemiAnnualInspection;
    expect(usace.periodStart).toBe("2026-07-01");
    expect(usace.periodEnd).toBe("2026-12-31");
    expect(usace.percentIsEstimate).toBe(true);
    expect(usace.reported).toBe(true);
    expect(usace.status).toBe("USACE LPV inspections underway");
    // Sept 1 is two months into a six-month half at 16.67%/mo -> ~33% expected.
    expect(usace.currentHalfPercent).toBeGreaterThanOrEqual(32);
    expect(usace.currentHalfPercent).toBeLessThanOrEqual(34);
  });

  it("keeps every prior permit month and appends the digest's month", () => {
    const t = baseline();
    applySitrep(septemberDigest, t);
    expect(t.operationsData.permitsIssued.map((e) => `${e.month}:${e.count}`)).toEqual([
      "April 2026:27",
      "May 2026:19",
      "July 2026:33",
      "August 2026:29",
    ]);
    expect(t.kpiMetrics.permitsIssued.label).toBe("Permits Issued (August)");
  });

  it("merges an accumulated permitsHistory and sorts chronologically", () => {
    const t = baseline();
    applySitrep(
      {
        ...septemberDigest,
        permitsHistory: [
          { issued: 29, period: "August 2026" },
          { issued: 12, period: "June 2026" },
          { issued: 33, period: "July 2026" },
        ],
      },
      t,
    );
    expect(t.operationsData.permitsIssued.map((e) => e.month)).toEqual([
      "April 2026",
      "May 2026",
      "June 2026",
      "July 2026",
      "August 2026",
    ]);
    expect(t.operationsData.permitsIssued.find((e) => e.month === "June 2026")?.count).toBe(12);
  });
});

describe("applySitrep with the October 2026 digest", () => {
  /** Live October digest: an unlabeled Q3 sentence the extractor filed under usace. */
  const octoberDigest = {
    ...septemberDigest,
    reportMonth: "October 2026",
    executiveSummary:
      "The Authority remains operationally ready. Q3 field inspections are complete, all PCCP stations and complex structures remain mission ready.",
    inspections: {
      cpra: { status: "not-reported", note: null },
      usace: { status: "complete", note: "Q3 field inspections complete; all PCCP stations and complex structures mission ready" },
      valves: { status: "on-track", completed: null, total: null, note: "Q4 valve inspections and exercises underway" },
    },
  };

  it("does not mark the Jul-Dec USACE half complete from a CPRA quarter sentence", () => {
    const t = baseline();
    applySitrep(octoberDigest, t);
    const usace = t.readinessMetrics.usaceSemiAnnualInspection;
    expect(usace.reported).toBe(false);
    expect(usace.currentHalfPercent).toBeLessThan(100);
    expect(usace.status).toBe("Not covered in the October 2026 SITREP");
    // Q3 is done; the October card grades Q4, which the SITREP does not cover.
    expect(t.readinessMetrics.cpraQuarterlyInspection.currentQuarter).toBe("Q4 2026");
    expect(t.readinessMetrics.cpraQuarterlyInspection.reported).toBe(false);
  });

  it("reads the split resend: Q3 complete does not put Q4 at 100%, USACE report on the USACE card", () => {
    const t = baseline();
    applySitrep({
      ...octoberDigest,
      inspections: {
        cpra: {
          status: "complete",
          note: "3rd quarter field inspections are complete and under Engineering review; 4th Quarter field inspection underway",
        },
        usace: { status: "on-track", note: "USACE Semi Annual Report nearing completion, to be submitted October 15, 2026, to CPRA" },
        valves: octoberDigest.inspections.valves,
      },
    }, t);
    const cpra = t.readinessMetrics.cpraQuarterlyInspection;
    expect(cpra.currentQuarter).toBe("Q4 2026");
    expect(cpra.reported).toBe(true);
    expect(cpra.currentQuarterPercent).toBeLessThan(100);
    const usace = t.readinessMetrics.usaceSemiAnnualInspection;
    expect(usace.reported).toBe(true);
    expect(usace.percentIsEstimate).toBe(true);
    expect(usace.status).toMatch(/^USACE Semi Annual Report/);
  });

  it("reads a bare 'complete' and spelled-out quarters as a stated CPRA figure", () => {
    expect(statedQuarterPercent(["Q3 field inspections are complete."], 3)?.percent).toBe(100);
    expect(statedQuarterPercent(["3rd quarter field inspections are complete."], 3)?.percent).toBe(100);
    expect(statedQuarterPercent(["Q3 field inspections nearing completion."], 3)).toBeNull();
    expect(statedQuarterPercent(["Q3 field inspections are nearly complete."], 3)).toBeNull();
  });

  it("isUnlabeledQuarterlyNote keeps USACE-named notes on the USACE card", () => {
    expect(isUnlabeledQuarterlyNote("Q3 field inspections complete")).toBe(true);
    expect(isUnlabeledQuarterlyNote("3rd quarter field inspections are complete")).toBe(true);
    expect(isUnlabeledQuarterlyNote("USACE semi-annual inspections complete")).toBe(false);
    expect(isUnlabeledQuarterlyNote("Q3 USACE LPV inspections underway")).toBe(false);
    expect(isUnlabeledQuarterlyNote(null)).toBe(false);
  });
});
