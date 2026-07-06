import type { GlobalConfig } from "payload";
import { revalidateCms } from "@/lib/revalidateCms";

/**
 * Editable copy for the Finance page (`/finance`).
 *
 * Only substantive editorial prose lives here — page intro/subtitle, section
 * headings, explainer captions, the variance-table methodology note, and the
 * bottom-of-page Data Note. All numbers, budget/actuals figures, chart/table
 * labels, KPI-card labels, source attributions, and dynamically interpolated
 * strings stay in the page/`financeData`/`siteData` and are intentionally NOT
 * exposed here.
 *
 * NOTE: `src/app/(frontend)/finance/page.tsx` is currently a `"use client"`
 * component, so it cannot `await getPageContent(...)` directly. These fields
 * become live once that page is split into a server wrapper (which reads this
 * global) + a client child for the interactive budget/actuals section. Until
 * then this global is the source-of-truth inventory + defaults for that copy.
 *
 * DEFAULTS match the current on-page wording character-for-character (with JSX
 * whitespace collapsed to single spaces, as it renders).
 */
export const FINANCE_DEFAULTS = {
  pageTitle: "Finance",
  pageSubtitle: "How your tax dollars are invested in flood protection",
  spendingSectionHeading: "Year-to-Date Spending vs Budget",
  revenueCaption: "Tax revenue is seasonal; large payments arrive at billing cycles",
  projectsCaption: "Multi-year projects ramp at different rates",
  varianceTableNote:
    "Note: When filtering by district, some categories and departments may not appear because not all expense types and departments exist within every district.",
  majorProjectsHeading: "Major Future Projects",
  majorProjectsIntro:
    "Long-term capital needs the Authority has identified but that are not yet funded or scheduled.",
  dataNoteBudget:
    "Budget vs Actuals sourced from FPA Dashboard Reports (Finance Department). O&M expenses are shown separately from Projects to avoid distortion from multi-year project timing. Hover over any acronym for its full name.",
  dataNoteProjects:
    "Future projects sourced from SITREP reports. Current capital projects live on the Engineering page.",
};

export const FinancePage: GlobalConfig = {
  slug: "finance-page",
  admin: {
    group: "Page Content",
    description: "Editable copy on the Finance page.",
  },
  access: { read: () => true },
  hooks: { afterChange: [revalidateCms] },
  fields: [
    {
      name: "pageTitle",
      type: "text",
      defaultValue: FINANCE_DEFAULTS.pageTitle,
      admin: { description: "The main page heading (H1) at the top of the Finance page." },
    },
    {
      name: "pageSubtitle",
      type: "text",
      defaultValue: FINANCE_DEFAULTS.pageSubtitle,
      admin: { description: "The descriptive subtitle shown beneath the Finance page heading." },
    },
    {
      name: "spendingSectionHeading",
      type: "text",
      defaultValue: FINANCE_DEFAULTS.spendingSectionHeading,
      admin: { description: "Heading for the lead budget-vs-actuals section." },
    },
    {
      name: "revenueCaption",
      type: "textarea",
      defaultValue: FINANCE_DEFAULTS.revenueCaption,
      admin: { description: "Small explainer caption under the Revenue Collected KPI card." },
    },
    {
      name: "projectsCaption",
      type: "textarea",
      defaultValue: FINANCE_DEFAULTS.projectsCaption,
      admin: { description: "Small explainer caption under the Projects KPI card." },
    },
    {
      name: "varianceTableNote",
      type: "textarea",
      defaultValue: FINANCE_DEFAULTS.varianceTableNote,
      admin: {
        description:
          "Methodology footnote beneath the Variance Detail table explaining why some rows disappear when filtering by district.",
      },
    },
    {
      name: "majorProjectsHeading",
      type: "text",
      defaultValue: FINANCE_DEFAULTS.majorProjectsHeading,
      admin: { description: "Heading for the Major Future Projects section." },
    },
    {
      name: "majorProjectsIntro",
      type: "textarea",
      defaultValue: FINANCE_DEFAULTS.majorProjectsIntro,
      admin: {
        description:
          "Lead sentence introducing the Major Future Projects table. The following sentence (with the inline Current Capital Projects link to the Engineering page) stays in the page markup.",
      },
    },
    {
      name: "dataNoteBudget",
      type: "textarea",
      defaultValue: FINANCE_DEFAULTS.dataNoteBudget,
      admin: {
        description:
          "First paragraph of the Data Note callout at the bottom of the page (budget/actuals sourcing and O&M-vs-Projects methodology).",
      },
    },
    {
      name: "dataNoteProjects",
      type: "textarea",
      defaultValue: FINANCE_DEFAULTS.dataNoteProjects,
      admin: {
        description:
          "Second paragraph of the Data Note callout (future-projects sourcing / SITREP).",
      },
    },
  ],
};
