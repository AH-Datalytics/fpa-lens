import type { GlobalConfig } from "payload";
import { revalidateCms } from "@/lib/revalidateCms";
import { rt } from "@/lib/richText";

/**
 * Editable copy for the Staffing page (`/staffing`). Only substantive editorial
 * prose lives here — the page title/subtitle, the two section headings, and
 * their descriptive intro paragraphs. All headcount/vacancy numbers, zone and
 * department data, thresholds, view-toggle labels, and other UI strings come
 * from `@/data/siteData` (+ the staffing.json overlay) and stay out of the CMS.
 *
 * `defaultValue`s mirror the current hardcoded wording exactly, so the admin
 * form pre-fills and an unseeded global still returns the live copy.
 */
export const STAFFING_DEFAULTS = {
  pageTitle: "Staffing",
  pageSubtitle: "The dedicated professionals protecting Greater New Orleans",
  coreHeading: "Core Flood Protection Unit",
  coreDescription: rt(
    "Operational capacity across Maintenance, Operations, Engineering, and Police.",
  ),
  adminHeading: "Administrative Functions",
  adminDescription: rt(
    "Support functions that keep the agency running. Not directly tied to storm response operations, but essential to sustained organizational capacity.",
  ),
};

export const StaffingPage: GlobalConfig = {
  slug: "staffing-page",
  admin: {
    group: "Page Content",
    description: "Editable copy on the Staffing page.",
  },
  access: { read: () => true },
  hooks: { afterChange: [revalidateCms] },
  fields: [
    {
      name: "pageTitle",
      label: "Page title",
      type: "text",
      defaultValue: () => STAFFING_DEFAULTS.pageTitle,
      admin: { description: "Main page heading (top of the Staffing page)." },
    },
    {
      name: "pageSubtitle",
      label: "Page subtitle",
      type: "textarea",
      defaultValue: () => STAFFING_DEFAULTS.pageSubtitle,
      admin: { description: "Subtitle beneath the page heading." },
    },
    {
      name: "coreHeading",
      label: "Core Unit: heading",
      type: "text",
      defaultValue: () => STAFFING_DEFAULTS.coreHeading,
      admin: { description: 'Heading of the first section ("Core Flood Protection Unit").' },
    },
    {
      name: "coreDescription",
      label: "Core Unit: description",
      type: "richText",
      defaultValue: () => STAFFING_DEFAULTS.coreDescription,
      admin: { description: "Intro paragraph under the Core Flood Protection Unit heading." },
    },
    {
      name: "adminHeading",
      label: "Administrative Functions: heading",
      type: "text",
      defaultValue: () => STAFFING_DEFAULTS.adminHeading,
      admin: { description: 'Heading of the second section ("Administrative Functions").' },
    },
    {
      name: "adminDescription",
      label: "Administrative Functions: description",
      type: "richText",
      defaultValue: () => STAFFING_DEFAULTS.adminDescription,
      admin: { description: "Intro paragraph under the Administrative Functions heading." },
    },
  ],
};
