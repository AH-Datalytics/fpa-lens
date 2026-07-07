import type { GlobalConfig } from "payload";
import { revalidateCms } from "@/lib/revalidateCms";

/**
 * Editable prose for the Infrastructure page
 * (`src/app/(frontend)/infrastructure/page.tsx`).
 *
 * Only substantive editorial copy lives here — page intro, section headings,
 * explainer paragraphs, and callouts. Everything numeric or computed (readiness
 * KPIs, the System-at-a-Glance table counts, ReadinessCard metrics, map data,
 * status thresholds, phone/SMS keywords, nav/button labels, source citations)
 * stays in code / the data pipeline and is NOT represented here.
 *
 * DEFAULTS mirror the current wording verbatim (HTML entities in the JSX are
 * stored as their rendered Unicode characters — e.g. `&ndash;` → "–" — so the
 * page renders identically once wired). Each field's `defaultValue` pre-fills
 * the admin form, and pages import `INFRASTRUCTURE_DEFAULTS` for a resilient
 * fallback when the global is unseeded or Payload is unavailable.
 *
 * NOTE: the Infrastructure page is currently a top-level `"use client"`
 * component (it renders the client-only `SystemMap`), so it cannot `await`
 * `getPageContent`. Page wiring is therefore DEFERRED until the page is split
 * so the copy can be read in a Server Component. This global is complete and
 * ready to consume at that point.
 */
export const INFRASTRUCTURE_DEFAULTS = {
  // Page header
  mainHeading: "Infrastructure",
  intro:
    "Learn about the flood protection infrastructure that keeps Greater New Orleans safe",

  // Overview section
  overviewHeading: "Overview",
  overviewBody:
    "The Southeast Louisiana Flood Protection Authority – East (SLFPA-E) manages flood protection infrastructure across the Greater New Orleans area, including the East Bank of Orleans and Jefferson Parishes, and St. Bernard Parish. Our system includes levees, floodgates, pump stations, and complex structures that work together to protect our community from flooding caused by hurricanes, tropical storms, and other weather events.",

  // System Map section
  systemMapHeading: "System Map",
  systemMapBody:
    "Interactive map showing levee alignments, floodgates, pump stations, and complex structures across the SLFPA-E flood protection system. Click on features for more information.",

  // System at a Glance section
  systemGlanceHeading: "System at a Glance",
  systemGlanceBody:
    "Components of the flood protection system, with counts by district.",
  systemGlanceQuote:
    "A world-class system, built to protect and maintained to perform.",

  // Infrastructure Readiness section
  readinessHeading: "Infrastructure Readiness",

  // Stay Informed section
  stayInformedHeading: "Stay Informed",
  alertsHeading: "Real-Time Alerts",
  alertsBody:
    "Get notified about floodgate operations, road closures, river levels, and high tide events. Operations issues Rave alerts for maintenance work and any activity that may affect travel through structures.",
};

export const InfrastructurePage: GlobalConfig = {
  slug: "infrastructure-page",
  admin: {
    group: "Page Content",
    description: "Editable copy on the Infrastructure page.",
  },
  access: { read: () => true },
  hooks: { afterChange: [revalidateCms] },
  fields: [
    // Page header
    {
      name: "mainHeading",
      type: "text",
      defaultValue: INFRASTRUCTURE_DEFAULTS.mainHeading,
      admin: { description: "Page title (H1) at the top of the Infrastructure page." },
    },
    {
      name: "intro",
      type: "textarea",
      defaultValue: INFRASTRUCTURE_DEFAULTS.intro,
      admin: { description: "Subtitle beneath the page title." },
    },

    // Overview section
    {
      name: "overviewHeading",
      type: "text",
      defaultValue: INFRASTRUCTURE_DEFAULTS.overviewHeading,
      admin: { description: 'Heading of the "Overview" card.' },
    },
    {
      name: "overviewBody",
      type: "textarea",
      defaultValue: INFRASTRUCTURE_DEFAULTS.overviewBody,
      admin: { description: "Overview paragraph describing SLFPA-E and the system." },
    },

    // System Map section
    {
      name: "systemMapHeading",
      type: "text",
      defaultValue: INFRASTRUCTURE_DEFAULTS.systemMapHeading,
      admin: { description: 'Heading above the interactive system map ("System Map").' },
    },
    {
      name: "systemMapBody",
      type: "textarea",
      defaultValue: INFRASTRUCTURE_DEFAULTS.systemMapBody,
      admin: { description: "Explainer paragraph above the interactive system map." },
    },

    // System at a Glance section
    {
      name: "systemGlanceHeading",
      type: "text",
      defaultValue: INFRASTRUCTURE_DEFAULTS.systemGlanceHeading,
      admin: { description: 'Heading above the components table ("System at a Glance").' },
    },
    {
      name: "systemGlanceBody",
      type: "textarea",
      defaultValue: INFRASTRUCTURE_DEFAULTS.systemGlanceBody,
      admin: { description: "Caption line above the System-at-a-Glance table." },
    },
    {
      name: "systemGlanceQuote",
      type: "textarea",
      defaultValue: INFRASTRUCTURE_DEFAULTS.systemGlanceQuote,
      admin: {
        description:
          "Green callout quote below the table (decorative curly quotes are added by the page).",
      },
    },

    // Infrastructure Readiness section
    {
      name: "readinessHeading",
      type: "text",
      defaultValue: INFRASTRUCTURE_DEFAULTS.readinessHeading,
      admin: { description: 'Heading of the readiness section ("Infrastructure Readiness").' },
    },

    // Stay Informed section
    {
      name: "stayInformedHeading",
      type: "text",
      defaultValue: INFRASTRUCTURE_DEFAULTS.stayInformedHeading,
      admin: { description: 'Heading of the alerts section ("Stay Informed").' },
    },
    {
      name: "alertsHeading",
      type: "text",
      defaultValue: INFRASTRUCTURE_DEFAULTS.alertsHeading,
      admin: { description: 'Sub-heading of the alerts card ("Real-Time Alerts").' },
    },
    {
      name: "alertsBody",
      type: "textarea",
      defaultValue: INFRASTRUCTURE_DEFAULTS.alertsBody,
      admin: { description: "Paragraph describing the Rave real-time alerts program." },
    },
  ],
};
