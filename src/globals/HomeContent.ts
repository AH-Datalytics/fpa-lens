import type { GlobalConfig } from "payload";

/**
 * Editable copy for the home page. First representative "page copy" global;
 * additional per-page globals follow the same pattern. Seeded from
 * `siteConfig` in siteData.ts. Only prose lives here — all metrics/readiness
 * come from the automated pipeline, not the CMS.
 */
export const HomeContent: GlobalConfig = {
  slug: "home-content",
  admin: {
    description: "Home page hero and intro copy.",
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: "tagline", type: "text", admin: { description: "Hero tagline." } },
    { name: "intro", type: "textarea", admin: { description: "Intro paragraph under the hero." } },
  ],
};
