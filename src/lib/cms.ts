/**
 * Server-only helpers to read CMS content from Payload, with graceful
 * fallbacks. If Payload is unavailable or a document hasn't been seeded, these
 * fall back to the curated defaults in siteData.ts, so the public site always
 * renders (same philosophy as the SITREP overlay).
 *
 * Reads are wrapped in unstable_cache (revalidate 60s, tag "cms") so pages stay
 * fast/ISR; a future afterChange hook can call revalidateTag("cms") for instant
 * updates. Only import from Server Components / server code.
 */
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";
import config from "@payload-config";
import { staffingData, siteConfig } from "@/data/siteData";

const CACHE_OPTS = { revalidate: 60, tags: ["cms"] };

// ---------------------------------------------------------------------------
// Home content
// ---------------------------------------------------------------------------
export interface HomeContentData {
  heroHeading: string | null;
  heroSubtext: string | null;
}

export const getHomeContent = unstable_cache(
  async (): Promise<HomeContentData> => {
    try {
      const payload = await getPayload({ config });
      const g = await payload.findGlobal({ slug: "home-content" });
      return { heroHeading: g?.heroHeading ?? null, heroSubtext: g?.heroSubtext ?? null };
    } catch {
      return { heroHeading: null, heroSubtext: null };
    }
  },
  ["cms-home-content"],
  CACHE_OPTS,
);

// ---------------------------------------------------------------------------
// Staff members (falls back to the curated leadership list)
// ---------------------------------------------------------------------------
export interface StaffBioSection {
  heading: string;
  text: string;
}
export interface StaffPerson {
  name: string;
  title: string;
  image?: string;
  bio?: StaffBioSection[];
}

export const getStaffMembers = unstable_cache(
  async (): Promise<StaffPerson[]> => {
    try {
      const payload = await getPayload({ config });
      const res = await payload.find({
        collection: "staff-members",
        sort: "order",
        depth: 1,
        limit: 100,
      });
      if (!res.docs.length) return staffingData.leadership as StaffPerson[];
      // Fall back to the curated static headshot (public/headshots/*) when a
      // staff member has no uploaded CMS photo yet.
      const curatedImage = new Map(
        (staffingData.leadership as StaffPerson[]).map((l) => [l.name, l.image]),
      );
      return res.docs.map((d) => {
        const photo = d.photo;
        const uploaded =
          photo && typeof photo === "object" && photo.url ? photo.url : undefined;
        return {
          name: d.name,
          title: d.title,
          image: uploaded ?? curatedImage.get(d.name),
          bio: (d.bio ?? []).map((b) => ({ heading: b.heading, text: b.text })),
        };
      });
    } catch {
      return staffingData.leadership as StaffPerson[];
    }
  },
  ["cms-staff-members"],
  CACHE_OPTS,
);

// ---------------------------------------------------------------------------
// Site settings (footer address + contact)
// ---------------------------------------------------------------------------
export interface SiteSettingsData {
  street: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettingsData> => {
    const fallback: SiteSettingsData = {
      street: siteConfig.address.street,
      city: siteConfig.address.city,
      state: siteConfig.address.state,
      zip: siteConfig.address.zip,
      phone: "(504) 286-3100",
    };
    try {
      const payload = await getPayload({ config });
      const g = await payload.findGlobal({ slug: "site-settings" });
      return {
        street: g?.street || fallback.street,
        city: g?.city || fallback.city,
        state: g?.state || fallback.state,
        zip: g?.zip || fallback.zip,
        phone: g?.phone || fallback.phone,
      };
    } catch {
      return fallback;
    }
  },
  ["cms-site-settings"],
  CACHE_OPTS,
);

// ---------------------------------------------------------------------------
// Per-page copy globals (about-page, finance-page, etc.)
//
// Each page has a Payload global whose fields carry that page's editable
// prose, with `defaultValue` set to the current wording (so the admin form
// pre-fills and unsaved globals still return the text). Pages import their
// `*_DEFAULTS` for a resilient fallback and read live values via this helper.
// ---------------------------------------------------------------------------
export async function getPageContent<T = Record<string, unknown>>(
  slug: string,
): Promise<T | null> {
  return unstable_cache(
    async () => {
      try {
        const payload = await getPayload({ config });
        const found = await payload.findGlobal({
          slug: slug as Parameters<typeof payload.findGlobal>[0]["slug"],
        });
        return found as T;
      } catch {
        return null;
      }
    },
    [`cms-page-${slug}`],
    CACHE_OPTS,
  )();
}
