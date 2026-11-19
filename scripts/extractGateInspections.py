#!/usr/bin/env python3
"""
Extract weekly river gate inspection counts from Engineering's running workbook.

Reads:  the weekly inspection log Engineering keeps in SharePoint
        (FPA Lens Data/Engineering/Inspections), one row per week:
        Week Ending | River Gates Inspected (this week) | Valves Exercised
        (this week) | Issues Found | Follow-up Needed | Notes
Writes: public/data/gate-inspections.json

Columns are found by header text, not position, so Engineering can reorder or
relabel them ("River Gates Inspected This Week" and "River Gates Inspected"
both match). Counts are PER WEEK and are summed over the Oct 1 - Dec 31
river gate cycle the latest week falls in.

PUBLIC REPO: only dates and numeric counts are published. Issues Found,
Follow-up Needed and Notes are free text that can name people or describe
defects at specific structures, so they are never read into the output.

Usage:
  python3 scripts/extractGateInspections.py [path-to-workbook.xlsx]
"""
import datetime as dt
import json
import os
import re
import sys

import openpyxl

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_INPUT = os.path.join(REPO_ROOT, "data/sources/inspections/gate-inspections.xlsx")
OUTPUT_PATH = os.path.join(REPO_ROOT, "public/data/gate-inspections.json")

# River gates are inspected annually Oct 1 - Dec 31 (Jeff's "FPA Lens Gate and
# Valve Testing" workbook). Must match riverGateInspections in siteData.ts.
RIVER_GATE_TOTAL = 84


def norm(v):
    return re.sub(r"\s+", " ", str(v or "")).strip().lower()


def find_columns(ws):
    """Locate the header row and the three columns we read. Returns
    (header_row_index, {week, gates, valves}) or raises."""
    for r_idx, row in enumerate(ws.iter_rows(min_row=1, max_row=15, values_only=True), start=1):
        cols = {}
        for c_idx, v in enumerate(row):
            h = norm(v)
            if "week" in h and ("ending" in h or "end" in h):
                cols.setdefault("week", c_idx)
            elif "river gate" in h or ("gate" in h and "inspect" in h):
                cols.setdefault("gates", c_idx)
            elif "valve" in h:
                cols.setdefault("valves", c_idx)
        if "week" in cols and "gates" in cols:
            return r_idx, cols
    raise SystemExit("ERROR: no header row with 'Week Ending' and 'River Gates Inspected' in the first 15 rows")


def as_date(v):
    if isinstance(v, dt.datetime):
        return v.date()
    if isinstance(v, dt.date):
        return v
    if isinstance(v, str):
        for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%m/%d/%y"):
            try:
                return dt.datetime.strptime(v.strip(), fmt).date()
            except ValueError:
                pass
    return None


def as_count(v, warnings, label):
    """Non-negative whole number, or None for a blank cell."""
    if v is None or (isinstance(v, str) and not v.strip()):
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        warnings.append(f"{label}: '{v}' is not a number, ignored")
        return None
    if f < 0 or f != int(f):
        warnings.append(f"{label}: {v} is not a whole count, ignored")
        return None
    return int(f)


def cycle_for(d):
    """Oct 1 - Dec 31 cycle of the calendar year the week falls in."""
    return dt.date(d.year, 10, 1), dt.date(d.year, 12, 31)


def main():
    path = os.path.expanduser(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_INPUT
    if not os.path.exists(path):
        raise SystemExit(f"ERROR: File not found: {path}")
    print(f"Reading {path}...")
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb[wb.sheetnames[0]]
    header_row, cols = find_columns(ws)

    warnings = []
    weeks = []
    for row in ws.iter_rows(min_row=header_row + 1, values_only=True):
        week = as_date(row[cols["week"]]) if cols["week"] < len(row) else None
        if week is None:
            continue
        label = f"week ending {week.isoformat()}"
        gates = as_count(row[cols["gates"]] if cols["gates"] < len(row) else None, warnings, label)
        valves = None
        if "valves" in cols and cols["valves"] < len(row):
            valves = as_count(row[cols["valves"]], warnings, label)
        if gates is None and valves is None:
            continue  # a pre-filled week nobody has reported yet
        weeks.append({"weekEnding": week.isoformat(), "gatesInspected": gates, "valvesExercised": valves})

    weeks.sort(key=lambda w: w["weekEnding"])
    out = {
        "source": os.path.basename(path),
        "sourceModified": os.environ.get("REFRESH_SOURCE_MODIFIED") or None,
        "latestWeekEnding": None,
        "riverGates": None,
        "weeks": weeks,
        "warnings": warnings,
    }

    reported = [w for w in weeks if w["gatesInspected"] is not None]
    if reported:
        latest = dt.date.fromisoformat(reported[-1]["weekEnding"])
        start, end = cycle_for(latest)
        in_cycle = [w for w in reported if start <= dt.date.fromisoformat(w["weekEnding"]) <= end]
        completed = sum(w["gatesInspected"] for w in in_cycle)
        out["latestWeekEnding"] = latest.isoformat()
        if not in_cycle:
            warnings.append(
                f"latest reported week {latest.isoformat()} is outside the Oct 1 - Dec 31 river gate cycle; no cycle total published"
            )
        else:
            if completed > RIVER_GATE_TOTAL:
                warnings.append(
                    f"river gates sum to {completed} this cycle, more than the {RIVER_GATE_TOTAL} gates; "
                    "check that weekly (not running) totals were entered"
                )
            out["riverGates"] = {
                "periodStart": start.isoformat(),
                "periodEnd": end.isoformat(),
                "completed": completed,
                "weeksReported": len(in_cycle),
            }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)
        f.write("\n")
    rg = out["riverGates"]
    print(
        f"Wrote {OUTPUT_PATH}: {len(weeks)} reported week(s)"
        + (f", {rg['completed']} river gates over {rg['weeksReported']} week(s) of the {rg['periodStart'][:4]} cycle" if rg else "")
    )
    for w in warnings:
        print(f"  WARNING: {w}")


if __name__ == "__main__":
    main()
