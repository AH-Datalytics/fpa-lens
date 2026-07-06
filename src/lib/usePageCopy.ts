"use client";

import { useState, useEffect } from "react";

/**
 * Client-side page-copy reader for pages that are Client Components (and so
 * can't use the server-only getPageContent). It renders the provided defaults
 * immediately — which match the current wording, so there's no visible change
 * unless an editor has actually reworded something — then fetches the page's
 * Payload global and overlays any non-empty edited values. Global read access
 * is public, so no auth is needed. Empty/cleared fields keep the default.
 */
export function usePageCopy<T extends Record<string, unknown>>(
  slug: string,
  defaults: T,
): T {
  const [copy, setCopy] = useState<T>(defaults);

  useEffect(() => {
    let active = true;
    fetch(`/api/globals/${slug}?depth=0`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data || typeof data !== "object") return;
        const merged = { ...defaults };
        for (const key of Object.keys(defaults) as (keyof T)[]) {
          const value = (data as Record<string, unknown>)[key as string];
          if (value != null && value !== "") merged[key] = value as T[keyof T];
        }
        setCopy(merged);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // defaults is a stable module-level const per page; slug identifies the global
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return copy;
}
