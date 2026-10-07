"""Tests for the NHC current storms (CurrentStorms.json) parser."""

import json
from pathlib import Path

import pytest

from gulfwatch.nhc import (
    GULF_LAT_MAX,
    GULF_LAT_MIN,
    GULF_LON_MAX,
    GULF_LON_MIN,
    Storm,
    deg_to_compass,
    in_gulf_box,
    next_advisory_from_text,
    parse_current_storms,
    resolve_next_advisory_time,
    storm_in_gulf,
)

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "current_storms.json"


@pytest.fixture(scope="module")
def storms():
    data = json.loads(FIXTURE_PATH.read_text())
    return parse_current_storms(data)


@pytest.fixture
def bertha(storms):
    return next(s for s in storms if s.id == "al022026")


@pytest.fixture
def fausto(storms):
    return next(s for s in storms if s.id == "ep062026")


def test_gulf_box_constants():
    assert (GULF_LON_MIN, GULF_LON_MAX) == (-98.0, -80.0)
    assert (GULF_LAT_MIN, GULF_LAT_MAX) == (18.0, 31.0)


def test_in_gulf_box():
    assert in_gulf_box(29.9, -90.1) is True
    assert in_gulf_box(25.0, -60.0) is False


def test_parse_returns_both_fixture_storms(storms):
    assert len(storms) == 2
    assert {s.id for s in storms} == {"al022026", "ep062026"}


def test_bertha_fields_match_fixture(bertha):
    # Real Bertha data committed at ingest/tests/fixtures/current_storms.json.
    assert bertha.id == "al022026"
    assert bertha.name == "Bertha"
    assert bertha.classification == "TS"
    assert bertha.intensity_kt == 40
    assert bertha.pressure_mb == 1002
    assert bertha.movement_dir == 260
    assert bertha.movement_mph == 7
    assert bertha.lat == 29.5
    assert bertha.lon == -90.5
    assert bertha.advisory_num == "014a"
    assert bertha.advisory_time == "2026-07-23T00:00:00Z"
    assert bertha.next_advisory_time == "2026-07-23T06:00:00Z"


def test_bertha_in_gulf_box_is_true(bertha):
    # Real assertion: Bertha is in the Gulf box right now.
    assert in_gulf_box(bertha.lat, bertha.lon) is True


def test_bertha_text_product_urls_and_issued_times(bertha):
    # forecastDiscussion/publicAdvisory/windSpeedProbabilities URLs + the
    # discussion's own issuance, carried through for gulfwatch.text/probs.
    assert bertha.discussion_url == "https://www.nhc.noaa.gov/text/MIATCDAT2.shtml"
    assert bertha.discussion_issued == "2026-07-22T21:00:00Z"
    assert bertha.advisory_url == "https://www.nhc.noaa.gov/text/MIATCPAT2.shtml"
    # publicAdvisory's issued time is Storm.advisory_time itself -- no
    # separate/duplicate field needed (see nhc.py).
    assert bertha.advisory_time == "2026-07-23T00:00:00Z"
    assert bertha.probs_url == "https://www.nhc.noaa.gov/text/MIAPWSAT2.shtml"


def test_bertha_gis_urls_all_explicit_from_json(bertha):
    # All three GIS product fields point at the same "5day" package zip for
    # this advisory -- that's expected NHC behavior, not a bug.
    expected = "https://www.nhc.noaa.gov/gis/forecast/archive/al022026_5day_014A.zip"
    assert bertha.gis_urls == {
        "cone": expected,
        "track": expected,
        "wwlines": expected,
        "windfield": "https://www.nhc.noaa.gov/gis/forecast/archive/al022026_fcst_014A.zip",
    }


def test_fausto_wwlines_falls_back_to_latest_pattern(fausto):
    # Fausto's windWatchesWarnings is null in the fixture -> fallback pattern.
    assert (
        fausto.gis_urls["wwlines"]
        == "https://www.nhc.noaa.gov/storm_graphics/api/EP062026_WW_latest.zip"
    )
    # cone/track are present explicitly in the fixture.
    assert (
        fausto.gis_urls["cone"]
        == "https://www.nhc.noaa.gov/gis/forecast/archive/ep062026_5day_016.zip"
    )
    assert (
        fausto.gis_urls["track"]
        == "https://www.nhc.noaa.gov/gis/forecast/archive/ep062026_5day_016.zip"
    )
    assert fausto.gis_urls["windfield"] == "https://www.nhc.noaa.gov/gis/forecast/archive/ep062026_fcst_016.zip"


def test_fausto_not_in_gulf_box(fausto):
    assert in_gulf_box(fausto.lat, fausto.lon) is False


@pytest.mark.parametrize(
    "deg,expected",
    [
        (0, "N"),
        (11, "N"),
        (90, "E"),
        (180, "S"),
        (247, "WSW"),
        (258.75, "W"),
        (260, "W"),  # Bertha's movementDir
        (270, "W"),
        (281.24, "W"),
        (349, "N"),
        (360, "N"),
    ],
)
def test_deg_to_compass(deg, expected):
    assert deg_to_compass(deg) == expected


def test_storm_in_gulf_true_by_current_position(bertha):
    assert storm_in_gulf(bertha, None) is True


