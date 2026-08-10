import { describe, expect, it } from "vitest";
import { DEFAULT_LAYER_STATE, DEMO_LAYER_STATE, toggleLayer } from "../layers";

describe("DEFAULT_LAYER_STATE", () => {
  it("starts with cone/history/models on, every wash overlay off", () => {
    expect(DEFAULT_LAYER_STATE).toEqual({
      cone: true,
      history: true,
      satellite: false,
      models: true,
      windField: false,
      // Off since Aug 2026 -- the 39 kt wash covered the cone and track.
      windProb: false,
      rain: false,
      radar: false,
    });
  });
});

describe("DEMO_LAYER_STATE", () => {
  it("starts historical demos with only the forecast cone enabled", () => {
    expect(DEMO_LAYER_STATE).toEqual({
      cone: true,
      history: true,
      satellite: false,
      models: false,
      windField: false,
      windProb: false,
      rain: false,
      radar: false,
    });
  });
});

describe("toggleLayer", () => {
  it("flips exactly the named key", () => {
    const next = toggleLayer(DEFAULT_LAYER_STATE, "radar");
    expect(next.radar).toBe(true);
    expect(next).not.toBe(DEFAULT_LAYER_STATE); // new object, no mutation
  });

  // Asserts the flip relative to the default rather than a literal, so changing
  // which overlays ship on by default cannot break a test about toggle mechanics.
  it("toggleLayer('windProb') flips just that key", () => {
    const next = toggleLayer(DEFAULT_LAYER_STATE, "windProb");
    expect(next.windProb).toBe(!DEFAULT_LAYER_STATE.windProb);
    expect(next.cone).toBe(DEFAULT_LAYER_STATE.cone);
  });

  it("does not mutate the input state", () => {
    const before = { ...DEFAULT_LAYER_STATE };
    toggleLayer(DEFAULT_LAYER_STATE, "models");
    expect(DEFAULT_LAYER_STATE).toEqual(before);
  });

  it("toggling twice returns to the original value", () => {
    const once = toggleLayer(DEFAULT_LAYER_STATE, "radar");
    const twice = toggleLayer(once, "radar");
    expect(twice.radar).toBe(DEFAULT_LAYER_STATE.radar);
  });
});
