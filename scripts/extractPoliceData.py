#!/usr/bin/env python3
"""
Extract monthly Levee District Police infrastructure-protection activity into JSON.

Reads:  one or more monthly "officer stats" workbooks from the Levee District
        Police (one workbook per month, compiled by the EJLD Captain from the
        platoon supervisors' monthly summaries of officers' Daily Activity
        Sheets). Each workbook has an East Jefferson sheet, an Orleans sheet,
        and a combined "EJ. OLD TOTALS" sheet; activity types are rows.
Writes: public/data/police-activity.json -- a month-by-month series of the
        thirteen infrastructure-protection activity counts shown on /protection,
        at agency level and per police district.

Only the thirteen infrastructure fields the Protection page displays are
extracted. The workbooks also carry enforcement rows (arrests, citations, calls
for service) and per-platoon columns whose headers include supervisor initials;
none of that is read, and nothing platoon-level is ever written. The raw
workbooks stay in the gitignored data/sources/police/.

Rows are matched by label, not position: the header row shifts between months
and the label spelling is the stable part. The "EJ. OLD TOTALS" sheet is the
source of record; the two district sheets are read as a cross-check and any
disagreement is reported in the output's `warnings` (the run still succeeds,
since the question is for the Police Department, not a reason to block the
other categories).

The output is MERGED with the previously published JSON: months present in the
input files replace their prior values, months absent from the inputs are kept.
So a run against only the newest upload extends the series, and a run against
the whole folder rebuilds it.

Usage:
  python3 scripts/extractPoliceData.py <file.xlsx> [<file.xlsx> ...]
  python3 scripts/extractPoliceData.py <directory>       # every .xlsx inside
  python3 scripts/extractPoliceData.py                   # data/sources/police/
"""
import calendar
import datetime
import glob
import json
import os
import re
import sys

import openpyxl

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_DIR = os.path.join(REPO_ROOT, "data/sources/police")
OUTPUT_PATH = os.path.join(REPO_ROOT, "public/data/police-activity.json")

# Louisiana state fiscal year runs July 1 - June 30 (FY2026 = Jul 2025 - Jun 2026).
FISCAL_YEAR_START_MONTH = 7

# The thirteen activity types the Protection page shows, in page order. `label`
# is the display wording; `workbookLabels` are the row labels as they appear in
# the Police workbooks (normalized: lowercase, whitespace removed). Add an alias
# here if the Police Department re-spells a row; never add enforcement rows.
FIELDS = [
    {"key": "gateChecks", "label": "Flood gate checks",
     "workbookLabels": ["gatechecks(pont,swing)", "gatechecks"]},
    {"key": "pumpStationChecks", "label": "Pump station / reach checks",
     "workbookLabels": ["pumpstation/reachchecks"]},
    {"key": "riverBattureChecks", "label": "River batture checks",
     "workbookLabels": ["riverbatcherchecks", "riverbatturechecks"]},
    {"key": "polderChecks", "label": "Polder checks",
     "workbookLabels": ["polderchecks"]},
    {"key": "gaugeReadings", "label": "Gauge readings",
     "workbookLabels": ["gaugereadings"]},
    {"key": "bayouBienvenueChecks", "label": "Bayou Bienvenue checks",
     "workbookLabels": ["bayoubienvenuechecks"]},
    {"key": "leveeInspections", "label": "Levee inspections / condition checks",
     "workbookLabels": ["leveecondition", "leveeconditionchecks"]},
    {"key": "shelterChecks", "label": "Shelter checks",
     "workbookLabels": ["shelterchecks"]},
    {"key": "marinaChecks", "label": "Marina checks",
     "workbookLabels": ["marinachecks"]},
    {"key": "facilityChecks", "label": "Franklin Ave / East Jefferson facility checks",
     "workbookLabels": ["franklin/ejfacilitychecks", "franklin/ejfacilitycheck"]},
    {"key": "neighborhoodPatrol", "label": "Neighborhood patrol / checks",
     "workbookLabels": ["neighborhoodpatrol"]},
    {"key": "trafficControl", "label": "Traffic control during maintenance / gate exercises",
     "workbookLabels": ["trafficcontrolassignment"]},
    {"key": "fpaEscorts", "label": "FPA maintenance escorts",
     "workbookLabels": ["escortfpa"]},
]

