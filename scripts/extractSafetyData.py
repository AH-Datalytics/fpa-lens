#!/usr/bin/env python3
"""
Extract safety event data from Excel files and output anonymized JSON for a dashboard.

Reads from: ~/Development/fpa/data/sources/safety-event-logs/*.xlsx
Outputs to:  ~/Development/fpa/public/data/safety-events.json

Anonymization: strips employee names, group codes, locations, unit numbers,
make/model, descriptions. Only retains date, event type category, and boolean
flags (recordable/accident, lost time, damage, private property damage).
"""

import json
import os
from collections import defaultdict
from datetime import datetime

import openpyxl

BASE_DIR = os.path.expanduser("~/Development/fpa/data/sources/safety-event-logs")
OUTPUT_PATH = os.path.expanduser("~/Development/fpa/public/data/safety-events.json")

# File configurations: (filename, sheet_name, has_event_type_column)
# 2022-2024: no Event Type column (cols 1-16)
# 2025-2026: Event Type at column 5, shifting subsequent columns (cols 1-17+)
FILES = [
    ("Event Log 2022.xlsx", "Events", False),
    ("2023 Event Log.xlsx", "Sheet2", False),
    ("2024 Event Log.xlsx", "Sheet1", False),
    ("2025 Event Log.xlsx", "Sheet1", True),
    ("2026 Event Log.xlsx", "Sheet1", True),
]


def parse_bool(value):
    """
    Parse a cell value as a boolean.

    Truthy: "yes", "yes, minor", "Yes(minor)", "Tractor door", "minimal",
            any non-empty string that isn't explicitly falsy.
    Falsy:  None, empty string, "no", "none", "n/a", "na", "unknown".
    """
    if value is None:
        return False
    s = str(value).strip().lower()
    if s in ("", "no", "none", "n/a", "na", "unknown"):
        return False
    # Anything else (including "yes", "yes, minor", "Tractor door", etc.) is truthy
    return True


def parse_date(value):
    """Parse a date cell value into a datetime object, or return None."""
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y"):
            try:
                return datetime.strptime(value.strip(), fmt)
            except ValueError:
                continue
    return None


def extract_events():
    """Extract all safety events from Excel files, returning anonymized records."""
    all_events = []

    for filename, sheet_name, has_event_type in FILES:
        filepath = os.path.join(BASE_DIR, filename)
        if not os.path.exists(filepath):
            print(f"WARNING: File not found: {filepath}")
            continue

        wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
        ws = wb[sheet_name]

        # Column mapping differs based on whether Event Type column exists
        if has_event_type:
            # 2025-2026 layout
            col_date = 0          # A
            col_event_type = 4    # E
            col_recordable = 10   # K
            col_lost_time = 11    # L
            col_damage = 12       # M
            col_private_prop = 15 # P
        else:
            # 2022-2024 layout
            col_date = 0          # A
            col_event_type = None
            col_recordable = 9    # J
            col_lost_time = 10    # K
            col_damage = 11       # L
            col_private_prop = 14 # O

        row_count = 0
        for row in ws.iter_rows(min_row=2, values_only=True):
            # Skip completely empty rows
            if all(v is None for v in row):
                continue

            date_val = parse_date(row[col_date] if col_date < len(row) else None)
            if date_val is None:
                # No valid date means this isn't a real data row
                continue

            # Event type
            if col_event_type is not None and col_event_type < len(row) and row[col_event_type]:
                event_type = str(row[col_event_type]).strip()
            else:
                event_type = "Not categorized"

            # Boolean fields - safely access with bounds checking
            recordable_val = row[col_recordable] if col_recordable < len(row) else None
            lost_time_val = row[col_lost_time] if col_lost_time < len(row) else None
            damage_val = row[col_damage] if col_damage < len(row) else None
            private_prop_val = row[col_private_prop] if col_private_prop < len(row) else None

            is_accident = parse_bool(recordable_val)  # Recordable = yes means OSHA-recordable accident
            is_lost_time = parse_bool(lost_time_val)
            has_damage = parse_bool(damage_val)
            has_private_property_damage = parse_bool(private_prop_val)

            event = {
                "date": date_val.strftime("%Y-%m-%d"),
                "month": date_val.month,
                "year": date_val.year,
                "monthName": date_val.strftime("%B"),
                "eventType": event_type,
                "isAccident": is_accident,
                "isLostTime": is_lost_time,
                "hasDamage": has_damage,
                "hasPrivatePropertyDamage": has_private_property_damage,
            }
            all_events.append(event)
            row_count += 1

        wb.close()
        print(f"Extracted {row_count} events from {filename}")

    return all_events


