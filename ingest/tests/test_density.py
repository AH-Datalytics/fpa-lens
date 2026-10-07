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


def test_ground_cell_size_matches_cell_km():
    grid = density.strike_grid({"AP01": _line(25.0, -95.0, -85.0)}, C, T0, T0 + timedelta(hours=120))
    lats, lons = grid.row_lats(), grid.col_lons()
    mid = len(lats) // 2
    d = density.haversine_km(lats[mid], lons[10], lats[mid], lons[11])
    assert 0.9 * density.CELL_KM <= float(d) <= 1.1 * density.CELL_KM


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


def test_render_png_upsamples_so_band_edges_are_smooth():
    # 2x2 cells: 0% west, 100% east. At 4x the boundary gets intermediate
    # bands instead of a single hard step, and the size grows 4x per side.
    fraction = np.array([[0.0, 1.0], [0.0, 1.0]])
    img = Image.open(io.BytesIO(density.render_png(fraction, scale=4))).convert("RGBA")
    assert img.size == (8, 8)
    row = [img.getpixel((x, 4)) for x in range(8)]
    colors = {px[:3] for px in row if px[3]}
    assert len(colors) >= 3  # several bands across the edge, not one jump
    assert row[0][3] == 0  # far west still transparent
