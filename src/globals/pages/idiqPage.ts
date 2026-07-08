import type { GlobalConfig } from "payload";
import { revalidateCms } from "@/lib/revalidateCms";
import { rt } from "@/lib/richText";

/**
 * Editable copy for the IDIQ Contract Tracker page
 * (`/engineering/idiq`). Only the substantive editorial prose lives here:
 * the landing intro, the Key Takeaway callout, service micro-descriptions,
 * the process-flow boxes, section headings, and explainer paragraphs.
 *
 * Everything numeric or data-driven stays in code: contract/KPI values, the
 * 2022/2025 cycle filter UI, nav/button labels, tiny status strings, and any
 * value computed from `public/data/idiq-contracts.json`.
 *
 * `IDIQ_DEFAULTS` mirrors the exact wording currently hardcoded on the page so
 * the admin form pre-fills and the page can fall back to it verbatim
 * (`copy?.x ?? IDIQ_DEFAULTS.x`) once wired.
 *
 * NOTE: the target page is a Client Component (`"use client"`, interactive
 * cycle filtering), so it cannot read this global directly. Page wiring is
 * deferred until the copy is lifted into a Server Component wrapper. Register
 * this global in `payload.config.ts` (globals array) to expose it in the admin.
 */
export const IDIQ_DEFAULTS = {
  pageTitle: "IDIQ Contract Tracker",
  pageSubtitle: "How we procure and assign engineering and professional services work",

  keyTakeawayBody: rt(
    "IDIQ contracts allow the Authority to respond quickly to project needs by working with pre-qualified firms. Work is assigned based on project requirements and expertise, not preset allocation, so utilization will vary across firms.",
  ),

  introHeading: "What is an IDIQ contract?",
  introParagraph1: rt(
    "IDIQ (Indefinite Delivery, Indefinite Quantity) contracts allow the Authority to pre-qualify engineering and professional service firms through a competitive, qualifications-based process. Task orders are issued as project needs arise, such as inspections, design, construction support, and facility improvements, without requiring a full procurement each time.",
  ),
  introParagraph2: rt(
    "IDIQ contracts are awarded in multi-year cycles (typically three years). The 2022 contracts were active through 2025, and the 2025 contracts represent the current cycle.",
  ),
  introParagraph3: rt(
    "Work is assigned based on project needs, timing, and expertise. As a result, utilization varies across firms within each service category; this is expected and reflects how IDIQ programs are designed to function.",
  ),

  contractCycleHeading: "Contract Cycle",

  // Service micro-descriptions (director feedback, Apr 2026). One entry per
  // service category; the page maps both the 2022-cycle and 2025-cycle naming
  // variants of a category to the same description.
  serviceCivilEngineering: rt("Levee repair, site development, and infrastructure design"),
  serviceSurveying: rt("Levee and structure elevation surveys and mapping"),
  serviceGeotechnicalEngineering: rt("Soil analysis, subsurface investigations, and testing"),
  serviceConstructionMaterialsTesting: rt(
    "Materials and soil testing for construction quality control",
  ),
  serviceMepServices: rt("Mechanical and electrical systems for facilities and pump stations"),
};

export const IdiqPage: GlobalConfig = {
  slug: "idiq-page",
  label: "IDIQ Page",
  admin: {
    group: "Page Content",
    description: "Editable copy on the IDIQ Contract Tracker page.",
  },
  access: { read: () => true },
  hooks: { afterChange: [revalidateCms] },
  fields: [
    {
      type: "collapsible",
      label: "Header",
      fields: [
        {
          name: "pageTitle",
          label: "Page title",
          type: "text",
          defaultValue: () => IDIQ_DEFAULTS.pageTitle,
          admin: { description: "Main page heading (SectionHeader title)." },
        },
        {
          name: "pageSubtitle",
          label: "Page subtitle",
          type: "text",
          defaultValue: () => IDIQ_DEFAULTS.pageSubtitle,
          admin: { description: "Subtitle beneath the page heading." },
        },
      ],
    },
    {
      type: "collapsible",
      label: "Key Takeaway callout",
      fields: [
        {
          name: "keyTakeawayBody",
          label: "Key Takeaway: body",
          type: "richText",
          defaultValue: () => IDIQ_DEFAULTS.keyTakeawayBody,
          admin: { description: "Body paragraph inside the Key Takeaway callout." },
        },
      ],
    },
    {
      type: "collapsible",
      label: "Educational intro",
      fields: [
        {
          name: "introHeading",
          label: "What is an IDIQ Contract: heading",
          type: "text",
          defaultValue: () => IDIQ_DEFAULTS.introHeading,
          admin: { description: 'Heading of the intro card ("What is an IDIQ contract?").' },
        },
        {
          name: "introParagraph1",
          label: "Intro: paragraph 1",
          type: "richText",
          defaultValue: () => IDIQ_DEFAULTS.introParagraph1,
          admin: { description: "First explainer paragraph in the intro card." },
        },
        {
          name: "introParagraph2",
          label: "Intro: paragraph 2",
          type: "richText",
          defaultValue: () => IDIQ_DEFAULTS.introParagraph2,
          admin: { description: "Second explainer paragraph in the intro card." },
        },
        {
          name: "introParagraph3",
          label: "Intro: paragraph 3",
          type: "richText",
          defaultValue: () => IDIQ_DEFAULTS.introParagraph3,
          admin: { description: "Third explainer paragraph in the intro card." },
        },
      ],
    },
    {
      name: "contractCycleHeading",
      label: "Contract Cycle: heading",
      type: "text",
      defaultValue: () => IDIQ_DEFAULTS.contractCycleHeading,
      admin: { description: "Section heading above the contract cycle selector." },
    },
    {
      type: "collapsible",
      label: "Service micro-descriptions",
      admin: {
        description:
          "One line per service category, shown under each service heading. Applies to both the 2022 and 2025 naming variants of the category.",
      },
      fields: [
        {
          name: "serviceCivilEngineering",
          label: "Service: Civil Engineering",
          type: "richText",
          defaultValue: () => IDIQ_DEFAULTS.serviceCivilEngineering,
          admin: { description: "Civil Engineering." },
        },
        {
          name: "serviceSurveying",
          label: "Service: Surveying",
          type: "richText",
          defaultValue: () => IDIQ_DEFAULTS.serviceSurveying,
          admin: { description: "Surveying / Surveying Services." },
        },
        {
          name: "serviceGeotechnicalEngineering",
          label: "Service: Geotechnical Engineering",
          type: "richText",
          defaultValue: () => IDIQ_DEFAULTS.serviceGeotechnicalEngineering,
          admin: { description: "Geotechnical Engineering." },
        },
        {
          name: "serviceConstructionMaterialsTesting",
          label: "Service: Construction Materials & Testing",
          type: "richText",
          defaultValue: () => IDIQ_DEFAULTS.serviceConstructionMaterialsTesting,
          admin: { description: "Construction Materials & Testing." },
        },
        {
          name: "serviceMepServices",
          label: "Service: MEP Services",
          type: "richText",
          defaultValue: () => IDIQ_DEFAULTS.serviceMepServices,
          admin: { description: "MEP Services." },
        },
      ],
    },
  ],
};
