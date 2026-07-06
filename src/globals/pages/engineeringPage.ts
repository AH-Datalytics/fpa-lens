import type { GlobalConfig } from "payload";
import { revalidateCms } from "@/lib/revalidateCms";

/**
 * Editable copy for the Engineering page (`/engineering`). Follows the per-page
 * copy-global pattern (same as HomeContent): only prose lives here — every
 * number, inspection percentage, permit count, capital-project record, and any
 * value derived from `@/data/siteData` stays in the automated data layer, not
 * the CMS.
 *
 * DEFAULTS below mirror the current on-page wording verbatim so the admin form
 * pre-fills correctly and an unseeded global still returns the exact text.
 *
 * NOTE: `src/app/(frontend)/engineering/page.tsx` is a Client Component
 * (`"use client"` — it needs `useState`/`useEffect` for the permit-pipeline
 * toggle and the SITREP fetch). Server-only `getPageContent` cannot be called
 * there, so these fields are not yet wired into the page. Wiring requires a
 * server wrapper + client child (a third file) and registering this global in
 * `payload.config.ts` — both out of scope for the two-file change. See the
 * report / the note in page.tsx.
 */
export const ENGINEERING_DEFAULTS = {
  // --- Page header ---
  pageTitle: "Engineering",
  pageSubtitle: "Permits, inspections, and engineering contracts",

  // --- Federal & State Inspections section ---
  inspectionsHeading: "Federal & State Inspections",
  cpraTitle: "CPRA Quarterly Inspection",
  cpraDescription:
    "State-mandated quarterly visual inspection of the levee system, with findings reported to the Coastal Protection and Restoration Authority.",
  usaceTitle: "USACE Semi-Annual Inspection",
  usaceDescription:
    "Federal inspection of HSDRRS levees, floodwalls, PCCPs, and complex structures. 100% = on pace for this point in the half-year cycle.",

  // --- Current Capital Projects section ---
  capitalProjectsHeading: "Current Capital Projects",
  capitalProjectsIntro:
    "Major capital projects currently under contract, in construction, or in active bidding.",

  // --- Permits section ---
  permitsHeading: "Permits",
  pipelineLabel: "Permit Processing Pipeline",
  permitsIssuedLabel: "Permits Issued",
  permitsTrendTitle: "Monthly Permits Trend",

  // --- Permit-pipeline "Full workflow" process steps ---
  pipelineStep1: "Permit Submittal",
  pipelineStep2: "FPA-E Review",
  pipelineStep3: "External Agency Coordination",
  pipelineStep4: "Receipt of LNO",
  pipelineStep5: "Final Review",
  pipelineStep6: "Permit Issued",
  lnoTooltipFull: "Letter of No Objection from the Levee District",
  lnoTooltipSimple: "LNO: Letter of No Objection issued by the Levee District",

  // --- Routine Maintenance section ---
  maintenanceLabel: "Routine Maintenance Activities",
  maintenanceCardTitle: "Current Maintenance Work",
};

