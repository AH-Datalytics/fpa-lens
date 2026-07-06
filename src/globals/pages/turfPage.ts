import type { GlobalConfig } from "payload";
import { revalidateCms } from "@/lib/revalidateCms";

/**
 * Editable copy for the Turf Maintenance page (`/infrastructure/turf-maintenance`).
 * Prose only. Strings that embed live data — the plan hero's acreage/zone totals,
 * the reporting-month freshness note and how-to-read intro, and the Green/Amber/Red
 * legend (which carries the numeric thresholds + inline bold) — intentionally stay
 * computed in the page and are NOT exposed here, so they never drift from the data.
 */
export const TURF_DEFAULTS = {
  // Page header
  pageTitle: "Turf Maintenance",
  pageSubtitle: "Levee turf maintenance progress across the system",

  // Maintenance plan hero (eyebrow only; heading/body embed live acreage totals)
  planEyebrow: "The maintenance plan",

  // System overview
  systemOverviewTitle: "System overview",

  // Operational note callout
  operationalNoteHeading: "Operational Note — June 2026",
  operationalNoteBody1:
    "Recent rainfall has reduced the number of workable mowing days across portions of the system. For safety and turf protection, mowing may be delayed when levee slopes, access roads, or work areas are saturated. SLFPA-East is using additional crews and overtime, including scheduled off-day work, to recover production where conditions allow.",
  operationalNoteBody2:
    "The dashboard will continue to show actual progress against monthly mowing targets. Status colors are not adjusted for weather impacts, but operational notes will be provided when conditions materially affect monthly progress.",

  // Map section
  mapTitle: "Zones across the system",
  mapSubtitle:
    "Mowing-area polygons colored by zone. Click any polygon for its name, zone, and acreage.",

  // How to read the zone cards
  howToReadHeading: "How to read the zone cards",
  statusExplainer:
    "The mowing status reflects progress against the monthly mowing target for each zone. It is an operational production indicator and does not, by itself, indicate a deficiency in the flood protection system. Weather, saturated ground conditions, site access, safety considerations, equipment availability, and other operating conditions may affect daily mowing production. When those conditions materially affect monthly progress, SLFPA-East may provide an operational note explaining the cause and recovery actions.",
};

export const TurfPage: GlobalConfig = {
  slug: "turf-page",
  admin: {
    group: "Page Content",
    description: "Editable copy on the Turf Maintenance page.",
  },
  access: { read: () => true },
  hooks: { afterChange: [revalidateCms] },
  fields: [
    { name: "pageTitle", type: "text", defaultValue: TURF_DEFAULTS.pageTitle, admin: { description: "Page title (top section header)." } },
    { name: "pageSubtitle", type: "text", defaultValue: TURF_DEFAULTS.pageSubtitle, admin: { description: "Subtitle beneath the page title." } },
    { name: "planEyebrow", type: "text", defaultValue: TURF_DEFAULTS.planEyebrow, admin: { description: "Small eyebrow label above the plan hero heading." } },
    { name: "systemOverviewTitle", type: "text", defaultValue: TURF_DEFAULTS.systemOverviewTitle, admin: { description: "Heading for the System overview section." } },
    { name: "operationalNoteHeading", type: "text", defaultValue: TURF_DEFAULTS.operationalNoteHeading, admin: { description: "Heading for the dated Operational Note callout." } },
    { name: "operationalNoteBody1", type: "textarea", defaultValue: TURF_DEFAULTS.operationalNoteBody1, admin: { description: "First paragraph of the Operational Note callout." } },
    { name: "operationalNoteBody2", type: "textarea", defaultValue: TURF_DEFAULTS.operationalNoteBody2, admin: { description: "Second paragraph of the Operational Note callout." } },
    { name: "mapTitle", type: "text", defaultValue: TURF_DEFAULTS.mapTitle, admin: { description: "Heading above the interactive zone map." } },
    { name: "mapSubtitle", type: "text", defaultValue: TURF_DEFAULTS.mapSubtitle, admin: { description: "Explainer subtitle above the interactive zone map." } },
    { name: "howToReadHeading", type: "text", defaultValue: TURF_DEFAULTS.howToReadHeading, admin: { description: "Heading for the 'How to read the zone cards' box." } },
    { name: "statusExplainer", type: "textarea", defaultValue: TURF_DEFAULTS.statusExplainer, admin: { description: "Operational-indicator caveat paragraph in the how-to-read box." } },
  ],
};
