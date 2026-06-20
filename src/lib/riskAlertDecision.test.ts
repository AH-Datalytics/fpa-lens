import { describe, it, expect } from "vitest";
import { decideRiskAlert } from "./riskAlertDecision";

describe("decideRiskAlert", () => {
  it("seeds the baseline silently on first run (null state)", () => {
    expect(decideRiskAlert(null, "GREEN", "stable")).toEqual({ send: false, nextNotified: "GREEN" });
    expect(decideRiskAlert(null, "ORANGE", "worsening")).toEqual({ send: false, nextNotified: "ORANGE" });
  });

  it("does not alert when the level is unchanged", () => {
    expect(decideRiskAlert("GREEN", "GREEN", "stable").send).toBe(false);
    expect(decideRiskAlert("ORANGE", "ORANGE", "improving").send).toBe(false);
  });

  // YELLOW is routine and below the alert floor — it must never email.
  it("never alerts on YELLOW (below the alert floor)", () => {
    expect(decideRiskAlert("GREEN", "YELLOW", "stable").send).toBe(false);
    expect(decideRiskAlert("GREEN", "YELLOW", "worsening").send).toBe(false);
    expect(decideRiskAlert("YELLOW", "GREEN", "improving").send).toBe(false);
  });

  it("alerts on a holding escalation into the band (GREEN -> ORANGE, stable)", () => {
    expect(decideRiskAlert("GREEN", "ORANGE", "stable")).toEqual({ send: true, nextNotified: "ORANGE" });
  });

  it("suppresses an ORANGE escalation that is already improving (receding spike)", () => {
    expect(decideRiskAlert("GREEN", "ORANGE", "improving")).toEqual({ send: false, nextNotified: "GREEN" });
  });

  it("alerts on a holding escalation into RED (stable or worsening)", () => {
    expect(decideRiskAlert("GREEN", "RED", "stable")).toEqual({ send: true, nextNotified: "RED" });
    expect(decideRiskAlert("GREEN", "RED", "worsening")).toEqual({ send: true, nextNotified: "RED" });
    expect(decideRiskAlert("ORANGE", "RED", "stable")).toEqual({ send: true, nextNotified: "RED" });
  });

  it("suppresses a RED escalation that is already improving (receding spike)", () => {
    expect(decideRiskAlert("GREEN", "RED", "improving")).toEqual({ send: false, nextNotified: "GREEN" });
    expect(decideRiskAlert("ORANGE", "RED", "improving")).toEqual({ send: false, nextNotified: "ORANGE" });
    expect(decideRiskAlert("YELLOW", "RED", "improving")).toEqual({ send: false, nextNotified: "YELLOW" });
  });

  it("sends an all-clear only to clear a real ORANGE/RED alert", () => {
    const alerted = decideRiskAlert("GREEN", "ORANGE", "stable");
    expect(alerted).toEqual({ send: true, nextNotified: "ORANGE" });

    const allClear = decideRiskAlert(alerted.nextNotified, "GREEN", "improving");
    expect(allClear).toEqual({ send: true, nextNotified: "GREEN" });
  });

  it("de-escalation out of the band fires once, then YELLOW->GREEN is silent", () => {
    // ORANGE alert was sent; now drops to YELLOW (leaves the band) -> one notice
    const toYellow = decideRiskAlert("ORANGE", "YELLOW", "improving");
    expect(toYellow).toEqual({ send: true, nextNotified: "YELLOW" });
    // ...then YELLOW -> GREEN is within the normal band -> no further email
    expect(decideRiskAlert(toYellow.nextNotified, "GREEN", "improving").send).toBe(false);
  });

  it("suppresses a de-escalation that is worsening (a dip about to rise)", () => {
    expect(decideRiskAlert("RED", "ORANGE", "worsening")).toEqual({ send: false, nextNotified: "RED" });
  });

  it("the original bug: oscillating across YELLOW (all improving) stays silent", () => {
    let baseline: "GREEN" | "YELLOW" | "ORANGE" | "RED" = "GREEN";
    let emails = 0;
    for (const level of ["YELLOW", "GREEN", "YELLOW", "GREEN", "YELLOW", "GREEN"] as const) {
      const d = decideRiskAlert(baseline, level, "improving");
      if (d.send) emails += 1;
      baseline = d.nextNotified;
    }
    expect(emails).toBe(0); // previously produced 3 all-clear emails
  });
});
