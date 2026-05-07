Subject: Turf Maintenance redesign — what we updated, and a few questions before the rebuild

Hi Jeff (cc Lavell, Angel, Kory),

Thanks for the call and the email chain on the Turf Maintenance redesign. I want to (1) summarize what we already pushed to the dashboard from your, Lavell's, Angel's, and Kory's notes, (2) lay out how I'm planning to rebuild the zone cards per your direction, and (3) flag a handful of open questions so we can lock the design before we ship the new view.

## What we just updated on the live page

Data corrections from this email thread, all live now:

- **Lake Borgne Basin** is now reflected as **once per month** across all four zones, per your call with Angel. The cadence copy on the page calls this out.
- **New Orleans East**: LPV-110 removed from the reach list (Lavell — railroad gate N-06 only).
- **Upper Protection**: total acreage updated from 62 to 53 ac per Kory's revised shapefile, and split into the two reaches Lavell defined (Earhart Blvd → MRL, plus MRL Jefferson Parish line → EB-00). The MRL section east of the IHNC has been moved into the Florida Ave zone.
- **Florida Ave**: now shows three reaches — Florida Ave, IHNC East (E-01 → MRL), and MRL (IHNC East → St. Bernard Parish line). Zone total stays at 57 ac.
- **LBBLD Non-Federal Back Levee / 40 Arpent**: collapsed to a single reach (Orleans Parish line → HWY 46 Reggio in lower St. Bernard) per Angel's correction.
- "Coverage" rename to "Reaches" is queued; it ships with the card redesign below.

## How we're planning to rebuild the zone card

Per your guidance, the public-facing zone card will focus on one question — *how much of the monthly cutting goal has been completed* — and hide the projection math from the reader.

Each card will show:
- **Headline metric**: "X of Y acres completed this month" (e.g. 360 of 600).
- **Single progress bar** filling left to right with cumulative acres completed against the monthly target, with a small **tick mark** indicating where Cycle 1 should land.
- **Green / Amber / Red KPI badge** computed behind the scenes — no acres-per-day or projection language shown.
- **Reaches** list (renamed from Coverage), with each reach's name and acreage.

The maintenance-team workbook you and Lavell are circulating becomes the weekly input source. Each Thursday's cumulative C1 / C2 percentages feed monthly progress automatically.

## Questions we need answered before we build the new card

A handful of these decisions drive the math behind the badge and the bar, so I want your call before I start in earnest.

**1. Green / Amber / Red thresholds for monthly progress.** Other dashboard cards use ≥90% Green / 80–89% Amber / <80% Red. Want us to mirror those, or pick something else for turf?

**2. Pace-adjusted vs. raw progress.** "Behind on schedule" only means something relative to where we should be on a given day. We can either (a) show raw progress against the monthly target — which always looks red on day 5 and green on day 30 — or (b) compare progress to where we should be by today's date. Option (b) is what the current page does behind the scenes, and I think it matches your intent. Confirm?

**3. Cycle 1 tick mark for non-2×/month zones.**
- 2× / month zones: tick at 50% (Cycle 1 = half the monthly target).
- 1.5× / month zones (NO East, Citrus Lakefront): tick at ~67%.
- 1× / month zones (all of LBBLD): no intermediate tick — the full bar **is** the cycle.

OK with that?

**4. Reporting period rollover.** The April workbook is done. When we open May, I'll switch the dashboard to display May progress and archive April. Is the convention to roll over on the first Monday of the month, or on the calendar 1st? And will Lavell/Angel send a single workbook each month or copy a fresh one?

**5. Florida Ave reach count.** Lavell's spreadsheet lists the new MRL piece as a third reach but the "Reach Count" column reads 2. We're treating it as 3 (10 + 21 + 26 = 57 ac). Confirm?

**6. EJLD cadence.** All EJLD zones are still set to twice per month based on the original plan. Given LBBLD's revision, we want to re-confirm with EJLD's foreman before the new view goes live.

**7. EJLD April actuals.** We don't have weekly C1 / C2 percentages from EJLD in the input template yet — only structure. Who's the right person to ask for the April update so we can backfill the new card?

Once we have answers on (1) through (3), we can build and review with you before the public-facing card flips. Items (4) through (7) we can chase in parallel.

Thanks again,

Oscar
