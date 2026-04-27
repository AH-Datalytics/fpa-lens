#!/usr/bin/env python3
"""
Extract safety event data from Excel files and output anonymized JSON.

Reads from: ~/Development/fpa/data/sources/safety-event-logs/*.xlsx
Outputs to:  ~/Development/fpa/public/data/safety-events.json

Per Safety Officer (Jamal) Apr 2026 update, each row is classified by the
fill color of the Recordable cell:

  RED (FFFF0000)        -> N/A         -> excluded from ALL metrics
  LIGHT BLUE (FF00B0F0) -> No-Fault    -> excluded from performance and
                                          year-over-year metrics, but kept
                                          in total event tracking
  No fill (00000000)    -> At-Fault    -> further classified as:
       Recordable=Yes -> OSHA Recordable accident
       Damage=Yes     -> Property damage event (FPA and/or private)

Anonymization: strips employee names, group codes, locations, unit numbers,
make/model, descriptions. Only retains date, event type, classification,
and boolean flags (lost time, injury, damage, private-property damage).
"""

import json
import os
from collections import defaultdict
from datetime import datetime

import openpyxl

BASE_DIR = os.path.expanduser("~/Development/fpa/data/sources/safety-event-logs")
OUTPUT_PATH = os.path.expanduser("~/Development/fpa/public/data/safety-events.json")

# File configurations: (filename, sheet_name)
# As of the Apr 2026 reclassified workbooks, all years share the same layout:
#   1:Date | 2:Time | 3:Employee | 4:Group | 5:Event Type
#   6:Event Description | 7:Root Cause | 8:Corrective Action | 9:Location
#   10:Injury/Body Part | 11:Recordable | 12:Lost Time | 13:Damage
#   14:FPA Unit No. | 15:Make Model/Description | 16:Damage to Private Property
#   17:Photo | 18:Notes
FILES = [
    ("Event Log 2022.xlsx", "Events"),
    ("2023 Event Log.xlsx", "Sheet2"),
    ("2024 Event Log.xlsx", "Sheet1"),
    ("2025 Event Log.xlsx", "Sheet1"),
    ("2026 Event Log.xlsx", "Sheet1"),
]

COL_DATE = 1
COL_EVENT_TYPE = 5
COL_INJURY = 10
COL_RECORDABLE = 11
COL_LOST_TIME = 12
COL_DAMAGE = 13
COL_PRIVATE_PROP = 16

# Cell fill colors used by the Safety Officer to classify rows.
COLOR_NA = "FFFF0000"          # red    -> exclude entirely
COLOR_NO_FAULT = "FF00B0F0"    # cyan   -> total tracking only
COLOR_AT_FAULT = ("00000000", "", None)  # white / no fill -> counted everywhere


def parse_yes(value):
    """Treat any non-empty string that isn't an explicit "no" as Yes."""
    if value is None:
        return False
    s = str(value).strip().lower()
    if s in ("", "no", "none", "n/a", "na", "unknown", "unk", "tbd", "pending"):
        return False
    return True


def parse_injury(value):
    """Injury column is free text. Empty / 'No' / 'N/A' means no injury."""
    if value is None:
        return False
    s = str(value).strip().lower()
    if s in ("", "no", "none", "n/a", "na", "unknown", "unk"):
        return False
    return True


def parse_date(value):
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y"):
            try:
                return datetime.strptime(value.strip(), fmt)
            except ValueError:
                continue
    return None


def cell_fill_color(cell):
    """Return the foreground fill color of a cell, normalized to upper-case hex."""
    fill = cell.fill
    if fill is None or fill.fgColor is None:
        return None
    val = fill.fgColor.value
    if val is None:
        return None
    return str(val).upper()


def classify_row(recordable_fill):
    """
    Classify a row based on the fill color of its Recordable cell.

    Returns one of:
      "excluded"   -- N/A row, drop entirely
      "no-fault"   -- counted in totals only
      "at-fault"   -- counted everywhere; further sub-classified by columns
    """
    if recordable_fill == COLOR_NA:
        return "excluded"
    if recordable_fill == COLOR_NO_FAULT:
        return "no-fault"
    return "at-fault"


