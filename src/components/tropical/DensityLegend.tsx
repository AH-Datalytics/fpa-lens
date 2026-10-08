import {
  DENSITY_BANDS,
  DENSITY_DISCLAIMER,
  densityCaption,
  densitySummary,
  ECMWF_CREDIT,
  GOOGLE_CITATION_PARTS,
} from "@/lib/tropical/density";
import type { DensityProduct, DensitySource } from "@/lib/tropical/types";

/** Color key for the drawn track density. The explanation, disclaimer and
 * ECMWF credit sit behind a collapsed "Details" toggle (Jeff, 2026-10-07) so
 * the box stays small over the map. Google's citation stays visible: its
 * terms require it whenever its layer is shown. */
export function DensityLegend({ source, product }: { source: DensitySource; product: DensityProduct }) {
  return (
    <div className="absolute left-2 top-14 z-10 w-[min(20rem,calc(100%-1rem))] sm:left-3 sm:top-3 rounded-md bg-white/90 px-2.5 py-2 text-[10px] leading-snug text-gray-700 shadow">
      <div className="flex h-2.5 overflow-hidden rounded-sm" aria-hidden="true">
        {DENSITY_BANDS.map((band) => (
          <span key={band.from} className="flex-1" style={{ backgroundColor: band.color }} />
        ))}
      </div>
      <div className="mt-0.5 flex justify-between text-[9px] text-gray-500">
        <span>5%</span>
        <span>50%</span>
        <span>90%+</span>
      </div>
      <details className="group mt-1">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-2">
          <span>{densitySummary(source, product)}</span>
          <span className="shrink-0 font-medium text-[#21355a] group-open:hidden">Details</span>
          <span className="hidden shrink-0 font-medium text-[#21355a] group-open:inline">Hide</span>
        </summary>
        <p className="mt-1">{densityCaption(source, product)}</p>
        <p className="mt-0.5 text-gray-500">{DENSITY_DISCLAIMER}</p>
        {(source === "ecmwf" || source === "aifs") && <p className="mt-1 text-[9px] text-gray-500">{ECMWF_CREDIT}</p>}
      </details>
      {source === "google" && (
        <p className="mt-1 text-[9px] text-gray-500">
          {GOOGLE_CITATION_PARTS.before}
          <a className="underline" href={GOOGLE_CITATION_PARTS.url} target="_blank" rel="noreferrer">
            {GOOGLE_CITATION_PARTS.url}
          </a>
          {GOOGLE_CITATION_PARTS.after}
        </p>
      )}
    </div>
  );
}
