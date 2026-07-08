import type { GlobalConfig } from "payload";
import { revalidateCms } from "@/lib/revalidateCms";
import { rt } from "@/lib/richText";

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

  // "What drives this risk indicator" explainer
  drivesTitle: "What drives this risk indicator",
  drivesSubtitle: "Three things have to line up before flooding becomes likely",
  drivesIntro: rt(
    "Lakeshore Drive floods when wind pushes Lake Pontchartrain water against the south shore. Most days the wind blows the lake away from the shore and there is no risk. The indicator turns yellow, orange, or red only when the right combination of wind direction, wind strength, duration, and rising water lines up.",
  ),

  windDirectionText: rt(
    "Blowing from the north (NW, N, or NE) toward Lakeshore Drive. Winds from the south push water away and pose no risk.",
  ),

  lakeLevelText: rt(
    "Lake level above tide prediction (surge anomaly) signals water piling up on the south shore. Only counted as risk when wind is also onshore.",
  ),

  elevatedConditionsText: rt(
    "Sustained onshore wind plus rising lake level. The longer the wind blows that direction, the higher water gets pushed against the shore.",
  ),

  // Current conditions
  currentConditionsTitle: "Current Conditions",

  // Conditions timeline
  timelineTitle: "Conditions Timeline",

  // Active alerts
  alertsTitle: "Active Weather Alerts",

  // Risk level thresholds
  thresholdsTitle: "Risk Level Thresholds",
  thresholdsCardTitle: "What triggers each risk level",

  // Flood structure gauges
  structureGaugesTitle: "Flood Structure Gauges",
  structureGaugesCardTitle: "Secondary reference for validating conditions",
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
      defaultValue: () => ENVIRONMENT_DEFAULTS.pageTitle,
      admin: { description: "Main page title (top of the Environment page)." },
    },
    {
      name: "pageSubtitle",
      type: "text",
      defaultValue: () => ENVIRONMENT_DEFAULTS.pageSubtitle,
      admin: { description: "Subtitle under the main page title." },
    },

    // --- "What drives this risk indicator" explainer ---
    {
      name: "drivesTitle",
      type: "text",
      defaultValue: () => ENVIRONMENT_DEFAULTS.drivesTitle,
      admin: { description: "Section heading: the risk-drivers explainer." },
    },
    {
      name: "drivesSubtitle",
      type: "text",
      defaultValue: () => ENVIRONMENT_DEFAULTS.drivesSubtitle,
      admin: { description: "Subtitle for the risk-drivers explainer section." },
    },
    {
      name: "drivesIntro",
      type: "richText",
      defaultValue: () => ENVIRONMENT_DEFAULTS.drivesIntro,
      admin: { description: "Intro paragraph of the risk-drivers explainer." },
    },
    {
      name: "windDirectionText",
      type: "richText",
      defaultValue: () => ENVIRONMENT_DEFAULTS.windDirectionText,
      admin: { description: "Explainer card 1 body (wind direction)." },
    },
    {
      name: "lakeLevelText",
      type: "richText",
      defaultValue: () => ENVIRONMENT_DEFAULTS.lakeLevelText,
      admin: { description: "Explainer card 3 body (lake level vs. tide)." },
    },
    {
      name: "elevatedConditionsText",
      type: "richText",
      defaultValue: () => ENVIRONMENT_DEFAULTS.elevatedConditionsText,
      admin: { description: "Amber callout body (elevated conditions)." },
    },

    // --- Current conditions ---
    {
      name: "currentConditionsTitle",
      type: "text",
      defaultValue: () => ENVIRONMENT_DEFAULTS.currentConditionsTitle,
      admin: { description: "Section heading: Current Conditions." },
    },

    // --- Conditions timeline ---
    {
      name: "timelineTitle",
      type: "text",
      defaultValue: () => ENVIRONMENT_DEFAULTS.timelineTitle,
      admin: { description: "Section heading: Conditions Timeline (charts)." },
    },

    // --- Active alerts ---
    {
      name: "alertsTitle",
      type: "text",
      defaultValue: () => ENVIRONMENT_DEFAULTS.alertsTitle,
      admin: { description: "Section heading: Active Weather Alerts." },
    },

    // --- Risk level thresholds ---
    {
      name: "thresholdsTitle",
      type: "text",
      defaultValue: () => ENVIRONMENT_DEFAULTS.thresholdsTitle,
      admin: { description: "Section heading: Risk Level Thresholds." },
    },
    {
      name: "thresholdsCardTitle",
      type: "text",
      defaultValue: () => ENVIRONMENT_DEFAULTS.thresholdsCardTitle,
      admin: { description: "Card title for the thresholds table." },
    },

    // --- Flood structure gauges ---
    {
      name: "structureGaugesTitle",
      type: "text",
      defaultValue: () => ENVIRONMENT_DEFAULTS.structureGaugesTitle,
      admin: { description: "Section heading: Flood Structure Gauges." },
    },
    {
      name: "structureGaugesCardTitle",
      type: "text",
      defaultValue: () => ENVIRONMENT_DEFAULTS.structureGaugesCardTitle,
      admin: { description: "Card title for the structure-gauges section." },
    },
  ],
};
