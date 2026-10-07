"""Ensemble track density for the tropical map. Pure functions, no I/O.

The value drawn is the share of an ensemble's member tracks whose center
passes within RADIUS_KM of a point between the window start and end. It is a
frequency across model runs, not a calibrated probability, and it describes
the center only -- wind, surge and rain reach far beyond it. See
docs/superpowers/specs/2026-10-07-tropical-ensemble-density-design.md.
"""

from __future__ import annotations

import hashlib
import io
import json
import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import numpy as np
from PIL import Image

EXPECTED_MEMBERS = {"gefs": 30, "ecmwf": 51, "google": 50}
# 80% of expected. At 40+ Google members one track contributes at most 2.5%,
# under the lowest drawn band (5%), so no single member is visible on its own.
MINIMUM_MEMBERS = {"gefs": 24, "ecmwf": 41, "google": 40}
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


CELL_KM = 5.0  # 10 km showed stair-steps on the map (Jeff, 2026-10-07)
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


def _round_down(value: float) -> float:
    return math.floor(value * 1e5) / 1e5


def _round_up(value: float) -> float:
    return math.ceil(value * 1e5) / 1e5


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
    # Rounded to 5 decimals (about 1 m) OUTWARD, so the advertised box never
    # trims a cell that is inside the radius.
    grid.bounds = (
        (_round_down(float(_lon_of(x0))), _round_down(float(_lat_of(y_top - nrows * cell_m)))),
        (_round_up(float(_lon_of(x0 + ncols * cell_m))), _round_up(float(_lat_of(y_top)))),
    )
    return grid


# Lower edges of the drawn bands: 5-10, 10-20, ..., 80-90, 90+ %.
RENDER_SCALE = 4
BAND_EDGES = (0.05, 0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90)
# Light blue -> blue -> green -> yellow -> orange -> red, after polarwx's
# density view. Keep in step with DENSITY_BANDS in src/lib/tropical/density.ts.
BAND_COLORS = (
    "#a9dcf2", "#5db5e8", "#2f7fd6", "#3fae49", "#9fd13f",
    "#f3e23a", "#f6b22d", "#f17a24", "#e2432a", "#b5172b",
)


def render_png(fraction: np.ndarray, scale: int = 1) -> bytes:
    """RGBA PNG, transparent below the first band.
    Banding (not a continuous ramp) is part of what keeps a density built from
    Google members a finished product rather than recoverable raw data.

    `scale` > 1 interpolates the grid (bilinear) that many times finer per side
    before banding, so band edges draw as smooth curves instead of 10 km steps
    (Jeff, 2026-10-07). The image covers the same bounds either way."""
    if scale > 1:
        rows, cols = fraction.shape
        fine = Image.fromarray(fraction.astype(np.float32)).resize(
            (cols * scale, rows * scale), Image.Resampling.BILINEAR
        )
        fraction = np.asarray(fine, dtype=np.float64)
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
