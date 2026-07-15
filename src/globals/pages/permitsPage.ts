import type { GlobalConfig } from "payload";
import { revalidateCms } from "@/lib/revalidateCms";
import { rt } from "@/lib/richText";

/**
 * Editable copy for the Permit Overview page (`/engineering/permits`). This page
 * is a live dashboard driven by the Vinformatix feed, so only the framing prose
 * is editable: the page heading, the intro paragraph, and the "Permit Lifecycle"
 * section heading. Every number, chart/card/metric label, filter control, status
 * message, the data-source note, and the lifecycle explainer (which embeds live
 * counts) stay hardcoded in the page and out of the CMS.
 *
 * `defaultValue`s mirror the current hardcoded wording exactly, so the admin form
 * pre-fills and an unseeded global still returns the live copy.
 */
export const PERMITS_DEFAULTS = {
  pageTitle: "Permit Overview",
  intro: rt(
    "SLFPA-East reviews and approves permit applications for construction, encroachments, and events on or near the levee system. Once a permit is submitted, FPA conducts its own engineering review -- but some steps require action from outside parties, such as a Letter of No Objection from the U.S. Army Corps of Engineers or the Coastal Protection and Restoration Authority, or a response from the applicant. Processing time reflects the full timeline from submission to decision, including any periods outside FPA’s control.",
  ),
  lifecycleHeading: "Permit Lifecycle",
};

export const PermitsPage: GlobalConfig = {
  slug: "permits-page",
  admin: {
    group: "Page Content",
    description: "Editable copy on the Permit Overview page.",
  },
  access: { read: () => true },
  hooks: { afterChange: [revalidateCms] },
  fields: [
    {
      name: "pageTitle",
      label: "Page title",
      type: "text",
      defaultValue: () => PERMITS_DEFAULTS.pageTitle,
      admin: { description: "Main page heading (top of the Permit Overview page)." },
    },
    {
      name: "intro",
      label: "Intro paragraph",
      type: "richText",
      defaultValue: () => PERMITS_DEFAULTS.intro,
      admin: {
        description:
          "Explainer paragraph beneath the page heading. Data, counts, and chart labels are not editable.",
      },
    },
    {
      name: "lifecycleHeading",
      label: "Permit Lifecycle: heading",
      type: "text",
      defaultValue: () => PERMITS_DEFAULTS.lifecycleHeading,
      admin: { description: 'Heading of the lifecycle section ("Permit Lifecycle").' },
    },
  ],
};
