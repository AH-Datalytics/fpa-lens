import { describe, expect, it } from "vitest";
import { gulfWatch } from "../outlookWatch";

function area(
  coords: [number, number][],
  props: Record<string, string>
): GeoJSON.Feature {
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [coords] },
    properties: props,
  };
}

const SW_GULF = area(
  [[-96, 20], [-92, 20], [-92, 23], [-96, 23], [-96, 20]],
  { PROB2DAY: "90%", PROB7DAY: "90%", RISK7DAY: "high" }
);
const MID_ATLANTIC = area(
  [[-50, 15], [-45, 15], [-45, 20], [-50, 20], [-50, 15]],
  { PROB2DAY: "60%", PROB7DAY: "80%", RISK7DAY: "high" }
);

const fc = (...features: GeoJSON.Feature[]): GeoJSON.FeatureCollection => ({
  type: "FeatureCollection",
  features,
});

describe("gulfWatch", () => {
  it("flags a medium/high area inside the Gulf box (AL92, Oct 6 2026)", () => {
    expect(gulfWatch(fc(SW_GULF))).toEqual({ prob2day: 90, prob7day: 90 });
  });

  it("ignores areas outside the Gulf box", () => {
    expect(gulfWatch(fc(MID_ATLANTIC))).toBeNull();
  });

  it("ignores low-odds Gulf areas", () => {
    const low = area([[-96, 20], [-92, 20], [-92, 23], [-96, 23], [-96, 20]], {
      PROB2DAY: "10%",
      PROB7DAY: "30%",
      RISK7DAY: "low",
    });
    expect(gulfWatch(fc(low))).toBeNull();
  });

  it("picks the highest seven-day odds when several qualify", () => {
    const medium = area([[-88, 26], [-85, 26], [-85, 28], [-88, 28], [-88, 26]], {
      PROB2DAY: "20%",
      PROB7DAY: "50%",
      RISK7DAY: "medium",
    });
    expect(gulfWatch(fc(medium, SW_GULF, MID_ATLANTIC))?.prob7day).toBe(90);
  });

  it("counts an area that only partly reaches into the box", () => {
    const caribbean = area([[-82, 15], [-78, 15], [-78, 19], [-82, 19], [-82, 15]], {
      PROB2DAY: "30%",
      PROB7DAY: "60%",
      RISK7DAY: "medium",
    });
    expect(gulfWatch(fc(caribbean))).toEqual({ prob2day: 30, prob7day: 60 });
  });

  it("handles a missing outlook", () => {
    expect(gulfWatch(undefined)).toBeNull();
    expect(gulfWatch(fc())).toBeNull();
  });
});
