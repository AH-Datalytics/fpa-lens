import { describe, expect, it } from "vitest";
import {
  centralDateStamp,
  centralOffsetMinutes,
  centralZoneAbbreviation,
  parseCentralTimestamp,
} from "../centralTime";

describe("parseCentralTimestamp", () => {
  it("reads a bare CO-OPS timestamp as Central daylight time in October", () => {
    // The live finding: NOAA's 07:00 CDT prediction was being matched against
    // 07:00 UTC on Vercel, five hours off.
    expect(parseCentralTimestamp("2026-10-07 07:00").toISOString()).toBe("2026-10-07T12:00:00.000Z");
  });

  it("reads a January timestamp as Central standard time (UTC-6)", () => {
    expect(parseCentralTimestamp("2026-01-15 07:00").toISOString()).toBe("2026-01-15T13:00:00.000Z");
  });

  it("accepts an optional seconds field and a T separator", () => {
    expect(parseCentralTimestamp("2026-10-07 07:00:30").toISOString()).toBe("2026-10-07T12:00:30.000Z");
    expect(parseCentralTimestamp("2026-10-07T07:00").toISOString()).toBe("2026-10-07T12:00:00.000Z");
  });

  it("leaves ISO strings that already carry a zone alone", () => {
    expect(parseCentralTimestamp("2026-10-07T12:00:00Z").toISOString()).toBe("2026-10-07T12:00:00.000Z");
    expect(parseCentralTimestamp("2026-10-07T07:00:00-05:00").toISOString()).toBe("2026-10-07T12:00:00.000Z");
    expect(parseCentralTimestamp("2026-10-07T15:53:00+00:00").toISOString()).toBe("2026-10-07T15:53:00.000Z");
  });

  it("resolves wall times across the 2026 DST boundaries", () => {
    // CDT begins 2026-03-08 02:00 and ends 2026-11-01 02:00.
    expect(parseCentralTimestamp("2026-03-08 01:00").toISOString()).toBe("2026-03-08T07:00:00.000Z");
    expect(parseCentralTimestamp("2026-03-08 03:00").toISOString()).toBe("2026-03-08T08:00:00.000Z");
    expect(parseCentralTimestamp("2026-10-31 23:00").toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(parseCentralTimestamp("2026-11-01 03:00").toISOString()).toBe("2026-11-01T09:00:00.000Z");
  });

  it("returns an Invalid Date for garbage rather than throwing", () => {
    expect(Number.isNaN(parseCentralTimestamp("not a time").getTime())).toBe(true);
  });
});

describe("centralOffsetMinutes", () => {
  it("is -300 in summer and -360 in winter", () => {
    expect(centralOffsetMinutes(new Date("2026-07-01T12:00:00Z"))).toBe(-300);
    expect(centralOffsetMinutes(new Date("2026-01-01T12:00:00Z"))).toBe(-360);
  });
});

describe("centralDateStamp", () => {
  it("uses the Central calendar date, not UTC's", () => {
    // 03:30Z on Oct 8 is still 10:30 PM on Oct 7 in New Orleans.
    expect(centralDateStamp(new Date("2026-10-08T03:30:00Z"))).toBe("20261007");
    expect(centralDateStamp(new Date("2026-10-08T12:00:00Z"))).toBe("20261008");
  });
});

describe("centralZoneAbbreviation", () => {
  it("flips between CDT and CST with the date", () => {
    expect(centralZoneAbbreviation(new Date("2026-10-07T12:00:00Z"))).toBe("CDT");
    expect(centralZoneAbbreviation(new Date("2026-12-07T12:00:00Z"))).toBe("CST");
  });
});
