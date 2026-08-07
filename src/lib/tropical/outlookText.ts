// Pure text-shaping for the seven-day Tropical Weather Outlook prose shown in
// quiet mode — which is what the page displays for most of the year, so it's
// the copy most visitors actually read.
//
// The NHC serves this product as raw teletype. A live outlook.json body looks
// like:
//
//   000
//   ABNT20 KNHC 061139
//   TWOAT
//
//   Tropical Weather Outlook
//   NWS National Hurricane Center Miami FL
//   800 AM EDT Thu Aug 6 2026
//
//   For the North Atlantic...Caribbean Sea and the Gulf of America:
//
//   Tropical cyclone formation is not expected during the next 7 days.
//
//   $$
//   Forecaster Reinhart
//
// The WMO/AWIPS transmission header, the product title block, and the
// forecaster sign-off are transmission plumbing, not content — and the page
// already shows the issuance time in its own line above this prose. Only the
// narrative survives.

import { splitParagraphs } from "./discussion";

/** "000 ABNT20 KNHC 061139 TWOAT" — the WMO/AWIPS transmission header, once
 *  splitParagraphs has collapsed its three lines into one. The leading "000"
 *  and the AWIPS product code are both optional across NHC products. */
const TRANSMISSION_HEADER_RE = /^(\d{3}\s+)?[A-Z]{4}\d{2}\s+[A-Z]{4}\s+\d{6}\b/;

/** "Tropical Weather Outlook / NWS National Hurricane Center Miami FL / 800 AM
 *  EDT Thu Aug 6 2026" — the product's own title block. */
const TITLE_BLOCK_RE = /^Tropical Weather Outlook\b/i;

/** "$$" on its own line, followed by the forecaster's name. */
const SIGNOFF_RE = /^\${2}/;

/**
 * The outlook's narrative paragraphs only. Returns `[]` for text that is
 * entirely plumbing, so callers can fall back rather than render an empty box.
 *
 * Already-clean prose (the committed demo fixture, for instance) passes
 * through untouched — every rule here matches a specific NHC framing line, not
 * "the first paragraph", so nothing real is ever dropped.
 */
export function outlookParagraphs(text: string): string[] {
  return splitParagraphs(text).filter(
    (paragraph) =>
      !TRANSMISSION_HEADER_RE.test(paragraph) &&
      !TITLE_BLOCK_RE.test(paragraph) &&
      !SIGNOFF_RE.test(paragraph)
  );
}
