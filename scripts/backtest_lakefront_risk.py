#!/usr/bin/env python3
"""
Lakefront Risk Model Backtester
================================
Pulls NOAA historical wind + water level data for each known Lakeshore Drive
closure event (from Rave alerts) and reports what the risk model would have
predicted at the time of closure.

Usage:
    python3 scripts/backtest_lakefront_risk.py

Requirements:
    pip install requests tabulate

Outputs a table showing:
  - Event date/time (CT)
  - Event type (full closure / partial / false positive)
  - Wind at closure time (speed, direction, gust)
  - Surge anomaly at closure time
  - Model-predicted risk level
  - Whether the model call was correct
"""

import sys
import math
from datetime import datetime, timedelta, timezone
from typing import Optional

try:
    import requests
    from tabulate import tabulate
except ImportError:
    print("Missing dependencies. Run: pip install requests tabulate")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Known closure events from Rave alerts + user-reported calibration points.
# Timestamps in UTC. "expected" is the minimum risk level we'd want to see.
# ---------------------------------------------------------------------------
EVENTS = [
    # (label, closure_utc, expected_min_level, event_type)
    # Full / partial closures = at least ORANGE expected
    ("Partial – Canal Blvd westbound",     "2025-11-10 00:00", "ORANGE", "closure"),
    ("Full – Elysian Fields to Franklin",  "2025-12-04 22:14", "ORANGE", "closure"),
    ("Full – Shelter 4 to Franklin",       "2025-12-14 15:05", "ORANGE", "closure"),
    ("Full – Franklin to Elysian Fields",  "2026-03-08 16:57", "ORANGE", "closure"),
    ("Full – all of Lakeshore",            "2026-03-12 11:46", "ORANGE", "closure"),
    ("Full – all of Lakeshore",            "2026-03-16 09:34", "ORANGE", "closure"),
    ("Full – all of Lakeshore",            "2026-03-17 12:18", "ORANGE", "closure"),
    ("Partial – road flooding",            "2026-03-30 21:38", "ORANGE", "closure"),
    ("Full – all of Lakeshore",            "2026-04-05 11:39", "ORANGE", "closure"),
    ("Partial – road flooding",            "2026-04-19 08:48", "ORANGE", "closure"),
    # May 1: true positive confirmed by Jeff (closure at 20:19 UTC, high risk seen at 23:39)
    ("Partial – road flooding (TP)",       "2026-05-01 23:39", "ORANGE", "closure"),
    # May 3: false positive — clear skies and calm, model showed RED
    ("FALSE POSITIVE – calm skies",        "2026-05-03 20:22", "GREEN",  "false_positive"),
]

# ---------------------------------------------------------------------------
# NOAA CO-OPS API
# ---------------------------------------------------------------------------
STATION_ID = "8761927"  # New Canal Station, Lake Pontchartrain
NOAA_BASE = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter"

def noaa_fetch(product: str, begin_dt: datetime, end_dt: datetime, datum: str = "MLLW") -> list[dict]:
    fmt = "%Y%m%d %H:%M"
    params = {
        "station":      STATION_ID,
        "product":      product,
        "begin_date":   begin_dt.strftime(fmt),
        "end_date":     end_dt.strftime(fmt),
        "datum":        datum,
        "units":        "english",
        "time_zone":    "gmt",
        "format":       "json",
        "application":  "fpa_lens_backtest",
    }
    r = requests.get(NOAA_BASE, params=params, timeout=20)
    r.raise_for_status()
    data = r.json()
    return data.get("data") or data.get("predictions") or []

def noaa_predictions(begin_dt: datetime, end_dt: datetime) -> list[dict]:
    fmt = "%Y%m%d %H:%M"
    params = {
        "station":      STATION_ID,
        "product":      "predictions",
        "begin_date":   begin_dt.strftime(fmt),
        "end_date":     end_dt.strftime(fmt),
        "datum":        "MLLW",
        "interval":     "h",
        "units":        "english",
        "time_zone":    "gmt",
        "format":       "json",
        "application":  "fpa_lens_backtest",
    }
    r = requests.get(NOAA_BASE, params=params, timeout=20)
    r.raise_for_status()
    data = r.json()
    return data.get("predictions") or []