def extract_events():
    all_events = []
    classification_counts = defaultdict(int)

    for filename, sheet_name in FILES:
        filepath = os.path.join(BASE_DIR, filename)
        if not os.path.exists(filepath):
            print(f"WARNING: File not found: {filepath}")
            continue

        # Need formatting info, so don't use read_only mode.
        wb = openpyxl.load_workbook(filepath, data_only=True)
        ws = wb[sheet_name]

        row_count = 0
        for r in range(2, ws.max_row + 1):
            date_cell = ws.cell(row=r, column=COL_DATE)
            date_val = parse_date(date_cell.value)
            if date_val is None:
                continue

            recordable_cell = ws.cell(row=r, column=COL_RECORDABLE)
            classification = classify_row(cell_fill_color(recordable_cell))

            if classification == "excluded":
                classification_counts["excluded"] += 1
                continue

            event_type = "Not categorized"
            v = ws.cell(row=r, column=COL_EVENT_TYPE).value
            if v is not None and str(v).strip():
                event_type = str(v).strip()

            injury_val = ws.cell(row=r, column=COL_INJURY).value
            recordable_val = recordable_cell.value
            lost_time_val = ws.cell(row=r, column=COL_LOST_TIME).value
            damage_val = ws.cell(row=r, column=COL_DAMAGE).value
            private_prop_val = ws.cell(row=r, column=COL_PRIVATE_PROP).value

            is_recordable = parse_yes(recordable_val)
            is_lost_time = parse_yes(lost_time_val)
            has_damage = parse_yes(damage_val)
            has_private_property_damage = parse_yes(private_prop_val)
            has_injury = parse_injury(injury_val)

            # Sub-classification for at-fault rows: an at-fault row is either
            # an OSHA-recordable accident (Recordable=Yes) or a Damage-only
            # event (Recordable=No but Damage=Yes). No-fault rows always carry
            # property damage, by Safety Officer convention.
            if classification == "at-fault":
                if is_recordable:
                    sub = "osha-recordable"
                elif has_damage or has_private_property_damage:
                    sub = "damage"
                else:
                    sub = "other"
            else:
                sub = "no-fault"

            classification_counts[sub] += 1

            all_events.append({
                "date": date_val.strftime("%Y-%m-%d"),
                "month": date_val.month,
                "year": date_val.year,
                "monthName": date_val.strftime("%B"),
                "eventType": event_type,
                "classification": sub,         # osha-recordable | damage | other | no-fault
                "isAtFault": classification == "at-fault",
                "isRecordable": is_recordable,
                "isLostTime": is_lost_time,
                "hasInjury": has_injury,
                "hasDamage": has_damage,
                "hasPrivatePropertyDamage": has_private_property_damage,
            })
            row_count += 1

        wb.close()
        print(f"Extracted {row_count} events from {filename}")

    print(f"\nClassification counts: {dict(classification_counts)}")
    return all_events


def build_output(events):
    # ---- yearlyTotals (excluding N/A by construction; further breakdowns) ----
    # Reporting framing: each event is an Accident, Incident, or No-Fault Event.
    #   Accident   = at-fault, OSHA-recordable injury
    #   Incident   = at-fault, no recordable injury (property damage or near-miss)
    #   No-Fault   = employee not at fault (Safety Officer's cyan classification)
    yearly = defaultdict(lambda: {
        "totalEvents": 0,
        "accidents": 0,              # at-fault OSHA recordable
        "incidents": 0,              # at-fault, not recordable (damage + minor)
        "noFault": 0,
        "lostTime": 0,
        "injuries": 0,
        "propertyDamageFpa": 0,
        "propertyDamagePrivate": 0,
    })
    for e in events:
        y = yearly[e["year"]]
        y["totalEvents"] += 1
        if e["classification"] == "osha-recordable":
            y["accidents"] += 1
        elif e["classification"] in ("damage", "other"):
            y["incidents"] += 1
        elif e["classification"] == "no-fault":
            y["noFault"] += 1
        if e["isLostTime"]:
            y["lostTime"] += 1
        if e["hasInjury"]:
            y["injuries"] += 1
        if e["hasDamage"]:
            y["propertyDamageFpa"] += 1
        if e["hasPrivatePropertyDamage"]:
            y["propertyDamagePrivate"] += 1

    yearly_totals = []
    for year in sorted(yearly.keys()):
        entry = {"year": year}
        entry.update(yearly[year])
        yearly_totals.append(entry)

    # ---- monthlyData ----
    monthly = defaultdict(lambda: {
        "accidents": 0,
        "incidents": 0,
        "noFault": 0,
    })
    for e in events:
        key = (e["year"], e["month"])
        if e["classification"] == "osha-recordable":
            monthly[key]["accidents"] += 1
        elif e["classification"] in ("damage", "other"):
            monthly[key]["incidents"] += 1
        elif e["classification"] == "no-fault":
            monthly[key]["noFault"] += 1

    monthly_data = []
    for (year, month) in sorted(monthly.keys()):
        m = monthly[(year, month)]
        monthly_data.append({
            "year": year,
            "month": month,
            "accidents": m["accidents"],
            "incidents": m["incidents"],
            "noFault": m["noFault"],
        })

    # ---- eventTypes ----
    type_counts = defaultdict(lambda: {
        "count": 0,
        "accidents": 0,
        "incidents": 0,
        "noFault": 0,
    })
    for e in events:
        if e["eventType"] == "Not categorized":
            continue
        t = type_counts[e["eventType"]]
        t["count"] += 1
        if e["classification"] == "osha-recordable":
            t["accidents"] += 1
        elif e["classification"] in ("damage", "other"):
            t["incidents"] += 1
        elif e["classification"] == "no-fault":
            t["noFault"] += 1

    event_types = []
    for etype in sorted(type_counts.keys()):
        entry = {"type": etype}
        entry.update(type_counts[etype])
        event_types.append(entry)

    # ---- recentEvents (anonymized) ----
    recent_events = sorted(events, key=lambda e: e["date"], reverse=True)
    recent_events = [
        {
            "date": e["date"],
            "month": e["monthName"],
            "year": e["year"],
            "eventType": e["eventType"],
            "classification": e["classification"],
            "isAtFault": e["isAtFault"],
            "isLostTime": e["isLostTime"],
            "hasInjury": e["hasInjury"],
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
    print(f"\nTotal events extracted (excluding N/A): {len(events)}")

    output = build_output(events)

    print("\nYearly totals:")
    for yt in output["yearlyTotals"]:
        print(f"  {yt['year']}: total={yt['totalEvents']} "
              f"accidents={yt['accidents']} "
              f"incidents={yt['incidents']} "
              f"no-fault={yt['noFault']} "
              f"lost-time={yt['lostTime']} injuries={yt['injuries']} "
              f"FPA damage={yt['propertyDamageFpa']} "
              f"private damage={yt['propertyDamagePrivate']}")

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nOutput written to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
