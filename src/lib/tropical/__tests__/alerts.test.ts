import { describe, expect, it } from "vitest";
import { NEUTRAL_ALERT_COLOR, deriveAlertsState, filterMetroAlerts, type NWSAlertFeature } from "../alerts";
import { WW_COLORS } from "../mapStyle";

const orleansHurricaneWarning: NWSAlertFeature = {
  properties: {
    event: "Hurricane Warning",
    areaDesc: "Orleans; Jefferson",
    geocode: { SAME: ["022071", "022051"] },
  },
};

// Same event+area as above, from an adjacent polygon segment — must dedupe.
const duplicateOrleansHurricaneWarning: NWSAlertFeature = {
  properties: {
    event: "Hurricane Warning",
    areaDesc: "Orleans; Jefferson",
    geocode: { SAME: ["022071"] },
  },
};

// Rapides Parish — not one of the five metro SAME codes.
const nonMetroParishAlert: NWSAlertFeature = {
  properties: {
    event: "Flood Warning",
    areaDesc: "Rapides",
    geocode: { SAME: ["022079"] },
  },
};

const stTammanyTsWatch: NWSAlertFeature = {
  properties: {
    event: "Tropical Storm Watch",
    areaDesc: "St. Tammany",
    geocode: { SAME: ["022103"] },
  },
};

const surgeWarning: NWSAlertFeature = {
  properties: {
    event: "Storm Surge Warning",
    areaDesc: "Lake Pontchartrain",
    geocode: { SAME: ["022071"] },
  },
};

const orleansFloodAdvisory: NWSAlertFeature = {
  properties: {
    event: "Flood Advisory",
    areaDesc: "Orleans",
    geocode: { SAME: ["022071"] },
  },
};

describe("filterMetroAlerts", () => {
  it("keeps only alerts whose SAME codes intersect the metro parishes", () => {
    const rows = filterMetroAlerts([orleansHurricaneWarning, nonMetroParishAlert]);
    expect(rows).toHaveLength(1);
    expect(rows[0].event).toBe("Hurricane Warning");
  });

  it("dedupes identical event+area pairs", () => {
    const rows = filterMetroAlerts([orleansHurricaneWarning, duplicateOrleansHurricaneWarning]);
    expect(rows).toHaveLength(1);
  });

  it("sorts Warning before Watch before Advisory", () => {
    const rows = filterMetroAlerts([orleansFloodAdvisory, stTammanyTsWatch, orleansHurricaneWarning]);
    expect(rows.map((r) => r.event)).toEqual([
      "Hurricane Warning",
      "Tropical Storm Watch",
      "Flood Advisory",
    ]);
  });

  it("colors alert borders with the map's WW_COLORS palette, never an undefined CSS token", () => {
    // The upstream build referenced --warn-hw/--warn-ssw/--warn-tsw tokens
    // that the Tailwind port never defined, so every chip lost its colour.
    // Chips now share WW_COLORS with the coastal watch/warning lines.
    const rows = filterMetroAlerts([
      orleansHurricaneWarning,
      surgeWarning,
      stTammanyTsWatch,
      orleansFloodAdvisory,
    ]);
    const byEvent = Object.fromEntries(rows.map((r) => [r.event, r.color]));
    expect(byEvent["Hurricane Warning"]).toBe(WW_COLORS.hurricaneWarning);
    expect(byEvent["Storm Surge Warning"]).toBe(WW_COLORS.surge);
    expect(byEvent["Tropical Storm Watch"]).toBe(WW_COLORS.tsWatch);
    expect(byEvent["Flood Advisory"]).toBe(NEUTRAL_ALERT_COLOR);
    for (const color of Object.values(byEvent)) expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("distinguishes watch from warning tiers like the map legend does", () => {
    const rows = filterMetroAlerts([
      { properties: { event: "Tropical Storm Warning", areaDesc: "Orleans", geocode: { SAME: ["022071"] } } },
      { properties: { event: "Hurricane Watch", areaDesc: "Orleans", geocode: { SAME: ["022071"] } } },
      { properties: { event: "Storm Surge Watch", areaDesc: "Orleans", geocode: { SAME: ["022071"] } } },
    ]);
    const byEvent = Object.fromEntries(rows.map((r) => [r.event, r.color]));
    expect(byEvent["Tropical Storm Warning"]).toBe(WW_COLORS.tsWarning);
    expect(byEvent["Hurricane Watch"]).toBe(WW_COLORS.hurricaneWatch);
    expect(byEvent["Storm Surge Watch"]).toBe(WW_COLORS.surge);
  });

  it("returns an empty array for no features", () => {
    expect(filterMetroAlerts([])).toEqual([]);
  });
});

describe("deriveAlertsState", () => {
  it("is unavailable when there's an error and no data has ever loaded", () => {
    const state = deriveAlertsState(undefined, new Error("fetch failed"));
    expect(state).toEqual({ rows: [], unavailable: true });
  });

  it("is NOT unavailable while the initial request is simply still in flight (no error yet)", () => {
    const state = deriveAlertsState(undefined, undefined);
    expect(state).toEqual({ rows: [], unavailable: false });
  });

  it("prefers stale cached data over a transient revalidation error — NOT unavailable", () => {
    // SWR's actual behavior: `data` stays as the last successful response
    // while `error` is also set, when a background revalidation fails.
    const state = deriveAlertsState({ features: [orleansHurricaneWarning] }, new Error("revalidation failed"));
    expect(state.unavailable).toBe(false);
    expect(state.rows).toHaveLength(1);
    expect(state.rows[0].event).toBe("Hurricane Warning");
  });

  it("derives rows from data with no error", () => {
    const state = deriveAlertsState({ features: [orleansHurricaneWarning, nonMetroParishAlert] }, undefined);
    expect(state).toEqual({
      rows: [
        {
          key: "Hurricane Warning|Orleans; Jefferson",
          event: "Hurricane Warning",
          areaDesc: "Orleans; Jefferson",
          color: WW_COLORS.hurricaneWarning,
        },
      ],
      unavailable: false,
    });
  });
});
