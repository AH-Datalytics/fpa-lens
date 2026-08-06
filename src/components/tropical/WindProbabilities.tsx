"use client";

import { findPoint, NEW_ORLEANS_POINT, otherPoints, pointLabel } from "@/lib/tropical/probs";
import type { ProbsEntry } from "@/lib/tropical/types";
import { CARD_CLASS } from "./Card";
import { Kicker } from "./Kicker";

export interface WindProbabilitiesProps {
  /** storms/{id}/probs.json for the selected storm. `null` while loading (or
   *  if the fetch failed); an empty array is a normal, loaded "no matching
   *  points this advisory" result. */
  probs: ProbsEntry[] | null;
}

/** One labelled probability bar. */
function ProbBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs text-gray-500">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <strong className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900">
        {value}%
      </strong>
    </div>
  );
}

/**
 * Rail hero section — full-period (120h) chance of tropical-storm-force and
 * hurricane-force winds at New Orleans, plus a small table of nearby points
 * (Grand Isle, Houma, Slidell, Gulfport) when the PWS text product carries
 * them. Most advisories won't include every point — that's expected, not an
 * error (see ingest/gulfwatch/probs.py).
 */
export function WindProbabilities({ probs }: WindProbabilitiesProps) {
  if (probs === null) {
    return (
      <div className={CARD_CLASS}>
        <Kicker>Wind probability</Kicker>
      </div>
    );
  }

  const nola = findPoint(probs, NEW_ORLEANS_POINT);
  const others = otherPoints(probs);

  return (
    <div className={CARD_CLASS}>
      <Kicker>Wind probability</Kicker>
      {nola ? (
        <>
          <div className="mb-2.5 text-xs text-gray-500">New Orleans · next 5 days</div>
          <div className="space-y-2">
            <ProbBar label="≥ 39 mph" value={nola.ts34} color="bg-[#2f6fae]" />
            <ProbBar label="≥ 74 mph" value={nola.hurricane64} color="bg-[#c0392b]" />
          </div>
        </>
      ) : (
        <p className="text-sm leading-relaxed text-gray-600">
          Wind probability data isn&apos;t available for New Orleans on this advisory.
        </p>
      )}
      {others.length > 0 && (
        <details className="group mt-3">
          <summary className="cursor-pointer list-none text-xs font-medium text-[#21355a] hover:underline">
            <span className="inline-block transition-transform group-open:rotate-90">▸</span> Wind
            chances at nearby locations
          </summary>
          <table className="mt-2 w-full text-xs">
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
