"use client";

import { useEffect, useState } from "react";
import { useLivePreview } from "@payloadcms/live-preview-react";

// Stable empty seed for useLivePreview. Must be a module-level constant so the
// hook's internal effect doesn't re-subscribe on every render.
const EMPTY_LIVE: Record<string, unknown> = {};

/**
 * Client-side page-copy reader for pages that are Client Components (and so
 * can't use the server-only getPageContent). It renders the provided defaults
 * immediately — which match the current wording, so there's no visible change
 * unless an editor has actually reworded something — then overlays edited copy
 * from two sources:
 *
 *  1. Saved values: fetched once from the public global API (`/api/globals/...`),
 *     so the live public site shows whatever editors have saved.
 *  2. Live Preview: when this page is rendered inside the Payload admin's Live
 *     Preview iframe, `useLivePreview` streams the editor's *unsaved* form state
 *     in real time (updates as they type, before Save). Outside the iframe no
 *     admin responds, so the live data stays empty and we use the saved values.
 *
 * Empty/cleared fields always fall back to the default, so a blanked field never
 * renders as empty on the public site.
 */
export function usePageCopy<T extends Record<string, unknown>>(
  slug: string,
  defaults: T,
): T {
  const [fetched, setFetched] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/globals/${slug}?depth=0`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data && typeof data === "object") {
          setFetched(data as Record<string, unknown>);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [slug]);

  // Real-time Live Preview. `data` starts as EMPTY_LIVE and is replaced with the
  // editor's merged (unsaved) form state only while inside the admin preview
  // iframe. On the public site it stays empty -> we use the fetched saved copy.
  const serverURL = typeof window !== "undefined" ? window.location.origin : "";
  const { data: live } = useLivePreview<Record<string, unknown>>({
    initialData: EMPTY_LIVE,
    serverURL,
    depth: 0,
  });

  const hasLive = live && Object.keys(live).length > 0;
  const source = hasLive ? live : fetched;

  const merged = { ...defaults };
  if (source) {
    for (const key of Object.keys(defaults) as (keyof T)[]) {
      const value = source[key as string];
      if (value != null && value !== "") merged[key] = value as T[keyof T];
    }
  }
  return merged;
}
