import type { GlobalConfig } from "payload";
import { revalidateCms } from "@/lib/revalidateCms";

/**
 * Editable copy for the Protection page (/protection). Only the hardcoded
 * editorial headings and section titles live here — every metric, activity
 * count, workforce snapshot, mission/outcome/callout body, and any value
 * derived from `@/data/protectionData` stays in the data module and the
 * automated pipeline, not the CMS. Follows the same per-page-global pattern as
 * HomeContent: `defaultValue` mirrors the current wording so the admin form
 * pre-fills and an unseeded global still returns the exact live text.
 */
export const PROTECTION_DEFAULTS = {
  pageTitle: "Infrastructure Protection Operations",
  pageSubtitle: "FPA Police as the 24/7 field protection of the flood-defense system",
  missionHeading: "Flood infrastructure security is the primary mission",
  monitoringHeading: "Infrastructure monitoring activity",
  leveeAwarenessHeading: "Levee and system awareness",
  outcomesHeading: "Operational outcomes",
  outcomesSubtitle: "Infrastructure-focused results",
  workforceHeading: "Workforce context",
};

export const ProtectionPage: GlobalConfig = {
  slug: "protection-page",
  admin: {
    group: "Page Content",
    description: "Editable copy on the Protection page.",
  },
  access: {
    read: () => true,
  },
  hooks: { afterChange: [revalidateCms] },
  fields: [
    {
      name: "pageTitle",
      label: "Page title",
      type: "text",
      defaultValue: PROTECTION_DEFAULTS.pageTitle,
      admin: { description: "Main page heading at the top of the Protection page." },
    },
    {
      name: "pageSubtitle",
      label: "Page subtitle",
      type: "text",
      defaultValue: PROTECTION_DEFAULTS.pageSubtitle,
      admin: { description: "Subtitle beneath the main page heading." },
    },
    {
      name: "missionHeading",
      label: "Mission: heading",
      type: "text",
      defaultValue: PROTECTION_DEFAULTS.missionHeading,
      admin: { description: "Heading inside the blue mission callout." },
    },
    {
      name: "monitoringHeading",
      label: "Monitoring Activity: heading",
      type: "text",
      defaultValue: PROTECTION_DEFAULTS.monitoringHeading,
      admin: {
        description: 'Section heading for the "Infrastructure monitoring activity" block.',
      },
    },
    {
      name: "leveeAwarenessHeading",
      label: "Levee Awareness: heading",
      type: "text",
      defaultValue: PROTECTION_DEFAULTS.leveeAwarenessHeading,
      admin: {
        description: 'Section heading for the "Levee and system awareness" block.',
      },
    },
    {
      name: "outcomesHeading",
      label: "Operational Outcomes: heading",
      type: "text",
      defaultValue: PROTECTION_DEFAULTS.outcomesHeading,
      admin: { description: 'Section heading for the "Operational outcomes" block.' },
    },
    {
      name: "outcomesSubtitle",
      label: "Operational Outcomes: subtitle",
      type: "text",
      defaultValue: PROTECTION_DEFAULTS.outcomesSubtitle,
      admin: { description: "Subtitle beneath the Operational outcomes heading." },
    },
    {
      name: "workforceHeading",
      label: "Workforce Context: heading",
      type: "text",
      defaultValue: PROTECTION_DEFAULTS.workforceHeading,
      admin: { description: 'Section heading for the "Workforce context" block.' },
    },
  ],
};
