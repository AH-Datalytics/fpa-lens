"""Per-storm wind speed probability fields from NHC's basin-wide WSP product.

NHC publishes wind speed probabilities as ONE file per forecast cycle covering
every active Atlantic and eastern-Pacific system, with no storm identifier of
any kind -- the only attributes are the probability band ("<5%".."90%") and the
wind threshold in the layer name (verified 2026-08-10 against the 2021082818
archive cycle, when Ida and Nora were both active). There is no per-storm GIS
variant; the per-storm products NHC does publish are rendered PNGs.

So attribution has to be geographic. Each probability band is a MultiPolygon of
disjoint components, and the components ARE well separated in practice -- a
storm's probability field is a contiguous blob around its track. Assigning each
component to whichever active storm it is closest to therefore recovers the
per-storm field exactly when one storm is active (everything is that storm's)
and sensibly when several are.

The Ida replay solved the same problem by hardcoding a Gulf bounding box, which
cannot generalise to a storm anywhere else in the basin.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

# Douglas-Peucker tolerance in degrees. The raw 5 km contours are far denser
# than a web map can show; without this a single cycle is several MB.
SIMPLIFY_DEGREES = 0.025

# Layer-name fragment per manifest key, as they appear in the WSP zip.
THRESHOLD_LAYERS = {"windprob": "wsp34", "windprob50": "wsp50", "windprob64": "wsp64"}


# ---------------------------------------------------------------------------
# Advisory pairing
# ---------------------------------------------------------------------------
#
# The cone, track and wind field are fetched from advisory-NUMBERED urls, so
# they are the same advisory package by construction. Wind probability is not:
# it is fetched as wsp_120hr5km_latest.zip, which carries a forecast CYCLE and
# no advisory number. So "the probabilities on screen belong to the advisory on
# screen" has to be checked, not assumed.
#
# The cycle IS recoverable at no cost: every member of the zip is named
# "<cycle>_wsp34knt120hr_5km.*", and shp.zip_to_geojson already copies that
# basename onto each feature as `shapefile`.
#
# WSP cycles are the four synoptic hours 00/06/12/18z, and advisories are issued
# at 03/09/15/21z -- so a cycle pairs with the advisory 3h AFTER it.
#
# VERIFIED 2026-08-13 by publication time (HTTP Last-Modified on the archived
# cycle-stamped zips), across 5 storms and 5 seasons -- Ida 2021, Nora 2021
# (concurrent, eastern Pacific), Ian 2022, Idalia 2023, Milton 2024 and
# Cristobal 2026: cycle C's file appears on NHC's server at C+3.38h to C+3.40h
# in 20 of 21 cycles sampled, with one late run at C+4.20h. That is NHC posting
# each cycle's probabilities as the C+3h advisory goes out, which is the pairing
# this encodes. (The earlier note in memory had this confirmed on one storm.)
#
# Two consequences the measurement makes concrete:
#
# 1. FLOOR to the synoptic grid; do not just subtract 3h. INTERMEDIATE
#    advisories ("014a" -- the shape of our own test fixture) are issued at
#    00/06/12/18z, so issuance-3h lands on 21/03/09/15z, which are never WSP
#    cycles. A bare -3h rule would demand a cycle that has never existed and
#    suppress a perfectly good layer. Flooring returns the newest cycle that
#    can actually be on the server, which the posting times confirm: at a 06z
#    intermediate advisory the 06z field is still ~3h away, and 00z is current.
#
# 2. There is a real mispairing WINDOW, ~20-25 minutes wide (longer for a late
#    run). The 09z Cristobal advisory was public at 09:00z while its matching
#    06z field only finished uploading at 09:22z -- and ingest runs at :07,
#    :22, :37, :52. So a run CAN legitimately see a fresh advisory alongside the
#    previous cycle's probabilities. That is why a mismatch is reported and
#    labelled rather than suppressed: the older field is still valid guidance,
#    and dropping it would blank a safety layer to fix a caption.
WSP_CYCLE_HOURS = 6
ADVISORY_TO_CYCLE_LAG_HOURS = 3

_CYCLE_RE = re.compile(r"^(\d{10})_")


def cycle_from_features(fc: dict | None) -> str | None:
    """The forecast cycle a parsed WSP FeatureCollection actually came from,
    read off the shapefile basenames. None if the names carry no cycle stamp
    (an unrecognised product layout -- caller should treat the pairing as
    unknown rather than broken)."""
    if not fc:
        return None
    stamps = set()
    for feature in fc.get("features", []):
        name = str((feature.get("properties") or {}).get("shapefile") or "")
        match = _CYCLE_RE.match(name)
        if match:
            stamps.add(match.group(1))
    if not stamps:
        return None
    # One cycle per file in practice; if a future product ever bundles more,
    # the newest is the one the advisory could be paired with.
    return max(stamps)


def expected_cycle(advisory_time: str | None) -> str | None:
    """The WSP cycle that belongs with an advisory issued at `advisory_time`
    (ISO 8601 UTC): the newest synoptic cycle at or before issuance - 3h.

    None if the time is missing or unparseable -- unknown, not mismatched.
    """
    if not advisory_time:
        return None
    try:
        issued = datetime.fromisoformat(str(advisory_time).replace("Z", "+00:00"))
    except (AttributeError, TypeError, ValueError):
        return None
    if issued.tzinfo is None:
        issued = issued.replace(tzinfo=timezone.utc)
    issued = issued.astimezone(timezone.utc)

    basis = issued - timedelta(hours=ADVISORY_TO_CYCLE_LAG_HOURS)
    floored = basis.replace(
        hour=(basis.hour // WSP_CYCLE_HOURS) * WSP_CYCLE_HOURS,
        minute=0,
        second=0,
        microsecond=0,
    )
    return floored.strftime("%Y%m%d%H")


def cycles_behind(actual_cycle: str | None, expected: str | None) -> int | None:
    """How many 6-hourly cycles `actual_cycle` lags `expected` by. 0 means
    paired, a positive number means the probabilities predate the advisory, a
    negative number means they are newer than it. None if either is unknown.
    """
    if not actual_cycle or not expected:
        return None
    try:
        actual_dt = datetime.strptime(actual_cycle, "%Y%m%d%H")
        expected_dt = datetime.strptime(expected, "%Y%m%d%H")
    except (TypeError, ValueError):
        return None
    hours = (expected_dt - actual_dt).total_seconds() / 3600
    return int(hours // WSP_CYCLE_HOURS)


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------


def _point_segment_distance_sq(point, start, end) -> float:
    px, py = point[0], point[1]
    x1, y1 = start[0], start[1]
    x2, y2 = end[0], end[1]
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return (px - x1) ** 2 + (py - y1) ** 2
    t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    nx, ny = x1 + t * dx, y1 + t * dy
    return (px - nx) ** 2 + (py - ny) ** 2


def _rdp(points: list, tolerance: float) -> list:
    if len(points) <= 2:
        return points
    max_distance_sq = -1.0
    split_index = 0
    for index, point in enumerate(points[1:-1], start=1):
        distance_sq = _point_segment_distance_sq(point, points[0], points[-1])
        if distance_sq > max_distance_sq:
            max_distance_sq = distance_sq
            split_index = index
    if max_distance_sq <= tolerance * tolerance:
        return [points[0], points[-1]]
    left = _rdp(points[: split_index + 1], tolerance)
    right = _rdp(points[split_index:], tolerance)
    return left[:-1] + right


def simplify_ring(ring: list, tolerance: float = SIMPLIFY_DEGREES) -> list:
    """Simplify a closed contour while keeping it a valid, closed ring.

    Split at the two extreme points before running Douglas-Peucker on each arc;
    running it once around a closed loop collapses the whole ring, because its
    first and last point are the same and the initial segment has zero length.
    """
    if len(ring) <= 5:
        return ring
    points = ring[:-1] if ring[0] == ring[-1] else ring[:]
    anchor = min(range(len(points)), key=lambda i: (points[i][0], points[i][1]))
    ordered = points[anchor:] + points[:anchor]
    opposite = max(
        range(1, len(ordered)),
        key=lambda i: (ordered[i][0] - ordered[0][0]) ** 2
        + (ordered[i][1] - ordered[0][1]) ** 2,
    )
    first_arc = _rdp(ordered[: opposite + 1], tolerance)
    second_arc = _rdp(ordered[opposite:] + [ordered[0]], tolerance)
    simplified = first_arc[:-1] + second_arc
    if simplified[0] != simplified[-1]:
        simplified.append(simplified[0])
    # A ring needs 4 positions (3 distinct + closure); anything less is not a
    # polygon, so keep the original rather than emit something invalid.
    return simplified if len(simplified) >= 4 else ring


def _polygon_centre(polygon: list) -> tuple[float, float]:
    """Bounding-box centre of a polygon's outer ring."""
    ring = polygon[0] if polygon else []
    if not ring:
        return (0.0, 0.0)
    lons = [p[0] for p in ring]
    lats = [p[1] for p in ring]
    return ((min(lons) + max(lons)) / 2, (min(lats) + max(lats)) / 2)


