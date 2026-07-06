import type { GlobalConfig } from "payload";
import { revalidateCms } from "@/lib/revalidateCms";

/**
 * Editable copy for the Environment page (`/environment` — Lakefront flood
 * risk). Only substantive editorial prose lives here: page intro/overview,
 * section headings, explainer paragraphs, risk-methodology copy, callouts, and
 * prose footnotes.
 *
 * Intentionally NOT here (stays hardcoded / computed in the page): all live
 * gauge & risk data, the lakefront API values, computed threshold numbers
 * (RISK_THRESHOLDS), chart labels/legends, nav & button labels, tiny UI status
 * strings, aria-labels, and any dynamic/interpolated values.
 *
 * NOTE: `src/app/(frontend)/environment/page.tsx` is a Client Component
 * (`"use client"`) that fetches its data via `/api/lakefront` on the client, so
 * it cannot call `getPageContent()` (a server-only helper). This global is
 * created so the copy is authorable in the admin, but wiring the page to read
 * from it is DEFERRED until the page (or a server wrapper) can read on the
 * server. The `defaultValue`s below match the current on-page wording verbatim
 * so nothing changes visually once wired.
 */
export const ENVIRONMENT_DEFAULTS = {
  // Page header
  pageTitle: "Environmental Conditions",
  pageSubtitle: "Real-time Lakeshore Drive flood risk assessment",

  // Hero risk indicator
  heroHeading: "Lakeshore Drive Flood Risk",
  contributingFactorsHeading: "Contributing Factors",

  // "What drives this risk indicator" explainer
  drivesTitle: "What drives this risk indicator",
  drivesSubtitle: "Three things have to line up before flooding becomes likely",
  drivesIntro:
    "Lakeshore Drive floods when wind pushes Lake Pontchartrain water against the south shore. Most days the wind blows the lake away from the shore and there is no risk. The indicator turns yellow, orange, or red only when the right combination of wind direction, wind strength, duration, and rising water lines up.",

  windDirectionHeading: "Wind direction",
  windDirectionValue: "Onshore",
  windDirectionText:
    "Blowing from the north (NW, N, or NE) toward Lakeshore Drive. Winds from the south push water away and pose no risk.",

  windStrengthHeading: "Wind strength & duration",
  windStrengthValue: "Sustained",
  windStrengthText:
    "Yellow and orange require winds above 15 / 25 knots for at least ~2 of the previous 3 hours. Red triggers immediately above 35 knots.",

  lakeLevelHeading: "Lake level vs. tide",
  lakeLevelValue: "Above predicted",
  lakeLevelText:
    "Lake level above tide prediction (surge anomaly) signals water piling up on the south shore. Only counted as risk when wind is also onshore.",

  normalConditionsHeading: "Normal conditions (green)",
  normalConditionsText:
    "Wind is calm, blowing offshore, or below 15 knots; lake level is near tide prediction. No action required.",

  elevatedConditionsHeading: "Elevated conditions (yellow / orange / red)",
  elevatedConditionsText:
    "Sustained onshore wind plus rising lake level. The longer the wind blows that direction, the higher water gets pushed against the shore.",

  // Current conditions
  currentConditionsTitle: "Current Conditions",
  surgeAnomalyExplainer:
    "Lake Level minus Tide Prediction. Positive = water is higher than tides alone explain, typically from wind pushing water toward shore. This is what drives the surge component of the risk level.",

  // Conditions timeline
  timelineTitle: "Conditions Timeline",

  // Active alerts
  alertsTitle: "Active Weather Alerts",

  // Risk level thresholds
  thresholdsTitle: "Risk Level Thresholds",
  thresholdsCardTitle: "What triggers each risk level",
  thresholdsPreliminaryNote:
    "These thresholds are preliminary and subject to calibration based on operational experience.",

  // Flood structure gauges
  structureGaugesTitle: "Flood Structure Gauges",
  structureGaugesCardTitle: "Secondary reference for validating conditions",
  structureGaugesIntro:
    "These are live water levels at flood control structures near Lake Pontchartrain, pulled from the same USGS gauges FPA operations monitors. Use them to corroborate the risk level above: if the indicator shows elevated risk from sustained northerly winds, rising levels at these structures confirm that lake water is actually being pushed toward shore and into the flood protection system.",
  structureGaugesNormalNote:
    "Normal levels fluctuate near 0 ft. Values climbing above +0.5 ft during sustained northerly winds suggest meaningful water movement toward the flood protection system.",
  structureGaugesConfirmationNote:
    "Gauge selection is preliminary and subject to confirmation with FPA operations.",

  // Data sources footer (prose paragraphs only; the one with an inline station
  // link is intentionally left hardcoded on the page).
  dataSourcesForecast:
    "Wind forecasts from the National Weather Service (NWS Slidell, LA office). Water level forecasts from NOAA's NGOFS2 operational model. Weather alerts from NWS.",
  dataSourcesStructureGauges:
    "Structure gauge levels from USGS Water Services (Seabrook, Surge Barrier, Bayou Dupre). These are the same gauges monitored by FPA operations and serve as secondary corroboration of Lake Pontchartrain conditions.",
  dataSourcesDisclaimer:
    "The risk indicator is a rule-based decision-support tool. It does not replace professional judgment or official NWS warnings. Always follow official SLFPA-E operational procedures.",
};

