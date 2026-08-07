import { describe, expect, it } from "vitest";
import { outlookParagraphs } from "../outlookText";

// Verbatim body of a real live outlook.json (Aug 6 2026), teletype and all.
const LIVE_OUTLOOK = [
  "000",
  "ABNT20 KNHC 061139",
  "TWOAT ",
  "",
  "Tropical Weather Outlook",
  "NWS National Hurricane Center Miami FL",
  "800 AM EDT Thu Aug 6 2026",
  "",
  "For the North Atlantic...Caribbean Sea and the Gulf of America:",
  "",
  "Tropical cyclone formation is not expected during the next 7 days.",
  "",
  "$$",
  "Forecaster Reinhart",
].join("\n");

describe("outlookParagraphs", () => {
  it("keeps only the narrative from a real live outlook", () => {
    expect(outlookParagraphs(LIVE_OUTLOOK)).toEqual([
      "For the North Atlantic...Caribbean Sea and the Gulf of America:",
      "Tropical cyclone formation is not expected during the next 7 days.",
    ]);
  });

  it("drops the WMO/AWIPS transmission header", () => {
    expect(outlookParagraphs(LIVE_OUTLOOK).join(" ")).not.toContain("ABNT20 KNHC");
  });

  it("drops the forecaster sign-off", () => {
    expect(outlookParagraphs(LIVE_OUTLOOK).join(" ")).not.toContain("Forecaster Reinhart");
  });

  it("passes already-clean prose through untouched", () => {
    const clean =
      "A tropical wave over the Bay of Campeche has a 20 percent chance of development before moving inland.";
    expect(outlookParagraphs(clean)).toEqual([clean]);
  });

  it("keeps a genesis-area paragraph that merely mentions the basin", () => {
    const text = [
      "ABNT20 KNHC 061139",
      "",
      "Tropical Weather Outlook",
      "",
      "Near the Cabo Verde Islands:",
      "",
      "A tropical wave is producing disorganized showers. Formation chance through 7 days...60 percent.",
    ].join("\n");
    expect(outlookParagraphs(text)).toEqual([
      "Near the Cabo Verde Islands:",
      "A tropical wave is producing disorganized showers. Formation chance through 7 days...60 percent.",
    ]);
  });

  it("returns nothing when the product is entirely plumbing", () => {
    expect(outlookParagraphs("000\nABNT20 KNHC 061139\nTWOAT\n\n$$\nForecaster Blake")).toEqual([]);
  });

  it("survives an outlook with no transmission header at all", () => {
    expect(outlookParagraphs("Tropical cyclone formation is not expected.")).toEqual([
      "Tropical cyclone formation is not expected.",
    ]);
  });
});
