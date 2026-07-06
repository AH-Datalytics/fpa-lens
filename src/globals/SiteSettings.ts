import type { GlobalConfig } from "payload";

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
  fields: [
    {
      type: "collapsible",
      label: "Address",
      fields: [
        { name: "street", type: "text" },
        { name: "city", type: "text" },
        { name: "state", type: "text" },
        { name: "zip", type: "text" },
      ],
    },
    { name: "phone", type: "text" },
    {
      type: "collapsible",
      label: "Public contact",
      fields: [
        { name: "contactEmail", type: "email" },
        { name: "contactPhone", type: "text" },
      ],
    },
  ],
};
