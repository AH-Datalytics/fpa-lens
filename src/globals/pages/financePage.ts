import type { GlobalConfig } from "payload";
import { revalidateCms } from "@/lib/revalidateCms";
import { rt } from "@/lib/richText";

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
  majorProjectsHeading: "Major Future Projects",
  majorProjectsIntro: rt(
    "Long-term capital needs the Authority has identified but that are not yet funded or scheduled.",
  ),
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
      label: "Page title",
      type: "text",
      defaultValue: () => FINANCE_DEFAULTS.pageTitle,
      admin: { description: "The main page heading (H1) at the top of the Finance page." },
    },
    {
      name: "pageSubtitle",
      label: "Page subtitle",
      type: "text",
      defaultValue: () => FINANCE_DEFAULTS.pageSubtitle,
      admin: { description: "The descriptive subtitle shown beneath the Finance page heading." },
    },
    {
      name: "spendingSectionHeading",
      label: "Spending section: heading",
      type: "text",
      defaultValue: () => FINANCE_DEFAULTS.spendingSectionHeading,
      admin: { description: "Heading for the lead budget-vs-actuals section." },
    },
    {
      name: "majorProjectsHeading",
      label: "Major Future Projects: heading",
      type: "text",
      defaultValue: () => FINANCE_DEFAULTS.majorProjectsHeading,
      admin: { description: "Heading for the Major Future Projects section." },
    },
    {
      name: "majorProjectsIntro",
      label: "Major Future Projects: intro",
      type: "richText",
      defaultValue: () => FINANCE_DEFAULTS.majorProjectsIntro,
      admin: {
        description:
          "Lead sentence introducing the Major Future Projects table. The following sentence (with the inline Current Capital Projects link to the Engineering page) stays in the page markup.",
      },
    },
  ],
};
