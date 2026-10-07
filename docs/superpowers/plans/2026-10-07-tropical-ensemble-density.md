# Tropical Ensemble Track-Density Layer (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a polarwx-style "track density" map layer (share of ensemble tracks whose center passes within 100 km) for the GEFS and Google DeepMind ensembles to FPA Lens's `/environment/tropical-weather` page, and show it locally to Jeff.

**Architecture:** The hourly Python ingest (`ingest/gulfwatch/`) extracts raw ensemble member positions (GEFS from the NHC a-deck it already downloads; Google from Weather Lab, in memory only), computes a strike-fraction grid in Web Mercator with great-circle distances, renders a banded RGBA PNG, uploads it, and advertises it in `manifest.json`. The Next.js page draws the PNG as a MapLibre image source under the cone/tracks, with a "Track density" control and a legend.

**Tech Stack:** Python 3.12 (CI) / 3.14 (local), numpy, Pillow, pytest; Next.js 16 + React, MapLibre GL, SWR, Tailwind, vitest.

**Spec:** `docs/superpowers/specs/2026-10-07-tropical-ensemble-density-design.md` (approved by Jeff 2026-10-07; Codex CLI ACCEPT WITH CHANGES, all findings adopted).

## Global Constraints

- Worktree `C:\Users\jeffm\fpa-lens-density`, branch `tropical-density`. **Never push.** Jeff: "don't push any changes yet, Ben is also working on it." Commits are local only, and only if Jeff has OK'd local commits (global CLAUDE.md: commit only when asked). If not OK'd, skip every "Commit" step.
- `AH-Datalytics/fpa-lens` is a **public** repo; GitHub Actions logs, the `fpa-tropical` blob store, `state.json` and `manifest.errors` are all public. No real Google Weather Lab rows may be committed, printed, stored, or put in an error message. Test fixtures for Google are synthetic.
- Google density is gated by env `GOOGLE_DENSITY_ENABLED == "1"`, default off. Off means: no Google fetch, no Google upload, no Google manifest entry. Do **not** set it in `.github/workflows/tropical-ingest.yml`.
- Google errors are only these codes: `google_unavailable`, `google_no_storm`, `google_too_few_members`, `google_parse_failed`, `google_render_failed`, `google_upload_failed`, `google_failed`.
- Constants (verbatim from spec): radius 100 km; ground cell ≈ 10 km; along-track sampling ≤ 10 km; horizon cycle + 120 h; window start = later of advisory time and cycle time; minimum window 24 h; staleness 12 h behind the newest cycle seen; expected members GEFS 30 / Google 50; minimum GEFS 24 / Google 40; bands 5–10, 10–20 … 80–90, 90+ %, transparent below 5%.
- Google member techs `^F\d{3}$`; GEFS `^AP\d{2}$`. Google URL: `https://deepmind.google.com/science/weatherlab/download/cyclones/OPER/ensemble/paired/atcf/OPER_YYYY_MM_DDTHH_00_atcf_a_deck.txt`.
- Google citation (verbatim, shown whenever the Google layer is on): "Google Weather Lab. © 2024-6 Google LLC, whose machine learning models were used to create the experimental data made available under the following licence terms https://storage.googleapis.com/weathernext-public/terms-of-use.pdf. This data is intended for experimental modelling only and is not intended, validated, or approved for real world use."
- Copy rules (Jeff): plain English, American spelling in our own copy (Google's citation is quoted verbatim, "licence"/"modelling" included), no slogans, no emoji, times in Central via `cdtDateTime`.
- Python tests: `python -m pytest ingest/tests/ -q` (baseline 153 passed). Frontend: `npm test` (vitest), `npx tsc --noEmit`, `npm run lint`.
- Do not touch `TropicalWeatherContent.tsx` beyond the one prop added in Task 8 (Ben edited it 2026-10-07; keep the merge surface small).
- Never run `next build` (it rewrites `importMap.js`; see CLAUDE.md CMS section). `next dev` only.

## Review Focus

1. **A storm whose GEFS members straddle two cycles** (new cycle half-posted): expect the older complete cycle, never a mix. Pinned in Task 2 (`test_select_cycle_prefers_older_complete_cycle`); the pipeline passes `extract_members` output straight to `select_cycle`, so no separate pipeline test.
2. **A Google run newer than the advisory** (18Z run, 15Z advisory): every member must still count (window starts at the cycle). Pinned in Task 2 (`test_window_starts_at_cycle_when_run_is_newer`).
3. **Malformed Google rows or a failing step**: the run continues, and nothing from the file appears in any stored object, error or log. Pinned in Task 6 leak tests.
4. **Flag switched off after Google entries were stored**: manifest must not advertise Google even though state has it. Pinned in Task 6 (`test_google_density_not_advertised_when_flag_off`).
5. **A density option with no image** (quiet season, demo mode, failed build): option disabled, no "Latest ingest was incomplete" notice. Pinned in Task 7 (`publicIngestIssues`) and checked in the browser in Task 9.

## File Structure

| File | Responsibility |
|---|---|
| `ingest/gulfwatch/adeck.py` (modify) | `MemberPoint`, `extract_members()`, `GEFS_MEMBER_RE`: raw member positions before display filtering |
| `ingest/gulfwatch/density.py` (create) | Pure density math: cycle selection, window, fingerprint, sampling, grid, PNG |
| `ingest/gulfwatch/weatherlab.py` (create) | Google Weather Lab fetch with allowlisted error codes, in-memory only |
| `ingest/gulfwatch/pipeline.py` (modify) | `_process_density`, state/manifest wiring, Google gate |
| `ingest/scripts/local_preview.py` (create) | Run the ingest into a gitignored local folder for Jeff's local view |
| `ingest/tests/test_adeck.py`, `test_density.py`, `test_weatherlab.py`, `test_pipeline.py` | Tests |
| `src/lib/tropical/types.ts` (modify) | `DensitySource`, `DensityProduct`, `StormEntry.density` |
| `src/lib/tropical/layers.ts` (modify) | `DensityChoice`, `LayerState.density`, `setDensity` |
| `src/lib/tropical/density.ts` (create) | Band colors, labels, caption, Google citation |
| `src/lib/tropical/useDashboard.tsx` (modify) | `geo.density` URLs; `publicIngestIssues` |
| `src/lib/tropical/mapStyle.ts` (modify) | Density image source + raster layer between satellite and labels |
| `src/components/tropical/DensityControl.tsx` (create) | Off / GFS / Google choice |
| `src/components/tropical/DensityLegend.tsx` (create) | Color bar, caption, disclaimer, Google citation |
| `src/components/tropical/StormMap.tsx`, `LayersControl.tsx`, `ModelLegend.tsx` (modify) | Wiring |
| `src/app/(frontend)/environment/tropical-weather/TropicalWeatherContent.tsx` (modify) | One prop: `onDensityChange` |
| `.gitignore` (modify) | `/public/tropical/local-preview/` |

---

### Task 1: Raw member extraction in `adeck.py`

**Files:**
- Modify: `ingest/gulfwatch/adeck.py` (add after `_model_meta`, ~line 149)
- Test: `ingest/tests/test_adeck.py` (append)

**Interfaces:**
- Produces: `adeck.MemberPoint(cycle: str, tech: str, tau: int, lat: float, lon: float)` (frozen dataclass); `adeck.GEFS_MEMBER_RE: re.Pattern`; `adeck.extract_members(text: str, tech_pattern: re.Pattern, basin: str | None = None, number: str | None = None) -> list[MemberPoint]`. Never raises on malformed rows; skips them.

- [ ] **Step 1: Write the failing tests** (append to `ingest/tests/test_adeck.py`)

```python
import re as _re

from gulfwatch.adeck import GEFS_MEMBER_RE, MemberPoint, extract_members

MEMBER_TEXT = (
    "# header line a Weather Lab file carries\n"
    "AL, 09, 2026100706, 03, AP01,   0, 218N,  945W,  35, 1004, XX,  34, NEQ\n"
    "AL, 09, 2026100706, 03, AP01,   0, 218N,  945W,  35, 1004, XX,  50, NEQ\n"  # wind-radius duplicate
    "AL, 09, 2026100706, 03, AP01,  12, 229N,  931W,  45,  998, XX,  34, NEQ\n"
    "AL, 09, 2026100700, 03, AP01,   0, 215N,  950W,  35, 1004, XX,  34, NEQ\n"  # older cycle kept
    "AL, 09, 2026100706, 03, AVNO,   0, 218N,  945W,  35, 1004, XX,  34, NEQ\n"  # not a member
    "AL, 09, 2026100706, 03, AP02,  12, 2X9N,  931W,  45,  998, XX,  34, NEQ\n"  # malformed lat
    "AL, 09, 2026100706, 03, AP03,  12,   0N,    0W,  45,  998, XX,  34, NEQ\n"  # null position
    "EP, 15, 2026100706, 03, AP01,   0, 150N, 1100W,  35, 1004, XX,  34, NEQ\n"
)


def test_extract_members_keeps_every_cycle_and_dedupes_wind_radius_rows():
    points = extract_members(MEMBER_TEXT, GEFS_MEMBER_RE, basin="AL", number="09")
    assert points == [
        MemberPoint("2026100706", "AP01", 0, 21.8, -94.5),
        MemberPoint("2026100706", "AP01", 12, 22.9, -93.1),
        MemberPoint("2026100700", "AP01", 0, 21.5, -95.0),
    ]


def test_extract_members_without_basin_filter_reads_all_storms():
    points = extract_members(MEMBER_TEXT, GEFS_MEMBER_RE)
    assert MemberPoint("2026100706", "AP01", 0, 15.0, -110.0) in points


def test_extract_members_skips_malformed_rows_without_raising():
    text = "AL, 09, 20261007XX, 03, F001, 0, 218N, 945W\nAL, 09\n,,,,,,,\n"
    assert extract_members(text, _re.compile(r"^F\d{3}$")) == []
```

- [ ] **Step 2: Run to verify failure**

Run: `python -m pytest ingest/tests/test_adeck.py -q -k extract_members`
Expected: FAIL / ERROR, `ImportError: cannot import name 'GEFS_MEMBER_RE'`

- [ ] **Step 3: Implement** (in `adeck.py`; add `from dataclasses import dataclass` to the imports; place after `_model_meta`)

```python
# Raw ensemble-member positions for the track-density layer (gulfwatch.density).
# Deliberately separate from parse_adeck: that function keeps only each tech's
# latest cycle and emits coordinates without forecast hours, so a complete
# previous cycle could never be recovered from its output (Codex review,
# 2026-10-07). This reads every row before any display filtering.
GEFS_MEMBER_RE = _GEFS_ENSEMBLE_RE


@dataclass(frozen=True)
class MemberPoint:
    cycle: str  # YYYYMMDDHH
    tech: str
    tau: int
    lat: float
    lon: float


def extract_members(
    text: str,
    tech_pattern: re.Pattern,
    basin: str | None = None,
    number: str | None = None,
) -> list[MemberPoint]:
    """Every (cycle, tech, tau) position for techs matching `tech_pattern`.

    `basin`/`number` filter a multi-storm file (Google Weather Lab files carry
    every basin). Rows repeated per wind radius (34/50/64 kt) are kept once.
    Malformed rows and the ATCF null position (0N/0W) are skipped, never raised:
    an exception here could quote input into a public error message.
    """
    seen: set[tuple[str, str, int]] = set()
    points: list[MemberPoint] = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        fields = [f.strip() for f in line.split(",")]
        if len(fields) < 8:
            continue
        if basin is not None and fields[0].upper() != basin:
            continue
        if number is not None and fields[1].zfill(2) != number:
            continue
        tech = fields[4].upper()
        if not tech_pattern.match(tech):
            continue
        cycle = fields[2]
        if _parse_cycle(cycle) is None:
            continue
        try:
            tau = int(fields[5])
            lat = _decode_coord(fields[6])
            lon = _decode_coord(fields[7])
        except (ValueError, IndexError):
            continue
        if lat == 0 or lon == 0:
            continue
        key = (cycle, tech, tau)
        if key in seen:
            continue
        seen.add(key)
        points.append(MemberPoint(cycle, tech, tau, lat, lon))
    return points
```

`_parse_cycle` is defined later in the module (line ~160); that is fine at call time. `_decode_coord("2X9N")` raises `ValueError` (caught).

- [ ] **Step 4: Run tests**

Run: `python -m pytest ingest/tests/ -q`
Expected: all pass (153 + 3).

- [ ] **Step 5: Commit** (local only, if OK'd)

```bash
git add ingest/gulfwatch/adeck.py ingest/tests/test_adeck.py
git commit -m "Read raw ensemble member positions from a-deck text"
```

---

### Task 2: Density selection, window and fingerprint (`density.py` part 1)

**Files:**
- Create: `ingest/gulfwatch/density.py`
- Test: `ingest/tests/test_density.py`

**Interfaces:**
- Consumes: `adeck.MemberPoint`.
- Produces: constants `EXPECTED_MEMBERS`, `MINIMUM_MEMBERS`, `RADIUS_KM`, `STALE_HOURS`, `MIN_WINDOW_HOURS`, `HORIZON_HOURS`; `Members = dict[str, list[tuple[int, float, float]]]` (tech → sorted (tau, lat, lon)); `parse_cycle(str) -> datetime`; `parse_iso(str) -> datetime`; `iso_z(datetime) -> str`; `select_cycle(points, minimum, newest_cycle=None) -> tuple[str, Members] | None`; `window(cycle, advisory_time) -> tuple[datetime, datetime] | None`; `fingerprint(members) -> str` (64 hex).

- [ ] **Step 1: Write the failing tests** (`ingest/tests/test_density.py`)

```python
from datetime import datetime, timezone

from gulfwatch import density
from gulfwatch.adeck import MemberPoint


def _members(cycle, count, tau_max=120):
    return [
        MemberPoint(cycle, f"AP{m:02d}", tau, 25.0, -90.0 + tau / 24)
        for m in range(1, count + 1)
        for tau in range(0, tau_max + 1, 12)
    ]


def test_select_cycle_takes_newest_cycle_meeting_minimum():
    points = _members("2026100700", 30) + _members("2026100706", 30)
    cycle, members = density.select_cycle(points, minimum=24)
    assert cycle == "2026100706"
    assert len(members) == 30
    assert members["AP01"][0] == (0, 25.0, -90.0)


def test_select_cycle_prefers_older_complete_cycle():
    # 06Z half-posted (10 members): use complete 00Z, never a mix.
    points = _members("2026100700", 30) + _members("2026100706", 10)
    cycle, members = density.select_cycle(points, minimum=24)
    assert cycle == "2026100700"
    assert len(members) == 30


def test_select_cycle_refuses_cycles_more_than_12h_behind_newest():
    points = _members("2026100618", 30) + _members("2026100712", 5)
    assert density.select_cycle(points, minimum=24) is None


def test_select_cycle_uses_external_newest_cycle_for_staleness():
    points = _members("2026100700", 45)
    assert density.select_cycle(points, minimum=40, newest_cycle="2026100718") is None
    assert density.select_cycle(points, minimum=40, newest_cycle="2026100712")[0] == "2026100700"


def test_select_cycle_empty_is_none():
    assert density.select_cycle([], minimum=1) is None


def test_window_starts_at_advisory_and_ends_cycle_plus_120h():
    start, end = density.window("2026100706", "2026-10-07T15:00:00Z")
    assert start == datetime(2026, 10, 7, 15, tzinfo=timezone.utc)
    assert end == datetime(2026, 10, 12, 6, tzinfo=timezone.utc)


def test_window_starts_at_cycle_when_run_is_newer():
    start, _ = density.window("2026100718", "2026-10-07T15:00:00Z")
    assert start == datetime(2026, 10, 7, 18, tzinfo=timezone.utc)


def test_window_none_when_under_24h_left():
    assert density.window("2026100206", "2026-10-07T15:00:00Z") is None


def test_fingerprint_is_order_independent_and_sensitive_to_new_points():
    a = {"AP01": [(0, 25.0, -90.0), (12, 25.5, -90.5)], "AP02": [(0, 25.1, -90.1)]}
    b = {"AP02": [(0, 25.1, -90.1)], "AP01": [(0, 25.0, -90.0), (12, 25.5, -90.5)]}
    c = {**a, "AP02": [(0, 25.1, -90.1), (12, 25.6, -90.6)]}
    assert density.fingerprint(a) == density.fingerprint(b)
    assert density.fingerprint(a) != density.fingerprint(c)
    assert len(density.fingerprint(a)) == 64
```

- [ ] **Step 2: Run to verify failure**

Run: `python -m pytest ingest/tests/test_density.py -q`
Expected: ERROR, `ImportError: cannot import name 'density'`

- [ ] **Step 3: Implement** (`ingest/gulfwatch/density.py`)

```python
"""Ensemble track density for the tropical map. Pure functions, no I/O.

The value drawn is the share of an ensemble's member tracks whose center
passes within RADIUS_KM of a point between the window start and end. It is a
frequency across model runs, not a calibrated probability, and it describes
the center only -- wind, surge and rain reach far beyond it. See
docs/superpowers/specs/2026-10-07-tropical-ensemble-density-design.md.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone

EXPECTED_MEMBERS = {"gefs": 30, "google": 50}
# 80% of expected. At 40+ Google members one track contributes at most 2.5%,
# under the lowest drawn band (5%), so no single member is visible on its own.
MINIMUM_MEMBERS = {"gefs": 24, "google": 40}
RADIUS_KM = 100.0
STALE_HOURS = 12
MIN_WINDOW_HOURS = 24
HORIZON_HOURS = 120

Members = dict[str, list[tuple[int, float, float]]]


def parse_cycle(cycle: str) -> datetime:
    return datetime.strptime(cycle, "%Y%m%d%H").replace(tzinfo=timezone.utc)


def parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def iso_z(moment: datetime) -> str:
    return moment.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def select_cycle(points, minimum: int, newest_cycle: str | None = None) -> tuple[str, Members] | None:
    """Newest cycle with at least `minimum` members, from one cycle only.

    A cycle more than STALE_HOURS behind the newest one seen (in `points`, or
    `newest_cycle` when the caller knows of a newer posted file) is refused.
    """
    by_cycle: dict[str, dict[str, list[tuple[int, float, float]]]] = {}
    for p in points:
        by_cycle.setdefault(p.cycle, {}).setdefault(p.tech, []).append((p.tau, p.lat, p.lon))
    if not by_cycle:
        return None
    newest = parse_cycle(max([*by_cycle, *([newest_cycle] if newest_cycle else [])]))
    for cycle in sorted(by_cycle, reverse=True):
        if newest - parse_cycle(cycle) > timedelta(hours=STALE_HOURS):
            break
        members = by_cycle[cycle]
        if len(members) >= minimum:
            return cycle, {tech: sorted(track) for tech, track in members.items()}
    return None


def window(cycle: str, advisory_time: str) -> tuple[datetime, datetime] | None:
    """(start, end) of the counting window, or None if under MIN_WINDOW_HOURS.

    Starts at the later of the advisory and the cycle: a run newer than the
    advisory would otherwise have every member begin after the window opens.
    """
    cycle_dt = parse_cycle(cycle)
    start = max(parse_iso(advisory_time), cycle_dt)
    end = cycle_dt + timedelta(hours=HORIZON_HOURS)
    if end - start < timedelta(hours=MIN_WINDOW_HOURS):
        return None
    return start, end


def fingerprint(members: Members) -> str:
    """SHA-256 of the selected members' rows. Rows cannot be recovered from it,
    so it is safe in the public state.json."""
    rows = sorted(
        (tech, tau, lat, lon) for tech, track in members.items() for tau, lat, lon in track
    )
    return hashlib.sha256(json.dumps(rows, separators=(",", ":")).encode()).hexdigest()
```

- [ ] **Step 4: Run tests**

Run: `python -m pytest ingest/tests/test_density.py -q`
Expected: 9 passed.

- [ ] **Step 5: Commit** (local only, if OK'd)

```bash
git add ingest/gulfwatch/density.py ingest/tests/test_density.py
git commit -m "Pick one complete ensemble cycle and its counting window"
```

---

### Task 3: Strike grid (`density.py` part 2)

**Files:**
- Modify: `ingest/gulfwatch/density.py`
- Test: `ingest/tests/test_density.py` (append)

**Interfaces:**
- Consumes: `parse_cycle`, `Members`.
- Produces: `DensityGrid` dataclass (`fraction: np.ndarray` rows north→south, cols west→east; `eligible: int`; `bounds: ((west, south), (east, north))` rounded to 5 dp; `x0`, `y_top`, `cell_m` floats; `value_at(lat, lon) -> float`; `row_lats()`, `col_lons()`); `strike_grid(members, cycle, start, end, radius_km=RADIUS_KM, minimum=1) -> DensityGrid | None`; `haversine_km(lat1, lon1, lat2, lon2)` (numpy-broadcasting).

- [ ] **Step 1: Write the failing tests** (append)

```python
import math
from datetime import timedelta

import numpy as np

C = "2026100700"
T0 = density.parse_cycle(C)


def _line(lat, lon0, lon1, taus=(0, 120)):
    """Straight track along a parallel, evenly spaced in time."""
    n = len(taus) - 1
    return [(tau, lat, lon0 + (lon1 - lon0) * i / n) for i, tau in enumerate(taus)]


def test_single_track_is_full_inside_radius_and_empty_outside():
    grid = density.strike_grid({"AP01": _line(25.0, -95.0, -85.0)}, C, T0, T0 + timedelta(hours=120))
    assert grid.eligible == 1
    assert grid.value_at(25.0, -90.0) == 1.0
    assert grid.value_at(25.0 + 50 / 111.2, -90.0) == 1.0   # ~50 km north
    assert grid.value_at(25.0 + 150 / 111.2, -90.0) == 0.0  # ~150 km north


def test_two_members_give_half_where_only_one_passes():
    members = {"AP01": _line(25.0, -95.0, -85.0), "AP02": _line(27.0, -95.0, -85.0)}
    grid = density.strike_grid(members, C, T0, T0 + timedelta(hours=120))
    assert grid.value_at(25.0, -90.0) == 0.5
    assert grid.value_at(27.0, -90.0) == 0.5
    assert grid.value_at(26.0, -90.0) == 0.0  # ~111 km from both


def test_member_ending_early_counts_as_non_pass():
    members = {
        "AP01": _line(25.0, -95.0, -85.0),
        "AP02": [(0, 25.0, -95.0), (24, 25.0, -93.0)],  # dissipates
    }
    grid = density.strike_grid(members, C, T0, T0 + timedelta(hours=120))
    assert grid.eligible == 2
    assert grid.value_at(25.0, -86.0) == 0.5


def test_member_starting_after_window_is_ineligible():
    members = {"AP01": _line(25.0, -95.0, -85.0), "AP02": [(6, 25.0, -95.0), (120, 25.0, -85.0)]}
    grid = density.strike_grid(members, C, T0, T0 + timedelta(hours=120))
    assert grid.eligible == 1


def test_pass_between_two_atcf_points_is_caught():
    # 12 h apart, ~600 km: the midpoint has no ATCF row of its own.
    grid = density.strike_grid({"AP01": [(0, 25.0, -90.0), (12, 25.0, -84.0)]}, C, T0, T0 + timedelta(hours=120))
    assert grid.value_at(25.0, -87.0) == 1.0


def test_window_start_interpolates_and_drops_earlier_track():
    start = T0 + timedelta(hours=6)  # track is at -87 here
    grid = density.strike_grid({"AP01": [(0, 25.0, -90.0), (12, 25.0, -84.0)]}, C, start, T0 + timedelta(hours=120))
    assert grid.value_at(25.0, -89.5) == 0.0  # ~250 km before the window start
    assert grid.value_at(25.0, -87.5) == 1.0


def test_ground_cell_size_is_about_10_km():
    grid = density.strike_grid({"AP01": _line(25.0, -95.0, -85.0)}, C, T0, T0 + timedelta(hours=120))
    lats, lons = grid.row_lats(), grid.col_lons()
    mid = len(lats) // 2
    d = density.haversine_km(lats[mid], lons[10], lats[mid], lons[11])
    assert 9.0 <= float(d) <= 11.0


def test_bounds_contain_every_point_within_radius():
    grid = density.strike_grid({"AP01": _line(25.0, -95.0, -85.0)}, C, T0, T0 + timedelta(hours=120))
    (west, south), (east, north) = grid.bounds
    dlat = math.degrees(100 / density.EARTH_RADIUS_KM)
    assert south <= 25.0 - dlat and north >= 25.0 + dlat
    dlon = math.degrees(100 / (density.EARTH_RADIUS_KM * math.cos(math.radians(25.0 + dlat))))
    assert west <= -95.0 - dlon and east >= -85.0 + dlon


def test_below_minimum_eligible_is_none():
    assert density.strike_grid({"AP01": _line(25.0, -95.0, -85.0)}, C, T0, T0 + timedelta(hours=120), minimum=2) is None


def test_all_tracks_before_window_is_none():
    start = T0 + timedelta(hours=48)
    assert density.strike_grid({"AP01": [(0, 25.0, -95.0), (24, 25.0, -93.0)]}, C, start, T0 + timedelta(hours=120)) is None
```

- [ ] **Step 2: Run to verify failure**

Run: `python -m pytest ingest/tests/test_density.py -q`
Expected: FAIL, `AttributeError: module 'gulfwatch.density' has no attribute 'strike_grid'`

- [ ] **Step 3: Implement** (append to `density.py`; add `import math`, `from dataclasses import dataclass`, `import numpy as np` to the imports)

```python
CELL_KM = 10.0
SAMPLE_KM = 10.0
EARTH_RADIUS_KM = 6371.0088
MERCATOR_RADIUS_M = 6378137.0


def haversine_km(lat1, lon1, lat2, lon2):
    """Great-circle distance in km; numpy-broadcasting."""
    p1, p2 = np.radians(lat1), np.radians(lat2)
    dphi = p2 - p1
    dlam = np.radians(np.asarray(lon2) - np.asarray(lon1))
    a = np.sin(dphi / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(dlam / 2) ** 2
    return 2 * EARTH_RADIUS_KM * np.arcsin(np.sqrt(np.minimum(a, 1.0)))


def _merc_x(lon):
    return MERCATOR_RADIUS_M * np.radians(lon)


def _merc_y(lat):
    return MERCATOR_RADIUS_M * np.log(np.tan(np.pi / 4 + np.radians(lat) / 2))


def _lon_of(x):
    return np.degrees(x / MERCATOR_RADIUS_M)


def _lat_of(y):
    return np.degrees(2 * np.arctan(np.exp(y / MERCATOR_RADIUS_M)) - np.pi / 2)


@dataclass
class DensityGrid:
    fraction: np.ndarray  # rows north -> south, cols west -> east
    eligible: int
    bounds: tuple[tuple[float, float], tuple[float, float]]  # ((west, south), (east, north))
    x0: float
    y_top: float
    cell_m: float

    def row_lats(self) -> np.ndarray:
        return _lat_of(self.y_top - (np.arange(self.fraction.shape[0]) + 0.5) * self.cell_m)

    def col_lons(self) -> np.ndarray:
        return _lon_of(self.x0 + (np.arange(self.fraction.shape[1]) + 0.5) * self.cell_m)

    def value_at(self, lat: float, lon: float) -> float:
        col = int((float(_merc_x(lon)) - self.x0) // self.cell_m)
        row = int((self.y_top - float(_merc_y(lat))) // self.cell_m)
        rows, cols = self.fraction.shape
        if 0 <= row < rows and 0 <= col < cols:
            return float(self.fraction[row, col])
        return 0.0


def _sample_track(track, cycle_dt: datetime, start: datetime, end: datetime):
    """Positions no more than SAMPLE_KM apart inside [start, end], with exact
    interpolated endpoints. None = ineligible (no position at or before
    start). An empty array = eligible but no position in the window (the
    member ended earlier): it counts as a non-pass."""
    if not track:
        return None
    hours = [((cycle_dt + timedelta(hours=tau)) - start).total_seconds() / 3600 for tau, _, _ in track]
    if hours[0] > 0:
        return None
    end_h = (end - start).total_seconds() / 3600
    pts = [(h, lat, lon) for h, (_, lat, lon) in zip(hours, track)]
    samples: list[tuple[float, float]] = []
    for (h0, a0, o0), (h1, a1, o1) in zip(pts, pts[1:]):
        if h1 < 0 or h0 > end_h or h1 == h0:
            continue
        lo, hi = max(h0, 0.0), min(h1, end_h)
        la = a0 + (lo - h0) / (h1 - h0) * (a1 - a0)
        oa = o0 + (lo - h0) / (h1 - h0) * (o1 - o0)
        lb = a0 + (hi - h0) / (h1 - h0) * (a1 - a0)
        ob = o0 + (hi - h0) / (h1 - h0) * (o1 - o0)
        n = max(1, math.ceil(float(haversine_km(la, oa, lb, ob)) / SAMPLE_KM))
        for k in range(n + 1):
            f = k / n
            samples.append((la + f * (lb - la), oa + f * (ob - oa)))
    samples.extend((lat, lon) for h, lat, lon in pts if 0 <= h <= end_h)
    return np.array(samples, dtype=float).reshape(-1, 2)


def strike_grid(
    members: Members,
    cycle: str,
    start: datetime,
    end: datetime,
    radius_km: float = RADIUS_KM,
    minimum: int = 1,
) -> DensityGrid | None:
    """Share of eligible members passing within radius_km of each cell.

    The grid is uniform in Web Mercator so the PNG can be placed as a MapLibre
    image source by its corners; distances are great-circle from each cell
    center. Cell size is CELL_KM on the ground at the tracks' mean latitude
    (Mercator size = CELL_KM / cos(lat)). Bounds are the samples' box expanded
    by radius_km along great circles on the same sphere as the distances, then
    snapped outward to whole cells.
    """
    cycle_dt = parse_cycle(cycle)
    sampled = [s for s in (_sample_track(t, cycle_dt, start, end) for t in members.values()) if s is not None]
    eligible = len(sampled)
    if eligible == 0 or eligible < minimum:
        return None
    nonempty = [s for s in sampled if len(s)]
    if not nonempty:
        return None
    pts = np.vstack(nonempty)
    dlat = math.degrees(radius_km / EARTH_RADIUS_KM)
    south, north = float(pts[:, 0].min()) - dlat, float(pts[:, 0].max()) + dlat
    widest = min(89.0, max(abs(south), abs(north)))
    dlon = math.degrees(radius_km / (EARTH_RADIUS_KM * math.cos(math.radians(widest))))
    west, east = float(pts[:, 1].min()) - dlon, float(pts[:, 1].max()) + dlon

    cell_m = CELL_KM * 1000 / math.cos(math.radians(float(pts[:, 0].mean())))
    x0 = float(_merc_x(west))
    ncols = math.ceil((float(_merc_x(east)) - x0) / cell_m)
    y_top = float(_merc_y(north))
    nrows = math.ceil((y_top - float(_merc_y(south))) / cell_m)
    grid = DensityGrid(np.zeros((nrows, ncols)), eligible, ((0, 0), (0, 0)), x0, y_top, cell_m)
    row_lat, col_lon = grid.row_lats(), grid.col_lons()  # row_lat decreasing

    counts = np.zeros((nrows, ncols), dtype=np.int32)
    for samples in sampled:
        mask = np.zeros((nrows, ncols), dtype=bool)
        for lat, lon in samples:
            r0 = int(np.searchsorted(-row_lat, -(lat + dlat), side="left"))
            r1 = int(np.searchsorted(-row_lat, -(lat - dlat), side="right"))
            plon = math.degrees(radius_km / (EARTH_RADIUS_KM * math.cos(math.radians(min(89.0, abs(lat) + dlat)))))
            c0 = int(np.searchsorted(col_lon, lon - plon, side="left"))
            c1 = int(np.searchsorted(col_lon, lon + plon, side="right"))
            if r0 >= r1 or c0 >= c1:
                continue
            d = haversine_km(row_lat[r0:r1, None], col_lon[None, c0:c1], lat, lon)
            mask[r0:r1, c0:c1] |= d <= radius_km
        counts += mask

    grid.fraction = counts / eligible
    grid.bounds = (
        (round(float(_lon_of(x0)), 5), round(float(_lat_of(y_top - nrows * cell_m)), 5)),
        (round(float(_lon_of(x0 + ncols * cell_m)), 5), round(float(_lat_of(y_top)), 5)),
    )
    return grid
```

- [ ] **Step 4: Run tests**

Run: `python -m pytest ingest/tests/test_density.py -q`
Expected: 19 passed. If `test_two_members_give_half...` at 26.0 fails, check `haversine_km` argument order (lat, lon, lat, lon), not the test.

- [ ] **Step 5: Time it on a realistic load** (no commit; a check)

Run:
```bash
python -c "
import time; from datetime import timedelta; from gulfwatch import density
import random; random.seed(1)
C='2026100700'; T0=density.parse_cycle(C)
m={f'F{i:03d}':[(t,22+t/12*0.6+random.uniform(-.5,.5),-93.6+t/12*0.4+random.uniform(-.5,.5)) for t in range(0,121,6)] for i in range(50)}
s=time.time(); g=density.strike_grid(m,C,T0,T0+timedelta(hours=120)); print(g.fraction.shape, round(time.time()-s,2),'s')"
```
(from `ingest/`). Expected: under 5 s. If slower, stop and report; do not optimize speculatively.

- [ ] **Step 6: Commit** (local only, if OK'd)

```bash
git add ingest/gulfwatch/density.py ingest/tests/test_density.py
git commit -m "Count ensemble tracks passing within 100 km on a Mercator grid"
```

---

### Task 4: PNG rendering (`density.py` part 3)

**Files:**
- Modify: `ingest/gulfwatch/density.py`
- Test: `ingest/tests/test_density.py` (append)

**Interfaces:**
- Produces: `BAND_EDGES: tuple[float, ...]` (10 values), `BAND_COLORS: tuple[str, ...]` (10 hex), `render_png(fraction: np.ndarray) -> bytes`.

- [ ] **Step 1: Write the failing test** (append)

```python
import io

from PIL import Image


def test_render_png_bands_and_transparency():
    fraction = np.array([[0.02, 0.05, 0.07], [0.5, 0.95, 1.0]])
    img = Image.open(io.BytesIO(density.render_png(fraction))).convert("RGBA")
    assert img.size == (3, 2)
    px = img.load()
    assert px[0, 0][3] == 0  # below 5%: transparent

    def rgb(hex_color):
        return tuple(int(hex_color[i:i + 2], 16) for i in (1, 3, 5))

    assert px[1, 0][:3] == rgb(density.BAND_COLORS[0])  # exactly 5% -> first band
    assert px[2, 0][:3] == rgb(density.BAND_COLORS[0])
    assert px[0, 1][:3] == rgb(density.BAND_COLORS[5])  # 50-60%
    assert px[1, 1][:3] == rgb(density.BAND_COLORS[9])  # 90%+
    assert px[2, 1][:3] == rgb(density.BAND_COLORS[9])
    assert len(density.BAND_EDGES) == len(density.BAND_COLORS) == 10
```

- [ ] **Step 2: Run to verify failure**

Run: `python -m pytest ingest/tests/test_density.py -q -k render_png`
Expected: FAIL, no attribute `render_png`.

- [ ] **Step 3: Implement** (append; add `import io` and `from PIL import Image` to the imports)

```python
# Lower edges of the drawn bands: 5-10, 10-20, ..., 80-90, 90+ %.
BAND_EDGES = (0.05, 0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90)
# Light blue -> blue -> green -> yellow -> orange -> red, after polarwx's
# density view. Keep in step with DENSITY_BANDS in src/lib/tropical/density.ts.
BAND_COLORS = (
    "#a9dcf2", "#5db5e8", "#2f7fd6", "#3fae49", "#9fd13f",
    "#f3e23a", "#f6b22d", "#f17a24", "#e2432a", "#b5172b",
)


def render_png(fraction: np.ndarray) -> bytes:
    """RGBA PNG, one pixel per grid cell, transparent below the first band.
    Banding (not a continuous ramp) is part of what keeps a density built from
    Google members a finished product rather than recoverable raw data."""
    idx = np.searchsorted(np.array(BAND_EDGES), fraction, side="right") - 1
    palette = np.array(
        [[int(c[i:i + 2], 16) for i in (1, 3, 5)] + [255] for c in BAND_COLORS], dtype=np.uint8
    )
    rgba = np.zeros((*fraction.shape, 4), dtype=np.uint8)
    drawn = idx >= 0
    rgba[drawn] = palette[idx[drawn]]
    buf = io.BytesIO()
    Image.fromarray(rgba).save(buf, format="PNG", optimize=True)
    return buf.getvalue()
```

- [ ] **Step 4: Run tests**

Run: `python -m pytest ingest/tests/ -q`
Expected: all pass.

- [ ] **Step 5: Commit** (local only, if OK'd)

```bash
git add ingest/gulfwatch/density.py ingest/tests/test_density.py
git commit -m "Render the density grid as a banded transparent PNG"
```

---

### Task 5: Google Weather Lab fetch (`weatherlab.py`)

**Files:**
- Create: `ingest/gulfwatch/weatherlab.py`
- Test: `ingest/tests/test_weatherlab.py`

**Interfaces:**
- Consumes: `adeck.extract_members`, `density.select_cycle`, `density.Members`.
- Produces: `weatherlab.ERROR_CODES: frozenset[str]`; `weatherlab.GoogleError(code)` with `.code` and `str(exc) == code`; `weatherlab.file_url(cycle_dt) -> str`; `weatherlab.cycle_candidates(now, count=4) -> list[datetime]`; `weatherlab.fetch_members(storm_id: str, fetch, now: datetime, minimum: int) -> tuple[str, Members]` (raises `GoogleError`); `weatherlab.MEMBER_RE`.

- [ ] **Step 1: Write the failing tests** (`ingest/tests/test_weatherlab.py`)

```python
"""Weather Lab fetch. All Google-format rows here are SYNTHETIC: the repo is
public and real-time Google data may not be committed (see the spec)."""

from datetime import datetime, timezone

import pytest

from gulfwatch import weatherlab

NOW = datetime(2026, 10, 7, 16, 30, tzinfo=timezone.utc)


def google_file(cycle, members, basin="AL", number="09", lat0=12.3, lon0=-61.7):
    lines = ["# SYNTHETIC test data in the Weather Lab ATCF layout", "# BEGIN DATA"]
    for m in range(members):
        for tau in range(0, 121, 12):
            lat = round(lat0 + tau / 12 * 0.3 + m * 0.01, 1)
            lon = round(lon0 - tau / 12 * 0.4, 1)
            lines.append(
                f"{basin}, {number}, {cycle}, 03, F{m:03d}, {tau:3d}, "
                f"{int(round(lat * 10))}N, {int(round(-lon * 10)):4d}W,  45,  998, XX,  34, NEQ"
            )
    return "\n".join(lines) + "\n"


class Resp:
    def __init__(self, status_code=200, text=""):
        self.status_code = status_code
        self.text = text


class Fetch:
    def __init__(self, routes):
        self.routes = routes
        self.calls = []

    def __call__(self, url, timeout=None):
        self.calls.append(url)
        r = self.routes.get(url, Resp(404))
        if isinstance(r, Exception):
            raise r
        return r


def url(cycle):
    return weatherlab.file_url(datetime.strptime(cycle, "%Y%m%d%H").replace(tzinfo=timezone.utc))


def test_file_url_matches_weather_lab_layout():
    assert url("2026100706") == (
        "https://deepmind.google.com/science/weatherlab/download/cyclones/OPER/"
        "ensemble/paired/atcf/OPER_2026_10_07T06_00_atcf_a_deck.txt"
    )


def test_cycle_candidates_newest_first_on_six_hour_grid():
    assert [c.hour for c in weatherlab.cycle_candidates(NOW)] == [12, 6, 0, 18]


def test_skips_unposted_newest_cycle_and_returns_members():
    fetch = Fetch({url("2026100706"): Resp(200, google_file("2026100706", 50))})
    cycle, members = weatherlab.fetch_members("al092026", fetch, NOW, minimum=40)
    assert cycle == "2026100706"
    assert len(members) == 50
    assert fetch.calls[0] == url("2026100712")


def test_continues_past_a_file_below_minimum():
    fetch = Fetch({
        url("2026100712"): Resp(200, google_file("2026100712", 12)),
        url("2026100706"): Resp(200, google_file("2026100706", 50)),
    })
    cycle, _ = weatherlab.fetch_members("al092026", fetch, NOW, minimum=40)
    assert cycle == "2026100706"


def test_too_few_everywhere_is_a_code():
    fetch = Fetch({url("2026100706"): Resp(200, google_file("2026100706", 12))})
    with pytest.raises(weatherlab.GoogleError) as exc:
        weatherlab.fetch_members("al092026", fetch, NOW, minimum=40)
    assert exc.value.code == "google_too_few_members"
    assert str(exc.value) == "google_too_few_members"


def test_storm_missing_from_posted_files_is_no_storm():
    fetch = Fetch({url("2026100706"): Resp(200, google_file("2026100706", 50, basin="EP", number="15"))})
    with pytest.raises(weatherlab.GoogleError) as exc:
        weatherlab.fetch_members("al092026", fetch, NOW, minimum=40)
    assert exc.value.code == "google_no_storm"


def test_nothing_posted_or_network_error_is_unavailable():
    fetch = Fetch({url("2026100712"): RuntimeError("boom 123N 617W")})
    with pytest.raises(weatherlab.GoogleError) as exc:
        weatherlab.fetch_members("al092026", fetch, NOW, minimum=40)
    assert exc.value.code == "google_unavailable"


def test_parse_failure_is_a_code_without_input_text(monkeypatch):
    def boom(*a, **k):
        raise ValueError("F001 123N 617W")
    monkeypatch.setattr(weatherlab.adeck, "extract_members", boom)
    fetch = Fetch({url("2026100712"): Resp(200, google_file("2026100712", 50))})
    with pytest.raises(weatherlab.GoogleError) as exc:
        weatherlab.fetch_members("al092026", fetch, NOW, minimum=40)
    assert str(exc.value) == "google_parse_failed"
    assert exc.value.__cause__ is None and exc.value.__suppress_context__


def test_unknown_code_rejected():
    with pytest.raises(ValueError):
        weatherlab.GoogleError("F001 123N")
```

- [ ] **Step 2: Run to verify failure**

Run: `python -m pytest ingest/tests/test_weatherlab.py -q`
Expected: ERROR, cannot import `weatherlab`.

- [ ] **Step 3: Implement** (`ingest/gulfwatch/weatherlab.py`)

```python
"""Google DeepMind Weather Lab ensemble members, for the track-density layer.

Weather Lab publishes every member track (OPER model, 50 members, techs
F000-F049) as ATCF a-deck text, no sign-in. The URL layout comes from the
`weathernext-download` package (cli.py BASE_URL + filename_for) and was
confirmed against live files 2026-10-07.

TERMS: every file binds the user to
https://storage.googleapis.com/weathernext-public/terms-of-use.pdf. Raw or
recolored tracks may not be published; a non-retrievable derived product may,
with Google's citation. So members stay in memory: this module never writes,
prints, or puts file content in an exception. Errors are allowlisted codes.
The repo, its Actions logs, the blob store and manifest.errors are all public.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

from gulfwatch import adeck, density

BASE_URL = "https://deepmind.google.com/science/weatherlab/download/cyclones"
MODEL = "OPER"
MEMBER_RE = re.compile(r"^F\d{3}$")
CANDIDATE_CYCLES = 4
TIMEOUT_S = 30

ERROR_CODES = frozenset({
    "google_unavailable",
    "google_no_storm",
    "google_too_few_members",
    "google_parse_failed",
    "google_render_failed",
    "google_upload_failed",
    "google_failed",
})


class GoogleError(Exception):
    """Carries only an allowlisted code -- never input text."""

    def __init__(self, code: str):
        if code not in ERROR_CODES:
            raise ValueError("unknown Weather Lab error code")
        super().__init__(code)
        self.code = code


def file_url(cycle_dt: datetime) -> str:
    stamp = cycle_dt.strftime("%Y_%m_%dT%H")
    return f"{BASE_URL}/{MODEL}/ensemble/paired/atcf/{MODEL}_{stamp}_00_atcf_a_deck.txt"


def cycle_candidates(now: datetime, count: int = CANDIDATE_CYCLES) -> list[datetime]:
    now = now.astimezone(timezone.utc)
    newest = now.replace(hour=now.hour - now.hour % 6, minute=0, second=0, microsecond=0)
    return [newest - timedelta(hours=6 * i) for i in range(count)]


def fetch_members(storm_id: str, fetch, now: datetime, minimum: int) -> tuple[str, density.Members]:
    """Newest qualifying cycle's members for `storm_id` (e.g. "al092026").

    Walks the newest CANDIDATE_CYCLES synoptic cycles newest first. A 404 is
    the normal "not posted yet" answer, so there is no retry-with-sleep. Keeps
    going past a file with fewer than `minimum` members for this storm.
    """
    basin, number = storm_id[:2].upper(), storm_id[2:4]
    newest_posted: str | None = None
    saw_storm = False
    too_few = False
    for cycle_dt in cycle_candidates(now):
        try:
            resp = fetch(file_url(cycle_dt), timeout=TIMEOUT_S)
        except Exception:  # noqa: BLE001 - network failure -> try an older cycle
            continue
        if resp.status_code != 200:
            continue
        cycle = cycle_dt.strftime("%Y%m%d%H")
        newest_posted = newest_posted or cycle
        try:
            points = adeck.extract_members(resp.text, MEMBER_RE, basin=basin, number=number)
        except Exception:  # noqa: BLE001
            raise GoogleError("google_parse_failed") from None
        if not points:
            continue
        saw_storm = True
        selected = density.select_cycle(points, minimum, newest_cycle=newest_posted)
        if selected is not None:
            return selected
        too_few = True
    if too_few:
        raise GoogleError("google_too_few_members")
    if newest_posted and not saw_storm:
        raise GoogleError("google_no_storm")
    raise GoogleError("google_unavailable")
```

- [ ] **Step 4: Run tests**

Run: `python -m pytest ingest/tests/ -q`
Expected: all pass.

- [ ] **Step 5: Commit** (local only, if OK'd)

```bash
git add ingest/gulfwatch/weatherlab.py ingest/tests/test_weatherlab.py
git commit -m "Fetch Google Weather Lab members in memory with allowlisted errors"
```

---

### Task 6: Pipeline wiring, state, manifest and leak tests

**Files:**
- Modify: `ingest/gulfwatch/pipeline.py` (imports line 34; `_process_adeck` line 493; `_process_storm` lines 606–760; new helpers before `_process_storm`)
- Test: `ingest/tests/test_pipeline.py` (append)

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces: manifest storm entry key `density: {gefs?: P, google?: P}` where `P = {image, bounds: [[w,s],[e,n]], cycle, members, expected, radiusKm, start, end}`; state storm key `density: {"version": 1, "entries": {kind: P + {"advisory", "fp"}}}` written only when entries exist; `pipeline._utcnow()`; `pipeline._google_density_enabled()`.

- [ ] **Step 1: Write the failing tests** (append to `ingest/tests/test_pipeline.py`)

```python
# ---------------------------------------------------------------------------
# Track density (spec 2026-10-07). Google rows are SYNTHETIC (public repo).
# ---------------------------------------------------------------------------
import re as _re
from datetime import datetime as _dt, timezone as _tz

from gulfwatch import weatherlab

DENSITY_NOW = _dt(2026, 7, 23, 1, 0, tzinfo=_tz.utc)
GOOGLE_18Z_URL = weatherlab.file_url(_dt(2026, 7, 22, 18, tzinfo=_tz.utc))
GOOGLE_00Z_URL = weatherlab.file_url(_dt(2026, 7, 23, 0, tzinfo=_tz.utc))


def _gefs_rows(cycle="2026072218", members=30):
    rows = []
    for m in range(1, members + 1):
        for tau in range(0, 121, 12):
            lat = 295 + tau // 12 * 3 + m % 3
            lon = 905 + tau // 12 * 6
            rows.append(f"AL, 02, {cycle}, 03, AP{m:02d}, {tau:3d}, {lat}N, {lon:4d}W,  40, 1002, TS\n")
    return "".join(rows)


def _google_text(members=45):
    # Caribbean coordinates, far from every Bertha fixture, so a leak is findable.
    lines = ["# SYNTHETIC test data in the Weather Lab ATCF layout"]
    for m in range(members):
        for tau in range(0, 121, 12):
            lines.append(
                f"AL, 02, 2026072218, 03, F{m:03d}, {tau:3d}, "
                f"{117 + tau // 12 * 2 + m % 4}N, {613 + tau // 12 * 3:4d}W,  45,  998, XX,  34, NEQ"
            )
    lines.append("AL, 02, 2026072218, 03, F099,  12, 1X9N,  619W,  45,  998, XX,  34, NEQ")  # malformed
    return "\n".join(lines) + "\n"


def _google_decimals():
    out = set()
    for m in range(45):
        for tau in range(0, 121, 12):
            out.add(f"{(117 + tau // 12 * 2 + m % 4) / 10:.1f}")
            out.add(f"-{(613 + tau // 12 * 3) / 10:.1f}")
    return out


def _density_routes(google_text=None):
    routes = {
        nhc.CURRENT_STORMS_URL: FakeResponse(json_data=CURRENT_STORMS_JSON),
        BERTHA_GIS_URL: FakeResponse(content=SAMPLE_CONE_ZIP),
        BERTHA_ADECK_URL: FakeResponse(content=_adeck_gz(BERTHA_ADECK_TEXT + _gefs_rows())),
        GOOGLE_00Z_URL: FakeResponse(status_code=404, text=""),
    }
    if google_text is not None:
        routes[GOOGLE_18Z_URL] = FakeResponse(content=google_text.encode())
    routes.update(_outlook_routes())
    routes.update(_bertha_text_product_routes())
    return routes


@pytest.fixture
def density_clock(monkeypatch):
    monkeypatch.setattr(pipeline_module, "_utcnow", lambda: DENSITY_NOW)


def _assert_no_google_leak(store, manifest, captured):
    tech = _re.compile(r"\bF\d{3}\b")
    decimals = _google_decimals()
    public_text = [json.dumps(manifest), json.dumps(store.data.get("state.json")), captured.out, captured.err]
    for path, obj in store.data.items():
        if not isinstance(obj, (bytes, bytearray)):
            public_text.append(json.dumps(obj))
    for text in public_text:
        assert not tech.search(text), "Google member tech published"
        for d in decimals:
            assert not _re.search(rf"(?<![\d.]){_re.escape(d)}(?!\d)", text), f"Google coordinate {d} published"
    for err in manifest["errors"]:
        if ".density.google" in err["product"]:
            assert err["message"] in weatherlab.ERROR_CODES


def test_gefs_density_advertised_after_upload(density_clock):
    store = FakeStore()
    manifest = run(fetch=FakeFetch(_density_routes()), store=store)
    entry = manifest["storms"][0]["density"]["gefs"]
    assert set(entry) == {"image", "bounds", "cycle", "members", "expected", "radiusKm", "start", "end"}
    assert entry["cycle"] == "2026072218"
    assert entry["members"] == 30 and entry["expected"] == 30 and entry["radiusKm"] == 100
    assert entry["start"] == "2026-07-23T00:00:00Z" and entry["end"] == "2026-07-27T18:00:00Z"
    assert entry["image"].startswith("storms/al022026/density-gefs-2026072218-20260723T0000Z-")
    assert isinstance(store.data[entry["image"]], bytes)
    assert "google" not in manifest["storms"][0]["density"]
    state = store.data["state.json"]["storms"]["al022026"]["density"]
    assert state["version"] == 1 and state["entries"]["gefs"]["fp"]


def test_gefs_density_not_rerendered_when_identity_unchanged(density_clock):
    store = FakeStore()
    run(fetch=FakeFetch(_density_routes()), store=store)
    first = [p for p in store.put_calls if "density-" in p]
    store.put_calls.clear()
    run(fetch=FakeFetch(_density_routes()), store=store)
    assert [p for p in store.put_calls if "density-" in p] == []
    assert first


def test_late_member_in_same_cycle_rebuilds(density_clock):
    store = FakeStore()
    routes = _density_routes()
    routes[BERTHA_ADECK_URL] = FakeResponse(content=_adeck_gz(BERTHA_ADECK_TEXT + _gefs_rows(members=29)))
    first = run(fetch=FakeFetch(routes), store=store)["storms"][0]["density"]["gefs"]["image"]
    second = run(fetch=FakeFetch(_density_routes()), store=store)["storms"][0]["density"]["gefs"]
    assert second["image"] != first and second["members"] == 30


def test_failed_density_upload_not_advertised_and_retried(density_clock):
    class FlakyStore(FakeStore):
        fail = True

        def put_bytes(self, path, data, content_type):
            if "density-gefs" in path and self.fail:
                raise RuntimeError("simulated store failure")
            super().put_bytes(path, data, content_type)

    store = FlakyStore()
    manifest = run(fetch=FakeFetch(_density_routes()), store=store)
    assert "density" not in manifest["storms"][0]
    assert any(e["product"] == "al022026.density.gefs" for e in manifest["errors"])
    store.fail = False
    manifest = run(fetch=FakeFetch(_density_routes()), store=store)
    assert "gefs" in manifest["storms"][0]["density"]


def test_google_density_built_when_flag_on_and_nothing_leaks(density_clock, monkeypatch, capsys):
    monkeypatch.setenv("GOOGLE_DENSITY_ENABLED", "1")
    store = FakeStore()
    manifest = run(fetch=FakeFetch(_density_routes(_google_text())), store=store)
    google = manifest["storms"][0]["density"]["google"]
    assert google["members"] == 45 and google["expected"] == 50
    assert google["image"].startswith("storms/al022026/density-google-2026072218-")
    _assert_no_google_leak(store, manifest, capsys.readouterr())


def test_google_density_not_advertised_when_flag_off(density_clock, monkeypatch):
    monkeypatch.setenv("GOOGLE_DENSITY_ENABLED", "1")
    store = FakeStore()
    run(fetch=FakeFetch(_density_routes(_google_text())), store=store)
    monkeypatch.delenv("GOOGLE_DENSITY_ENABLED")
    fetch = FakeFetch(_density_routes(_google_text()))
    manifest = run(fetch=fetch, store=store)
    assert "google" not in manifest["storms"][0].get("density", {})
    assert GOOGLE_18Z_URL not in fetch.calls
    assert "google" not in store.data["state.json"]["storms"]["al022026"]["density"]["entries"]


@pytest.mark.parametrize("target,expected_code", [
    ("gulfwatch.adeck.extract_members", "google_parse_failed"),
    ("gulfwatch.density.render_png", "google_render_failed"),
])
def test_google_failures_publish_only_codes(density_clock, monkeypatch, capsys, target, expected_code):
    monkeypatch.setenv("GOOGLE_DENSITY_ENABLED", "1")
    module_name, attr = target.rsplit(".", 1)
    import importlib
    module = importlib.import_module(module_name)
    real = getattr(module, attr)

    def boom(*args, **kwargs):
        # Only break the Google call; leave GEFS working.
        text = args[0] if args else None
        if attr == "extract_members" and isinstance(text, str) and "F000" not in text:
            return real(*args, **kwargs)
        if attr == "render_png" and not getattr(boom, "armed", False):
            boom.armed = True  # first call is GEFS, second is Google
            return real(*args, **kwargs)
        raise ValueError("F001 1X9N 619W 11.7 -61.3")

    monkeypatch.setattr(module, attr, boom)
    store = FakeStore()
    manifest = run(fetch=FakeFetch(_density_routes(_google_text())), store=store)
    codes = [e["message"] for e in manifest["errors"] if e["product"] == "al022026.density.google"]
    assert codes == [expected_code]
    assert "google" not in manifest["storms"][0].get("density", {})
    _assert_no_google_leak(store, manifest, capsys.readouterr())


def test_google_upload_failure_publishes_only_code(density_clock, monkeypatch, capsys):
    monkeypatch.setenv("GOOGLE_DENSITY_ENABLED", "1")

    class NoGoogleUploads(FakeStore):
        def put_bytes(self, path, data, content_type):
            if "density-google" in path:
                raise RuntimeError(f"cannot write {path} 11.7 -61.3 F001")
            super().put_bytes(path, data, content_type)

    store = NoGoogleUploads()
    manifest = run(fetch=FakeFetch(_density_routes(_google_text())), store=store)
    codes = [e["message"] for e in manifest["errors"] if e["product"] == "al022026.density.google"]
    assert codes == ["google_upload_failed"]
    _assert_no_google_leak(store, manifest, capsys.readouterr())


def test_storm_without_members_has_no_density_key(density_clock):
    routes = _density_routes()
    routes[BERTHA_ADECK_URL] = FakeResponse(content=_adeck_gz(BERTHA_ADECK_TEXT))
    store = FakeStore()
    manifest = run(fetch=FakeFetch(routes), store=store)
    assert "density" not in manifest["storms"][0]
    assert "density" not in store.data["state.json"]["storms"]["al022026"]
```

Check `FakeResponse(status_code=404, text="")`: its `raise_for_status` raises, but `weatherlab` reads `status_code` directly, which is what is under test.

- [ ] **Step 2: Run to verify failure**

Run: `python -m pytest ingest/tests/test_pipeline.py -q -k "density"`
Expected: FAIL (`AttributeError: ... '_utcnow'` or missing `density` key).

- [ ] **Step 3: Implement**

3a. Imports (`pipeline.py` line 34 and the stdlib imports above it):

```python
import os
from gulfwatch import adeck, aifs, blob, density, nhc, outlook, probs, satellite, shp, text, weatherlab, windprob
```

3b. `_process_adeck` gains a sink (signature line 493, and one line after decompress):

```python
def _process_adeck(storm, paths, prev_cycle, fetch, store, errors, force=False, rebuild=False, sink=None):
```
```python
        text = gzip.decompress(resp.content).decode("latin-1")
        # The raw text is also the GEFS member source for the density layer,
        # so it is handed back rather than downloaded twice.
        if sink is not None:
            sink["text"] = text
        parsed = adeck.parse_adeck(text, reference_time=storm.advisory_time)
```

3c. New helpers, placed just above `_process_storm`:

```python
# Bump when the meaning of state.json's "density" record changes (same reason
# as _GIS_STATE_VERSION: a stale record must be re-derived, not trusted).
_DENSITY_STATE_VERSION = 1
_DENSITY_PUBLIC_KEYS = ("image", "bounds", "cycle", "members", "expected", "radiusKm", "start", "end")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _google_density_enabled() -> bool:
    # Release gate for the Google layer, default off. Off means no fetch, no
    # upload and no manifest entry. Stays off until Google agrees in writing to
    # the Restricted Country clause of its terms (see the density spec).
    return os.environ.get("GOOGLE_DENSITY_ENABLED") == "1"


class _DensityStepError(Exception):
    def __init__(self, step: str):
        super().__init__(step)
        self.step = step  # "render" | "upload"


def _build_density(kind, storm, selected, store, prev):
    """Return the state entry for one ensemble's density, re-rendering only
    when (cycle, advisory, input fingerprint) changed. None = no image."""
    if selected is None:
        return None
    cycle, members = selected
    span = density.window(cycle, storm.advisory_time)
    if span is None:
        return None
    fp = density.fingerprint(members)
    if prev and (prev.get("cycle"), prev.get("advisory"), prev.get("fp")) == (cycle, storm.advisory_time, fp):
        return prev
    try:
        grid = density.strike_grid(members, cycle, span[0], span[1], minimum=density.MINIMUM_MEMBERS[kind])
        if grid is None:
            return None
        png = density.render_png(grid.fraction)
    except Exception as exc:  # noqa: BLE001
        raise _DensityStepError("render") from exc
    stamp = density.parse_iso(storm.advisory_time).strftime("%Y%m%dT%H%MZ")
    path = f"storms/{storm.id}/density-{kind}-{cycle}-{stamp}-{fp[:8]}.png"
    try:
        store.put_bytes(path, png, "image/png")
    except Exception as exc:  # noqa: BLE001
        raise _DensityStepError("upload") from exc
    return {
        "image": path,
        "bounds": [list(grid.bounds[0]), list(grid.bounds[1])],
        "cycle": cycle,
        "members": grid.eligible,
        "expected": density.EXPECTED_MEMBERS[kind],
        "radiusKm": int(density.RADIUS_KM),
        "start": density.iso_z(span[0]),
        "end": density.iso_z(span[1]),
        "advisory": storm.advisory_time,
        "fp": fp,
    }


def _process_density(storm, adeck_text, fetch, store, errors, prev_state):
    """Track-density entries for one storm. Identity is saved only once its
    image has uploaded, so a failed upload is retried next run."""
    prev = prev_state.get("entries", {}) if prev_state.get("version") == _DENSITY_STATE_VERSION else {}
    entries: dict = {}

    # GEFS: members from the a-deck already downloaded this run (public domain).
    if adeck_text is None:
        if prev.get("gefs"):
            entries["gefs"] = prev["gefs"]  # a-deck failed this run: carry forward
    else:
        try:
            points = adeck.extract_members(adeck_text, adeck.GEFS_MEMBER_RE)
            selected = density.select_cycle(points, density.MINIMUM_MEMBERS["gefs"])
            entry = _build_density("gefs", storm, selected, store, prev.get("gefs"))
            if entry:
                entries["gefs"] = entry
        except _DensityStepError as exc:
            errors.append({"product": f"{storm.id}.density.gefs", "message": f"{exc.step} failed: {exc.__cause__}"})
            if prev.get("gefs"):
                entries["gefs"] = prev["gefs"]
        except Exception as exc:  # noqa: BLE001
            errors.append({"product": f"{storm.id}.density.gefs", "message": str(exc)})

    # Google: in memory only; every failure is an allowlisted code, never text.
    if _google_density_enabled():
        product = f"{storm.id}.density.google"
        try:
            selected = weatherlab.fetch_members(storm.id, fetch, _utcnow(), density.MINIMUM_MEMBERS["google"])
            entry = _build_density("google", storm, selected, store, prev.get("google"))
            if entry:
                entries["google"] = entry
        except weatherlab.GoogleError as exc:
            errors.append({"product": product, "message": exc.code})
            if exc.code == "google_unavailable" and prev.get("google"):
                entries["google"] = prev["google"]
        except _DensityStepError as exc:
            errors.append({"product": product, "message": f"google_{exc.step}_failed"})
            if prev.get("google"):
                entries["google"] = prev["google"]
        except Exception:  # noqa: BLE001
            errors.append({"product": product, "message": "google_failed"})
    return entries


def _density_manifest(entries, storm):
    out = {}
    for kind, entry in entries.items():
        if kind == "google" and not _google_density_enabled():
            continue
        if density.window(entry["cycle"], storm.advisory_time) is None:
            continue  # stale: under 24 h of window left
        out[kind] = {key: entry[key] for key in _DENSITY_PUBLIC_KEYS}
    return out
```

The `prev.get("google")` carry-forward after a render/upload failure is still filtered by `_density_manifest`, and the parametrized failure test starts from an empty store, so it expects no Google entry.

3d. `_process_storm`: pass a sink to `_process_adeck` and call density after it:

```python
    adeck_sink: dict = {}
    new_cycle, fresh_adeck = _process_adeck(
        storm,
        paths,
        prev_cycle,
        fetch,
        store,
        errors,
        force=prev_adeck is None,
        rebuild=advisory_changed,
        sink=adeck_sink,
    )
```
(keep the existing comment above `rebuild=`), then after the `adeck_keys = ...` line:

```python
    density_entries = _process_density(
        storm, adeck_sink.get("text"), fetch, store, errors, prev_storm_state.get("density", {})
    )
```

After `if sat: manifest_entry["satellite"] = sat`:

```python
    density_manifest = _density_manifest(density_entries, storm)
    if density_manifest:
        manifest_entry["density"] = density_manifest
```

At the end of `next_state` construction (before `return`):

```python
    if density_entries:
        next_state["density"] = {"version": _DENSITY_STATE_VERSION, "entries": density_entries}
```

- [ ] **Step 4: Run all Python tests**

Run: `python -m pytest ingest/tests/ -q`
Expected: all pass, including the 153 originals (Bertha's real deck has no AP members, so existing manifests and states are unchanged).

- [ ] **Step 5: Commit** (local only, if OK'd)

```bash
git add ingest/gulfwatch/pipeline.py ingest/tests/test_pipeline.py
git commit -m "Build and advertise GEFS and gated Google density in the hourly ingest"
```

---

### Task 7: Local Node environment and front-end data layer

**Files:**
- Modify: `src/lib/tropical/types.ts`, `src/lib/tropical/layers.ts`, `src/lib/tropical/useDashboard.tsx`
- Create: `src/lib/tropical/density.ts`
- Test: `src/lib/tropical/__tests__/layers.test.ts`, `src/lib/tropical/__tests__/useDashboard.test.ts`, `src/lib/tropical/__tests__/density.test.ts` (create)

**Interfaces:**
- Produces (TS): `DensitySource = "gefs" | "google"`; `DensityProduct {image; bounds: [[number, number], [number, number]]; cycle; members; expected; radiusKm; start; end}`; `StormEntry.density?: Partial<Record<DensitySource, DensityProduct>>`; `DensityChoice = "off" | DensitySource`; `LayerState.density: DensityChoice`; `setDensity(state, choice): LayerState`; `DashboardData.geo.density: Partial<Record<DensitySource, DensityProduct & { url: string }>>`; `publicIngestIssues(errors)`; from `density.ts`: `DENSITY_BANDS`, `DENSITY_SOURCE_LABEL`, `densityCaption(source, product)`, `DENSITY_DISCLAIMER`, `GOOGLE_CITATION_PARTS {before, url, after}`.

- [ ] **Step 1: Set up x64 Node (needs Jeff's OK for the download)**

Ask Jeff first: "Download Node.js 24 for Windows x64 (`node-v24.x-win-x64.zip`, ~32 MB, from nodejs.org/dist/latest-v24.x/) into the scratchpad?" Only on yes:

```bash
SP="C:/Users/jeffm/AppData/Local/Temp/claude/C--Users-jeffm/ca9f1d83-14e7-4221-bffd-3fc20e4efe95/scratchpad"
cd "$SP" && curl -sO https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt
ZIP=$(grep -o 'node-v24[^ ]*-win-x64.zip' SHASUMS256.txt) && curl -sO "https://nodejs.org/dist/latest-v24.x/$ZIP"
grep " $ZIP\$" SHASUMS256.txt | sha256sum -c - && unzip -q "$ZIP" && ls -d node-v24*-win-x64
```
Expected: `OK`, then the folder name. Then, in the worktree:

```bash
NODE64="$SP/$(cd "$SP" && ls -d node-v24*-win-x64)"
cd /c/Users/jeffm/fpa-lens-density && PATH="$NODE64:$PATH" node -p "process.arch" && PATH="$NODE64:$PATH" npm ci
```
Expected: `x64`, then install completes. If `npm ci` fails, read the error; do not retry blindly. Fallback if Jeff declines the download: native `npm ci` (ARM64) for tests and type-checks only, and the preview becomes a Vercel branch preview that needs Jeff's push OK.

Baseline: `PATH="$NODE64:$PATH" npm test` → record the pass count.

- [ ] **Step 2: Write the failing tests**

`src/lib/tropical/__tests__/layers.test.ts`: add `density: "off",` to both `toEqual` objects (after `radar: false,`), and append:

```ts
import { setDensity } from "../layers";

describe("setDensity", () => {
  it("sets the density choice without touching boolean layers", () => {
    const next = setDensity(DEFAULT_LAYER_STATE, "gefs");
    expect(next.density).toBe("gefs");
    expect(next.cone).toBe(DEFAULT_LAYER_STATE.cone);
    expect(next).not.toBe(DEFAULT_LAYER_STATE);
  });
});
```

`src/lib/tropical/__tests__/useDashboard.test.ts`: add `publicIngestIssues` to the import list and append:

```ts
describe("publicIngestIssues", () => {
  it("hides aifs and density errors, which degrade to a disabled option", () => {
    expect(
      publicIngestIssues([
        { product: "aifs", message: "x" },
        { product: "al092026.density.gefs", message: "render failed: x" },
        { product: "al092026.density.google", message: "google_unavailable" },
        { product: "al092026.models", message: "boom" },
      ])
    ).toEqual([{ product: "al092026.models", message: "Latest ingest was incomplete" }]);
  });
});
```

`src/lib/tropical/__tests__/density.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DENSITY_BANDS, densityCaption, GOOGLE_CITATION_PARTS } from "../density";

const product = {
  image: "storms/al092026/density-gefs.png",
  bounds: [[-97, 18], [-84, 33]] as [[number, number], [number, number]],
  cycle: "2026100706",
  members: 28,
  expected: 30,
  radiusKm: 100,
  start: "2026-10-07T15:00:00Z",
  end: "2026-10-12T06:00:00Z",
};

describe("densityCaption", () => {
  it("states what is counted, the real window and the member count", () => {
    const text = densityCaption("gefs", product);
    expect(text).toContain("Share of GFS ensemble tracks whose center passes within about 60 miles (100 km)");
    expect(text).toContain("28 of 30 members");
    expect(text).toContain("06Z Oct 7 run");
    expect(text).not.toContain("5 days");
  });
});

describe("DENSITY_BANDS", () => {
  it("matches the ingest's ten bands", () => {
    expect(DENSITY_BANDS.map((b) => b.color)).toEqual([
      "#a9dcf2", "#5db5e8", "#2f7fd6", "#3fae49", "#9fd13f",
      "#f3e23a", "#f6b22d", "#f17a24", "#e2432a", "#b5172b",
    ]);
  });
});

describe("GOOGLE_CITATION_PARTS", () => {
  it("reassembles Google's required citation verbatim", () => {
    const { before, url, after } = GOOGLE_CITATION_PARTS;
    expect(before + url + after).toBe(
      "Google Weather Lab. © 2024-6 Google LLC, whose machine learning models were used to create the experimental data made available under the following licence terms https://storage.googleapis.com/weathernext-public/terms-of-use.pdf. This data is intended for experimental modelling only and is not intended, validated, or approved for real world use."
    );
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `PATH="$NODE64:$PATH" npx vitest run src/lib/tropical/__tests__/layers.test.ts src/lib/tropical/__tests__/useDashboard.test.ts src/lib/tropical/__tests__/density.test.ts`
Expected: FAIL (missing exports, `density` key absent).

- [ ] **Step 4: Implement**

`types.ts` (before `StormEntry`):

```ts
export type DensitySource = "gefs" | "google";

/** One ensemble's track-density image (ingest/gulfwatch/density.py). The
 * value is the share of member tracks whose center passes within radiusKm,
 * between start and end -- not a calibrated probability. */
export interface DensityProduct {
  image: string;
  bounds: [[number, number], [number, number]];
  cycle: string;
  members: number;
  expected: number;
  radiusKm: number;
  start: string;
  end: string;
}
```
and in `StormEntry`, after `radar?`:

```ts
  /** Track-density images, advertised only once uploaded. Google's is gated
   * off in the ingest until its terms question is settled. */
  density?: Partial<Record<DensitySource, DensityProduct>>;
```

`layers.ts`: `import type { DensitySource } from "./types";`, add `export type DensityChoice = "off" | DensitySource;`, add to `LayerState`:

```ts
  /** Track-density image under the cone and tracks. Not a boolean, so it is
   *  set with setDensity, never toggleLayer. */
  density: DensityChoice;
```
add `density: "off",` to both `DEFAULT_LAYER_STATE` and `DEMO_LAYER_STATE`, and:

```ts
/** Pure: choose which ensemble's density is drawn ("off" for none). */
export function setDensity(state: LayerState, choice: DensityChoice): LayerState {
  return { ...state, density: choice };
}
```
`LayerKey` is unchanged, so `toggleLayer` stays boolean-only.

`src/lib/tropical/density.ts`:

```ts
import type { DensityProduct, DensitySource } from "./types";
import { cdtDateTime, formatCycle } from "./format";

/** Keep in step with BAND_EDGES / BAND_COLORS in ingest/gulfwatch/density.py. */
export const DENSITY_BANDS: { from: number; color: string }[] = [
  { from: 5, color: "#a9dcf2" },
  { from: 10, color: "#5db5e8" },
  { from: 20, color: "#2f7fd6" },
  { from: 30, color: "#3fae49" },
  { from: 40, color: "#9fd13f" },
  { from: 50, color: "#f3e23a" },
  { from: 60, color: "#f6b22d" },
  { from: 70, color: "#f17a24" },
  { from: 80, color: "#e2432a" },
  { from: 90, color: "#b5172b" },
];

export const DENSITY_SOURCE_LABEL: Record<DensitySource, string> = {
  gefs: "GFS ensemble",
  google: "Google DeepMind AI ensemble",
};

export const DENSITY_DISCLAIMER =
  "Shows where the storm's center may go, not where wind, surge or rain will reach.";

/** Google's Section 4(b) citation, verbatim (its spelling, not ours), split
 * so the terms URL can be a link. */
export const GOOGLE_CITATION_PARTS = {
  before:
    "Google Weather Lab. © 2024-6 Google LLC, whose machine learning models were used to create the experimental data made available under the following licence terms ",
  url: "https://storage.googleapis.com/weathernext-public/terms-of-use.pdf",
  after:
    ". This data is intended for experimental modelling only and is not intended, validated, or approved for real world use.",
};

function cycleLabel(cycle: string): string {
  const date = new Date(Date.UTC(+cycle.slice(0, 4), +cycle.slice(4, 6) - 1, +cycle.slice(6, 8)));
  const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
  return `${formatCycle(cycle)} ${day}`;
}

export function densityCaption(source: DensitySource, p: DensityProduct): string {
  const miles = Math.round((p.radiusKm * 0.621371) / 5) * 5;
  return (
    `Share of ${DENSITY_SOURCE_LABEL[source]} tracks whose center passes within about ${miles} miles ` +
    `(${p.radiusKm} km), ${cdtDateTime(p.start)} through ${cdtDateTime(p.end)}. ` +
    `${p.members} of ${p.expected} members, ${cycleLabel(p.cycle)} run.`
  );
}
```

`useDashboard.tsx`: import `DensityProduct, DensitySource` types; add to `DashboardData.geo`:

```ts
    /** Track-density images for the selected storm, keyed by ensemble. */
    density: Partial<Record<DensitySource, DensityProduct & { url: string }>>;
```
export the filter (above `useDashboardSource`):

```ts
/** Ingest errors worth telling visitors about. Density (like AIFS) degrades
 * to a disabled option instead, so it is not listed as an outage. */
export function publicIngestIssues(
  errors: { product: string; message: string }[]
): { product: string; message: string }[] {
  return errors
    .filter((issue) => issue.product !== "aifs" && !issue.product.includes(".density."))
    .map((issue) => ({ product: issue.product, message: "Latest ingest was incomplete" }));
}
```
replace the `for (const issue of manifest?.errors ?? [])` loop (lines 409–413) with `issues.push(...publicIngestIssues(manifest?.errors ?? []));`. After the `satellite` const (line ~351):

```ts
  const density: DashboardData["geo"]["density"] = {};
  for (const [source, product] of Object.entries(storm?.density ?? {}) as [DensitySource, DensityProduct][]) {
    density[source] = { ...product, url: stormFileUrl(product.image) };
  }
```
and add `density,` to the returned `geo`.

- [ ] **Step 5: Run tests and type-check**

Run: `PATH="$NODE64:$PATH" npm test` then `PATH="$NODE64:$PATH" npx tsc --noEmit`
Expected: tests pass (baseline + new) and zero type errors (`geo={dashboard.geo}` passes a variable, so the extra `density` key is not an excess-property error before Task 8 types it).

- [ ] **Step 6: Commit** (local only, if OK'd)

```bash
git add src/lib/tropical/types.ts src/lib/tropical/layers.ts src/lib/tropical/density.ts src/lib/tropical/useDashboard.tsx src/lib/tropical/__tests__/layers.test.ts src/lib/tropical/__tests__/useDashboard.test.ts src/lib/tropical/__tests__/density.test.ts
git commit -m "Carry density images through the dashboard data layer"
```

---

### Task 8: Map layer, control and legend

**Files:**
- Modify: `src/lib/tropical/mapStyle.ts` (LAYER_IDS line 367, SOURCE_IDS line 396, `buildInitialStyle` sources/layers ~line 482–534)
- Create: `src/components/tropical/DensityControl.tsx`, `src/components/tropical/DensityLegend.tsx`
- Modify: `src/components/tropical/StormMap.tsx`, `LayersControl.tsx`, `ModelLegend.tsx`, `src/app/(frontend)/environment/tropical-weather/TropicalWeatherContent.tsx` (one prop)
- Test: `src/lib/tropical/__tests__/mapStyle.test.ts` (append)

**Interfaces:**
- Consumes: Task 7 types, `setDensity`, `DENSITY_*`, `densityCaption`, `GOOGLE_CITATION_PARTS`.
- Produces: `LAYER_IDS.density`, `SOURCE_IDS.density` (`"gw-density"`); `StormMapProps.onDensityChange: (choice: DensityChoice) => void`; `LayersControlProps.densityAvailable`, `.onDensityChange`, `.showDensity`; `ModelLegendProps.densityOn?`, `.onOfficialForecast?`.

- [ ] **Step 1: Write the failing test** (append to `mapStyle.test.ts`)

```ts
import { buildInitialStyle, LAYER_IDS } from "../mapStyle";

describe("density layer", () => {
  it("sits above the weather satellite and below labels, cone and tracks", () => {
    const ids = buildInitialStyle().layers.map((layer) => layer.id);
    const at = (id: string) => ids.indexOf(id);
    expect(at(LAYER_IDS.density)).toBeGreaterThan(at(LAYER_IDS.satellite));
    expect(at(LAYER_IDS.density)).toBeLessThan(at(LAYER_IDS.labels));
    expect(at(LAYER_IDS.density)).toBeLessThan(at(LAYER_IDS.coneFill));
    expect(at(LAYER_IDS.density)).toBeLessThan(at(LAYER_IDS.modelsEnsemble));
  });
});
```
(If `buildInitialStyle`/`LAYER_IDS` are already imported at the top of the file, extend that import instead of adding a second.)

- [ ] **Step 2: Run to verify failure**

Run: `PATH="$NODE64:$PATH" npx vitest run src/lib/tropical/__tests__/mapStyle.test.ts`
Expected: FAIL (`LAYER_IDS.density` undefined → index -1).

- [ ] **Step 3: Implement `mapStyle.ts`**

Add `density: "gw-density",` to both `LAYER_IDS` and `SOURCE_IDS`. In `buildInitialStyle().sources`, after the satellite source:

```ts
      // Track density (ingest/gulfwatch/density.py): one image, swapped by URL.
      [SOURCE_IDS.density]: {
        type: "image",
        url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg==",
        coordinates: [[-95.5, 32], [-80, 32], [-80, 19], [-95.5, 19]],
      },
```
and in `layers`, between the satellite layer and the labels layer:

```ts
      {
        // Below the place-name labels so they stay readable through it, and
        // below the cone, model lines and storm icon (spec 2026-10-07).
        id: LAYER_IDS.density,
        type: "raster",
        source: SOURCE_IDS.density,
        layout: { visibility: "none" },
        paint: { "raster-opacity": 0.75, "raster-fade-duration": 0, "raster-resampling": "nearest" },
      },
```

- [ ] **Step 4: Create `DensityControl.tsx`**

```tsx
"use client";

import { Check } from "lucide-react";
import { DENSITY_SOURCE_LABEL } from "@/lib/tropical/density";
import type { DensityChoice } from "@/lib/tropical/layers";
import type { DensitySource } from "@/lib/tropical/types";
import { Kicker } from "./Kicker";

export interface DensityControlProps {
  choice: DensityChoice;
  onChange: (choice: DensityChoice) => void;
  available: Partial<Record<DensitySource, boolean>>;
}

const SOURCES: DensitySource[] = ["gefs", "google"];

function choiceClass(selected: boolean, disabled: boolean): string {
  if (disabled) {
    return "flex w-full items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-left cursor-not-allowed opacity-50";
  }
  return `flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left ${
    selected ? "border-[#21355a] bg-[#21355a]/5" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
  }`;
}

/** Which ensemble's track density to draw. Options without an image for this
 * storm stay visible but disabled, so the choice never silently vanishes. */
export function DensityControl({ choice, onChange, available }: DensityControlProps) {
  return (
    <section className="border-b border-gray-200 px-3.5 py-2.5" aria-labelledby="track-density-heading">
      <Kicker id="track-density-heading">Track density</Kicker>
      <div className="space-y-1">
        <button type="button" className={choiceClass(choice === "off", false)} onClick={() => onChange("off")} aria-pressed={choice === "off"}>
          <b className="text-xs font-semibold text-gray-900">Off</b>
          {choice === "off" && <Check className="h-4 w-4 shrink-0 text-[#21355a]" aria-hidden="true" />}
        </button>
        {SOURCES.map((source) => {
          const ok = Boolean(available[source]);
          return (
            <button
              key={source}
              type="button"
              disabled={!ok}
              className={choiceClass(choice === source, !ok)}
              onClick={() => onChange(source)}
              aria-pressed={choice === source}
            >
              <span>
                <b className="block text-xs font-semibold text-gray-900">{DENSITY_SOURCE_LABEL[source]}</b>
                {!ok && <small className="block text-[11px] text-gray-500">Not available for this storm</small>}
              </span>
              {choice === source && <Check className="h-4 w-4 shrink-0 text-[#21355a]" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create `DensityLegend.tsx`**

```tsx
import { DENSITY_BANDS, DENSITY_DISCLAIMER, densityCaption, GOOGLE_CITATION_PARTS } from "@/lib/tropical/density";
import type { DensityProduct, DensitySource } from "@/lib/tropical/types";

/** Color key and caption for the drawn track density. Google's citation is
 * required by its terms whenever its layer is shown. */
export function DensityLegend({ source, product }: { source: DensitySource; product: DensityProduct }) {
  return (
    <div className="absolute bottom-6 left-2 z-10 w-[min(20rem,calc(100%-1rem))] rounded-md bg-white/90 px-2.5 py-2 text-[10px] leading-snug text-gray-700 shadow">
      <div className="flex h-2.5 overflow-hidden rounded-sm" aria-hidden="true">
        {DENSITY_BANDS.map((band) => (
          <span key={band.from} className="flex-1" style={{ backgroundColor: band.color }} />
        ))}
      </div>
      <div className="mt-0.5 flex justify-between text-[9px] text-gray-500">
        <span>5%</span>
        <span>50%</span>
        <span>90%+</span>
      </div>
      <p className="mt-1">{densityCaption(source, product)}</p>
      <p className="mt-0.5 text-gray-500">{DENSITY_DISCLAIMER}</p>
      {source === "google" && (
        <p className="mt-1 text-[9px] text-gray-500">
          {GOOGLE_CITATION_PARTS.before}
          <a className="underline" href={GOOGLE_CITATION_PARTS.url} target="_blank" rel="noreferrer">
            {GOOGLE_CITATION_PARTS.url}
          </a>
          {GOOGLE_CITATION_PARTS.after}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Wire `ModelLegend.tsx`**

Add to `ModelLegendProps`:

```ts
  /** A density layer is drawn, so "Official forecast" is not the only thing on the map. */
  densityOn?: boolean;
  /** "Official forecast" means official forecast only: it also clears density. */
  onOfficialForecast?: () => void;
```
destructure both, and change the Official button:

```tsx
        <button
          type="button"
          className={choiceClass(!enabled && !densityOn)}
          onClick={() => {
            choose([]);
            onOfficialForecast?.();
          }}
        >
          <b className="text-xs font-semibold text-gray-900">Official forecast</b>
          {!enabled && !densityOn && <Check className="h-4 w-4 shrink-0 text-[#21355a]" aria-hidden="true" />}
        </button>
```

- [ ] **Step 7: Wire `LayersControl.tsx`**

Imports: `import type { DensityChoice } from "@/lib/tropical/layers";`, `import type { DensitySource } from "@/lib/tropical/types";`, `import { DensityControl } from "./DensityControl";`. Add to `LayersControlProps`:

```ts
  /** Shown whenever a storm is selected, independent of the spaghetti list. */
  showDensity: boolean;
  densityAvailable: Partial<Record<DensitySource, boolean>>;
  onDensityChange: (choice: DensityChoice) => void;
```
destructure them; pass `densityOn={layers.density !== "off"}` and `onOfficialForecast={() => onDensityChange("off")}` to `ModelLegend`; and directly after the `{models && (<ModelLegend .../>)}` block:

```tsx
          {showDensity && (
            <DensityControl choice={layers.density} onChange={onDensityChange} available={densityAvailable} />
          )}
```

- [ ] **Step 8: Wire `StormMap.tsx`**

Imports: `DensityChoice` from layers; `DensityProduct, DensitySource` types; `DensityLegend`. In `StormMapProps.geo` add:

```ts
    density: Partial<Record<DensitySource, DensityProduct & { url: string }>>;
```
and to `StormMapProps`: `onDensityChange: (choice: DensityChoice) => void;` (destructure it). After the satellite `useSWR`:

```ts
  const densityProduct = layers.density === "off" ? undefined : geo.density[layers.density];
  const { data: densityObjectUrl } = useSWR<string>(
    densityProduct?.url ?? null,
    imageObjectUrlFetcher,
    VERSIONED_DATA_OPTIONS
  );
```
After the satellite effect:

```ts
  // --- track density image, same placement pattern as the satellite image ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    if (!densityProduct || !densityObjectUrl) {
      map.setLayoutProperty(LAYER_IDS.density, "visibility", "none");
      return;
    }
    map.setLayoutProperty(LAYER_IDS.density, "visibility", "visible");
    const [[west, south], [east, north]] = densityProduct.bounds;
    const src = map.getSource(SOURCE_IDS.density) as ImageSource | undefined;
    src?.updateImage({
      url: densityObjectUrl,
      coordinates: [[west, north], [east, north], [east, south], [west, south]],
    });
  }, [densityProduct, densityObjectUrl, loaded]);
```
In the JSX, after the satellite attribution link:

```tsx
      {layers.density !== "off" && densityProduct && (
        <DensityLegend source={layers.density} product={densityProduct} />
      )}
```
and pass to `LayersControl`:

```tsx
          showDensity={Boolean(stormSummary)}
          densityAvailable={{ gefs: Boolean(geo.density.gefs), google: Boolean(geo.density.google) }}
          onDensityChange={onDensityChange}
```

`densityProduct` is a new object each render (built in `useDashboard`), so the effect re-runs per render; `updateImage` with the same object URL is cheap, but if the browser check in Task 9 shows flicker, change the dependency to `densityProduct?.url` and `densityProduct?.bounds.join()`.

- [ ] **Step 9: Wire `TropicalWeatherContent.tsx`** (one prop; import `setDensity` alongside `toggleLayer`)

```tsx
              onDensityChange={(choice) => setLayers((s) => setDensity(s, choice))}
```
placed after `onLayersToggle=...`.

- [ ] **Step 10: Verify**

Run: `PATH="$NODE64:$PATH" npm test`, `PATH="$NODE64:$PATH" npx tsc --noEmit`, `PATH="$NODE64:$PATH" npm run lint`
Expected: all pass, zero type errors, no new lint errors.

- [ ] **Step 11: Commit** (local only, if OK'd)

```bash
git add src/lib/tropical/mapStyle.ts src/lib/tropical/__tests__/mapStyle.test.ts src/components/tropical/DensityControl.tsx src/components/tropical/DensityLegend.tsx src/components/tropical/StormMap.tsx src/components/tropical/LayersControl.tsx src/components/tropical/ModelLegend.tsx "src/app/(frontend)/environment/tropical-weather/TropicalWeatherContent.tsx"
git commit -m "Draw track density under the cone with a control and legend"
```

---

### Task 9: Local preview with live data, and browser check

**Files:**
- Create: `ingest/scripts/local_preview.py`
- Modify: `.gitignore` (add `/public/tropical/local-preview/`)
- Local only, never committed: `.env.local`, `.claude/launch.json`, `public/tropical/local-preview/`

**Interfaces:**
- Consumes: `pipeline.run(fetch, store)`.

- [ ] **Step 1: Write the preview runner** (`ingest/scripts/local_preview.py`)

```python
"""Run the tropical ingest against live feeds into a local, gitignored folder,
so the page can be viewed on localhost without touching the public blob store.

Google density is switched on here only: viewing it locally is internal use
under Weather Lab's terms. Output must never be committed or published.

    python ingest/scripts/local_preview.py
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from gulfwatch import pipeline  # noqa: E402

OUT = Path(__file__).resolve().parents[2] / "public" / "tropical" / "local-preview"


class LocalStore:
    def __init__(self, root: Path):
        self.root = root

    def _path(self, path: str) -> Path:
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        return target

    def get_json(self, path):
        target = self.root / path
        return json.loads(target.read_text(encoding="utf-8")) if target.exists() else None

    def put_json(self, path, obj):
        self._path(path).write_text(json.dumps(obj), encoding="utf-8")

    def put_bytes(self, path, data, content_type):
        self._path(path).write_bytes(data)


def main() -> None:
    os.environ["GOOGLE_DENSITY_ENABLED"] = "1"
    manifest = pipeline.run(fetch=requests.get, store=LocalStore(OUT))
    densities = {s["id"]: sorted(s.get("density", {})) for s in manifest["storms"]}
    print(f"mode={manifest['mode']} storms={len(manifest['storms'])} errors={len(manifest['errors'])} density={densities}")


if __name__ == "__main__":
    main()
```

Add `/public/tropical/local-preview/` to `.gitignore`, then confirm: `git check-ignore public/tropical/local-preview/manifest.json` prints the path.

- [ ] **Step 2: Run it**

Run: `python ingest/scripts/local_preview.py`
Expected (Isaias still active): `density={'al092026': ['gefs', 'google']}`. If an ensemble is missing, read `public/tropical/local-preview/manifest.json` `errors` (codes only) and diagnose before going on. If no storm is active, run with `?demo=` is not a substitute: tell Jeff and stop.

- [ ] **Step 3: Local env and launch config** (not committed)

`.env.local` (gitignored by `.env*`):

```
PAYLOAD_SECRET=<32 random hex chars from: python -c "import secrets;print(secrets.token_hex(16))">
DATABASE_URI=file:./cms-dev.db
NEXT_PUBLIC_TROPICAL_BLOB_BASE_URL=/tropical/local-preview
```

Run the predev check once by hand (the launch below skips npm scripts): `PATH="$NODE64:$PATH" node scripts/check-maplibre-worker-sync.mjs`.

`.claude/launch.json`:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "fpa-lens-density",
      "runtimeExecutable": "<NODE64>/node.exe",
      "runtimeArgs": ["node_modules/next/dist/bin/next", "dev", "-p", "3100"],
      "port": 3100
    }
  ]
}
```
(`<NODE64>` = the absolute x64 Node folder from Task 7, forward slashes.)

- [ ] **Step 4: Start and verify in the browser**

`preview_start {name: "fpa-lens-density"}`, then open `http://localhost:3100/environment/tropical-weather`. Check, in order:
1. Console has no errors (`read_console_messages`), and the server log has no `libsql` error (`preview_logs`).
2. Map options shows "Track density" with Off checked; GFS and Google enabled.
3. Choose GFS ensemble: the colored field draws under the cone and track, place labels readable, legend shows "28 of 30 members"-style counts and the real end time, no "5 days".
4. Choose Google: field changes; Google citation visible under the legend.
5. Click "Official forecast": density turns Off and the Off option is checked.
6. No "Some products are temporarily unavailable" notice caused by density.
7. Open `https://polarwx.com/tropical/#al092026/ensembles` and compare the GEFS density for the same cycle: same overall corridor and peak location. Differences in radius/time window are expected (theirs runs the full forecast).
8. `resize_window` mobile: legend fits within the map without covering the options panel button; reset to desktop.

- [ ] **Step 5: Share proof**

Screenshot of the GFS layer, the Google layer and the polarwx view side by side, sent to Jeff with the localhost URL. Note that the Google layer appears only locally; the live data update keeps it off.

- [ ] **Step 6: Commit** (local only, if OK'd; never `.env.local`, `.claude/`, or `public/tropical/local-preview/`)

```bash
git add ingest/scripts/local_preview.py .gitignore
git status --short  # confirm nothing under public/tropical/local-preview is staged
git commit -m "Add a local preview runner for the tropical ingest"
```

---

## Not in this plan

- Turning Google on in production (`GOOGLE_DENSITY_ENABLED` in `.github/workflows/tropical-ingest.yml`): waits on Google's written agreement and Jeff's call.
- Pushing the branch, a Vercel preview, merging: waits on Jeff and coordination with Ben.
- Phase 2: ECMWF ensemble tracks/density and the Euro AI (AIFS) single-run track.
