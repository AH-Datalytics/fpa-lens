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

# Douglas-Peucker tolerance in degrees. The raw 5 km contours are far denser
# than a web map can show; without this a single cycle is several MB.
SIMPLIFY_DEGREES = 0.025

# Layer-name fragment per manifest key, as they appear in the WSP zip.
THRESHOLD_LAYERS = {"windprob": "wsp34", "windprob50": "wsp50", "windprob64": "wsp64"}


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
