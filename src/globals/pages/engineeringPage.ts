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
  cpraDescription:
    "State-mandated quarterly visual inspection of the levee system, with findings reported to the Coastal Protection and Restoration Authority.",
  usaceDescription:
    "Federal inspection of HSDRRS levees, floodwalls, PCCPs, and complex structures. 100% = on pace for this point in the half-year cycle.",

  // --- Current Capital Projects section ---
  capitalProjectsHeading: "Current Capital Projects",
  capitalProjectsIntro:
    "Major capital projects currently under contract, in construction, or in active bidding.",

  // --- Permits section ---
  permitsHeading: "Permits",
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
      name: "cpraDescription",
      type: "textarea",
      defaultValue: ENGINEERING_DEFAULTS.cpraDescription,
      admin: { description: "Explainer paragraph inside the CPRA inspection card." },
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
  ],
};