def build_output(events):
    """Build the full JSON output structure from extracted events."""

    # --- yearlyTotals ---
    yearly = defaultdict(lambda: {
        "totalEvents": 0, "accidents": 0, "incidents": 0,
        "lostTime": 0, "propertyDamage": 0,
    })
    for e in events:
        y = yearly[e["year"]]
        y["totalEvents"] += 1
        if e["isAccident"]:
            y["accidents"] += 1
        else:
            y["incidents"] += 1
        if e["isLostTime"]:
            y["lostTime"] += 1
        if e["hasDamage"] or e["hasPrivatePropertyDamage"]:
            y["propertyDamage"] += 1

    yearly_totals = []
    for year in sorted(yearly.keys()):
        entry = {"year": year}
        entry.update(yearly[year])
        yearly_totals.append(entry)

    # --- monthlyData ---
    monthly = defaultdict(lambda: {"accidents": 0, "incidents": 0})
    for e in events:
        key = (e["year"], e["month"])
        if e["isAccident"]:
            monthly[key]["accidents"] += 1
        else:
            monthly[key]["incidents"] += 1

    monthly_data = []
    for (year, month) in sorted(monthly.keys()):
        monthly_data.append({
            "year": year,
            "month": month,
            "accidents": monthly[(year, month)]["accidents"],
            "incidents": monthly[(year, month)]["incidents"],
        })

    # --- eventTypes ---
    type_counts = defaultdict(lambda: {"count": 0, "accidents": 0, "incidents": 0})
    for e in events:
        t = type_counts[e["eventType"]]
        t["count"] += 1
        if e["isAccident"]:
            t["accidents"] += 1
        else:
            t["incidents"] += 1

    event_types = []
    for etype in sorted(type_counts.keys()):
        entry = {"type": etype}
        entry.update(type_counts[etype])
        event_types.append(entry)

    # --- recentEvents (sorted by date descending) ---
    recent_events = sorted(events, key=lambda e: e["date"], reverse=True)
    # Only include the anonymized fields
    recent_events = [
        {
            "date": e["date"],
            "month": e["monthName"],
            "year": e["year"],
            "eventType": e["eventType"],
            "isAccident": e["isAccident"],
            "isLostTime": e["isLostTime"],
            "hasDamage": e["hasDamage"],
            "hasPrivatePropertyDamage": e["hasPrivatePropertyDamage"],
        }
        for e in recent_events
    ]

    return {
        "yearlyTotals": yearly_totals,
        "monthlyData": monthly_data,
        "eventTypes": event_types,
        "recentEvents": recent_events,
    }


def main():
    print("Extracting safety event data...")
    events = extract_events()
    print(f"\nTotal events extracted: {len(events)}")

    output = build_output(events)

    # Summary
    print("\nYearly totals:")
    for yt in output["yearlyTotals"]:
        print(f"  {yt['year']}: {yt['totalEvents']} events "
              f"({yt['accidents']} accidents, {yt['incidents']} incidents, "
              f"{yt['lostTime']} lost time, {yt['propertyDamage']} property damage)")

    print(f"\nEvent types: {len(output['eventTypes'])}")
    for et in output["eventTypes"]:
        print(f"  {et['type']}: {et['count']} ({et['accidents']} accidents, {et['incidents']} incidents)")

    # Write output
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nOutput written to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