# --- Next advisory time from the public advisory text -------------------------
#
# CurrentStorms.json has no nextAdvisoryTime, so the Storm record assumes +6h.
# Once watches/warnings are up NHC issues 3-hourly intermediates, which made
# "Next update" on the storm header 3h late. The public advisory's own NEXT
# ADVISORY block says when each is due.

# Verbatim tail of Hurricane Ida advisory 6 (500 PM EDT Fri Aug 27 2021).
IDA_ADV6_TAIL = (
    "NEXT ADVISORY\n"
    "-------------\n"
    "Next intermediate advisory at 800 PM EDT.\n"
    "Next complete advisory at 1100 PM EDT.\n"
    " \n"
    "$$\n"
    "Forecaster Brown\n"
)


def test_next_advisory_prefers_the_earlier_intermediate_advisory():
    # 800 PM EDT = 0000Z, three hours after the 2100Z advisory -- not the
    # complete advisory at 1100 PM EDT (0300Z) and not the +6h fallback.
    assert next_advisory_from_text(IDA_ADV6_TAIL, "2021-08-27T21:00:00Z") == "2021-08-28T00:00:00Z"


def test_next_advisory_rolls_past_local_midnight():
    # Ida advisory 7 (1100 PM EDT Fri = 0300Z Sat) announced "Next intermediate
    # advisory at 200 AM EDT" -- 0600Z Saturday, the same UTC day but the next
    # local day.
    text = "Next intermediate advisory at 200 AM EDT.\nNext complete advisory at 500 AM EDT.\n"
    assert next_advisory_from_text(text, "2021-08-28T03:00:00Z") == "2021-08-28T06:00:00Z"
    # Bertha intermediate 18A (700 PM CDT Thu) announcing 1000 PM CDT: later
    # the same local evening, which is 0300Z the next UTC day.
    text = "Next complete advisory at 1000 PM CDT.\n"
    assert next_advisory_from_text(text, "2026-07-23T00:00:00Z") == "2026-07-23T03:00:00Z"


def test_next_advisory_handles_noon_midnight_and_bare_phrasing():
    assert next_advisory_from_text("Next advisory at 1200 PM CDT.", "2026-07-23T14:00:00Z") == "2026-07-23T17:00:00Z"
    assert next_advisory_from_text("Next advisory at 1200 AM CDT.", "2026-07-23T23:00:00Z") == "2026-07-24T05:00:00Z"


def test_next_advisory_is_none_when_nothing_usable_is_announced():
    assert next_advisory_from_text("", "2021-08-27T21:00:00Z") is None
    assert next_advisory_from_text("This is the last public advisory.", "2021-08-27T21:00:00Z") is None
    # Unknown zone abbreviation: skip rather than guess an offset.
    assert next_advisory_from_text("Next advisory at 800 PM XYZ.", "2021-08-27T21:00:00Z") is None
    # Unparseable advisory time.
    assert next_advisory_from_text(IDA_ADV6_TAIL, "") is None
    assert next_advisory_from_text(IDA_ADV6_TAIL, "yesterday") is None


def test_resolve_next_advisory_time_falls_back_to_six_hours():
    assert resolve_next_advisory_time("2021-08-27T21:00:00Z", IDA_ADV6_TAIL) == "2021-08-28T00:00:00Z"
    assert resolve_next_advisory_time("2021-08-27T21:00:00Z", None) == "2021-08-28T03:00:00Z"
    assert resolve_next_advisory_time("2021-08-27T21:00:00Z", "no schedule here") == "2021-08-28T03:00:00Z"


def test_storm_in_gulf_false_when_far_and_no_track():
    storm = Storm(
        id="ep992026",
        name="Test",
        classification="TS",
        intensity_kt=40,
        pressure_mb=1002,
        movement_dir=260,
        movement_mph=7,
        lat=17.2,
        lon=-122.0,
        advisory_num="001",
        advisory_time="2026-07-22T21:00:00Z",
        next_advisory_time="2026-07-23T03:00:00Z",
        gis_urls={},
    )
    assert storm_in_gulf(storm, None) is False


def test_storm_in_gulf_true_via_forecast_track_point_only():
    # Position is well outside the box, but a forecast track point is inside.
    storm = Storm(
        id="ep992026",
        name="Test",
        classification="TS",
        intensity_kt=40,
        pressure_mb=1002,
        movement_dir=260,
        movement_mph=7,
        lat=17.2,
        lon=-122.0,
        advisory_num="001",
        advisory_time="2026-07-22T21:00:00Z",
        next_advisory_time="2026-07-23T03:00:00Z",
        gis_urls={},
    )
    track_geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[-122.0, 17.2], [-90.0, 25.0]],
                },
                "properties": {},
            }
        ],
    }
    assert storm_in_gulf(storm, track_geojson) is True


def test_storm_in_gulf_false_when_track_never_enters_box():
    storm = Storm(
        id="ep992026",
        name="Test",
        classification="TS",
        intensity_kt=40,
        pressure_mb=1002,
        movement_dir=260,
        movement_mph=7,
        lat=17.2,
        lon=-122.0,
        advisory_num="001",
        advisory_time="2026-07-22T21:00:00Z",
        next_advisory_time="2026-07-23T03:00:00Z",
        gis_urls={},
    )
    track_geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[-122.0, 17.2], [-115.0, 20.0]],
                },
                "properties": {},
            }
        ],
    }
    assert storm_in_gulf(storm, track_geojson) is False
