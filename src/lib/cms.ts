/**
 * Server-only helpers to read CMS content from Payload, with graceful
 * fallbacks. If Payload is unavailable or a global hasn't been seeded, these
 * return null and callers fall back to the curated defaults in siteData.ts, so
 * the public site always renders (same philosophy as the SITREP overlay).
 *
 * Only import from Server Components / server code.
 */
import { getPayload } from "payload";
import config from "@payload-config";

export interface HomeContentData {
  heroHeading?: string | null;
  heroSubtext?: string | null;
}

export async function getHomeContent(): Promise<HomeContentData | null> {
  try {
    const payload = await getPayload({ config });
    return (await payload.findGlobal({ slug: "home-content" })) as HomeContentData;
  } catch {
    return null;
  }
}
