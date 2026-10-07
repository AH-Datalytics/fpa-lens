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