DISTRICTS = {
    # key -> (sheet-title prefix, column in the totals sheet)
    "EJLDPD": {"sheetPrefix": "EJ OFFICERS", "totalsCol": 2},
    "OLDPD": {"sheetPrefix": "OLD OFFICERS", "totalsCol": 3},
}

MONTHS_LC = [m.lower() for m in calendar.month_name if m]


def norm(s):
    return re.sub(r"\s+", "", str(s)).lower()


def resolve_inputs(argv):
    """Expand the CLI args (files and/or directories) into a sorted list of .xlsx paths."""
    targets = [os.path.expanduser(a) for a in argv] or [BASE_DIR]
    files = []
    for t in targets:
        if os.path.isdir(t):
            files.extend(glob.glob(os.path.join(t, "*.xlsx")))
        elif os.path.isfile(t):
            files.append(t)
        else:
            print(f"ERROR: not found: {t}")
            sys.exit(1)
    # Ignore Excel lock files and anything else that isn't a workbook.
    files = [f for f in files if not os.path.basename(f).startswith("~$")]
    return sorted(set(files))


def month_from_name(path):
    """Return 'YYYY-MM' from the filename, or None.

    Accepts the pipeline convention (police-activity_2026-04.xlsx) and the
    names the Police Department actually uses ("AGENCY PLATOON MONTHLY OFFICER
    STATS APRIL 2026.xlsx"), mirroring fetch.mjs's flexibleMonth so a local
    run against the original files behaves like the SharePoint run.
    """
    name = os.path.basename(path)
    m = re.search(r"(?<!\d)(20\d{2})[-._ ]?(0[1-9]|1[0-2])(?!\d)", name)
    if m:
        return f"{m.group(1)}-{m.group(2)}"
    m = re.search(r"(" + "|".join(MONTHS_LC) + r")[ ,._-]*(20\d{2})", name, re.I)
    if m:
        return f"{m.group(2)}-{MONTHS_LC.index(m.group(1).lower()) + 1:02d}"
    m = re.search(r"(?<!\d)(0[1-9]|1[0-2])[-._ ](20\d{2})(?!\d)", name)
    if m:
        return f"{m.group(2)}-{m.group(1)}"
    return None


def month_label(month):
    y, m = month.split("-")
    return f"{calendar.month_name[int(m)]} {y}"


def as_count(v):
    """Coerce a cell to an int count; None for blank/non-numeric."""
    if v is None or v == "":
        return None
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return int(round(v))
    try:
        return int(round(float(str(v).strip())))
    except ValueError:
        return None


def rows_by_label(ws):
    """Map normalized row label -> tuple of row values."""
    out = {}
    for row in ws.iter_rows(values_only=True):
        if row and row[0] is not None and str(row[0]).strip():
            out.setdefault(norm(row[0]), row)
    return out


def find_row(rows, field):
    for lbl in field["workbookLabels"]:
        if lbl in rows:
            return rows[lbl]
    return None


def find_sheet(wb, predicate):
    for ws in wb.worksheets:
        if predicate(ws.title.strip().upper()):
            return ws
    return None


