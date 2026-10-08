import { describe, expect, it } from "vitest";
import { RAIN_BANDS, rainColorExpression, rainRow } from "../rain";

const nola = {
  issued: "2026-10-08T12:00:00Z",
  start: "2026-10-08T12:00:00Z",
  end: "2026-10-11T12:00:00Z",
  lowIn: 0.3,
  midIn: 2.5,
  highIn: 6.0,
  lowPct: 10,
  highPct: 90,
};

describe("rainRow", () => {
  it("leads with the middle estimate and gives the range, one decimal", () => {
    const row = rainRow(nola);
    expect(row.middle).toBe("2.5 in");
    expect(row.range).toBe("0.3–6.0 in");
  });

  it("explains the range in plain words", () => {
    expect(rainRow(nola).help).toBe(
      "WPC rainfall forecast for New Orleans. Middle estimate: as likely to be more as less. Range: a 1-in-10 chance of less than 0.3 in and a 1-in-10 chance of more than 6.0 in."
    );
  });
});

describe("rain map colors", () => {
  it("has a band for each WPC amount the map draws, lightest first", () => {
    expect(RAIN_BANDS.map((b) => b.from)).toEqual([0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 7, 10]);
    const expr = rainColorExpression() as unknown[];
    expect(expr[0]).toBe("step");
    expect(expr).toContain(RAIN_BANDS[RAIN_BANDS.length - 1].color);
  });
});
