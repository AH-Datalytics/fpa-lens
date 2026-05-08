# FPA Lens - Claude Code Instructions

## Project Overview
Dashboard for the Southeast Louisiana Flood Protection Authority (FPA). Built for AH Datalytics (AHD) with Regional Director Jeff Williams as the primary stakeholder.

## Dashboard Pages

### Staffing (/staffing)
- Removed individual recent hires (names/positions) -- too much detail for public dashboard
- Keep vacancy count (45) for now since that's all the data we have
- Revisit detail level when the Director provides more detailed staffing info

### Financial (/finance)
- Budget vs actuals is live. Refreshed from the Dashboard Reports `.xlsm` workbook Finance sends on a monthly (or quarterly) cadence.
- Current data: FY26 YTD through Mar 31, 2026.
- Projects are shown separately from O&M per the Director's direction, since project timing would otherwise distort the operational spending story.

### Engineering (/engineering)
- Renamed from "Operations" / "Operations & Maintenance" per the Director, Apr 2026. URL was migrated from `/operations` to `/engineering` (Apr 2026); the old paths now 308-redirect via `next.config.ts` so external links keep working.
- /engineering/idiq is the IDIQ Contract Tracker. Landing intro, Key Takeaway callout, service micro-descriptions, process boxes, and teal accent bar (#2FA4A9) all follow the Director's mockup. KPI cards filter by the selected 2022/2025 contract cycle.
- LNO = Letter of No Objection (used in permit pipeline copy).

### Safety (/safety)
- Reporting period is calendar year (Jan 1 - Dec 31) per Director and Safety Officer direction, Apr 2026.
- Per Safety Officer (Jamal) Apr 2026 reclassification, each event's classification is encoded in the fill color of the Recordable cell:
  - Red (`FFFF0000`) = N/A → excluded from all metrics
  - Light blue (`FF00B0F0`) = No-Fault → counted in totals only; excluded from performance metrics and the YoY accident chart
  - No fill = At-Fault → if Recordable=Yes it's an OSHA-recordable accident (the headline performance metric), otherwise it's an at-fault property-damage event
- Property-damage-only events are excluded from the YoY accident chart per Jamal's recommendation, but are surfaced in their own cards (FPA damage, private damage) and the YoY table.
- Updated event logs arrive monthly from the Safety Officer; re-run `python3 scripts/extractSafetyData.py` to refresh `public/data/safety-events.json`.

### Turf Maintenance (/infrastructure/turf-maintenance)
- Built out May 2026. Covers all three levee districts: Orleans (OLD, 6 zones, 1,620 ac), East Jefferson (EJLD, 4 zones, 660 ac), and Lake Borgne Basin (LBBLD, 4 zones, 1,353 ac). 3,633 acres / 14 zones total.
- Page leads with the maintenance plan (Jeff's verbiage: "SLFPA-East maintains 3,633 acres of levee turf across 14 zones in three levee districts. Mowing targets vary by zone... This dashboard shows monthly progress against those targets using a simple Green / Amber / Red status"), then a district filter that scopes both the map and the per-zone cards below it. Default filter is OLD. The old "Cycle 1 complete" status strip + per-district zoneCount cards were removed in May 2026 once OLD started logging Cycle 2 — per-zone Green/Amber/Red is now the single source of truth.
- Per-zone cards (redesigned May 2026, second pass per Director feedback): focus on a single question — *how much of the monthly cutting goal has been completed?* Header shows acres, cycles/mo, and the monthly target. Body shows a Reach list (renamed from "Coverage") with per-reach acreage, then a single progress bar headlined "X of Y acres completed this month" with a Cycle 1 tick mark and a Green/Amber/Red badge. Projection math, acres-per-day pace, Cycle 1 dates, and working-day counts are all hidden. Zones with no reported actuals show an "Awaiting weekly update" gray state.
- Data model (`src/data/grassCutting.ts`): each zone carries `reaches: Reach[]` (name, acres, `cycle1Pct`, `cycle2Pct`) and `hasReportedData: boolean`. `cycle1Pct`/`cycle2Pct` are cumulative percent-complete from the maintenance team's weekly workbook (max value across the month's weeks per cycle). `cycle2Pct` is `null` for 1×/mo zones (LBBLD). A `reportingMonth` field on `grassCuttingData` (`{ label, year, month, isComplete }`) drives the period the cards report against.
- KPI helpers (`src/lib/turfMaintenance.ts`):
  - `monthlyTargetAcres = zone.acres × monthlyFrequency`
  - `monthAcresDone = Σ reach.acres × (cycle1Pct + (cycle2Pct ?? 0))`
  - `computeMonthlyKpi`: when `reportingMonth.isComplete`, level is set on raw `done/target`. When the month is in flight, level is pace-adjusted by `done / (elapsedFraction × target)`. Thresholds: Green ≥ 90%, Amber 80–89%, Red < 80% (Director confirmed May 7, 2026).
  - `cycle1TickPosition = 1 / monthlyFrequency`, returns `null` for 1×/mo (no intermediate tick — the bar *is* the cycle). Director confirmed May 7, 2026.
- Source data:
  - GIS shapefiles from Kory at FPA: `data/sources/shapefiles/{OLD,EJLD,LBBLD}_{Centerline,Mowing_Area}.*`
  - Weekly C1/C2 percentages now flow from the **FPA Turf Maintenance Input Template** (Jeff's Excel workbook with Orleans / East Jefferson / Lake Borgne Basin tabs), columns G/J/M/P/S = weekly C1 % and H/K/N/Q/T = weekly C2 % across up to five week-ending columns. Per Director (May 2026), updated weekly and submitted Mondays for the prior week. The legacy "New Cutting Plan 2026" / "Mileage log" tabs are no longer the source of truth for percentages, only for the Cycle 1 historic dates carried in `oldCycle1` / `ejldCycle1` / `lbbldCycle1` summaries.
- Refresh GIS: `node scripts/convertShapefiles.mjs` regenerates `public/data/{old,ejld,lbbld}-{centerline,mowing-areas}.json`
- Per-reach acreages and per-month cycle percentages are hand-entered in `src/data/grassCutting.ts` from the input-template workbook. Current values reflect April 2026 finals as of the May 7 input template:
  - OLD reaches: most at C1=1.0/C2=1.0; LPV-115 (Citrus Back, Paris Rd. Bridge to Jourdan) at C2=0.75; Outfall Canals at C2=0; IHNC East (E-13 to N-01) at C1=0/C2=1 (data entry oddity from the workbook, kept as-is).
  - LBBLD reaches at C1=1.0/C2=null (1×/mo target met).
  - EJLD all four zones at C1=1.0/C2=1.0 — Jeff confirmed verbally May 8, 2026 ("all zones in EJ was cut twice in April").
- Reporting period: stays on **April 2026** until next week's data drop (per Jeff's May 7 reply: "we can wait until next week to change the reporting period... You should receive two weeks of data next week, which should give us a cleaner starting point for May"). Going forward the rollover rule is: flip to the new month at the end of the first reporting week of that month, once the newest weekly data is received.
- Outstanding:
  - **EJLD cadence confirmation**: all four EJLD zones currently assumed 2×/mo; Jeff confirming with team Monday (May 11, 2026).
  - **Lakefront & Outfall Canals (OLD)**: Outfall Canals reach currently rendered at C2=0 per the May 7 input template. Jeff said May 8, 2026 that Lavell verbally told him it was completed in April; awaiting confirmation from Carlos and Lavell before flipping to C2=1.0.
  - **Reach Count column**: Jeff said the column is no longer important and he'll remove it from the template — ignore.
  - **LBBLD spreadsheet target = 2×/mo**: the May 7 input template shows "Target Cycles / Month = 2" for all four LBBLD zones. We render LBBLD as 1×/mo per Jeff's prior direction (manpower constraints). The mismatch is likely a template default; do not change LBBLD cadence without explicit confirmation.
  - **LPV-115 in the spreadsheet**: Carlos confirmed (May 2026) LPV-115 / Paris Rd. to Jourdan is Citrus Back Levee, mowed 2×/mo (4 working days w/ 4 operators). Polygon is folded into "Southside MRGO & Citrus Back" and the +122 ac is in the zone total (185 → 307 ac). Maintenance team still needs to start logging LPV-115 in the input template (currently rolled up under the Citrus Back Levee row).
  - **Florida Ave acreage override**: `ACREAGE_OVERRIDES` in `convertShapefiles.mjs` patches the S1 to Bienvenue polygon down to 2.6 ac (Kory confirmed the 185.6 ac value was an erroneous duplicate). Drop the override block once Kory ships an updated OLD shapefile with the fix baked in.
- Origin: Ryan Foster (Dir. of Engineering) pitched the grass cutting progress map idea; reference was Jefferson Parish's canal grass maintenance map at canalgrassmaintenance.azurewebsites.us. Director Jeff Williams loved it and forwarded to AHD, which is what kicked off this feature.

## Lakefront Risk Feature

Merged to `main` and deployed. Lives on `/environment`.

### Director Feedback (March 2026)
From Regional Director Jeff Williams. Chief Rondeno looped in and tasked with gathering historical closure log.

1. **Wind persistence/duration**: Duration of sustained winds matters as much as speed. Wind setup develops over hours, not instantly. Current engine only checks instantaneous speed. Need backward-looking duration check (sustained onshore winds above threshold for X hours before escalating). NOAA gives 6-min intervals so we have the data.

2. **Segment sensitivity**: Franklin area of Lakeshore Drive is most sensitive and floods first. Start with system-wide indicator (what we built), consider segment-based refinement over time. No action needed now.

3. **Over-sensitivity at yellow**: Must avoid triggering yellow on routine north wind events. If yellow fires too often, operations will ignore it. 15 kt threshold may need to be higher, or gated by duration factor. Historical backtesting will tell us how many days per winter would have been yellow.

4. **Canal gauges as secondary reference**: Director wants canal gauges (17th Street, Orleans Ave, London Ave outfall canals) included. These drain directly into Pontchartrain from the south, so they're where wind setup shows up first. Approach: display as corroboration/validation of risk level, NOT inputs to the risk algorithm. Show a "Canal Conditions" card on environmental page (prominent at YELLOW+) with current levels relative to normal range.

   **Research finding:** USGS does NOT have active gauge height stations on the three outfall canals. These are managed infrastructure (USACE pump stations + closure structures). Monitoring is done by **Army Corps of Engineers (USACE)** via their own gauge network (8 gauges per canal, reported through rivergages.com). Director likely meant "federal gauges" generally, not USGS specifically. Nearest relevant USACE station: **85625** "Lake Pontchartrain at West End" (near 17th St Canal mouth). Unclear if USACE rivergages has a clean programmatic API.

   **What operations actually uses (from Kaz's EOC email, Nov 2025):**
   - Depth gauge page: `info.floodauthority.org/gages.htm`
   - Alert stages: `info.floodauthority.org/alertstages.htm`
   - CIMS Floodgate Viewer (CPRA): `cims.coastal.louisiana.gov/Viewer/Map.aspx`
   - GIS Maps (ArcGIS): `orleanslevee.maps.arcgis.com` (shared FPA login; see Director or Engineering for credentials)
   - Windy displays, hurricane tracking, radar on info.floodauthority.org
   - SCADA (pump station controls): internal only, NOT public

   **USGS gauges they already monitor** (from depth gage page):
   - Surge Barrier flood/protected side: **073802339**
   - Seabrook flood/protected side: **073802332** (Pontchartrain meets IHNC -- best candidate for wind-driven lake level reference)
   - Bayou Dupre flood/protected side: **073745235**
   - Caernarvon flood/protected side: **073745245**
   - Mississippi River at Carrollton: **07374510**
   - Mississippi at Bonnet Carre: **07374370**
   - NOAA: Bayou Bienvenue, Lakefront Airport

   **Still need to confirm with Director:** Whether they want these specific structure gauges on our page, or if the "canal gauges" request was something different.

5. **Wind direction range confirmed**: NW-N-NE (315-045 degrees) aligns with their understanding of onshore conditions.

6. **Threshold validation**: Proposed thresholds (15/25/35 kt wind, 0.5/1.0/1.5 ft surge) accepted as starting points. Historical backtesting will calibrate.

7. **Historical closure log**: Chief Rondeno's team gathering data. ~10-15 events since Nov/Dec 2025, mix of rain/drainage and cold front closures. Cold front events most relevant for calibration.

### Completed Implementation
- Core risk engine with 4-tier system (GREEN/YELLOW/ORANGE/RED)
- Wind duration gating: YELLOW and ORANGE require 70% sustained onshore winds over 3-hour window (~2.1 hrs effective). RED triggers immediately. Falls back to instantaneous-only if wind history unavailable.
- Environmental page shows persistence info in wind card and threshold table footnote
- All methodology documented in JSDoc comments in lakefrontRisk.ts
- **Split wind/water charts**: Separate stacked charts sharing same time axis
- **Configurable observed window**: Time range selector (6h/12h/24h/48h/72h) re-fetches API with `?range=N`. Default 24h observed + 2-day forecast. Auto-scaling thinning per range.
- **Chart controls**: PNG download, CSV download, date-annotated X-axis, threshold annotations
- **Forecast snapshot storage** (`src/lib/forecastStore.ts`): Saves first-seen forecast per target hour to `data/forecast-history.json`. 7-day retention. Toggle to overlay original forecast over observed data. Both "first seen" (~48h lead) and `forecast24h` (22-26h lead) strategies stored.
- **Structure gauges**: Seabrook, Surge Barrier, Bayou Dupre from USGS. Fixed `parseFloat("0.00") || null` bug.
- **Water chart**: Title shows "Water Level at New Canal Station". Source includes MLLW datum explanation.
- **Timezone handling**: `parseCentralTimestamp()` correctly tags NOAA timestamps with CDT/CST offset.

### Next Steps
1. **Historical backtesting**: Once Chief Rondeno's closure log arrives (~10-15 events), pull NOAA historical data for each cold front event and test current thresholds + duration gating. Adjust as needed.
2. **Canal gauges**: Add as secondary corroboration. Blocked on confirming data source with Director's team. Ask what they actually watch.
3. **Segment sensitivity**: Franklin area floods first. System-wide indicator fine for now; segment-based refinement is future consideration.
4. **Yellow sensitivity tuning**: After backtesting, may raise 15 kt threshold or tighten duration if yellow fires too often.
5. **Forecast storage on Vercel**: KV set up. Cron hits `/api/cron/collect-forecasts` every 5 min. Dashboard setup needed: create KV store, link to project, add `CRON_SECRET` env var.
6. **Verify forecast overlay**: Check stored data for `leadTimeHours` clustering. Compare first-seen vs forecast24h accuracy. Wide spread in leadTimeHours = server restarts creating inconsistent baselines, making forecast24h the more reliable comparison.
