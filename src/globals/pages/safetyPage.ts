import type { GlobalConfig } from "payload";
import { revalidateCms } from "@/lib/revalidateCms";

/**
 * Editable copy for the Safety page (`/safety`). Follows the same "page copy"
 * pattern as HomeContent: only substantive editorial prose lives here (page
 * intro, section headings, definitions, chart explainers, and the methodology
 * data note). All numbers/metrics, chart axis + legend labels, table headers,
 * button labels, the dynamic headline pace card, and source attributions stay
 * in code because they are computed or data-driven.
 *
 * NOTE: the Safety page (`src/app/(frontend)/safety/page.tsx`) is a client
 * component (`"use client"` with useState/useEffect and an interactive year
 * selector), so it cannot be an async Server Component and cannot call the
 * server-only `getPageContent`. These defaults capture the copy verbatim and
 * define the CMS schema; wiring them live requires a server wrapper that reads
 * `getPageContent("safety-page")` and passes the copy as props to the client
 * component, plus registering `SafetyPage` in `src/payload.config.ts`.
 */
export const SAFETY_DEFAULTS = {
  // Page header (SectionHeader) -----------------------------------------------
  pageTitle: "Safety Performance",
  pageSubtitle: "Our commitment to a safe workplace",

  // Section headings (SectionSubheader) ---------------------------------------
  definitionsHeading: "Definitions",
  trendsHeading: "Multi-Year Safety Trends",
  monthlyHeading: "Monthly Breakdown",
  categoryHeading: "Events by Category",

  // Definitions cards ---------------------------------------------------------
  accidentTerm: "Accident",
  accidentDefinition:
    "A work-related event that resulted in an OSHA-recordable injury or illness (medical treatment beyond first aid, lost time, restricted duty, or worse).",
  incidentTerm: "Incident",
  incidentDefinition:
    "A tracked work-related event that did not meet OSHA-recordable criteria (typically property damage, near-miss, or first-aid-only).",
  lostTimeTerm: "Lost-Time Injury",
  lostTimeDefinition:
    "A work-related injury or illness that causes an employee to miss one or more scheduled workdays after the day of the event.",
  nonLostTimeTerm: "Non-Lost-Time Injury",
  nonLostTimeDefinition:
    "A work-related injury or illness that does not cause the employee to miss a scheduled workday. This may include first aid, medical treatment, or restricted duty, depending on the event.",

  // Card headings above charts/tables -----------------------------------------
  accidentsByYearTitle: "Accidents by Year",
  annualBreakdownTitle: "Annual Event Breakdown",
  categoryChartTitle: "All recorded years",

  // Chart explainer footnotes -------------------------------------------------
  accidentsByYearNote:
    "OSHA-recordable accidents only. Incidents are tracked in the breakdown table below.",
  totalEventsNote:
    "Total Events = Accidents + Incidents. 2026 data is calendar year-to-date.",
  lostTimeTooltip:
    "Any accident or incident where the injury or illness causes the employee to miss one or more subsequent workdays. Lost time is a subset of injuries.",

  // Methodology data note (bottom of page) ------------------------------------
  dataNotePrivacy:
    "All safety event data is anonymized. Individual event details (names, specific locations, equipment identifiers) are not published to protect employee privacy.",
  dataNoteClassification:
    "Source data: FPA Event Logs 2022-2026, classified by the Safety Officer in April 2026. Each event is tagged Accident (OSHA-recordable) or Incident (not recordable). Events flagged N/A by the Safety Officer (reporting errors and duplicates) are excluded from all metrics.",
  dataNoteReporting:
    "Reporting period is the calendar year (Jan 1 - Dec 31). 2026 figures are year-to-date through the latest event log entry. Updated event logs are shared by the Safety Officer monthly.",
};

