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
- Built out May 2026. Covers all three levee districts: Orleans (OLD, 6 zones, ~1,507 ac), East Jefferson (EJLD, 4 zones, ~660 ac), and Lake Borgne Basin (LBBLD, 4 zones, ~1,353 ac). ~3,520 acres / 14 zones total.
- Page leads with the maintenance plan (twice-monthly mowing, doubled from prior monthly schedule starting Mar 2026), a "Cycle 1 complete" status strip with per-district summaries, then a district filter that scopes both the map and the per-zone cards below it. Default filter is OLD.
- Source data:
  - GIS shapefiles from Kory at FPA: `data/sources/shapefiles/{OLD,EJLD,LBBLD}_{Centerline,Mowing_Area}.*`
  - Cycle 1 dates from Carlos's "New Cutting Plan 2026" spreadsheet, three tabs: "Mileage log OLD", "Mileage log EJLD", "Mileage log LBBLD"
- Refresh GIS: `node scripts/convertShapefiles.mjs` regenerates `public/data/{old,ejld,lbbld}-{centerline,mowing-areas}.json`
- Per-zone Cycle 1 dates and comments are hand-entered in `src/data/grassCutting.ts` (keyed by zone).
- Outstanding:
  - **LPV-115 / Paris Rd. to Jourdan (~122 ac)**: in OLD's mowing-area shapefile but not on the original cutting plan. Renders as a light purple dashed "Pending classification" footprint until Carlos confirms whether it's mowed and at what cadence.
  - **Florida Ave acreage override**: `ACREAGE_OVERRIDES` in `convertShapefiles.mjs` patches the S1 to Bienvenue polygon down to 2.6 ac (Kory confirmed the 185.6 ac value was an erroneous duplicate). Drop the override block once Kory ships an updated OLD shapefile with the fix baked in.
  - **Cycle 2 schedule**: not yet wired up. Format and cadence for ongoing cycle reporting (same spreadsheet vs. SITREP line vs. something else) is still being confirmed with the maintenance team.
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
