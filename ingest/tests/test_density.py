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
