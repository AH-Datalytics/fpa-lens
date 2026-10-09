import { describe, it, expect } from "vitest";
import {
  computeRiskLevel,
  degreesToCardinal,
  isOnshoreWind,
  windShoreRelation,
  type LakefrontConditions,
  type WindReading,
} from "./lakefrontRisk";

describe("isOnshoreWind", () => {
  it("treats every NW, NNW, N, NNE, NE and ENE reading as onshore", () => {
    for (let d = 0; d < 360; d += 0.25) {
      const onshoreCardinal = ["NW", "NNW", "N", "NNE", "NE", "ENE"].includes(degreesToCardinal(d));
      expect(isOnshoreWind(d), `${d} deg (${degreesToCardinal(d)})`).toBe(onshoreCardinal);
    }
  });

  it("covers the readings 315-045 used to miss", () => {
    expect(isOnshoreWind(50)).toBe(true); // shown as NE
    expect(isOnshoreWind(60)).toBe(true); // ENE, Oct 9 2026 closure
    expect(isOnshoreWind(310)).toBe(true); // shown as NW
  });
});

describe("windShoreRelation", () => {
  it("distinguishes along-shore winds from offshore winds", () => {
    expect(windShoreRelation(0)).toBe("onshore");
    expect(windShoreRelation(90)).toBe("alongshore"); // E
    expect(windShoreRelation(270)).toBe("alongshore"); // W
    expect(windShoreRelation(292.5)).toBe("alongshore"); // WNW
    expect(windShoreRelation(135)).toBe("offshore"); // SE
    expect(windShoreRelation(180)).toBe("offshore"); // S
    expect(windShoreRelation(225)).toBe("offshore"); // SW
  });
});

describe("computeRiskLevel", () => {
  // Oct 9 2026 ~10:18 CT, Lakeshore Drive closed: ENE 23.7 kt gusting 28.8,
  // surge +1.96 ft. Under the old 315-045 range the surge was suppressed as
  // "no recent onshore wind" and the dashboard read YELLOW.
  const reading = (direction: number): WindReading => ({
    speed: 23.7, direction, gust: 28.8, cardinal: degreesToCardinal(direction), timestamp: "2026-10-09 10:18",
  });
  const current: LakefrontConditions = {
    wind: reading(60),
    waterLevel: { level: 2.687, predicted: 0.731, anomaly: 1.956, timestamp: "2026-10-09 10:18" },
    pressure: { value: 1010.8, timestamp: "2026-10-09 10:18" },
  };
  const history = Array.from({ length: 30 }, () => reading(60));

  it("scores ENE wind as onshore and lets the surge count", () => {
    const risk = computeRiskLevel(current, [], history);
    expect(risk.isOnshore).toBe(true);
    expect(risk.shoreRelation).toBe("onshore");
    expect(risk.level).toBe("RED");
    expect(risk.factors.join(" ")).not.toMatch(/offshore|no recent onshore/);
  });

  it("still suppresses surge when the wind is genuinely offshore", () => {
    const south = { ...current, wind: reading(180) };
    const risk = computeRiskLevel(south, [], Array.from({ length: 30 }, () => reading(180)));
    expect(risk.level).toBe("GREEN");
    expect(risk.factors.join(" ")).toMatch(/offshore, not driving surge/);
  });

  it("describes an east wind as along the shore, not offshore", () => {
    const east = { ...current, wind: reading(90) };
    const risk = computeRiskLevel(east, [], Array.from({ length: 30 }, () => reading(90)));
    expect(risk.factors.join(" ")).toMatch(/along the shore/);
    expect(risk.factors.join(" ")).not.toMatch(/\(offshore/);
  });
});
