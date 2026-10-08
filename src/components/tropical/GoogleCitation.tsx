import { GOOGLE_CITATION_PARTS } from "@/lib/tropical/density";

/** Google Weather Lab's required citation (terms Section 4(b)), shown below
 * the map whenever the Google ensemble layer is on (Jeff, 2026-10-07). */
export function GoogleCitation() {
  return (
    <p className="mt-2 text-xs text-gray-500">
      {GOOGLE_CITATION_PARTS.before}
      <a className="underline" href={GOOGLE_CITATION_PARTS.url} target="_blank" rel="noreferrer">
        {GOOGLE_CITATION_PARTS.url}
      </a>
      {GOOGLE_CITATION_PARTS.after}
    </p>
  );
}