export const EnvironmentPage: GlobalConfig = {
  slug: "environment-page",
  admin: {
    group: "Page Content",
    description: "Editable copy on the Environment page.",
  },
  access: { read: () => true },
  hooks: { afterChange: [revalidateCms] },
  fields: [
    // --- Page header ---
    {
      name: "pageTitle",
      type: "text",
      defaultValue: ENVIRONMENT_DEFAULTS.pageTitle,
      admin: { description: "Main page title (top of the Environment page)." },
    },
    {
      name: "pageSubtitle",
      type: "text",
      defaultValue: ENVIRONMENT_DEFAULTS.pageSubtitle,
      admin: { description: "Subtitle under the main page title." },
    },

    // --- Hero risk indicator ---
    {
      name: "heroHeading",
      type: "text",
      defaultValue: ENVIRONMENT_DEFAULTS.heroHeading,
      admin: { description: "Small heading above the hero risk indicator." },
    },
    {
      name: "contributingFactorsHeading",
      type: "text",
      defaultValue: ENVIRONMENT_DEFAULTS.contributingFactorsHeading,
      admin: {
        description: "Heading for the contributing-factors list in the hero card.",
      },
    },

    // --- "What drives this risk indicator" explainer ---
    {
      name: "drivesTitle",
      type: "text",
      defaultValue: ENVIRONMENT_DEFAULTS.drivesTitle,
      admin: { description: "Section heading: the risk-drivers explainer." },
    },
    {
      name: "drivesSubtitle",
      type: "text",
      defaultValue: ENVIRONMENT_DEFAULTS.drivesSubtitle,
      admin: { description: "Subtitle for the risk-drivers explainer section." },
    },
    {
      name: "drivesIntro",
      type: "textarea",
      defaultValue: ENVIRONMENT_DEFAULTS.drivesIntro,
      admin: { description: "Intro paragraph of the risk-drivers explainer." },
    },
    {
      name: "windDirectionHeading",
      type: "text",
      defaultValue: ENVIRONMENT_DEFAULTS.windDirectionHeading,
      admin: { description: "Explainer card 1 heading (wind direction)." },
    },
    {
      name: "windDirectionValue",
      type: "text",
      defaultValue: ENVIRONMENT_DEFAULTS.windDirectionValue,
      admin: { description: "Explainer card 1 bold value (wind direction)." },
    },
    {
      name: "windDirectionText",
      type: "textarea",
      defaultValue: ENVIRONMENT_DEFAULTS.windDirectionText,
      admin: { description: "Explainer card 1 body (wind direction)." },
    },
    {
      name: "windStrengthHeading",
      type: "text",
      defaultValue: ENVIRONMENT_DEFAULTS.windStrengthHeading,
      admin: { description: "Explainer card 2 heading (wind strength & duration)." },
    },
    {
      name: "windStrengthValue",
      type: "text",
      defaultValue: ENVIRONMENT_DEFAULTS.windStrengthValue,
      admin: { description: "Explainer card 2 bold value (wind strength & duration)." },
    },
    {
      name: "windStrengthText",
      type: "textarea",
      defaultValue: ENVIRONMENT_DEFAULTS.windStrengthText,
      admin: {
        description:
          "Explainer card 2 body (wind strength & duration). Mentions the 15/25/35 kt cutoffs in prose — keep in sync with the model thresholds.",
      },
    },
    {
      name: "lakeLevelHeading",
      type: "text",
      defaultValue: ENVIRONMENT_DEFAULTS.lakeLevelHeading,
      admin: { description: "Explainer card 3 heading (lake level vs. tide)." },
    },
    {
      name: "lakeLevelValue",
      type: "text",
      defaultValue: ENVIRONMENT_DEFAULTS.lakeLevelValue,
      admin: { description: "Explainer card 3 bold value (lake level vs. tide)." },
    },
    {
      name: "lakeLevelText",
      type: "textarea",
      defaultValue: ENVIRONMENT_DEFAULTS.lakeLevelText,
      admin: { description: "Explainer card 3 body (lake level vs. tide)." },
    },
    {
      name: "normalConditionsHeading",
      type: "text",
      defaultValue: ENVIRONMENT_DEFAULTS.normalConditionsHeading,
      admin: { description: "Green callout label (normal conditions)." },
    },
    {
      name: "normalConditionsText",
      type: "textarea",
      defaultValue: ENVIRONMENT_DEFAULTS.normalConditionsText,
      admin: {
        description:
          "Green callout body (normal conditions). Mentions the 15 kt cutoff in prose — keep in sync with the model.",
      },
    },
    {
      name: "elevatedConditionsHeading",
      type: "text",
      defaultValue: ENVIRONMENT_DEFAULTS.elevatedConditionsHeading,
      admin: { description: "Amber callout label (elevated conditions)." },
    },
    {
      name: "elevatedConditionsText",
      type: "textarea",
      defaultValue: ENVIRONMENT_DEFAULTS.elevatedConditionsText,
      admin: { description: "Amber callout body (elevated conditions)." },
    },

    // --- Current conditions ---
    {
      name: "currentConditionsTitle",
      type: "text",
      defaultValue: ENVIRONMENT_DEFAULTS.currentConditionsTitle,
      admin: { description: "Section heading: Current Conditions." },
    },
    {
      name: "surgeAnomalyExplainer",
      type: "textarea",
      defaultValue: ENVIRONMENT_DEFAULTS.surgeAnomalyExplainer,
      admin: { description: "Explainer note under the Surge Anomaly metric card." },
    },

    // --- Conditions timeline ---
    {
      name: "timelineTitle",
      type: "text",
      defaultValue: ENVIRONMENT_DEFAULTS.timelineTitle,
      admin: { description: "Section heading: Conditions Timeline (charts)." },
    },

    // --- Active alerts ---
    {
      name: "alertsTitle",
      type: "text",
      defaultValue: ENVIRONMENT_DEFAULTS.alertsTitle,
      admin: { description: "Section heading: Active Weather Alerts." },
    },

    // --- Risk level thresholds ---
    {
      name: "thresholdsTitle",
      type: "text",
      defaultValue: ENVIRONMENT_DEFAULTS.thresholdsTitle,
      admin: { description: "Section heading: Risk Level Thresholds." },
    },
    {
      name: "thresholdsCardTitle",
      type: "text",
      defaultValue: ENVIRONMENT_DEFAULTS.thresholdsCardTitle,
      admin: { description: "Card title for the thresholds table." },
    },
    {
      name: "thresholdsPreliminaryNote",
      type: "textarea",
      defaultValue: ENVIRONMENT_DEFAULTS.thresholdsPreliminaryNote,
      admin: { description: "Italic note below the thresholds table." },
    },

    // --- Flood structure gauges ---
    {
      name: "structureGaugesTitle",
      type: "text",
      defaultValue: ENVIRONMENT_DEFAULTS.structureGaugesTitle,
      admin: { description: "Section heading: Flood Structure Gauges." },
    },
    {
      name: "structureGaugesCardTitle",
      type: "text",
      defaultValue: ENVIRONMENT_DEFAULTS.structureGaugesCardTitle,
      admin: { description: "Card title for the structure-gauges section." },
    },
    {
      name: "structureGaugesIntro",
      type: "textarea",
      defaultValue: ENVIRONMENT_DEFAULTS.structureGaugesIntro,
      admin: { description: "Intro paragraph above the structure-gauge cards." },
    },
    {
      name: "structureGaugesNormalNote",
      type: "textarea",
      defaultValue: ENVIRONMENT_DEFAULTS.structureGaugesNormalNote,
      admin: {
        description:
          "Second paragraph in the blue 'How to read these' callout (normal-level note).",
      },
    },
    {
      name: "structureGaugesConfirmationNote",
      type: "textarea",
      defaultValue: ENVIRONMENT_DEFAULTS.structureGaugesConfirmationNote,
      admin: { description: "Amber note below the structure-gauge callout." },
    },

    // --- Data sources footer ---
    {
      name: "dataSourcesForecast",
      type: "textarea",
      defaultValue: ENVIRONMENT_DEFAULTS.dataSourcesForecast,
      admin: { description: "Data-sources footer: forecast sources paragraph." },
    },
    {
      name: "dataSourcesStructureGauges",
      type: "textarea",
      defaultValue: ENVIRONMENT_DEFAULTS.dataSourcesStructureGauges,
      admin: { description: "Data-sources footer: structure-gauge sources paragraph." },
    },
    {
      name: "dataSourcesDisclaimer",
      type: "textarea",
      defaultValue: ENVIRONMENT_DEFAULTS.dataSourcesDisclaimer,
      admin: { description: "Data-sources footer: decision-support disclaimer." },
    },
  ],
};