export const EngineeringPage: GlobalConfig = {
  slug: "engineering-page",
  admin: {
    group: "Page Content",
    description: "Editable copy on the Engineering page.",
  },
  access: { read: () => true },
  hooks: { afterChange: [revalidateCms] },
  fields: [
    // --- Page header ---
    {
      name: "pageTitle",
      type: "text",
      defaultValue: ENGINEERING_DEFAULTS.pageTitle,
      admin: { description: "The large H1 heading at the top of the Engineering page." },
    },
    {
      name: "pageSubtitle",
      type: "text",
      defaultValue: ENGINEERING_DEFAULTS.pageSubtitle,
      admin: { description: "The subtitle line beneath the page heading." },
    },

    // --- Federal & State Inspections section ---
    {
      name: "inspectionsHeading",
      type: "text",
      defaultValue: ENGINEERING_DEFAULTS.inspectionsHeading,
      admin: { description: "Section heading above the two inspection cards." },
    },
    {
      name: "cpraTitle",
      type: "text",
      defaultValue: ENGINEERING_DEFAULTS.cpraTitle,
      admin: { description: "Title of the CPRA inspection card." },
    },
    {
      name: "cpraDescription",
      type: "textarea",
      defaultValue: ENGINEERING_DEFAULTS.cpraDescription,
      admin: { description: "Explainer paragraph inside the CPRA inspection card." },
    },
    {
      name: "usaceTitle",
      type: "text",
      defaultValue: ENGINEERING_DEFAULTS.usaceTitle,
      admin: { description: "Title of the USACE inspection card." },
    },
    {
      name: "usaceDescription",
      type: "textarea",
      defaultValue: ENGINEERING_DEFAULTS.usaceDescription,
      admin: { description: "Explainer paragraph inside the USACE inspection card." },
    },

    // --- Current Capital Projects section ---
    {
      name: "capitalProjectsHeading",
      type: "text",
      defaultValue: ENGINEERING_DEFAULTS.capitalProjectsHeading,
      admin: { description: "Section heading above the capital-projects grid." },
    },
    {
      name: "capitalProjectsIntro",
      type: "textarea",
      defaultValue: ENGINEERING_DEFAULTS.capitalProjectsIntro,
      admin: { description: "Intro paragraph beneath the Current Capital Projects heading." },
    },

    // --- Permits section ---
    {
      name: "permitsHeading",
      type: "text",
      defaultValue: ENGINEERING_DEFAULTS.permitsHeading,
      admin: { description: 'Section heading for the "Permits" block.' },
    },
    {
      name: "pipelineLabel",
      type: "text",
      defaultValue: ENGINEERING_DEFAULTS.pipelineLabel,
      admin: { description: "Small uppercase label above the permit-processing pipeline card." },
    },
    {
      name: "permitsIssuedLabel",
      type: "text",
      defaultValue: ENGINEERING_DEFAULTS.permitsIssuedLabel,
      admin: { description: "Small uppercase label above the monthly permits chart." },
    },
    {
      name: "permitsTrendTitle",
      type: "text",
      defaultValue: ENGINEERING_DEFAULTS.permitsTrendTitle,
      admin: { description: "Title of the monthly permits-trend chart card." },
    },

    // --- Permit-pipeline "Full workflow" process steps ---
    {
      name: "pipelineStep1",
      type: "text",
      defaultValue: ENGINEERING_DEFAULTS.pipelineStep1,
      admin: { description: "Permit pipeline (Full workflow) step 1 label." },
    },
    {
      name: "pipelineStep2",
      type: "text",
      defaultValue: ENGINEERING_DEFAULTS.pipelineStep2,
      admin: { description: "Permit pipeline (Full workflow) step 2 label." },
    },
    {
      name: "pipelineStep3",
      type: "text",
      defaultValue: ENGINEERING_DEFAULTS.pipelineStep3,
      admin: { description: "Permit pipeline (Full workflow) step 3 label." },
    },
    {
      name: "pipelineStep4",
      type: "text",
      defaultValue: ENGINEERING_DEFAULTS.pipelineStep4,
      admin: { description: "Permit pipeline (Full workflow) step 4 label." },
    },
    {
      name: "pipelineStep5",
      type: "text",
      defaultValue: ENGINEERING_DEFAULTS.pipelineStep5,
      admin: { description: "Permit pipeline (Full workflow) step 5 label." },
    },
    {
      name: "pipelineStep6",
      type: "text",
      defaultValue: ENGINEERING_DEFAULTS.pipelineStep6,
      admin: { description: "Permit pipeline (Full workflow) final step label." },
    },
    {
      name: "lnoTooltipFull",
      type: "text",
      defaultValue: ENGINEERING_DEFAULTS.lnoTooltipFull,
      admin: { description: 'Tooltip on the "Receipt of LNO" step in the Full workflow view.' },
    },
    {
      name: "lnoTooltipSimple",
      type: "textarea",
      defaultValue: ENGINEERING_DEFAULTS.lnoTooltipSimple,
      admin: { description: 'Tooltip on the "LNO Review" node in the simple pipeline view.' },
    },

    // --- Routine Maintenance section ---
    {
      name: "maintenanceLabel",
      type: "text",
      defaultValue: ENGINEERING_DEFAULTS.maintenanceLabel,
      admin: { description: "Small uppercase label above the maintenance-activities card." },
    },
    {
      name: "maintenanceCardTitle",
      type: "text",
      defaultValue: ENGINEERING_DEFAULTS.maintenanceCardTitle,
      admin: { description: "Title of the current-maintenance-work card." },
    },
  ],
};
