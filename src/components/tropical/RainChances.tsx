import { rainRow } from "@/lib/tropical/rain";
import type { RainSummary } from "@/lib/tropical/types";

/** New Orleans rain, next 3 days: WPC's middle estimate with its 10th-90th
 * percentile range, styled to sit under the wind chances. */
export function RainChances({ rain }: { rain: RainSummary }) {
  const row = rainRow(rain);
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2" title={row.help}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#21355a]">
        New Orleans rain
        <span className="ml-1.5 font-normal normal-case tracking-normal text-gray-500">next 3 days</span>
      </span>
      <span className="flex items-baseline gap-2">
        <span className="whitespace-nowrap text-xs text-gray-600">Middle estimate</span>
        <strong className="text-sm font-semibold tabular-nums text-gray-900">{row.middle}</strong>
      </span>
      <span className="flex items-baseline gap-2">
        <span className="whitespace-nowrap text-xs text-gray-600">Range</span>
        <strong className="text-sm font-semibold tabular-nums text-gray-900">{row.range}</strong>
      </span>
    </div>
  );
}