# ---------------------------------------------------------------------------
# Attribution + simplification
# ---------------------------------------------------------------------------


def _nearest_index(point, targets) -> int:
    px, py = point
    best, best_d = 0, None
    for i, (tx, ty) in enumerate(targets):
        d = (px - tx) ** 2 + (py - ty) ** 2
        if best_d is None or d < best_d:
            best, best_d = i, d
    return best


def features_for_storm(
    feature_collection: dict,
    layer_fragment: str,
    storm: tuple[float, float],
    others: list[tuple[float, float]] | None = None,
    simplify: bool = True,
) -> dict:
    """Keep one threshold's bands, reduced to the components nearest `storm`.

    `storm` and each of `others` are (lon, lat) current positions. With no other
    storms every component belongs to `storm`, which is the common case and is
    exact. Bands left with no component are dropped entirely rather than emitted
    empty, so the map never draws a legend entry with nothing behind it.
    """
    others = others or []
    targets = [storm, *others]
    out = []
    for feature in feature_collection.get("features", []):
        props = feature.get("properties") or {}
        if layer_fragment not in str(props.get("shapefile", "")):
            continue
        geometry = feature.get("geometry") or {}
        gtype = geometry.get("type")
        if gtype not in {"Polygon", "MultiPolygon"}:
            continue
        polygons = (
            geometry["coordinates"] if gtype == "MultiPolygon" else [geometry["coordinates"]]
        )
        kept = [p for p in polygons if _nearest_index(_polygon_centre(p), targets) == 0]
        if not kept:
            continue
        if simplify:
            kept = [[simplify_ring(ring) for ring in polygon] for polygon in kept]
        out.append(
            {
                **feature,
                "geometry": {"type": "MultiPolygon", "coordinates": kept},
            }
        )
    return {"type": "FeatureCollection", "features": out}
