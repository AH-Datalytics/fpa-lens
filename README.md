# The FPA Lens

Public transparency dashboard for the Southeast Louisiana Flood Protection Authority - East (SLFPA-E). Built with Next.js, TypeScript, and Tailwind CSS. Deployed on Vercel.

## Pages

| Route | Description |
|---|---|
| `/` | Homepage with readiness gauge cards, KPIs, and quick links |
| `/our-system` | Interactive map, infrastructure assets, infrastructure readiness status, real-time alerts |
| `/operations` | Permits, inspections, valve exercises, PCCP repairs, maintenance activities |
| `/safety` | Accident/incident trends, events by category, lost time tracking |
| `/financial` | FY26 budget by category and district, capital projects, major future projects |
| `/our-team` | Staffing: headcount, vacancies, department status, recent hires |
| `/contact` | Regional Director contact info |
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
  components/             # Shared components (DataCard, KPICard, Header, Footer, etc.)
  data/siteData.ts        # Central data file for most pages
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

### Source 1: Monthly SITREPs

**What it is:** The Regional Director's monthly SITREP is the single most important data source. It contains staffing numbers, inspection progress, capital project updates, safety KPIs, maintenance activities, and system readiness status.

**Where raw files go:** `data-sources/sitreps/`

**What gets updated (and where in the code):**

| SITREP Section | Site Page | Updated In | Notes |
|---|---|---|---|
| Overall readiness status | `/our-system`, `/` | `systemReadiness.overallStatus`, `.categories` | Homepage gauge cards derive from this |
| Alerts (e.g., GIWW gate issues) | `/our-system` | `systemReadiness.alerts` | Array; empty when no active alerts |
| Mississippi River level + forecast | `/our-system` | `systemReadiness.riverConditions` | Level, unit, status text, forecast |
| PCCP pump availability | `/our-system`, `/` | `kpiMetrics.pccpPumps` | value/total (e.g., 17/17) |
| YTD accidents | `/`, `/safety` | `kpiMetrics.ytdAccidents`, `safetyData` | FY26 YTD count |
| Hurricane gate inspection % | `/our-system`, `/operations` | `kpiMetrics.floodgateInspections`, `operationsData.floodgateInspections` | |
| Valve exercises % | `/our-system`, `/operations` | `operationsData.floodgateInspections.valveExercises` | |
| Permits issued (monthly count) | `/operations` | `operationsData.permitsIssued` array | **Append** new month; page auto-derives latest |
| Staff headcount and vacancies | `/`, `/our-team` | `kpiMetrics.staffCount`, `staffingData` | |
| Recent hires | `/our-team` | `staffingData.recentHires` | |
| Department staffing status | `/our-team` | `staffingData.departmentStatus` | |
| Capital project updates | `/financial` | `financialData.capitalProjects` | |
| PCCP repair status | `/operations` | `operationsData.pccpRepairStatus` | |
| Maintenance activities | `/operations` | `operationsData.maintenanceActivities` | Array of summary strings |
| USACE inspection status | `/operations` | `operationsData.floodgateInspections.usaceInspections` | |

All fields referenced above are in `src/data/siteData.ts`. Each field has a `source` comment indicating which SITREP (or other document) it came from.

**How to update:** Open `src/data/siteData.ts` and update the relevant fields. Update the `source` comments and `lastUpdated` fields. After editing, run `npm run build` to verify no type errors.

### Source 2: Budget Data

**What it is:** The FY26 Adopted Budget Summary, broken down by 4 districts (OLD, EJLD, LBBLD, FPAE) and 9 expense categories.

**Source file:** `data-sources/budget/Budget Summary w Projects FY26.xlsx`

**Extraction script:** `scripts/extractBudgetData.py`

**Output:** `public/data/budget-fy26.json`

**Displayed on:** `/financial`

**How to update:**
1. Place the new budget Excel file in `data-sources/budget/`
2. Update the filename in `scripts/extractBudgetData.py` if it changed
3. Run: `python3 scripts/extractBudgetData.py`
4. Verify the output JSON totals match the spreadsheet
5. The financial page loads this JSON at runtime, so no code changes needed for budget numbers

**Quarterly Spending Actuals (not yet implemented).** The financial page has a "coming soon" section for budget-vs-actuals comparison. Finance will provide quarterly spending reports (actual expenditures by category and district). Each quarter, the new spending data will need to be uploaded, an extraction script built (similar to the budget extractor), and the financial page updated to show budget-vs-actual comparisons by category and by department. This is the next major addition to the financial page.

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

**What it is:** Geographic data for the interactive system map: levee centerlines (183 mi), floodgates (248), valves (103), PCCP pump stations (3), and complex structures (7).

**Source files:**
- `data-sources/kmz/` - KMZ files (Floodgates.kmz, Valves.kmz, PCCP.kmz, Complex Structures.kmz, Levee Centerline.kmz)
- `data-sources/shapefiles/` - Shapefiles (Complex_Structures, FPA_Levee_Centerline, PCCPs)

**Extraction scripts:**
- `scripts/convertKmz.mjs` - Converts KMZ to GeoJSON
- `scripts/convertShapefiles.mjs` - Converts shapefiles to GeoJSON

**Output:** `public/data/` (floodgates.json, valves.json, pccps.json, complex-structures.json, levee-centerline.json)

**Displayed on:** `/our-system`

**How to update:** These change infrequently. If Engineering provides updated KMZ or shapefiles, place them in the appropriate `data-sources/` folder and run the conversion script.

---

## Monthly Update Checklist

When a new SITREP arrives:

1. Save the SITREP file to `data-sources/sitreps/`
2. Open `src/data/siteData.ts` and update the following. Each SITREP section maps to specific fields (see the table above for exact field names):
   - [ ] `siteConfig.lastUpdated` (e.g., "April 2026")
   - [ ] `systemReadiness.lastUpdated`, `.overallStatus`, `.categories`, `.alerts`
   - [ ] `systemReadiness.riverConditions` (level, status, forecast)
   - [ ] `kpiMetrics` (pccpPumps, ytdAccidents, floodgateInspections, staffCount)
   - [ ] `operationsData.permitsIssued` - **append** the new month's entry (page auto-derives the latest month for display)
   - [ ] `operationsData.floodgateInspections` (hurricaneGates %, valveExercises %, usaceInspections text)
   - [ ] `operationsData.pccpRepairStatus`, `.maintenanceActivities`
   - [ ] `staffingData` (headcount, vacancies, recentHires, departmentStatus)
   - [ ] `financialData.capitalProjects` (status and description updates)
3. If a new safety event log is provided, run `python3 scripts/extractSafetyData.py`
4. Run `npm run build` to verify no type errors
5. Deploy (push to main; Vercel auto-deploys)

**Important notes:**
- Permits: Each month's permit count comes from the *following* month's SITREP (e.g., February permits are reported in the March SITREP). Set the `source` field accordingly.
- The Operations page auto-derives the latest month label and count from the last entry in the `permitsIssued` array, so no separate KPI update is needed for permits.
- The homepage readiness gauge cards auto-derive from `systemReadiness.categories` and `.overallStatus`.

## Quarterly Updates

- **Spending actuals:** When Finance provides quarterly spending data, upload to `data-sources/budget/`, run extraction script, and update the financial page to show budget-vs-actual comparisons. (Script and page support to be built when first actuals arrive.)

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