export const SafetyPage: GlobalConfig = {
  slug: "safety-page",
  admin: {
    group: "Page Content",
    description: "Editable copy on the Safety page.",
  },
  access: {
    read: () => true,
  },
  hooks: { afterChange: [revalidateCms] },
  fields: [
    // Page header -------------------------------------------------------------
    {
      name: "pageTitle",
      type: "text",
      defaultValue: SAFETY_DEFAULTS.pageTitle,
      admin: { description: "Main page title at the top of the Safety page." },
    },
    {
      name: "pageSubtitle",
      type: "text",
      defaultValue: SAFETY_DEFAULTS.pageSubtitle,
      admin: { description: "Subtitle shown beneath the Safety page title." },
    },

    // Section headings --------------------------------------------------------
    {
      name: "definitionsHeading",
      type: "text",
      defaultValue: SAFETY_DEFAULTS.definitionsHeading,
      admin: { description: 'Heading for the "Definitions" section.' },
    },
    {
      name: "trendsHeading",
      type: "text",
      defaultValue: SAFETY_DEFAULTS.trendsHeading,
      admin: { description: 'Heading for the multi-year trend charts section.' },
    },
    {
      name: "monthlyHeading",
      type: "text",
      defaultValue: SAFETY_DEFAULTS.monthlyHeading,
      admin: { description: 'Heading for the monthly breakdown chart section.' },
    },
    {
      name: "categoryHeading",
      type: "text",
      defaultValue: SAFETY_DEFAULTS.categoryHeading,
      admin: { description: 'Heading for the events-by-category section.' },
    },

    // Definitions cards -------------------------------------------------------
    {
      name: "accidentTerm",
      type: "text",
      defaultValue: SAFETY_DEFAULTS.accidentTerm,
      admin: { description: 'Term/heading of the "Accident" definition card.' },
    },
    {
      name: "accidentDefinition",
      type: "textarea",
      defaultValue: SAFETY_DEFAULTS.accidentDefinition,
      admin: { description: 'Body text of the "Accident" definition card.' },
    },
    {
      name: "incidentTerm",
      type: "text",
      defaultValue: SAFETY_DEFAULTS.incidentTerm,
      admin: { description: 'Term/heading of the "Incident" definition card.' },
    },
    {
      name: "incidentDefinition",
      type: "textarea",
      defaultValue: SAFETY_DEFAULTS.incidentDefinition,
      admin: { description: 'Body text of the "Incident" definition card.' },
    },
    {
      name: "lostTimeTerm",
      type: "text",
      defaultValue: SAFETY_DEFAULTS.lostTimeTerm,
      admin: { description: 'Term/heading of the "Lost-Time Injury" definition card.' },
    },
    {
      name: "lostTimeDefinition",
      type: "textarea",
      defaultValue: SAFETY_DEFAULTS.lostTimeDefinition,
      admin: { description: 'Body text of the "Lost-Time Injury" definition card.' },
    },
    {
      name: "nonLostTimeTerm",
      type: "text",
      defaultValue: SAFETY_DEFAULTS.nonLostTimeTerm,
      admin: { description: 'Term/heading of the "Non-Lost-Time Injury" definition card.' },
    },
    {
      name: "nonLostTimeDefinition",
      type: "textarea",
      defaultValue: SAFETY_DEFAULTS.nonLostTimeDefinition,
      admin: { description: 'Body text of the "Non-Lost-Time Injury" definition card.' },
    },

    // Card headings above charts/tables ---------------------------------------
    {
      name: "accidentsByYearTitle",
      type: "text",
      defaultValue: SAFETY_DEFAULTS.accidentsByYearTitle,
      admin: { description: 'Card title above the "Accidents by Year" bar chart.' },
    },
    {
      name: "annualBreakdownTitle",
      type: "text",
      defaultValue: SAFETY_DEFAULTS.annualBreakdownTitle,
      admin: { description: 'Card title above the annual event breakdown table.' },
    },
    {
      name: "categoryChartTitle",
      type: "text",
      defaultValue: SAFETY_DEFAULTS.categoryChartTitle,
      admin: { description: 'Card title above the events-by-category chart.' },
    },

    // Chart explainer footnotes -----------------------------------------------
    {
      name: "accidentsByYearNote",
      type: "textarea",
      defaultValue: SAFETY_DEFAULTS.accidentsByYearNote,
      admin: { description: 'Footnote beneath the "Accidents by Year" chart.' },
    },
    {
      name: "totalEventsNote",
      type: "textarea",
      defaultValue: SAFETY_DEFAULTS.totalEventsNote,
      admin: { description: 'Footnote beneath the Total Events / Lost Time chart.' },
    },
    {
      name: "lostTimeTooltip",
      type: "textarea",
      defaultValue: SAFETY_DEFAULTS.lostTimeTooltip,
      admin: {
        description:
          'Hover tooltip explaining "Lost Time" (reused on the chart title and the breakdown table header).',
      },
    },

    // Methodology data note ---------------------------------------------------
    {
      name: "dataNotePrivacy",
      type: "textarea",
      defaultValue: SAFETY_DEFAULTS.dataNotePrivacy,
      admin: { description: "Data note paragraph 1 (privacy/anonymization)." },
    },
    {
      name: "dataNoteClassification",
      type: "textarea",
      defaultValue: SAFETY_DEFAULTS.dataNoteClassification,
      admin: { description: "Data note paragraph 2 (source + classification)." },
    },
    {
      name: "dataNoteReporting",
      type: "textarea",
      defaultValue: SAFETY_DEFAULTS.dataNoteReporting,
      admin: { description: "Data note paragraph 3 (reporting period + cadence)." },
    },
  ],
};
