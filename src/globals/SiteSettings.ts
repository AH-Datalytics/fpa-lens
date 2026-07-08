import type { GlobalConfig } from "payload";
import { revalidateCms } from "@/lib/revalidateCms";

/**
 * Small, occasionally-edited site-wide values: the footer address/phone and the
 * public contact info. Seeded from `siteConfig` / `contacts` in siteData.ts.
 * (Automated pipeline data is intentionally NOT here.)
 */
export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  admin: {
    description: "Footer address, phone, and public contact details.",
  },
  access: {
    read: () => true,
  },
  hooks: { afterChange: [revalidateCms] },
  fields: [
    {
      type: "collapsible",
      label: "Address",
      fields: [
        { name: "street", label: "Street address", type: "text" },
        { name: "city", label: "City", type: "text" },
        { name: "state", label: "State", type: "text" },
        { name: "zip", label: "ZIP code", type: "text" },
      ],
    },
    { name: "phone", label: "Phone", type: "text" },
    {
      type: "collapsible",
      label: "Public contact",
      fields: [
        { name: "contactEmail", label: "Contact email", type: "email" },
        { name: "contactPhone", label: "Contact phone", type: "text" },
      ],
    },
  ],
};
