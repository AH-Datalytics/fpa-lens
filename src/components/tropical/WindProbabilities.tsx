"use client";

import { findPoint, NEW_ORLEANS_POINT, otherPoints, pointLabel } from "@/lib/tropical/probs";
import type { ProbsEntry } from "@/lib/tropical/types";

export interface WindProbabilitiesProps {
  /** storms/{id}/probs.json for the selected storm. `null` while loading (or
   *  if the fetch failed); an empty array is a normal, loaded "no matching
   *  points this advisory" result. */
  probs: ProbsEntry[] | null;
}

/** Threshold, bar and percentage on one line. */
function ProbBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="whitespace-nowrap text-xs text-gray-600">{label}</span>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <strong className="text-sm font-semibold tabular-nums text-gray-900">{value}%</strong>
    </div>
  );
}

/**
 * Chance of tropical-storm-force and hurricane-force winds at New Orleans over
 * the full 120-hour period, plus nearby points behind a disclosure when the
 * PWS product carries them. Most advisories won't include every point — that's
 * expected, not an error (see ingest/gulfwatch/probs.py).
 *
 * Laid out as one inline run so it costs a line of the storm banner rather
 * than a column of its own.
 */
export function WindProbabilities({ probs }: WindProbabilitiesProps) {
  if (probs === null) return null;

  const nola = findPoint(probs, NEW_ORLEANS_POINT);
  const others = otherPoints(probs);

  if (!nola) {
    return (
      <span className="text-xs text-gray-500">
        Wind probabilities aren&apos;t available for New Orleans on this advisory.
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#21355a]">
        New Orleans wind chances
        <span className="ml-1.5 font-normal normal-case tracking-normal text-gray-500">
          next 5 days
        </span>
      </span>
      <ProbBar label="≥ 39 mph" value={nola.ts34} color="bg-[#2f6fae]" />
      <ProbBar label="≥ 74 mph" value={nola.hurricane64} color="bg-[#c0392b]" />
      {others.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none text-xs font-medium text-[#21355a] hover:underline">
            <span className="inline-block transition-transform group-open:rotate-90">▸</span> Nearby
          </summary>
          <table className="mt-2 w-full min-w-[18rem] text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-1 font-medium">Nearby</th>
                <th className="py-1 text-right font-medium">TS force</th>
                <th className="py-1 text-right font-medium">50+ mph</th>
                <th className="py-1 text-right font-medium">Hurricane</th>
              </tr>
            </thead>
            <tbody>
              {others.map((p) => (
                <tr key={p.point} className="border-b border-gray-100 last:border-b-0">
                  <td className="py-1 text-gray-700">{pointLabel(p.point)}</td>
                  <td className="py-1 text-right tabular-nums text-gray-900">{p.ts34}%</td>
                  <td className="py-1 text-right tabular-nums text-gray-900">{p.kt50}%</td>
                  <td className="py-1 text-right tabular-nums text-gray-900">{p.hurricane64}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}
