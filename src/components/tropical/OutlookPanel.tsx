"use client";

import { cdtTime, nextOutlookIssueTime } from "@/lib/tropical/format";
import { outlookParagraphs } from "@/lib/tropical/outlookText";

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

/**
 * Quiet-mode banner: status line, then the seven-day genesis outlook running
 * the full width of the strip. Full width on purpose — the prose is the only
 * substantial thing on the page between storms, and boxing it into a third of
 * the row made a tall narrow column of text beside two mostly-empty ones.
 */
export function OutlookPanel({ outlookText }: OutlookPanelProps) {
  const paragraphs = outlookText ? outlookParagraphs(outlookText.text) : [];

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <div className="flex items-center gap-2 text-lg font-semibold text-[#21355a]">
          <span
            className="h-2.5 w-2.5 rounded-full bg-green-500 animate-status-pulse"
            aria-hidden="true"
          />
          {/* "Gulf", not "systems", because that is the claim this panel can
              actually support. It renders whenever `mode` is not "active", and
              `mode` means "a storm is inside the Gulf box" -- NOT "a storm
              exists". A named Atlantic storm outside the box left this reading
              "No active systems" while that storm was live and fully loaded on
              the map. Still accurate in the ordinary case where nothing is
              spinning anywhere, and appropriately scoped for a Gulf authority. */}
          No active Gulf systems
        </div>
        {outlookText && (
          <span className="text-xs text-gray-500">
            Tropical weather outlook · issued {cdtTime(outlookText.issued)} · next update{" "}
            {nextOutlookIssueTime(outlookText.issued)}
          </span>
        )}
      </div>
      {paragraphs.length > 0 && (
        <div className="mt-2 max-w-5xl space-y-1.5 text-sm leading-relaxed text-gray-600">
          {paragraphs.map((paragraph, i) => (
            <p key={i}>{withBoldPercentages(paragraph)}</p>
          ))}
        </div>
      )}
    </div>
  );
}
