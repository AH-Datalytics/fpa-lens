import { describe, test, expect } from "vitest";
import { parseSummary, summarizeChange, buildDigest, shouldSend } from "./notify-digest.mjs";

describe("parseSummary", () => {
  test("parses the per-category status lines written by refresh-data.mjs", () => {
    const txt = [
      "REFRESHED finance: budget-actuals_2026-06.xlsm",
      "SKIPPED   sitrep: no file uploaded yet",
      "FAILED    idiq: workbook tab missing",
    ].join("\n");
    expect(parseSummary(txt)).toEqual([
      { status: "REFRESHED", key: "finance", detail: "budget-actuals_2026-06.xlsm" },
      { status: "SKIPPED", key: "sitrep", detail: "no file uploaded yet" },
      { status: "FAILED", key: "idiq", detail: "workbook tab missing" },
    ]);
  });

  test("returns [] for empty or missing input", () => {
    expect(parseSummary("")).toEqual([]);
    expect(parseSummary(undefined)).toEqual([]);
  });
});

describe("summarizeChange", () => {
  test("finance reports the YTD period roll", () => {
    const s = summarizeChange(
      "public/data/actuals-fy26.json",
      { period: "FY26 YTD through May 31, 2026" },
      { period: "FY26 YTD through June 30, 2026" },
    );
    expect(s).toBe(
      "Finance: FY26 YTD through May 31, 2026 → FY26 YTD through June 30, 2026",
    );
  });

  test("turf reports the reporting-month roll", () => {
    const s = summarizeChange(
      "src/data/turfCycles.json",
      { reportingMonth: { label: "June 2026" } },
      { reportingMonth: { label: "July 2026" } },
    );
    expect(s).toBe("Turf maintenance: reporting month June 2026 → July 2026");
  });

  test("sitrep reports a month roll", () => {
    const s = summarizeChange(
      "public/data/sitrep.json",
      { reportMonth: "June 2026" },
      { reportMonth: "July 2026" },
    );
    expect(s).toBe("SITREP: dashboard rolled June 2026 → July 2026");
  });

  test("a brand-new file (no HEAD version) still summarizes", () => {
    const s = summarizeChange("public/data/staffing.json", null, {
      vacancies: 50,
      asOf: "June 2026",
    });
    expect(s).toContain("Staffing");
  });

  test("an unrecognized file falls back to a generic 'updated' line", () => {
    const s = summarizeChange("public/data/whatever.json", {}, {});
    expect(s).toBe("whatever.json: updated");
  });
});

describe("buildDigest", () => {
  test("published updates -> plural subject, listed changes, pull status, logs link", () => {
    const { subject, text } = buildDigest({
      results: [{ status: "REFRESHED", key: "finance", detail: "f.xlsm" }],
      changes: [
        "Finance: A → B",
        "Turf maintenance: reporting month June 2026 → July 2026",
      ],
      runUrl: "https://logs.example",
      siteUrl: "https://fpalens.org",
    });
    expect(subject).toBe("FPA Lens data refresh: 2 updates published");
    expect(text).toContain("Finance: A → B");
    expect(text).toContain("Turf maintenance: reporting month June 2026 → July 2026");
    expect(text).toContain("REFRESHED");
    expect(text).toContain("https://logs.example");
    expect(text).toContain("https://fpalens.org");
  });

  test("exactly one change -> singular subject", () => {
    const { subject } = buildDigest({ results: [], changes: ["Finance: A → B"] });
    expect(subject).toBe("FPA Lens data refresh: 1 update published");
  });

  test("no changes -> explicit all-current subject and body note", () => {
    const { subject, text } = buildDigest({
      results: [{ status: "SKIPPED", key: "turf", detail: "no file uploaded yet" }],
      changes: [],
    });
    expect(subject).toBe("FPA Lens data refresh: all sources current");
    expect(text).toContain("None — every source was already current.");
  });

  test("a failed category -> warning subject and needs-attention section", () => {
    const { subject, text } = buildDigest({
      results: [{ status: "FAILED", key: "idiq", detail: "bad tab" }],
      changes: [],
    });
    expect(subject).toBe("FPA Lens data refresh: ⚠ 1 source failed");
    expect(text).toContain("Needs attention:");
    expect(text).toContain("idiq: bad tab");
  });

  test("hard run failure (step errored before any summary) still flags attention", () => {
    const { subject, text } = buildDigest({ results: [], changes: [], runFailed: true });
    expect(subject).toBe("FPA Lens data refresh: ⚠ run errored");
    expect(text).toContain("errored before");
  });
});

describe("shouldSend", () => {
  const current = [{ status: "REFRESHED", key: "finance", detail: "f.xlsm" }];

  test("a quiet run (sources pulled, nothing changed) stays silent", () => {
    expect(shouldSend({ results: current, changes: [] })).toBe(false);
  });

  test("published changes send", () => {
    expect(shouldSend({ results: current, changes: ["Finance: A → B"] })).toBe(true);
  });

  test("a failed source sends even with no changes", () => {
    expect(
      shouldSend({ results: [{ status: "FAILED", key: "idiq", detail: "bad tab" }], changes: [] }),
    ).toBe(true);
  });

  test("a hard run failure sends", () => {
    expect(shouldSend({ results: [], changes: [], runFailed: true })).toBe(true);
  });

  test("force sends a quiet run (manual dispatch wants confirmation)", () => {
    expect(shouldSend({ results: current, changes: [], force: true })).toBe(true);
  });

  test("defaults to silence when handed nothing", () => {
    expect(shouldSend({})).toBe(false);
  });
});
