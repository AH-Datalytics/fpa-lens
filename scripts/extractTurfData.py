#!/usr/bin/env python3
"""
Extract weekly turf-maintenance percentages from the input template into JSON.

Reads:  the FPA Turf Maintenance Input Template (one workbook, district tabs
        Orleans / East Jefferson / Lake Borgne Basin; each reach is a row with
        weekly Cycle 1 / Cycle 2 % columns G/J/M/P/S and H/K/N/Q/T).
Writes: src/data/turfCycles.json

Per reach we take the MAX cumulative % across the weekly columns (the latest
cumulative value). grassCutting.ts overlays these onto the curated structure
ONLY when this file's reporting month is newer than the curated baseline, so an
incomplete current-month template never regresses confirmed values.

Usage:
  python3 scripts/extractTurfData.py [path-to-template.xlsx]
  TURF_INPUT=<path> python3 scripts/extractTurfData.py
"""
import json
import os
import re
import sys

import openpyxl

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_DIR = os.path.join(REPO_ROOT, "data/sources/turf")
OUTPUT_PATH = os.path.join(REPO_ROOT, "src/data/turfCycles.json")
DEFAULT_FILENAME = "turf-maintenance.xlsx"

# District tab name -> dashboard district key.
DISTRICT_TABS = {"Orleans": "OLD", "East Jefferson": "EJLD", "Lake Borgne Basin": "LBBLD"}

# 0-indexed columns: Zone=A(0), Reach=E(4); weekly C1 = G,J,M,P,S; C2 = H,K,N,Q,T.
ZONE_COL, REACH_COL = 0, 4
C1_COLS = [6, 9, 12, 15, 18]
C2_COLS = [7, 10, 13, 16, 19]

MONTHS = {m.lower(): i for i, m in enumerate(
    ["", "January", "February", "March", "April", "May", "June",
     "July", "August", "September", "October", "November", "December"])}


def resolve_input():
    if len(sys.argv) > 1:
        return os.path.expanduser(sys.argv[1])
    if os.environ.get("TURF_INPUT"):
        return os.path.expanduser(os.environ["TURF_INPUT"])
    return os.path.join(BASE_DIR, DEFAULT_FILENAME)


def max_pct(row, cols):
    vals = []
    for c in cols:
        if c < len(row) and isinstance(row[c], (int, float)):
            vals.append(float(row[c]))
    return max(vals) if vals else None


def find_reporting_month(ws, year):
    """Read 'Reporting Month: <name>' near the top; pair with year from filename."""
    for r in ws.iter_rows(min_row=1, max_row=6, values_only=True):
        for i, v in enumerate(r):
            if isinstance(v, str) and "reporting month" in v.lower():
                # value is usually the next non-empty cell
                for nxt in r[i + 1:]:
                    if isinstance(nxt, str) and nxt.strip().lower() in MONTHS:
                        m = MONTHS[nxt.strip().lower()]
                        return {"label": f"{nxt.strip()} {year}", "year": year, "month": m}
    return None


def main():
    path = resolve_input()
    if not os.path.exists(path):
        print(f"ERROR: File not found: {path}")
        sys.exit(1)

    fn_match = re.search(r"(\d{4})-(\d{2})", os.path.basename(path))
    year = int(fn_match.group(1)) if fn_match else None

    print(f"Reading {path}...")
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)

    reporting_month = None
    districts = {}
    for tab, district_key in DISTRICT_TABS.items():
        if tab not in wb.sheetnames:
            print(f"  (tab not found: {tab})")
            continue
        ws = wb[tab]
        if reporting_month is None and year:
            reporting_month = find_reporting_month(ws, year)

        zones = {}
        for row in ws.iter_rows(min_row=7, values_only=True):
            if not row or len(row) <= REACH_COL:
                continue
            zone = str(row[ZONE_COL]).strip() if row[ZONE_COL] else None
            reach = str(row[REACH_COL]).strip() if row[REACH_COL] else None
            if not zone or not reach:
                continue
            c1, c2 = max_pct(row, C1_COLS), max_pct(row, C2_COLS)
            if c1 is None and c2 is None:
                continue
            zones.setdefault(zone, {})[reach] = {"cycle1Pct": c1, "cycle2Pct": c2}
        if zones:
            districts[district_key] = zones

    wb.close()

    # Fall back to filename month if the in-sheet label wasn't found.
    if reporting_month is None and year and fn_match:
        m = int(fn_match.group(2))
        reporting_month = {"label": f"{m}/{year}", "year": year, "month": m}

    output = {"reportingMonth": reporting_month, "source": os.path.basename(path), "districts": districts}

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    n_reaches = sum(len(z) for d in districts.values() for z in d.values())
    print(f"Reporting month: {reporting_month}")
    print(f"Districts: {', '.join(districts)} | {n_reaches} reaches")
    print(f"Output written to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
