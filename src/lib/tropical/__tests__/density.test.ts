import { describe, expect, it } from "vitest";
import { DENSITY_BANDS, densityCaption, densityOptions, densitySummary, ECMWF_CREDIT, GOOGLE_CITATION_PARTS } from "../density";

const product = {
  image: "storms/al092026/density-gefs.png",
  bounds: [[-97, 18], [-84, 33]] as [[number, number], [number, number]],
  cycle: "2026100706",
  members: 28,
  expected: 30,
  radiusKm: 100,
  start: "2026-10-07T15:00:00Z",
  end: "2026-10-12T06:00:00Z",
};

describe("densityCaption", () => {
  it("states what is counted, the real window and the member count", () => {
    const text = densityCaption("gefs", product);
    expect(text).toContain("Share of GFS ensemble tracks whose center passes within about 60 miles (100 km)");
    expect(text).toContain("28 of 30 members");
    expect(text).toContain("06Z Oct 7 run");
    expect(text).not.toContain("5 days");
  });
});

describe("DENSITY_BANDS", () => {
  it("matches the ingest's ten bands", () => {
    expect(DENSITY_BANDS.map((b) => b.color)).toEqual([
      "#a9dcf2", "#5db5e8", "#2f7fd6", "#3fae49", "#9fd13f",
      "#f3e23a", "#f6b22d", "#f17a24", "#e2432a", "#b5172b",
    ]);
  });
});

describe("GOOGLE_CITATION_PARTS", () => {
  it("reassembles Google's required citation verbatim", () => {
    const { before, url, after } = GOOGLE_CITATION_PARTS;
    expect(before + url + after).toBe(
      "Google Weather Lab. © 2024-6 Google LLC, whose machine learning models were used to create the experimental data made available under the following licence terms https://storage.googleapis.com/weathernext-public/terms-of-use.pdf. This data is intended for experimental modelling only and is not intended, validated, or approved for real world use."
    );
  });
});

describe("Euro AI ensemble", () => {
  it("is labeled for the public", () => {
    expect(densityCaption("aifs", { ...product, members: 51, expected: 51 })).toContain(
      "Share of Euro AI ensemble tracks"
    );
  });
});

describe("Euro ensemble", () => {
  it("is labeled for the public and credited to ECMWF under CC BY 4.0", () => {
    expect(densityCaption("ecmwf", { ...product, members: 51, expected: 51 })).toContain(
      "Share of Euro ensemble tracks"
    );
    expect(ECMWF_CREDIT).toContain("ECMWF");
    expect(ECMWF_CREDIT).toContain("CC BY 4.0");
  });
});

describe("densityOptions", () => {
  it("hides Google until its layer exists; other ensembles stay listed", () => {
    expect(densityOptions({ gefs: "12Z" })).toEqual(["gefs", "ecmwf", "aifs"]);
    expect(densityOptions({ gefs: "12Z", google: "12Z" })).toEqual(["gefs", "ecmwf", "aifs", "google"]);
  });
});

describe("densitySummary", () => {
  it("is one short line: which ensemble, how many members, which run", () => {
    expect(densitySummary("aifs", { ...product, members: 51, expected: 51 })).toBe(
      "Euro AI ensemble: 51 of 51 members, 06Z Oct 7 run"
    );
  });
});
