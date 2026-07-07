import type { GlobalConfig } from "payload";
import { revalidateCms } from "@/lib/revalidateCms";

/**
 * Editable copy for the home page hero. Only the headline is editable here; the
 * supporting subtext is fixed in the page (it embeds the org short-name inline).
 * All metrics/readiness come from the automated pipeline, not the CMS.
 */
export const HOME_DEFAULTS = {
  heroHeading: "Protecting Greater New Orleans",
};

export const HomeContent: GlobalConfig = {
  slug: "home-content",
  admin: {
    description: "Home page hero headline.",
  },
  access: {
    read: () => true,
  },
  hooks: { afterChange: [revalidateCms] },
  fields: [
    {
      name: "heroHeading",
      type: "text",
      defaultValue: HOME_DEFAULTS.heroHeading,
      admin: { description: "The large hero headline on the home page." },
    },
  ],
};
