"""Attribution of the basin-wide wind-probability field to a single storm.

The product merges every active Atlantic and eastern-Pacific system into one
MultiPolygon per probability band with no storm identifier (verified against
the 2021082818 archive cycle, when Ida and Nora were both active), so getting
this wrong shows one storm's wind probabilities on another storm's map.
"""

from gulfwatch.windprob import features_for_storm, simplify_ring


def _square(cx, cy, half=1.0):
    return [[
        [cx - half, cy - half],
        [cx + half, cy - half],
        [cx + half, cy + half],
        [cx - half, cy + half],
        [cx - half, cy - half],
    ]]


def _band(layer, percentage, polygons):
    return {
        "type": "Feature",
        "properties": {"shapefile": layer, "PERCENTAGE": percentage},
        "geometry": {"type": "MultiPolygon", "coordinates": polygons},
    }


GULF = (-90.0, 27.0)
EPAC = (-120.0, 18.0)


def _fc(*features):
    return {"type": "FeatureCollection", "features": list(features)}


def test_single_active_storm_keeps_the_whole_field():
    """With one storm every component is that storm's -- attribution is exact,
    not a guess, which is the common case."""
    fc = _fc(_band("2026081218_wsp34knt120hr_5km", "20-30%",
                   [_square(-90, 27), _square(-86, 25)]))
    out = features_for_storm(fc, "wsp34", GULF, simplify=False)
    assert len(out["features"]) == 1
    assert len(out["features"][0]["geometry"]["coordinates"]) == 2


def test_a_second_storms_component_is_not_handed_to_this_storm():
    fc = _fc(_band("2026081218_wsp34knt120hr_5km", "20-30%",
                   [_square(-90, 27), _square(-120, 18)]))
    out = features_for_storm(fc, "wsp34", GULF, others=[EPAC], simplify=False)
    kept = out["features"][0]["geometry"]["coordinates"]
    assert len(kept) == 1
    # the kept component is the Gulf one
    lons = [p[0] for p in kept[0][0]]
    assert min(lons) >= -92 and max(lons) <= -88


def test_the_other_storm_gets_its_own_component():
    fc = _fc(_band("2026081218_wsp34knt120hr_5km", "20-30%",
                   [_square(-90, 27), _square(-120, 18)]))
    out = features_for_storm(fc, "wsp34", EPAC, others=[GULF], simplify=False)
    kept = out["features"][0]["geometry"]["coordinates"]
    assert len(kept) == 1
    lons = [p[0] for p in kept[0][0]]
    assert min(lons) >= -122 and max(lons) <= -118


def test_only_the_requested_threshold_is_returned():
    fc = _fc(
        _band("2026081218_wsp34knt120hr_5km", "20-30%", [_square(-90, 27)]),
        _band("2026081218_wsp64knt120hr_5km", "20-30%", [_square(-90, 27)]),
    )
    out = features_for_storm(fc, "wsp64", GULF, simplify=False)
    assert len(out["features"]) == 1
    assert "wsp64" in out["features"][0]["properties"]["shapefile"]


def test_a_band_with_no_nearby_component_is_dropped_not_emitted_empty():
    """An empty band would draw a legend entry with nothing behind it."""
    fc = _fc(_band("2026081218_wsp34knt120hr_5km", "20-30%", [_square(-120, 18)]))
    out = features_for_storm(fc, "wsp34", GULF, others=[EPAC], simplify=False)
    assert out["features"] == []


def test_probability_band_label_is_preserved():
    fc = _fc(_band("2026081218_wsp34knt120hr_5km", "70-80%", [_square(-90, 27)]))
    out = features_for_storm(fc, "wsp34", GULF, simplify=False)
    assert out["features"][0]["properties"]["PERCENTAGE"] == "70-80%"


def test_non_polygon_geometry_is_skipped():
    fc = _fc({
        "type": "Feature",
        "properties": {"shapefile": "2026081218_wsp34knt120hr_5km"},
        "geometry": {"type": "LineString", "coordinates": [[-90, 27], [-89, 28]]},
    })
    assert features_for_storm(fc, "wsp34", GULF)["features"] == []


# --- ring simplification ------------------------------------------------------


def test_simplify_keeps_a_closed_valid_ring():
    import math

    ring = [[math.cos(t / 60 * 2 * math.pi) - 90, math.sin(t / 60 * 2 * math.pi) + 27]
            for t in range(61)]
    out = simplify_ring(ring, tolerance=0.05)
    assert out[0] == out[-1], "ring must stay closed"
    assert len(out) >= 4, "a polygon ring needs at least 4 positions"
    assert len(out) < len(ring), "simplification should actually remove points"


def test_simplify_leaves_small_rings_alone():
    ring = _square(-90, 27)[0]
    assert simplify_ring(ring) == ring
