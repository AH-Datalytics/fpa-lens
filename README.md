# The FPA Lens

Public transparency dashboard for the Southeast Louisiana Flood Protection Authority - East (SLFPA-E). Built with Next.js, TypeScript, and Tailwind CSS. Deployed on Vercel.

## Pages

| Route | Description |
|---|---|
| `/` | Homepage with readiness gauge cards, KPIs, and quick links |
| `/infrastructure` | Infrastructure page: interactive map, "System We Manage" table (per-district), 7 infrastructure readiness cards graded against straight-line monthly progress, real-time alerts |
| `/infrastructure/turf-maintenance` | Turf Maintenance page: 3,633 acres across 14 zones in three levee districts (OLD, EJLD, LBBLD), with district filter, interactive map, system-wide on-pace badge, and per-zone Green/Amber/Red monthly progress |
| `/engineering` | Engineering: permits, inspections, valve exercises, PCCP repairs, maintenance activities |
| `/engineering/idiq` | IDIQ Contract Tracker: 2022 and 2025 cycles, service categories with micro-descriptions, firm-level utilization |
| `/safety` | Accident/incident trends, events by category, lost time tracking. FY26 YTD accident count sourced from Safety Officer |
| `/finance` | FY26 budget by category/district, budget vs actuals (monthly YTD refresh), capital projects |
| `/staffing` | Staffing: leadership, headcount, vacancies, department status |
| `/environment` | Real-time lakefront flood risk indicator with KNEW fallback wind source (see below) |
| `/protection` | Infrastructure Protection Operations: 24/7 field protection of the flood system, activity stats, JP pump-theft anecdote |
| `/about/what-we-do` | About Us: organization overview |

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Project Structure

```
src/
  app/                    # Next.js App Router pages
    api/lakefront/        # Server-side API route for real-time environmental data
  components/             # Shared components (DataCard, KPICard, Header, Footer, etc.)
  data/siteData.ts        # Central data file for most pages
  lib/                    # Pure logic modules (lakefrontRisk.ts risk engine)
public/data/              # JSON data files loaded at runtime
scripts/                  # Data extraction scripts (Python, Node.js)
data-sources/             # Raw source files (Excel, KMZ, shapefiles, SITREPs)
```

---

## Data Sources and Update Guide

This section documents where each piece of data on the site comes from and how to update it. This is the reference for ongoing maintenance.

### Overview

The site pulls from four types of source data:

1. **Monthly SITREPs** (Regional Director's Situation Report) - primary source for most operational data
2. **Budget spreadsheets** (FY budget summary from Finance) - annual budget data
3. **Safety event logs** (Excel workbooks from Safety) - detailed incident/accident records
4. **GIS/infrastructure files** (KMZ and shapefiles from Engineering) - map data, updated rarely
5. **Real-time environmental APIs** (NOAA CO-OPS + NWS) - live lakefront conditions, fetched server-side every 5 minutes

### Source 1: Monthly SITREPs

**What it is:** The Regional Director's monthly SITREP is the single most important data source. It contains staffing numbers, inspection progress, capital project updates, safety KPIs, maintenance activities, and system readiness status.

**Where raw files go:** `data-sources/sitreps/`

**What gets updated (and where in the code):**

| SITREP Section | Site Page | Updated In | Notes |
|---|---|---|---|
| Overall readiness status | `/infrastructure`, `/` | `systemReadiness.overallStatus`, `.categories` | Homepage gauge cards derive from this |
| Alerts (e.g., GIWW gate issues) | `/infrastructure` | `systemReadiness.alerts` | Array; empty when no active alerts |
| Mississippi River level + forecast | `/infrastructure` | `systemReadiness.riverConditions` | Level, unit, status text, forecast |
| PCCP pump availability | `/infrastructure`, `/` | `kpiMetrics.pccpPumps` | value/total (e.g., 17/17) |
| YTD accidents | `/`, `/safety` | `kpiMetrics.ytdAccidents`, `safetyData` | FY26 YTD count |
| Hurricane gate inspection % | `/infrastructure`, `/engineering` | `kpiMetrics.floodgateInspections`, `operationsData.floodgateInspections` | |
| Valve exercises % | `/infrastructure`, `/engineering` | `operationsData.floodgateInspections.valveExercises` | |
| Permits issued (monthly count) | `/engineering` | `operationsData.permitsIssued` array | **Append** new month; page auto-derives latest |
| Staff headcount and vacancies | `/`, `/staffing` | `kpiMetrics.staffCount`, `staffingData` | |
| Recent hires | `/staffing` | `staffingData.recentHires` | |
| Department staffing status | `/staffing` | `staffingData.departmentStatus` | |
| Capital project updates | `/finance` | `financialData.capitalProjects` | |
| PCCP repair status | `/engineering` | `operationsData.pccpRepairStatus` | |
| Maintenance activities | `/engineering` | `operationsData.maintenanceActivities` | Array of summary strings |
| USACE inspection status | `/engineering` | `operationsData.floodgateInspections.usaceInspections` | |

All fields referenced above are in `src/data/siteData.ts`. Each field has a `source` comment indicating which SITREP (or other document) it came from.

**How to update:** Open `src/data/siteData.ts` and update the relevant fields. Update the `source` comments and `lastUpdated` fields. After editing, run `npm run build` to verify no type errors.

### Source 2: Budget Data

**What it is:** The FY26 Adopted Budget Summary, broken down by 4 districts (OLD, EJLD, LBBLD, FPAE) and 9 expense categories.

**Source file:** `data-sources/budget/Budget Summary w Projects FY26.xlsx`

**Extraction script:** `scripts/extractBudgetData.py`

**Output:** `public/data/budget-fy26.json`

**Displayed on:** `/finance`

**How to update:**
1. Place the new budget Excel file in `data-sources/budget/`
2. Update the filename in `scripts/extractBudgetData.py` if it changed
3. Run: `python3 scripts/extractBudgetData.py`
4. Verify the output JSON totals match the spreadsheet
5. The financial page loads this JSON at runtime, so no code changes needed for budget numbers

### Source 2b: Budget vs Actuals (YTD Spending)

**What it is:** Year-to-date actual expenditures vs budget from the FPA Dashboard Reports workbook, produced by Finance. Shows spending by category and department for each district. O&M expenses are separated from Projects per Regional Director's guidance.

**Source file:** `data-sources/budget/Dashboard_Reports through MM.DD.YY.xlsm`

**Extraction script:** `scripts/extractActualsData.py`

**Output:** `public/data/actuals-fy26.json`

**Displayed on:** `/finance` (Budget vs Actuals section: KPI cards, category charts, department tables)

**How to update:**
1. Place the new Dashboard Reports file in `data-sources/budget/`
2. Update the `FILENAME` variable in `scripts/extractActualsData.py` to match the new file name
3. Run: `python3 scripts/extractActualsData.py`
4. Review the summary output to confirm totals look right
5. The financial page loads this JSON at runtime; no code changes needed

**Variance color scale:**
- Green: 0-5% absolute variance
- Yellow: 5-15%
- Amber: 15-25%
- Red: >25%

See `data-sources/budget/UPDATE-GUIDE.md` for detailed instructions to share with the Finance team.

### Source 3: Safety Event Logs

**What it is:** Annual Excel workbooks with individual safety event records (date, type, description, whether it involved lost time, etc.). Events are anonymized before display.

**Source files:** `data-sources/safety-event-logs/` (one file per calendar year, e.g., `2026 Event Log.xlsx`)

**Extraction script:** `scripts/extractSafetyData.py`

**Output:** `public/data/safety-events.json`

**Displayed on:** `/safety`

**How to update:**
1. Place the new/updated event log Excel file in `data-sources/safety-event-logs/`
2. Run: `python3 scripts/extractSafetyData.py`
3. The script reads all year files, anonymizes events, and outputs combined JSON
4. The safety page loads this JSON at runtime

**Note:** The SITREP provides the YTD accident count (KPI), but the detailed event-level data (charts, tables, trends) comes from the event log Excel files. Both should be updated.

### Source 4: Map/Infrastructure Data

**What it is:** Geographic data for the interactive system map. Per-district counts are sourced from the Regional Director (Apr 2026): 192 miles of levee/floodwall, 244 land-based flood gates, 8 navigable floodgates, 3 Permanent Canal Closures and Pumps, 3,530 acres of turf maintenance area, 103 valves. The map geometry still comes from the KMZ/shapefiles below.

**Source files:**
- `data-sources/kmz/` - KMZ files (Floodgates.kmz, Valves.kmz, PCCP.kmz, Complex Structures.kmz, Levee Centerline.kmz)
- `data-sources/shapefiles/` - System shapefiles (Complex_Structures, FPA_Levee_Centerline, PCCPs) plus per-district turf-maintenance shapefiles (`OLD_Centerline`, `OLD_Mowing_Area`, `EJLD_Centerline`, `EJLD_Mowing_Area`, `LBBLD_Centerline`, `LBBLD_Mowing_Area`) supplied by Kory

**Extraction scripts:**
- `scripts/convertKmz.mjs` - Converts KMZ to GeoJSON
- `scripts/convertShapefiles.mjs` - Converts shapefiles to GeoJSON (system + per-district turf)

**Output:** `public/data/` - floodgates.json, valves.json, pccps.json, complex-structures.json, levee-centerline.json, plus per-district turf files: `{old,ejld,lbbld}-centerline.json` and `{old,ejld,lbbld}-mowing-areas.json`

**Displayed on:** `/infrastructure` (system map), `/infrastructure/turf-maintenance` (per-district turf zones)

**How to update:** These change infrequently. If Engineering provides updated KMZ or shapefiles, place them in the appropriate `data-sources/` folder and run `node scripts/convertShapefiles.mjs`.

### Source 5: Real-Time Environmental Data (Lakefront Flood Risk)

**What it is:** Live wind, water level, barometric pressure, and forecast data used to compute a 4-tier lakefront flood risk indicator. This is the only data source that requires no manual updates — it's fetched automatically from public APIs.

**Data sources:**
- **NOAA CO-OPS Station 8761927** (New Canal Station, primary): water level, tidal predictions, wind speed/direction, NGOFS2 48-hr storm surge model forecast. 6-minute update interval. Free, no API key.
- **NWS API** (api.weather.gov, grid point LIX/67,92): hourly wind forecasts (156 hrs), active weather alerts. Free, requires only a `User-Agent` header.
- **KNEW (New Orleans Lakefront Airport) METAR** via `api.weather.gov/stations/KNEW/observations`: wind fallback. Kicks in when the primary New Canal wind sensor has been silent for 24+ hours (configurable via `WIND_FALLBACK_STALENESS_MIN` in `src/app/api/lakefront/route.ts`). UI surfaces an amber note and updates the chart source line when the fallback is active.

**Forecast snapshot history:** `src/lib/forecastStore.ts` captures the first forecast seen for each future hour (~48h lead) plus a second snapshot at the 22-26h lead window. Used by the "Show original forecast over observed" toggle on the Conditions Timeline. Backed by Vercel Blob (private store) in production, local JSON fallback in dev. Pruned after 7 days.

**How it works:**
- `src/app/api/lakefront/route.ts` — Server-side API route that fetches from 5 NOAA endpoints + 2 NWS endpoints in parallel, computes surge anomaly (actual water level minus tidal prediction), merges forecasts, and runs the risk engine. Cached for 5 minutes via ISR (`revalidate = 300`).
- `src/lib/lakefrontRisk.ts` — Pure logic risk engine. Evaluates current conditions and forecast against configurable thresholds to produce a risk level (GREEN/YELLOW/ORANGE/RED). Key factors: onshore wind direction (N/NE/NW, 315-045°), wind speed (15/25/35 kt tiers), surge anomaly (0.5/1.0/1.5 ft tiers), gust escalation, and 6-hour forecast lookahead.

**Risk levels and operational actions:**

| Level | Wind (onshore) | Surge Anomaly | Action |
|-------|----------------|---------------|--------|
| GREEN | < 15 kt or offshore | < 0.5 ft | No action needed |
| YELLOW | 15-25 kt | 0.5-1.0 ft | Monitor conditions |
| ORANGE | 25-35 kt sustained | 1.0-1.5 ft | Stage barricades |
| RED | > 35 kt | > 1.5 ft | Close roadway |

Either condition (wind OR surge) alone can trigger a level. Forecast escalation: if conditions are predicted to cross a higher tier within 6 hours, the current level bumps up one tier.

**Displayed on:** `/environment` (full dashboard with current conditions, 48-hr forecast chart, NWS alerts, threshold reference table) and `/` (homepage gauge card showing wind, surge anomaly, and risk level).

**Components:**
- `src/components/RiskBadge.tsx` — 4-tier status badge (parallels `StatusBadge` but with GREEN/YELLOW/ORANGE/RED). Also exports `RiskIndicator` (large hero variant) and helper functions (`riskBorder`, `riskBg`, `riskText`).
- `src/components/EnvironmentalCard.tsx` — Self-contained `"use client"` homepage gauge card. Fetches from `/api/lakefront` on mount.

**Status:** Live on `main`. Deployed to production.

**Open calibration work:**
- Current thresholds (15/25/35 kt wind, 0.5/1.0/1.5 ft surge) are starting points accepted by the Director as a starting point in March 2026. Chief Rondeno is gathering a historical closure log (~10-15 cold-front events since Nov/Dec 2025) for backtesting against NOAA historical data. Adjust in `RISK_THRESHOLDS` in `src/lib/lakefrontRisk.ts` once backtesting is done.
- Onshore wind direction range (NW through NE, 315-045°) confirmed by the Director.
- Yellow-tier sensitivity may need to be tightened after backtesting if it fires too often on routine north wind events.

---

## Monthly Update Checklist

When a new SITREP arrives:

1. Save the SITREP file to `data-sources/sitreps/`
2. Open `src/data/siteData.ts` and update the following. Each SITREP section maps to specific fields (see the table above for exact field names):
   - [ ] `siteConfig.lastUpdated` (e.g., "April 2026")
   - [ ] `systemReadiness.lastUpdated`, `.overallStatus`, `.categories`, `.alerts`
   - [ ] `systemReadiness.riverConditions` (level, status, forecast)
   - [ ] `kpiMetrics` (pccpPumps, ytdAccidents, floodgateInspections, staffCount)
   - [ ] `readinessMetrics` (data-as-of date + any card values provided in the SITREP: hurricane gate %, valve exercises %, CPRA/USACE inspection status). Cards auto-grade against the straight-line monthly rates.
   - [ ] `operationsData.permitsIssued` - **append** the new month's entry (page auto-derives the latest month for display)
   - [ ] `operationsData.floodgateInspections` (hurricaneGates %, valveExercises %, usaceInspections text)
   - [ ] `operationsData.pccpRepairStatus`, `.maintenanceActivities`
   - [ ] `staffingData` (headcount, vacancies, recentHires, departmentStatus)
   - [ ] `financialData.capitalProjects` (status and description updates)
   - [ ] `safetyData.ytdAccidents` - FY26 YTD count from the Safety Officer, not from the calendar-year event logs
3. If a new safety event log is provided, run `python3 scripts/extractSafetyData.py`. Script treats "UNK"/"TBD"/"pending" recordable flags as not-an-accident.
4. Run `npm run build` to verify no type errors
5. Deploy (push to main; Vercel auto-deploys)

**Important notes:**
- Permits: Each month's permit count comes from the *following* month's SITREP (e.g., February permits are reported in the March SITREP). Set the `source` field accordingly.
- The Operations page auto-derives the latest month label and count from the last entry in the `permitsIssued` array, so no separate KPI update is needed for permits.
- The homepage readiness gauge cards auto-derive from `systemReadiness.categories` and `.overallStatus`.

## Monthly/Quarterly Updates

- **Spending actuals:** When Finance provides an updated Dashboard Reports file:
  1. Save the new `.xlsm` file to `data-sources/budget/`
  2. Update the `FILENAME` in `scripts/extractActualsData.py`
  3. Run: `python3 scripts/extractActualsData.py`
  4. Update the homepage O&M numbers in `src/app/page.tsx` (search for `omActual`, `omAnnualBudget`, `omDataDate`)
  5. Verify output, deploy

## Annual Updates

- **New fiscal year budget:** New Excel file in `data-sources/budget/`, run `scripts/extractBudgetData.py`
- **New safety event log year:** New Excel file in `data-sources/safety-event-logs/`, run `scripts/extractSafetyData.py`
- **Infrastructure changes:** New KMZ/shapefiles from Engineering, run conversion scripts

## Tech Stack

- **Framework:** Next.js 16 (App Router, React 19)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Charts:** Recharts
- **Maps:** Leaflet / React-Leaflet
- **Deployment:** Vercel (auto-deploy on push to main)
- **Data extraction:** Python (openpyxl, pdfplumber), Node.js

## Deployment

The site auto-deploys from the `main` branch via Vercel. Push to `main` to deploy.
