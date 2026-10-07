import { DENSITY_BANDS, DENSITY_DISCLAIMER, densityCaption, GOOGLE_CITATION_PARTS } from "@/lib/tropical/density";
import type { DensityProduct, DensitySource } from "@/lib/tropical/types";

/** Color key and caption for the drawn track density. Google's citation is
 * required by its terms whenever its layer is shown. */
export function DensityLegend({ source, product }: { source: DensitySource; product: DensityProduct }) {
  return (
    <div className="absolute bottom-6 left-2 z-10 w-[min(20rem,calc(100%-1rem))] rounded-md bg-white/90 px-2.5 py-2 text-[10px] leading-snug text-gray-700 shadow">
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
      <p className="mt-1">{densityCaption(source, product)}</p>
      <p className="mt-0.5 text-gray-500">{DENSITY_DISCLAIMER}</p>
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
