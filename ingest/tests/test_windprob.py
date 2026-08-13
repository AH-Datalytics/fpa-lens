"""Attribution of the basin-wide wind-probability field to a single storm.

The product merges every active Atlantic and eastern-Pacific system into one
MultiPolygon per probability band with no storm identifier (verified against
the 2021082818 archive cycle, when Ida and Nora were both active), so getting
this wrong shows one storm's wind probabilities on another storm's map.
"""

from gulfwatch.windprob import (
    cycle_from_features,
    cycles_behind,
    expected_cycle,
    features_for_storm,
    simplify_ring,
)


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


# --- advisory pairing ---------------------------------------------------------
#
# Wind probability is the only storm layer not fetched from an advisory-numbered
# url, so it is the only one that can silently disagree with the cone. The offset
# encoded here (cycle = newest synoptic hour at or before issuance - 3h) was
# verified against publication times for Ida 2021, Nora 2021, Ian 2022, Idalia
# 2023, Milton 2024 and Cristobal 2026 -- see windprob.py.


def test_cycle_read_from_the_shapefile_basenames():
    fc = {"features": [
        _band("2026081306_wsp34knt120hr_5km", "20%", _square(-90, 27)),
        _band("2026081306_wsp50knt120hr_5km", "10%", _square(-90, 27)),
    ]}
    assert cycle_from_features(fc) == "2026081306"


def test_cycle_unknown_when_names_carry_no_stamp():
    """An unrecognised product layout must read as "pairing unknown", not as a
    mismatch -- the difference between saying nothing and crying wolf."""
    fc = {"features": [_band("wsp34knt120hr_5km", "20%", _square(-90, 27))]}
    assert cycle_from_features(fc) is None
    assert cycle_from_features(None) is None
    assert cycle_from_features({"features": []}) is None


def test_expected_cycle_for_a_main_advisory():
    # Main advisories go out at 03/09/15/21z; 3h back is exactly a synoptic hour.
    assert expected_cycle("2026-08-13T09:00:00Z") == "2026081306"
    assert expected_cycle("2026-08-13T21:00:00Z") == "2026081318"
    assert expected_cycle("2026-08-13T03:00:00Z") == "2026081300"


def test_expected_cycle_for_an_intermediate_advisory_floors_to_a_real_cycle():
    """The trap a bare "issuance - 3h" rule falls into.

    Intermediate advisories (advNum "014a" -- the shape of our own pipeline
    fixture) are issued at 00/06/12/18z, so issuance-3h lands on 21/03/09/15z,
    which are NEVER WSP cycles. Demanding one of those would find nothing on the
    server and suppress a good layer. Flooring returns the newest cycle that can
    actually exist -- and the measured publication times agree: at a 06z
    intermediate advisory, the 06z field is still ~3h from being posted, so 00z
    is the current one.
    """
    assert expected_cycle("2026-08-13T06:00:00Z") == "2026081300"
    assert expected_cycle("2026-08-13T00:00:00Z") == "2026081218"
    assert expected_cycle("2026-08-13T12:00:00Z") == "2026081306"
    assert expected_cycle("2026-08-13T18:00:00Z") == "2026081312"


def test_expected_cycle_unknown_for_missing_or_malformed_times():
    assert expected_cycle(None) is None
    assert expected_cycle("") is None
    assert expected_cycle("not a timestamp") is None


def test_cycles_behind_counts_the_lag():
    # Paired: the 09z advisory's own field.
    assert cycles_behind("2026081306", expected_cycle("2026-08-13T09:00:00Z")) == 0
    # The ~20-minute window after an advisory, before its field finishes
    # uploading: one cycle behind, layer still valid guidance.
    assert cycles_behind("2026081300", expected_cycle("2026-08-13T09:00:00Z")) == 1
    assert cycles_behind("2026081218", expected_cycle("2026-08-13T09:00:00Z")) == 2
    # Newer than the advisory (NHC posted the next cycle first).
    assert cycles_behind("2026081312", expected_cycle("2026-08-13T09:00:00Z")) == -1


def test_cycles_behind_unknown_when_either_side_is():
    assert cycles_behind(None, "2026081306") is None
    assert cycles_behind("2026081306", None) is None
    assert cycles_behind("garbage", "2026081306") is None


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
