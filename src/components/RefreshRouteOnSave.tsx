"use client";

import { RefreshRouteOnSave as PayloadRefreshRouteOnSave } from "@payloadcms/live-preview-react";
import { useRouter } from "next/navigation";

/**
 * When the site is shown inside the Payload admin's Live Preview iframe, this
 * refreshes the route as soon as an editor saves, so the preview reflects the
 * change instantly. It's inert on the normal public site (no Payload parent).
 */
export function RefreshRouteOnSave() {
  const router = useRouter();
  // postMessage needs a valid target origin; same-origin admin <-> site.
  const serverURL = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <PayloadRefreshRouteOnSave refresh={() => router.refresh()} serverURL={serverURL} />
  );
}

export default RefreshRouteOnSave;
