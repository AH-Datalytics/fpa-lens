# FPA Lens - Claude Code Instructions

## Project Overview
Dashboard for the Southeast Louisiana Flood Protection Authority (FPA). Built for AH Datalytics (AHD) with Regional Director Jeff Williams as the primary stakeholder.

## Dashboard Pages

### Staffing (/our-team)
- Removed individual recent hires (names/positions) -- too much detail for public dashboard
- Keep vacancy count (45) for now since that's all the data we have
- Revisit detail level when the Director provides more detailed staffing info

### Financial (/financial)
- Budget vs actuals is live. Refreshed from the Dashboard Reports `.xlsm` workbook Finance sends on a monthly (or quarterly) cadence.
- Current data: FY26 YTD through Feb 28, 2026.
- Projects are shown separately from O&M per the Director's direction, since project timing would otherwise distort the operational spending story.

### Engineering (/operations)
- Menu item, page title, and homepage card are all "Engineering" (renamed from "Operations" / "Operations & Maintenance" per the Director, Apr 2026). URL kept at `/operations` to avoid breaking external links.
- /operations/idiq is the IDIQ Contract Tracker. Landing intro, Key Takeaway callout, service micro-descriptions, process boxes, and teal accent bar (#2FA4A9) all follow the Director's mockup. KPI cards filter by the selected 2022/2025 contract cycle.
- LNO = Letter of No Objection (used in permit pipeline copy).

### Safety (/safety)
- FY26 YTD accident count on the headline card is sourced directly from the FPA Safety Officer (Jamal) rather than inferred from the calendar-year event logs, so the number stays aligned with the authoritative count.
- Multi-year/monthly charts are still calendar-year. Safety Officer is reviewing and reclassifying the 2022-2026 event logs, and may decide to switch the whole view to fiscal year going forward.
- "UNK" / "TBD" / "pending" values in the Recordable column are treated as not-an-accident by the extraction script.

### Grass Cutting (potential future feature)
- Ryan Foster (Dir. of Engineering) originally pitched a grass cutting progress map
- Reference: Jefferson Parish's canal grass maintenance map at canalgrassmaintenance.azurewebsites.us
- Jeff Williams loved the idea, forwarded to AHD. Not built yet, but on their radar.

## Lakefront Risk Feature

Merged to `main` and deployed. Lives on `/environmental`.

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
   - GIS Maps (ArcGIS): `orleanslevee.maps.arcgis.com` (login: gis_user17 / Franklin1)
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
