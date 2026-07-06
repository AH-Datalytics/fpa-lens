import type { GlobalConfig } from "payload";
import { revalidateCms } from "@/lib/revalidateCms";

/**
 * Editable copy for the home page hero. First "page copy" global; additional
 * per-page globals follow the same pattern. Only prose lives here — all
 * metrics/readiness come from the automated pipeline, not the CMS.
 */
export const HomeContent: GlobalConfig = {
  slug: "home-content",
  admin: {
    description: "Home page hero heading and subtext.",
  },
  access: {
    read: () => true,
  },
  hooks: { afterChange: [revalidateCms] },
  fields: [
    {
      name: "heroHeading",
      type: "text",
      admin: { description: "The large hero headline on the home page." },
    },
    {
      name: "heroSubtext",
      type: "textarea",
      admin: { description: "The paragraph beneath the hero headline." },
    },
  ],
};
