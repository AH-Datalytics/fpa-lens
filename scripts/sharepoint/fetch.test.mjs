import { describe, it, expect } from "vitest";
import { flexibleMonth, dateKey, normalizeName, CATEGORIES } from "./fetch.mjs";

const sitrep = CATEGORIES.sitrep;

describe("flexibleMonth", () => {
  it("parses the pipeline convention", () => {
    expect(flexibleMonth("sitrep_2026-06.docx")).toEqual({ yyyy: "2026", mm: "06" });
  });

  it("parses the Regional Director's off-convention name", () => {
    // The real July 2026 upload that the strict regex skipped.
    expect(flexibleMonth("2026.07_Regional Director’s SITREP - July 2026.pdf"))
      .toEqual({ yyyy: "2026", mm: "07" });
  });

  it("falls back to a spelled-out month + year", () => {
    expect(flexibleMonth("Regional Director SITREP - August 2026.pdf"))
      .toEqual({ yyyy: "2026", mm: "08" });
  });

  it("parses MM-YYYY order", () => {
    expect(flexibleMonth("07-2026 sitrep.pdf")).toEqual({ yyyy: "2026", mm: "07" });
  });

  it("returns null when no month is resolvable", () => {
    expect(flexibleMonth("Regional Director SITREP.pdf")).toBeNull();
  });
});

describe("sitrep category (flexibleMonth)", () => {
  it("canonicalizes the saved name to descriptor_YYYY-MM.ext", () => {
    expect(normalizeName("2026.07_Regional Director’s SITREP - July 2026.pdf", sitrep))
      .toBe("sitrep_2026-07.pdf");
    expect(normalizeName("sitrep_2026-06.docx", sitrep)).toBe("sitrep_2026-06.docx");
  });

  it("sorts July ahead of June by dateKey", () => {
    const july = dateKey("2026.07_Regional Director’s SITREP - July 2026.pdf", sitrep);
    const june = dateKey("sitrep_2026-06.docx", sitrep);
    expect(july).toBe(20260701);
    expect(june).toBe(20260601);
    expect(july).toBeGreaterThan(june);
  });

  it("skips a nameless file (dateKey null)", () => {
    expect(dateKey("Regional Director SITREP.pdf", sitrep)).toBeNull();
  });
});