# ---------------------------------------------------------------------------
# Risk model (mirrors lakefrontRisk.ts logic)
# ---------------------------------------------------------------------------
ONSHORE_MIN = 315
ONSHORE_MAX = 45
WIND_HISTORY_HOURS = 3
ONSHORE_FRACTION = 0.70

RED_WIND    = 35
ORANGE_WIND = 25
YELLOW_WIND = 15

RED_SURGE    = 1.5
ORANGE_SURGE = 1.0
YELLOW_SURGE = 0.75

def is_onshore(deg: float) -> bool:
    # NW–N–NE (315–045)
    return deg >= ONSHORE_MIN or deg <= ONSHORE_MAX

def cardinal(deg: float) -> str:
    dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"]
    idx = round(deg / 22.5) % 16
    return dirs[idx]

def wind_level(speed: float, is_on: bool) -> str:
    if not is_on:
        return "GREEN"
    if speed >= RED_WIND:
        return "RED"
    if speed >= ORANGE_WIND:
        return "ORANGE"
    if speed >= YELLOW_WIND:
        return "YELLOW"
    return "GREEN"

LEVEL_ORDER = {"GREEN": 0, "YELLOW": 1, "ORANGE": 2, "RED": 3}

def compute_risk(wind_rows: list[dict], water_rows: list[dict], pred_rows: list[dict],
                 event_dt: datetime) -> dict:
    """
    Simplified port of the TypeScript risk engine.
    Returns dict with keys: level, wind_speed, wind_dir, wind_gust, anomaly, onshore_pct
    """
    if not wind_rows or not water_rows or not pred_rows:
        return {"level": "UNKNOWN", "wind_speed": None, "wind_dir": None,
                "wind_gust": None, "anomaly": None, "onshore_pct": None}

    def parse_dt(s: str) -> datetime:
        for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S+00:00"):
            try:
                return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
            except ValueError:
                pass
        return datetime.min.replace(tzinfo=timezone.utc)

    # Find reading closest to event time
    def closest(rows: list[dict], key: str = "t") -> Optional[dict]:
        event_ts = event_dt.timestamp()
        best, best_diff = None, float("inf")
        for r in rows:
            diff = abs(parse_dt(r[key]).timestamp() - event_ts)
            if diff < best_diff:
                best_diff = diff
                best = r
        return best

    # Current wind
    cur_wind = closest(wind_rows)
    if not cur_wind:
        return {"level": "UNKNOWN", "wind_speed": None, "wind_dir": None,
                "wind_gust": None, "anomaly": None, "onshore_pct": None}

    speed = float(cur_wind.get("s", 0) or 0)
    direction = float(cur_wind.get("d", 0) or 0)
    gust = float(cur_wind.get("g", 0) or 0)
    onshore_now = is_onshore(direction)

    # 3-hour wind history for duration gating
    cutoff = event_dt - timedelta(hours=WIND_HISTORY_HOURS)
    history = [r for r in wind_rows if parse_dt(r["t"]) >= cutoff and parse_dt(r["t"]) <= event_dt]
    onshore_count = sum(1 for r in history if is_onshore(float(r.get("d", 0) or 0)))
    onshore_pct = (onshore_count / len(history) * 100) if history else 0
    has_persistence = (onshore_pct / 100) >= ONSHORE_FRACTION

    # Sustained wind level (duration-gated for YELLOW/ORANGE; RED immediate)
    sustained_level = "GREEN"
    if onshore_now:
        if speed >= RED_WIND:
            sustained_level = "RED"
        elif speed >= ORANGE_WIND and has_persistence:
            sustained_level = "ORANGE"
        elif speed >= YELLOW_WIND and has_persistence:
            sustained_level = "YELLOW"

    # Gust bump (one tier, only if onshore)
    gust_level = "GREEN"
    if onshore_now:
        gust_level = wind_level(gust, True)

    effective_level = sustained_level
    if LEVEL_ORDER.get(gust_level, 0) > LEVEL_ORDER.get(effective_level, 0):
        # Bump one tier from gust
        tiers = ["GREEN", "YELLOW", "ORANGE", "RED"]
        idx = tiers.index(effective_level)
        effective_level = tiers[min(idx + 1, 3)]

    # Surge anomaly — use median of 5 readings for spike resistance
    water_near = sorted(
        [r for r in water_rows if abs((parse_dt(r["t"]).timestamp() - event_dt.timestamp())) < 30 * 60],
        key=lambda r: parse_dt(r["t"])
    )[-5:]
    levels = sorted([float(r["v"]) for r in water_near if r.get("v") and float(r.get("v", 0)) != 0])
    smoothed = levels[len(levels) // 2] if levels else None

    cur_pred = closest(pred_rows)
    predicted = float(cur_pred["v"]) if cur_pred else None

    anomaly = (smoothed - predicted) if smoothed is not None and predicted is not None else None

    # Surge gating: suppress if wind is mostly offshore
    surge_suppressed = (onshore_pct / 100) < 0.30 and not onshore_now

    surge_level = "GREEN"
    if anomaly is not None and not surge_suppressed:
        if anomaly >= RED_SURGE:
            surge_level = "RED"
        elif anomaly >= ORANGE_SURGE:
            surge_level = "ORANGE"
        elif anomaly >= YELLOW_SURGE:
            surge_level = "YELLOW"

    final_level = effective_level if LEVEL_ORDER.get(effective_level, 0) >= LEVEL_ORDER.get(surge_level, 0) else surge_level

    return {
        "level": final_level,
        "wind_speed": round(speed, 1),
        "wind_dir": f"{round(direction)}° {cardinal(direction)}",
        "wind_gust": round(gust, 1),
        "onshore_pct": round(onshore_pct),
        "anomaly": round(anomaly, 2) if anomaly is not None else None,
        "surge_suppressed": surge_suppressed,
    }

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print(f"\nLakefront Risk Model Backtester — NOAA Station {STATION_ID}")
    print(f"Pull window: ±3 hours around each event\n")

    rows = []
    for label, utc_str, expected, etype in EVENTS:
        event_dt = datetime.strptime(utc_str, "%Y-%m-%d %H:%M").replace(tzinfo=timezone.utc)
        ct_str = (event_dt - timedelta(hours=5)).strftime("%b %-d %Y %-I:%M%p CT")
        print(f"  Fetching {ct_str}  ({label})...", end="", flush=True)

        begin = event_dt - timedelta(hours=3, minutes=30)
        end = event_dt + timedelta(minutes=30)

        try:
            wind_rows  = noaa_fetch("wind",        begin, end)
            water_rows = noaa_fetch("water_level", begin, end)
            pred_rows  = noaa_predictions(begin, end)
            result     = compute_risk(wind_rows, water_rows, pred_rows, event_dt)
        except Exception as e:
            print(f" ERROR: {e}")
            rows.append([ct_str, label[:35], expected, "ERROR", "?", "?", "?", "?", "—"])
            continue

        lvl = result["level"]
        correct = (
            (etype == "closure"       and LEVEL_ORDER.get(lvl, 0) >= LEVEL_ORDER.get(expected, 0))
            or (etype == "false_positive" and LEVEL_ORDER.get(lvl, 0) == 0)
        )
        mark = "✓" if correct else "✗"
        print(f" {lvl} {mark}")

        rows.append([
            ct_str,
            label[:38],
            etype,
            f"{result.get('wind_speed','?')} kt {result.get('wind_dir','?')}",
            f"gust {result.get('wind_gust','?')} kt",
            f"{result.get('onshore_pct','?')}% onshore",
            f"{result.get('anomaly','?')} ft surge",
            lvl,
            mark,
        ])

    print()
    print(tabulate(
        rows,
        headers=["Time (CT)", "Event", "Type", "Wind", "Gust", "Persistence", "Surge anomaly", "Model", "✓/✗"],
        tablefmt="rounded_outline",
    ))
    print()

    correct_closures = sum(1 for r in rows if r[2] == "closure" and r[8] == "✓")
    total_closures   = sum(1 for r in rows if r[2] == "closure")
    fp_correct       = sum(1 for r in rows if r[2] == "false_positive" and r[8] == "✓")
    total_fp         = sum(1 for r in rows if r[2] == "false_positive")

    print(f"True positive rate  (closures): {correct_closures}/{total_closures}")
    print(f"False positive rate (calm):     {total_fp - fp_correct}/{total_fp} suppressed correctly")
    print()

if __name__ == "__main__":
    main()
