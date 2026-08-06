"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { discussionParagraphs } from "@/lib/tropical/discussion";
import { cdtTime } from "@/lib/tropical/format";
import type { TextProduct } from "@/lib/tropical/types";

export interface ForecastDiscussionProps {
  discussion: TextProduct | null;
  onClose: () => void;
}

/** Full NHC technical discussion shown as a dedicated map pop-out. */
export function ForecastDiscussion({ discussion, onClose }: ForecastDiscussionProps) {
  const paragraphs = useMemo(
    () => (discussion ? discussionParagraphs(discussion.text) : []),
    [discussion]
  );

  if (!discussion || paragraphs.length === 0) return null;

  return (
    <section
      className="absolute inset-x-3 bottom-3 top-3 z-20 flex max-w-lg flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl sm:inset-y-4 sm:left-4"
      role="dialog"
      aria-labelledby="forecast-discussion-title"
    >
      <header className="flex items-start justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#21355a]">
            National Hurricane Center
          </div>
          <h2 id="forecast-discussion-title" className="text-base font-semibold text-gray-900">
            Forecast discussion
          </h2>
          <span className="text-xs text-gray-500">Issued {cdtTime(discussion.issued)}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close forecast discussion"
          className="rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="space-y-3 overflow-y-auto px-4 py-3 text-sm leading-relaxed text-gray-700">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
