import { describe, expect, it } from "vitest";
import {
  intensityTauShiftHours,
  normalizeIntensity,
  parseCycle,
  trackReferenceMs,
  trackTauShiftHours,
} from "../intensityTime";
import type { IntensitySeries } from "../types";

// Shape of the committed Ida advisory-6 fixture: a-deck cycle 18Z, advisory
// issued 21Z, tauH counted from the cycle (no `reference`).
const IDA_ADV6_LEGACY: IntensitySeries = {
  cycle: "2021082718",
  series: [
    {
      model: "OFCL",
      label: "Official",
      kind: "official",
      points: [
        { tauH: 0, mph: 80 },
        { tauH: 3, mph: 80 },
        { tauH: 12, mph: 100 },
        { tauH: 24, mph: 120 },
      ],
    },
  ],
};
const IDA_ADV6_TIME = "2021-08-27T21:00:00Z";

// What the ingest emits after rebasing: same guidance, already on the
// advisory clock, and it says so.
const IDA_ADV6_REBASED: IntensitySeries = {
  cycle: "2021082718",
  reference: IDA_ADV6_TIME,
  series: [
    {
      model: "OFCL",
      label: "Official",
      kind: "official",
      points: [
        { tauH: -3, mph: 80 },
        { tauH: 0, mph: 80 },
        { tauH: 9, mph: 100 },
        { tauH: 21, mph: 120 },
      ],
    },
  ],
};

// Real NHC forecast-point properties (Ida advisory 6): TAU counts from the
// 18Z synoptic time, so TAU 12 is VALIDTIME 28/0600, not 09Z.
const IDA_ADV6_TRACK: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", geometry: { type: "Point", coordinates: [-83.2, 22.1] }, properties: { TAU: 0, VALIDTIME: "27/1800" } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-84.8, 23.5] }, properties: { TAU: 12, VALIDTIME: "28/0600" } },
  ],
};

describe("parseCycle", () => {
  it("decodes an ATCF cycle stamp as UTC", () => {
    expect(parseCycle("2021082718")).toBe(Date.UTC(2021, 7, 27, 18));
  });

  it("returns null for anything that is not ten digits", () => {
    expect(parseCycle("")).toBeNull();
    expect(parseCycle(undefined)).toBeNull();
    expect(parseCycle("2021-08-27")).toBeNull();
  });
});

describe("intensityTauShiftHours", () => {
  it("shifts a legacy cycle-relative series back onto the advisory clock", () => {
    expect(intensityTauShiftHours(IDA_ADV6_LEGACY, IDA_ADV6_TIME)).toBe(-3);
  });

  it("is zero for a rebased series whose reference is the advisory", () => {
    expect(intensityTauShiftHours(IDA_ADV6_REBASED, IDA_ADV6_TIME)).toBe(0);
  });

  it("corrects a rebased series built against a different reference time", () => {
    // Blob rebased to the 15Z advisory, page now showing the 21Z one.
    expect(intensityTauShiftHours({ cycle: "2021082712", reference: "2021-08-27T15:00:00Z" }, IDA_ADV6_TIME)).toBe(-6);
  });

  it("degrades to zero on unparseable inputs", () => {
    expect(intensityTauShiftHours({ cycle: "garbage" }, IDA_ADV6_TIME)).toBe(0);
    expect(intensityTauShiftHours(IDA_ADV6_LEGACY, "not a time")).toBe(0);
    expect(intensityTauShiftHours({ cycle: "2021082718", reference: "nope" }, IDA_ADV6_TIME)).toBe(0);
  });
});

describe("normalizeIntensity", () => {
  it("makes the legacy and rebased fixtures identical on the advisory clock", () => {
    const normalized = normalizeIntensity(IDA_ADV6_LEGACY, IDA_ADV6_TIME);
    expect(normalized.series[0].points).toEqual(IDA_ADV6_REBASED.series[0].points);
    expect(normalized.reference).toBe(IDA_ADV6_TIME);
    // OFCL's tau-3 row IS the advisory-time intensity, so it lands on "Now".
    expect(normalized.series[0].points.find((p) => p.tauH === 0)?.mph).toBe(80);
  });

  it("returns the same object when nothing needs shifting", () => {
    expect(normalizeIntensity(IDA_ADV6_REBASED, IDA_ADV6_TIME)).toBe(IDA_ADV6_REBASED);
  });
});

describe("trackReferenceMs", () => {
  it("reads the synoptic time off the TAU 0 point's VALIDTIME", () => {
    expect(trackReferenceMs(IDA_ADV6_TRACK, IDA_ADV6_TIME)).toBe(Date.UTC(2021, 7, 27, 18));
  });

  it("works from a later point when TAU 0 is missing", () => {
    const tail: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [IDA_ADV6_TRACK.features[1]] };
    expect(trackReferenceMs(tail, IDA_ADV6_TIME)).toBe(Date.UTC(2021, 7, 27, 18));
  });

  it("resolves a VALIDTIME across a month boundary", () => {
    const track: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: { type: "Point", coordinates: [0, 0] }, properties: { TAU: 0, VALIDTIME: "31/1800" } }],
    };
    expect(trackReferenceMs(track, "2021-09-01T03:00:00Z")).toBe(Date.UTC(2021, 7, 31, 18));
  });

  it("is null for tracks without VALIDTIME (demo fixtures) or without a track", () => {
    const bare: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: { type: "Point", coordinates: [0, 0] }, properties: { TAU: 0 } }],
    };
    expect(trackReferenceMs(bare, IDA_ADV6_TIME)).toBeNull();
    expect(trackReferenceMs(null, IDA_ADV6_TIME)).toBeNull();
  });
});

describe("trackTauShiftHours", () => {
  it("uses the track's own VALIDTIME when present", () => {
    expect(trackTauShiftHours(IDA_ADV6_TRACK, IDA_ADV6_LEGACY, IDA_ADV6_TIME)).toBe(-3);
  });

  it("falls back to the a-deck cycle, then to zero", () => {
    expect(trackTauShiftHours(null, IDA_ADV6_LEGACY, IDA_ADV6_TIME)).toBe(-3);
    expect(trackTauShiftHours(null, { cycle: "garbage" }, IDA_ADV6_TIME)).toBe(0);
    expect(trackTauShiftHours(null, null, IDA_ADV6_TIME)).toBe(0);
  });
});
