"use client";

import { cdtTime, nextOutlookIssueTime } from "@/lib/tropical/format";
import { outlookParagraphs } from "@/lib/tropical/outlookText";
import { Kicker } from "./Kicker";

export interface OutlookPanelProps {
  outlookText: { issued: string; text: string } | null;
}

// NHC's real Tropical Weather Outlook prose spells out "NN percent" (confirmed
// by the demo fixture's wording); also match a bare "NN%" defensively.
const PERCENT_RE = /(\d+\s*(?:%|percent))/gi;

function withBoldPercentages(text: string) {
  return text.split(PERCENT_RE).map((part, i) =>
    /^\d+\s*(?:%|percent)$/i.test(part) ? (
      <b key={i} className="font-semibold text-gray-900">
        {part}
      </b>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

/** Quiet-mode rail content: "no active systems" status + the 7-day genesis outlook prose. */
export function OutlookPanel({ outlookText }: OutlookPanelProps) {
  const paragraphs = outlookText ? outlookParagraphs(outlookText.text) : [];

  return (
    <>
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-[#21355a]">
          <span
            className="h-2.5 w-2.5 rounded-full bg-green-500 animate-status-pulse"
            aria-hidden="true"
          />
          No active systems
        </div>
        {outlookText && (
          <div className="mt-1.5 text-xs leading-relaxed text-gray-500">
            Tropical weather outlook · issued {cdtTime(outlookText.issued)} · next update{" "}
            {nextOutlookIssueTime(outlookText.issued)}
          </div>
        )}
      </div>
      {paragraphs.length > 0 && (
        <div className="border-b border-gray-200 py-4">
          <Kicker>Seven-day outlook</Kicker>
          <div className="space-y-2 text-sm leading-relaxed text-gray-600">
            {paragraphs.map((paragraph, i) => (
              <p key={i}>{withBoldPercentages(paragraph)}</p>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
