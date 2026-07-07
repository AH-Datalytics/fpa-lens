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
  accidentDefinition:
    "A work-related event that resulted in an OSHA-recordable injury or illness (medical treatment beyond first aid, lost time, restricted duty, or worse).",
  incidentDefinition:
    "A tracked work-related event that did not meet OSHA-recordable criteria (typically property damage, near-miss, or first-aid-only).",
  lostTimeDefinition:
    "A work-related injury or illness that causes an employee to miss one or more scheduled workdays after the day of the event.",
  nonLostTimeDefinition:
    "A work-related injury or illness that does not cause the employee to miss a scheduled workday. This may include first aid, medical treatment, or restricted duty, depending on the event.",
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
      name: "accidentDefinition",
      type: "textarea",
      defaultValue: SAFETY_DEFAULTS.accidentDefinition,
      admin: { description: 'Body text of the "Accident" definition card.' },
    },
    {
      name: "incidentDefinition",
      type: "textarea",
      defaultValue: SAFETY_DEFAULTS.incidentDefinition,
      admin: { description: 'Body text of the "Incident" definition card.' },
    },
    {
      name: "lostTimeDefinition",
      type: "textarea",
      defaultValue: SAFETY_DEFAULTS.lostTimeDefinition,
      admin: { description: 'Body text of the "Lost-Time Injury" definition card.' },
    },
    {
      name: "nonLostTimeDefinition",
      type: "textarea",
      defaultValue: SAFETY_DEFAULTS.nonLostTimeDefinition,
      admin: { description: 'Body text of the "Non-Lost-Time Injury" definition card.' },
    },
  ],
};