def read_workbook(path, warnings):
    """Return {agency: {...}, districts: {EJLDPD: {...}, OLDPD: {...}}} or None."""
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    base = os.path.basename(path)
    try:
        totals_ws = find_sheet(wb, lambda t: "TOTALS" in t)
        district_ws = {
            k: find_sheet(wb, lambda t, p=d["sheetPrefix"]: t.startswith(p))
            for k, d in DISTRICTS.items()
        }
        if totals_ws is None and any(ws is None for ws in district_ws.values()):
            warnings.append(f"{base}: no totals sheet and district sheets missing; skipped")
            return None

        totals_rows = rows_by_label(totals_ws) if totals_ws is not None else {}
        district_rows = {k: rows_by_label(ws) if ws is not None else {} for k, ws in district_ws.items()}

        agency, districts = {}, {k: {} for k in DISTRICTS}
        for field in FIELDS:
            key = field["key"]
            # District values: prefer each district sheet's own "Platoon Totals"
            # column (B); fall back to the totals sheet's per-district column.
            dvals = {}
            for dk, dcfg in DISTRICTS.items():
                row = find_row(district_rows[dk], field)
                v = as_count(row[1]) if row and len(row) > 1 else None
                if v is None:
                    trow = find_row(totals_rows, field)
                    v = as_count(trow[dcfg["totalsCol"]]) if trow and len(trow) > dcfg["totalsCol"] else None
                dvals[dk] = v

            trow = find_row(totals_rows, field)
            total = as_count(trow[1]) if trow and len(trow) > 1 else None
            summed = sum(v for v in dvals.values() if v is not None) if any(v is not None for v in dvals.values()) else None

            if total is None and summed is None:
                warnings.append(f"{base}: row '{field['label']}' not found; recorded as 0")
                total, summed = 0, 0
                dvals = {dk: 0 for dk in DISTRICTS}
            elif total is None:
                total = summed
            elif summed is not None and total != summed:
                warnings.append(
                    f"{base}: '{field['label']}' totals sheet says {total} but district "
                    f"sheets sum to {summed}; using the totals sheet"
                )
                # Cross-check the totals sheet's own district columns so the
                # district split still reconciles to the published total.
                for dk, dcfg in DISTRICTS.items():
                    tv = as_count(trow[dcfg["totalsCol"]]) if len(trow) > dcfg["totalsCol"] else None
                    if tv is not None:
                        dvals[dk] = tv

            agency[key] = total
            for dk in DISTRICTS:
                districts[dk][key] = dvals[dk] if dvals[dk] is not None else 0
        return {"agency": agency, "districts": districts}
    finally:
        wb.close()


def load_existing():
    try:
        with open(OUTPUT_PATH, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return None


def main():
    files = resolve_inputs(sys.argv[1:])
    if not files:
        print("ERROR: no .xlsx inputs found")
        sys.exit(1)

    existing = load_existing()
    months = {m["month"]: m for m in (existing or {}).get("months", [])}
    warnings = []
    parsed = []

    for path in files:
        month = month_from_name(path)
        base = os.path.basename(path)
        if not month:
            warnings.append(f"{base}: could not determine the month from the filename; skipped")
            print(f"  ! {base}: no month in filename, skipped")
            continue
        print(f"Reading {base} -> {month}")
        data = read_workbook(path, warnings)
        if data is None:
            continue
        total = sum(data["agency"].values())
        months[month] = {
            "month": month,
            "label": month_label(month),
            "source": base,
            "total": total,
            "agency": data["agency"],
            "districts": data["districts"],
        }
        parsed.append((month, base, total))

    if not parsed:
        print("ERROR: no workbook could be parsed")
        sys.exit(1)

    series = [months[k] for k in sorted(months)]
    newest = max(parsed)
    output = {
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "source": newest[1],
        "sourceModified": os.environ.get("REFRESH_SOURCE_MODIFIED") or None,
        "latestMonth": series[-1]["month"],
        "fiscalYearStartMonth": FISCAL_YEAR_START_MONTH,
        "fields": [{"key": f["key"], "label": f["label"]} for f in FIELDS],
        "months": series,
        "warnings": warnings,
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)
        f.write("\n")

    for month, base, total in parsed:
        print(f"  {month}  {total:>7,}  ({base})")
    print(f"Series: {series[0]['month']} .. {series[-1]['month']} ({len(series)} months)")
    if warnings:
        print(f"{len(warnings)} warning(s):")
        for w in warnings:
            print(f"  - {w}")
    print(f"Output written to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
