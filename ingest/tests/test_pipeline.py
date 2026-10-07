"""Tests for the ingest orchestrator (poll -> convert -> upload ->
manifest.json), using fake fetch/store doubles per the Task 4 brief -- no
real network or Blob store calls happen anywhere in this file.
"""

from __future__ import annotations

import gzip
import json
from pathlib import Path

import pytest

from gulfwatch import nhc, outlook
from gulfwatch.pipeline import ADECK_URL_TEMPLATE, run
import gulfwatch.pipeline as pipeline_module

FIXTURES = Path(__file__).parent / "fixtures"
CURRENT_STORMS_JSON = json.loads((FIXTURES / "current_storms.json").read_text())
SAMPLE_CONE_ZIP = (FIXTURES / "sample_cone.zip").read_bytes()
GTWO_ZIP = (FIXTURES / "gtwo_shapefiles.zip").read_bytes()
INDEX_AT_XML = (FIXTURES / "index-at.xml").read_text(encoding="utf-8")
BERTHA_DISCUSSION_SHTML = (FIXTURES / "bertha_discussion.shtml").read_text(encoding="utf-8")
BERTHA_PUBLIC_ADVISORY_SHTML = (FIXTURES / "bertha_public_advisory.shtml").read_text(
    encoding="utf-8"
)
BERTHA_PWS_SHTML = (FIXTURES / "bertha_pws.shtml").read_text(encoding="utf-8")

# Bertha (al022026): the only Atlantic/Gulf storm in current_storms.json,
# real advisory-14a data with cone/track/wwlines all pointing at the same
# bundled "5day" zip -- see task-nhc.py's own tests for the raw values.
BERTHA_GIS_URL = "https://www.nhc.noaa.gov/gis/forecast/archive/al022026_5day_014A.zip"
BERTHA_WIND_FIELD_URL = "https://www.nhc.noaa.gov/gis/forecast/archive/al022026_fcst_014A.zip"
BERTHA_BEST_TRACK_URL = "https://www.nhc.noaa.gov/gis/best_track/al022026_best_track.zip"
BERTHA_ADECK_URL = ADECK_URL_TEMPLATE.format(stormid="al022026")

# Bertha's text-product URLs, from the current_storms.json fixture's
# forecastDiscussion/publicAdvisory/windSpeedProbabilities fields.
BERTHA_DISCUSSION_URL = "https://www.nhc.noaa.gov/text/MIATCDAT2.shtml"
BERTHA_ADVISORY_URL = "https://www.nhc.noaa.gov/text/MIATCPAT2.shtml"
BERTHA_PROBS_URL = "https://www.nhc.noaa.gov/text/MIAPWSAT2.shtml"

# The TWO RSS item's pubDate in the committed index-at.xml fixture (see
# test_outlook.py's test_real_fixture_issued_parses_to_iso8601).
OUTLOOK_ISSUED = "2026-07-23T00:00:00Z"

BERTHA_ADECK_TEXT = (
    # Cycle 18z against Bertha's 2026-07-23T00:00:00Z advisory: model tracks are
    # clipped to the advisory time, so the cycle has to sit a REALISTIC few hours
    # behind it. At the previous 00z the whole run was already 24h elapsed by the
    # advisory and clipping (rightly) left nothing to draw.
    "AL, 02, 2026072218, 03, OFCL,   0, 295N,  905W,  40, 1002, TS\n"
    "AL, 02, 2026072218, 03, OFCL,  12, 296N,  913W,  40, 1000, TS\n"
)


def _adeck_gz(text: str) -> bytes:
    return gzip.compress(text.encode("latin-1"))


# ---------------------------------------------------------------------------
# Fake fetch/store doubles
# ---------------------------------------------------------------------------


class FakeResponse:
    """Minimal requests.Response look-alike: .content, .text, .json(),
    .raise_for_status()."""

    def __init__(self, *, content=None, text=None, json_data=None, status_code=200):
        self._content = content
        self._text = text
        self._json_data = json_data
        self.status_code = status_code

    @property
    def content(self):
        return self._content

    @property
    def text(self):
        if self._text is not None:
            return self._text
        return (self._content or b"").decode("utf-8")

    def json(self):
        if self._json_data is not None:
            return self._json_data
        return json.loads(self.text)

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")


class FakeFetch:
    """Routes url -> FakeResponse. Urls in `raising` raise instead of
    returning a response (both retry attempts, so callers see a real
    failure after pipeline.py's one-retry policy)."""

    def __init__(self, routes: dict, raising: set | None = None):
        self.routes = routes
        self.raising = raising or set()
        self.calls: list[str] = []

    def __call__(self, url, timeout=None):
        self.calls.append(url)
        if url in self.raising:
            raise RuntimeError(f"simulated network failure: {url}")
        if url not in self.routes:
            raise AssertionError(f"unexpected fetch url (no route registered): {url}")
        return self.routes[url]


class FakeStore:
    """In-memory get_json/put_json/put_bytes double. `raising_paths` lets a
    test make a specific put_json path fail (e.g. to test per-product error
    labeling) without touching every other path."""

    def __init__(self, initial: dict | None = None, raising_paths: set | None = None):
        self.data = dict(initial or {})
        self.put_calls: list[str] = []
        self.raising_paths = raising_paths or set()

    def get_json(self, path):
        return self.data.get(path)

    def put_json(self, path, obj):
        if path in self.raising_paths:
            raise RuntimeError(f"simulated store failure: {path}")
        self.data[path] = obj
        self.put_calls.append(path)

    def put_bytes(self, path, data, content_type):
        if path in self.raising_paths:
            raise RuntimeError(f"simulated store failure: {path}")
        self.data[path] = data
        self.put_calls.append(path)


def _outlook_routes():
    return {
        outlook.INDEX_AT_URL: FakeResponse(text=INDEX_AT_XML),
        outlook.GTWO_SHAPEFILES_URL: FakeResponse(content=GTWO_ZIP),
    }


def _bertha_text_product_routes():
    return {
        BERTHA_DISCUSSION_URL: FakeResponse(text=BERTHA_DISCUSSION_SHTML),
        BERTHA_ADVISORY_URL: FakeResponse(text=BERTHA_PUBLIC_ADVISORY_SHTML),
        BERTHA_PROBS_URL: FakeResponse(text=BERTHA_PWS_SHTML),
        # The sample zip has no initialradii member, but it exercises the
        # independent fetch/convert/upload path without adding a binary fixture.
        BERTHA_WIND_FIELD_URL: FakeResponse(content=SAMPLE_CONE_ZIP),
        # Same trick for the observed past track. The bundled 5day zip carries
        # forecast-track *points*, which stand in for best-track fixes well
        # enough to exercise fetch -> build_history -> upload; they are not real
        # observed positions, so assert only on the shape, never the geometry.
        BERTHA_BEST_TRACK_URL: FakeResponse(content=SAMPLE_CONE_ZIP),
        # Basin-wide wind probabilities, fetched once per run whenever any
        # storm is active. The sample zip's layers are not named wsp34/50/64,
        # so attribution finds nothing and no windprob key is advertised --
        # which is exactly the "product absent" path we want covered by
        # default. Attribution itself is unit-tested in test_windprob.py.
        pipeline_module.WSP_LATEST_URL: FakeResponse(content=SAMPLE_CONE_ZIP),
    }


@pytest.fixture(autouse=True)
def no_real_sleep(monkeypatch):
    # Never actually sleep 10s in tests, even when a retry path is hit.
    monkeypatch.setattr("gulfwatch.pipeline.time.sleep", lambda seconds: None)


@pytest.fixture(autouse=True)
def no_ecmwf(monkeypatch):
    """ECMWF density runs on every storm (no flag). Default to its normal
    "nothing posted" answer so tests not about it make no ECMWF requests."""
    from gulfwatch import ecmwf

    monkeypatch.setattr(ecmwf, "download_files", lambda fetch, now, keep=2: [])


@pytest.fixture(autouse=True)
def no_satellite(monkeypatch):
    """Skip the GOES overlay in tests that are not about imagery.

    Its S3 keys are partitioned by year/day-of-year/hour, so the listing URL
    changes with the wall clock -- routing it in every test would pin those
    tests to the hour they were written. Imagery is covered by its own pure
    unit tests (test_satellite.py).
    """
    monkeypatch.setattr(pipeline_module, "_process_satellite", lambda *a, **k: None)


# ---------------------------------------------------------------------------
# Quiet path: no storms -> outlook refreshed, mode == "quiet"
# ---------------------------------------------------------------------------


def test_quiet_path_no_storms_outlook_refreshed():
    routes = {nhc.CURRENT_STORMS_URL: FakeResponse(json_data={"activeStorms": []})}
    routes.update(_outlook_routes())
    fetch = FakeFetch(routes)
    store = FakeStore()

    manifest = run(fetch=fetch, store=store)

    assert manifest["mode"] == "quiet"
    assert manifest["storms"] == []
    assert manifest["errors"] == []
    assert manifest["outlook"] == {
        "geojson": "outlook.geojson",
        "text": "outlook.json",
        "issued": OUTLOOK_ISSUED,
    }
    assert "outlook.geojson" in store.put_calls
    assert "outlook.json" in store.put_calls
    assert "manifest.json" in store.put_calls
    assert "state.json" in store.put_calls
    assert store.data["state.json"] == {"storms": {}, "outlook_issued": OUTLOOK_ISSUED}


# ---------------------------------------------------------------------------
# Active path: Bertha (in Gulf box) -> mode == "active", all five storm
# files uploaded, state advanced.
# ---------------------------------------------------------------------------


def test_active_path_all_five_storm_files_uploaded_and_state_advanced():
    routes = {
        nhc.CURRENT_STORMS_URL: FakeResponse(json_data=CURRENT_STORMS_JSON),
        BERTHA_GIS_URL: FakeResponse(content=SAMPLE_CONE_ZIP),
        BERTHA_ADECK_URL: FakeResponse(content=_adeck_gz(BERTHA_ADECK_TEXT)),
    }
    routes.update(_outlook_routes())
    routes.update(_bertha_text_product_routes())
    fetch = FakeFetch(routes)
    store = FakeStore()

    manifest = run(fetch=fetch, store=store)

    assert manifest["mode"] == "active"
    assert manifest["errors"] == []
    # Fausto (ep062026) is East Pacific -- excluded, only Bertha remains.
    assert [s["id"] for s in manifest["storms"]] == ["al022026"]

    bertha = manifest["storms"][0]
    assert bertha["name"] == "Bertha"
    assert bertha["classification"] == "TS"
    assert bertha["intensityMph"] == round(40 * 1.15078)  # 46
    assert bertha["pressureMb"] == 1002
    assert bertha["movementDir"] == "W"  # movement_dir 260 deg -> compass W
    assert bertha["movementMph"] == 7
    assert bertha["lat"] == 29.5
    assert bertha["lon"] == -90.5
    assert bertha["advisoryNum"] == "014a"
    assert bertha["advisoryTime"] == "2026-07-23T00:00:00Z"
    # Read from the public advisory fixture's NEXT ADVISORY block ("Next
    # complete advisory at 1000 PM CDT." -- 0300Z), not the feed-only +6h
    # assumption (0600Z). An intermediate advisory at 7 PM CDT is followed by
    # a complete one 3h later; the header counts down to that.
    assert bertha["nextAdvisoryTime"] == "2026-07-23T03:00:00Z"
    assert bertha["inGulfBox"] is True
    assert bertha["modelCycle"] == "2026072218"
    assert bertha["files"] == {
        "cone": "storms/al022026/cone.geojson",
        "track": "storms/al022026/track.geojson",
        "wwlines": "storms/al022026/wwlines.geojson",
        "windfield": "storms/al022026/windfield.geojson",
        "models": "storms/al022026/models.geojson",
        "intensity": "storms/al022026/intensity.json",
        "text": "storms/al022026/text.json",
        "probs": "storms/al022026/probs.json",
        # Observed past track, added Aug 2026 so live storms get the same
        # "Past track" option the Ida replay always had.
        "history": "storms/al022026/history.geojson",
    }

    for path in bertha["files"].values():
        assert path in store.put_calls

    text_json = store.data["storms/al022026/text.json"]
    assert set(text_json.keys()) == {"discussion", "publicAdvisory"}
    assert text_json["discussion"]["issued"] == "2026-07-22T21:00:00Z"
    assert text_json["discussion"]["text"].startswith(
        "Tropical Storm Bertha Discussion Number  18"
    )
    assert text_json["publicAdvisory"]["issued"] == "2026-07-23T00:00:00Z"
    assert text_json["publicAdvisory"]["text"].startswith("BULLETIN")

    # Bertha made landfall in Texas, west of Louisiana -- none of our 5
    # whitelisted Gulf Coast points legitimately appear in this real PWS
    # fixture's table. Empty array is the correct, expected result.
    assert store.data["storms/al022026/probs.json"] == []

    cone_fc = store.data["storms/al022026/cone.geojson"]
    assert {f["properties"]["shapefile"] for f in cone_fc["features"]} == {
        "al022026-014A_5day_pgn"
    }
    track_fc = store.data["storms/al022026/track.geojson"]
    assert {f["properties"]["shapefile"] for f in track_fc["features"]} == {
        "al022026-014A_5day_lin",
        "al022026-014A_5day_pts",
    }
    ww_fc = store.data["storms/al022026/wwlines.geojson"]
    assert {f["properties"]["shapefile"] for f in ww_fc["features"]} == {
        "al022026-014A_ww_wwlin"
    }
    assert store.data["storms/al022026/windfield.geojson"]["features"] == []

    assert store.data["state.json"]["storms"]["al022026"] == {
        "advisory": "014a",
        "cycle": "2026072218",
        # The announced next advisory, persisted because the text it comes
        # from is only fetched when the advisory changes.
        "nextAdvisoryTime": "2026-07-23T03:00:00Z",
        # Carried forward so an already-built past track keeps its manifest key
        # on a run where the advisory did not change.
        "history": True,
        # No windprob layers landed: the sample zip's layers are not named
        # wsp34/50/64, so attribution finds nothing to attribute.
        "windprob": [],
        # Which optional GIS layers actually reached the store, so an unchanged
        # advisory keeps advertising exactly what exists (NHC 404s a storm's
        # WW zip when no watches or warnings are in effect).
        "gis": ["cone", "track", "windfield", "wwlines"],
        # Model guidance that reached the store, so an unchanged cycle keeps
        # advertising exactly what exists.
        "adeck": ["intensity", "models"],
        "gisVersion": 3,
    }

    # cone/track/wwlines share one bundled zip in this fixture -- must be
    # fetched (and converted) only once, not three times.
    assert fetch.calls.count(BERTHA_GIS_URL) == 1


# ---------------------------------------------------------------------------
# No-change path: same advisory + a-deck cycle already in state.json ->
# no storm GIS/a-deck uploads (and no GIS re-fetch at all).
# ---------------------------------------------------------------------------


def test_no_change_path_same_advisory_and_cycle_skips_storm_uploads():
    initial_state = {
        "storms": {
            "al022026": {
                "advisory": "014a",
                "cycle": "2026072218",
                # Already built by a prior run. History and wind probability
                # also rebuild when MISSING, not only on a new advisory, so a
                # steady state needs them present for this test to be about an
                # unchanged advisory rather than about a backfill.
                "history": True,
                "windprob": ["windprob"],
                # Which optional GIS layers a prior run confirmed. Absent state
                # would trigger a one-off rebuild to establish it, which is a
                # different scenario from this test's unchanged advisory.
                "gis": ["cone", "track", "wwlines", "windfield"],
                "adeck": ["models", "intensity"],
                "gisVersion": 3,
            }
        },
        "outlook_issued": OUTLOOK_ISSUED,  # unchanged too, isolates this test's assertion
    }
    # A prior run's track.geojson, already showing Bertha's position inside
    # the Gulf box -- this run must reuse it rather than refetching GIS.
    prior_track_fc = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [-90.5, 29.5]},
                "properties": {"shapefile": "al022026-014A_5day_pts"},
            }
        ],
    }
    store = FakeStore(
        {
            "state.json": initial_state,
            "storms/al022026/track.geojson": prior_track_fc,
        }
    )
    routes = {
        nhc.CURRENT_STORMS_URL: FakeResponse(json_data=CURRENT_STORMS_JSON),
        BERTHA_ADECK_URL: FakeResponse(content=_adeck_gz(BERTHA_ADECK_TEXT)),
    }
    routes.update(_outlook_routes())
    # Deliberately no GIS zip route registered -- FakeFetch raises
    # AssertionError if the pipeline tries to fetch it.
    fetch = FakeFetch(routes)

    manifest = run(fetch=fetch, store=store)

    assert manifest["mode"] == "active"
    assert manifest["errors"] == []
    bertha = manifest["storms"][0]
    assert bertha["advisoryNum"] == "014a"
    assert bertha["modelCycle"] == "2026072218"
    assert bertha["inGulfBox"] is True

    storm_upload_paths = {
        "storms/al022026/cone.geojson",
        "storms/al022026/track.geojson",
        "storms/al022026/wwlines.geojson",
        "storms/al022026/models.geojson",
        "storms/al022026/intensity.json",
        "storms/al022026/text.json",
        "storms/al022026/probs.json",
    }
    assert not (storm_upload_paths & set(store.put_calls))
    assert "outlook.geojson" not in store.put_calls
    assert "outlook.json" not in store.put_calls
    assert BERTHA_GIS_URL not in fetch.calls
    assert BERTHA_DISCUSSION_URL not in fetch.calls
    assert BERTHA_ADVISORY_URL not in fetch.calls
    assert BERTHA_PROBS_URL not in fetch.calls


# ---------------------------------------------------------------------------
# Error path: cone download raises -> manifest has an errors entry, other
# products still uploaded.
# ---------------------------------------------------------------------------


def test_error_path_cone_failure_still_uploads_other_products():
    cone_url = "https://fake.example/cone.zip"
    track_url = "https://fake.example/track.zip"
    ww_url = "https://fake.example/ww.zip"

    bertha_raw = dict(CURRENT_STORMS_JSON["activeStorms"][0])
    storms_json = {
        "activeStorms": [
            {
                **bertha_raw,
                "trackCone": {**bertha_raw["trackCone"], "zipFile": cone_url},
                "forecastTrack": {**bertha_raw["forecastTrack"], "zipFile": track_url},
                "windWatchesWarnings": {
                    **bertha_raw["windWatchesWarnings"],
                    "zipFile": ww_url,
                },
            }
        ]
    }

    routes = {
        nhc.CURRENT_STORMS_URL: FakeResponse(json_data=storms_json),
        track_url: FakeResponse(content=SAMPLE_CONE_ZIP),
        ww_url: FakeResponse(content=SAMPLE_CONE_ZIP),
        BERTHA_ADECK_URL: FakeResponse(content=_adeck_gz(BERTHA_ADECK_TEXT)),
    }
    routes.update(_outlook_routes())
    routes.update(_bertha_text_product_routes())
    fetch = FakeFetch(routes, raising={cone_url})
    store = FakeStore()

    manifest = run(fetch=fetch, store=store)

    assert manifest["errors"] == [
        {"product": "al022026.cone", "message": "simulated network failure: https://fake.example/cone.zip"}
    ]

    assert "storms/al022026/track.geojson" in store.put_calls
    assert "storms/al022026/wwlines.geojson" in store.put_calls
    assert "storms/al022026/models.geojson" in store.put_calls
    assert "storms/al022026/intensity.json" in store.put_calls
    assert "storms/al022026/cone.geojson" not in store.put_calls
    assert "storms/al022026/text.json" in store.put_calls
    assert "storms/al022026/probs.json" in store.put_calls

    bertha = manifest["storms"][0]
    # Resolved via storm.lat/lon (29.5, -90.5) directly -- storm_in_gulf
    # doesn't even need the track (which also happened to succeed here).
    assert bertha["inGulfBox"] is True

    # cone_url is retried once (per the 30s/one-retry-at-10s-backoff policy)
    # before giving up.
    assert fetch.calls.count(cone_url) == 2


# ---------------------------------------------------------------------------
# Bonus: one malformed storm entry in CurrentStorms.json must not discard
# every other storm in the feed (critical integration fact from the task
# brief -- nhc.parse_current_storms has no per-item try/except of its own).
# ---------------------------------------------------------------------------


def test_malformed_storm_entry_does_not_kill_the_run():
    bad = {"id": "al992026", "name": "Malformed"}  # missing required fields
    good = dict(CURRENT_STORMS_JSON["activeStorms"][0])  # Bertha, valid
    storms_json = {"activeStorms": [bad, good]}

    routes = {
        nhc.CURRENT_STORMS_URL: FakeResponse(json_data=storms_json),
        BERTHA_GIS_URL: FakeResponse(content=SAMPLE_CONE_ZIP),
        BERTHA_ADECK_URL: FakeResponse(content=_adeck_gz(BERTHA_ADECK_TEXT)),
    }
    routes.update(_outlook_routes())
    fetch = FakeFetch(routes)
    store = FakeStore()

    manifest = run(fetch=fetch, store=store)

    assert [s["id"] for s in manifest["storms"]] == ["al022026"]
    error_products = {e["product"] for e in manifest["errors"]}
    assert "al992026" in error_products


# ---------------------------------------------------------------------------
# Regression: a shared GIS URL (the common case -- cone/track/wwlines all
# point at one bundled zip) that fails must be fetched exactly once (plus
# its one retry), not once per product key. Each of the three products
# still gets its own manifest.errors entry (so callers can see all three
# products are missing), but no *extra* HTTP attempts happen beyond the
# single fetch's own retry.
# ---------------------------------------------------------------------------


def test_shared_gis_url_failure_dedupes_fetch_attempts():
    routes = {
        nhc.CURRENT_STORMS_URL: FakeResponse(json_data=CURRENT_STORMS_JSON),
        BERTHA_ADECK_URL: FakeResponse(content=_adeck_gz(BERTHA_ADECK_TEXT)),
    }
    routes.update(_outlook_routes())
    routes.update(_bertha_text_product_routes())
    # Bertha's cone/track/wwlines gis_urls all point at BERTHA_GIS_URL in the
    # fixture -- make that one shared URL fail.
    fetch = FakeFetch(routes, raising={BERTHA_GIS_URL})
    store = FakeStore()

    manifest = run(fetch=fetch, store=store)

    error_products = {e["product"] for e in manifest["errors"]}
    assert error_products == {"al022026.cone", "al022026.track", "al022026.wwlines"}
    assert len(manifest["errors"]) == 3

    # Exactly one fetch attempt + one retry for the shared URL -- NOT one
    # attempt+retry pair per product key (which would be 6 calls).
    assert fetch.calls.count(BERTHA_GIS_URL) == 2

    for path in (
        "storms/al022026/cone.geojson",
        "storms/al022026/track.geojson",
        "storms/al022026/wwlines.geojson",
    ):
        assert path not in store.put_calls


# ---------------------------------------------------------------------------
# Minor fix: models.geojson and intensity.json are two separate uploads and
# must get two separately-labeled error entries, not both blamed on
# "{id}.models".
# ---------------------------------------------------------------------------


def test_adeck_models_and_intensity_upload_failures_labeled_separately():
    store = FakeStore(raising_paths={"storms/al022026/intensity.json"})
    routes = {
        nhc.CURRENT_STORMS_URL: FakeResponse(json_data=CURRENT_STORMS_JSON),
        BERTHA_GIS_URL: FakeResponse(content=SAMPLE_CONE_ZIP),
        BERTHA_ADECK_URL: FakeResponse(content=_adeck_gz(BERTHA_ADECK_TEXT)),
    }
    routes.update(_outlook_routes())
    routes.update(_bertha_text_product_routes())
    fetch = FakeFetch(routes)

    manifest = run(fetch=fetch, store=store)

    error_products = {e["product"] for e in manifest["errors"]}
    assert error_products == {"al022026.intensity"}
    assert "al022026.models" not in error_products
    # models.geojson upload itself succeeded independently of intensity's failure.
    assert "storms/al022026/models.geojson" in store.put_calls
    assert "storms/al022026/intensity.json" not in store.put_calls


# ---------------------------------------------------------------------------
# BLOCKER B1 (final review): a CurrentStorms.json fetch failure (both
# attempts exhausted) must be a total-run failure, not a synthesized quiet
# run -- writing a fresh {"activeStorms": []}-derived manifest/state on a
# transient NHC outage would erase whatever storm is currently live on the
# public site. Required behavior: write NOTHING to the store (no
# manifest.json, no state.json -- last-good stays untouched) and propagate
# the failure so ingest.py's existing top-level try/except exits 1 for this
# run. This is distinct from a *legitimately* empty activeStorms list (a
# normal quiet run, exercised by test_quiet_path_no_storms_outlook_refreshed
# above), which must keep writing normally.
# ---------------------------------------------------------------------------


def test_current_storms_fetch_failure_writes_nothing_and_raises():
    fetch = FakeFetch({}, raising={nhc.CURRENT_STORMS_URL})
    store = FakeStore()

    with pytest.raises(Exception):
        run(fetch=fetch, store=store)

    assert store.put_calls == []
    # Retried once (per the 30s/one-retry-at-10s-backoff policy) before giving up.
    assert fetch.calls.count(nhc.CURRENT_STORMS_URL) == 2


# ---------------------------------------------------------------------------
# AIFS graceful degradation (Task 5): gulfwatch.aifs.fetch_aifs_tracks is
# stubbed to always return [] and never raise (see aifs.py's SPIKE
# OUTCOME), but pipeline.py wraps the call in its own try/except regardless
# -- this test proves that guarantee directly by monkeypatching a raising
# fetch_aifs_tracks, independent of whether the real implementation ever
# raises. A raising AIFS fetcher must still produce a full manifest (all
# other storm products uploaded, mode/inGulfBox computed normally) plus one
# "aifs" error entry -- it must never take down the run.
# ---------------------------------------------------------------------------


def test_aifs_failure_degrades_gracefully_and_still_produces_full_manifest(monkeypatch):
    def raising_fetch_aifs_tracks(storm_atcf_id, fetch_impl=None):
        raise RuntimeError("simulated BUFR decode failure")

    monkeypatch.setattr(
        pipeline_module.aifs, "fetch_aifs_tracks", raising_fetch_aifs_tracks
    )

    routes = {
        nhc.CURRENT_STORMS_URL: FakeResponse(json_data=CURRENT_STORMS_JSON),
        BERTHA_GIS_URL: FakeResponse(content=SAMPLE_CONE_ZIP),
        BERTHA_ADECK_URL: FakeResponse(content=_adeck_gz(BERTHA_ADECK_TEXT)),
    }
    routes.update(_outlook_routes())
    routes.update(_bertha_text_product_routes())
    fetch = FakeFetch(routes)
    store = FakeStore()

    manifest = run(fetch=fetch, store=store)

    assert manifest["errors"] == [
        {"product": "aifs", "message": "simulated BUFR decode failure"}
    ]

    # The rest of the run still completed normally: full manifest entry,
    # all five storm files uploaded, mode computed correctly.
    assert manifest["mode"] == "active"
    bertha = manifest["storms"][0]
    assert bertha["id"] == "al022026"
    assert bertha["inGulfBox"] is True
    for path in bertha["files"].values():
        assert path in store.put_calls

    # models.geojson still holds the a-deck-derived features (OFCL) -- just
    # with no AIFS features concatenated in, since the fetch raised.
    models_fc = store.data["storms/al022026/models.geojson"]
    assert {f["properties"]["model"] for f in models_fc["features"]} == {"OFCL"}


# ---------------------------------------------------------------------------
# text.json/probs.json error isolation: one of the three sub-fetches
# (discussion/advisory/probs) failing must not block the other product's
# upload -- text.json and probs.json are two independently try/excepted
# products (see pipeline.py's _process_text_products), same isolation
# guarantee as cone/track/wwlines above.
# ---------------------------------------------------------------------------


def test_text_product_error_isolation_discussion_failure_still_uploads_probs():
    routes = {
        nhc.CURRENT_STORMS_URL: FakeResponse(json_data=CURRENT_STORMS_JSON),
        BERTHA_GIS_URL: FakeResponse(content=SAMPLE_CONE_ZIP),
        BERTHA_ADECK_URL: FakeResponse(content=_adeck_gz(BERTHA_ADECK_TEXT)),
    }
    routes.update(_outlook_routes())
    routes.update(_bertha_text_product_routes())
    # Discussion fetch fails -- this must take down text.json only (both
    # attempts exhausted, per the one-retry policy), never probs.json.
    fetch = FakeFetch(routes, raising={BERTHA_DISCUSSION_URL})
    store = FakeStore()

    manifest = run(fetch=fetch, store=store)

    assert manifest["errors"] == [
        {
            "product": "al022026.text",
            "message": f"simulated network failure: {BERTHA_DISCUSSION_URL}",
        }
    ]

    assert "storms/al022026/text.json" not in store.put_calls
    assert "storms/al022026/probs.json" in store.put_calls
    assert store.data["storms/al022026/probs.json"] == []

    # The rest of the manifest/run still completed normally.
    assert manifest["mode"] == "active"
    for path in (
        "storms/al022026/cone.geojson",
        "storms/al022026/track.geojson",
        "storms/al022026/wwlines.geojson",
        "storms/al022026/models.geojson",
        "storms/al022026/intensity.json",
    ):
        assert path in store.put_calls

    # Discussion URL retried once before giving up (30s/one-retry policy).
    assert fetch.calls.count(BERTHA_DISCUSSION_URL) == 2
    # Advisory fetch never even attempted -- the discussion fetch (the
    # first of the two text.json fetches) already failed and raised before
    # the advisory fetch would run.
    assert BERTHA_ADVISORY_URL not in fetch.calls


def test_text_product_missing_url_field_records_error_not_crash():
    # A storm entry whose forecastDiscussion is None (as some real entries
    # are, e.g. peakSurgeKML on Fausto in current_storms.json) must record
    # a per-sub-product error rather than crashing the whole run.
    bertha_raw = dict(CURRENT_STORMS_JSON["activeStorms"][0])
    storms_json = {
        "activeStorms": [{**bertha_raw, "forecastDiscussion": None}],
    }
    routes = {
        nhc.CURRENT_STORMS_URL: FakeResponse(json_data=storms_json),
        BERTHA_GIS_URL: FakeResponse(content=SAMPLE_CONE_ZIP),
        BERTHA_ADECK_URL: FakeResponse(content=_adeck_gz(BERTHA_ADECK_TEXT)),
    }
    routes.update(_outlook_routes())
    routes.update(_bertha_text_product_routes())
    fetch = FakeFetch(routes)
    store = FakeStore()

    manifest = run(fetch=fetch, store=store)

    error_products = {e["product"] for e in manifest["errors"]}
    assert "al022026.text" in error_products
    assert "storms/al022026/text.json" not in store.put_calls
    assert "storms/al022026/probs.json" in store.put_calls
    # discussion_url is empty for this storm -- must never even attempt to
    # fetch it.
    assert BERTHA_DISCUSSION_URL not in fetch.calls


# --- Observed past track (Aug 2026) -------------------------------------------


def _pt(lon, lat, dtg):
    return {
        "type": "Feature",
        "properties": {"DTG": dtg},
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
    }


def test_build_history_lines_up_fixes_and_appends_current_position():
    from gulfwatch.pipeline import build_history

    best = {"type": "FeatureCollection", "features": [_pt(-80.0, 20.0, 2026081000),
                                                      _pt(-82.0, 22.0, 2026081006)]}
    out = build_history(best, -84.0, 24.0)
    line = out["features"][0]
    assert line["geometry"]["type"] == "LineString"
    assert line["properties"]["kind"] == "observed-history"
    # the live current position is newer than the last archived fix
    assert line["geometry"]["coordinates"] == [[-80.0, 20.0], [-82.0, 22.0], [-84.0, 24.0]]
    # the individual fixes are kept alongside the line
    assert len(out["features"]) == 3


def test_build_history_sorts_out_of_order_fixes():
    """An unsorted shapefile would otherwise draw the past track doubling back."""
    from gulfwatch.pipeline import build_history

    best = {"type": "FeatureCollection", "features": [_pt(-82.0, 22.0, 2026081006),
                                                      _pt(-80.0, 20.0, 2026081000)]}
    coords = build_history(best, -84.0, 24.0)["features"][0]["geometry"]["coordinates"]
    assert coords == [[-80.0, 20.0], [-82.0, 22.0], [-84.0, 24.0]]


def test_build_history_does_not_duplicate_the_current_position():
    from gulfwatch.pipeline import build_history

    best = {"type": "FeatureCollection", "features": [_pt(-80.0, 20.0, 2026081000),
                                                      _pt(-84.0, 24.0, 2026081006)]}
    coords = build_history(best, -84.0, 24.0)["features"][0]["geometry"]["coordinates"]
    assert coords == [[-80.0, 20.0], [-84.0, 24.0]]


def test_build_history_emits_no_line_for_a_single_fix():
    """One fix plus the current position is a line; zero fixes is not."""
    from gulfwatch.pipeline import build_history

    out = build_history({"type": "FeatureCollection", "features": []}, -84.0, 24.0)
    assert out["features"] == []


def test_build_history_ignores_non_point_geometry():
    from gulfwatch.pipeline import build_history

    best = {
        "type": "FeatureCollection",
        "features": [
            {"type": "Feature", "properties": {},
             "geometry": {"type": "LineString", "coordinates": [[-80, 20], [-81, 21]]}},
            _pt(-80.0, 20.0, 2026081000),
        ],
    }
    out = build_history(best, -84.0, 24.0)
    assert out["features"][0]["geometry"]["coordinates"] == [[-80.0, 20.0], [-84.0, 24.0]]
    assert all(f["geometry"]["type"] == "Point" for f in out["features"][1:])


def test_wwlines_is_not_advertised_when_nhc_has_no_watches_or_warnings():
    """NHC publishes {ID}_WW_latest.zip only while watches/warnings are in
    effect and 404s otherwise. Advertising the key regardless left the manifest
    pointing at a blob that was never written, so every page load 404'd and the
    rail claimed products were "temporarily unavailable" for a storm that simply
    had no warnings. Observed live on Cristobal (al032026), 2026-08-12.
    """
    routes = {
        nhc.CURRENT_STORMS_URL: FakeResponse(json_data=CURRENT_STORMS_JSON),
        BERTHA_GIS_URL: FakeResponse(content=SAMPLE_CONE_ZIP),
        BERTHA_ADECK_URL: FakeResponse(content=_adeck_gz(BERTHA_ADECK_TEXT)),
    }
    routes.update(_outlook_routes())
    routes.update(_bertha_text_product_routes())
    # The storm's own WW zip is the one product NHC is not serving.
    fetch = FakeFetch(routes, raising={BERTHA_GIS_URL})
    store = FakeStore()

    manifest = run(fetch=fetch, store=store)
    files = manifest["storms"][0]["files"]

    assert "wwlines" not in files, "must not advertise a blob that was never written"
    assert "storms/al022026/wwlines.geojson" not in store.put_calls
    # The failure is still reported -- silence would hide a real NHC outage.
    assert any(e["product"] == "al022026.wwlines" for e in manifest["errors"])


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
    assert state["version"] == pipeline_module._DENSITY_STATE_VERSION and state["entries"]["gefs"]["fp"]


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


def test_density_from_an_older_state_version_is_rerendered(density_clock):
    store = FakeStore()
    run(fetch=FakeFetch(_density_routes()), store=store)
    state = store.data["state.json"]
    state["storms"]["al022026"]["density"]["version"] = pipeline_module._DENSITY_STATE_VERSION - 1
    store.put_calls.clear()
    run(fetch=FakeFetch(_density_routes()), store=store)
    assert [p for p in store.put_calls if "density-gefs" in p]


# ---------------------------------------------------------------------------
# ECMWF ensemble density (public CC BY 4.0 data; decode stubbed -- needs ecCodes)
# ---------------------------------------------------------------------------
from gulfwatch import ecmwf as _ecmwf
from gulfwatch.adeck import MemberPoint as _MP


def _ecmwf_members():
    return "2026072218", {
        f"EN{m:02d}": [(tau, 29.5 + tau / 40, -90.5 - tau / 20) for tau in range(0, 121, 6)]
        for m in range(1, 52)
    }


def test_ecmwf_density_advertised_without_any_flag(density_clock, monkeypatch):
    monkeypatch.setattr(_ecmwf, "download_files", lambda fetch, now, keep=2: [("2026072218", b"BUFR")])
    monkeypatch.setattr(_ecmwf, "members_for_storm", lambda files, storm_id, minimum, advisory_time: _ecmwf_members())
    store = FakeStore()
    manifest = run(fetch=FakeFetch(_density_routes()), store=store)
    entry = manifest["storms"][0]["density"]["ecmwf"]
    assert entry["members"] == 51 and entry["expected"] == 51
    assert entry["image"].startswith("storms/al022026/density-ecmwf-2026072218-")


def test_ecmwf_not_posted_is_silent_and_failure_is_recorded(density_clock, monkeypatch):
    # "Not posted yet" / "storm not in the file" are normal states: no error.
    manifest = run(fetch=FakeFetch(_density_routes()), store=FakeStore())
    assert "ecmwf" not in manifest["storms"][0]["density"]
    assert not [e for e in manifest["errors"] if ".density.ecmwf" in e["product"]]

    def boom(*a, **k):
        raise RuntimeError("ecCodes decode failed")
    monkeypatch.setattr(_ecmwf, "download_files", lambda fetch, now, keep=2: [("2026072218", b"BUFR")])
    monkeypatch.setattr(_ecmwf, "members_for_storm", boom)
    manifest = run(fetch=FakeFetch(_density_routes()), store=FakeStore())
    assert "gefs" in manifest["storms"][0]["density"]
    assert {"product": "al022026.density.ecmwf", "message": "ecCodes decode failed"} in manifest["errors"]


def test_ecmwf_files_downloaded_once_per_run(density_clock, monkeypatch):
    calls = []

    def download(fetch, now, keep=2):
        calls.append(now)
        return []
    monkeypatch.setattr(_ecmwf, "download_files", download)
    run(fetch=FakeFetch(_density_routes()), store=FakeStore())
    assert len(calls) == 1


def test_google_stops_at_first_network_failure(density_clock, monkeypatch):
    monkeypatch.setenv("GOOGLE_DENSITY_ENABLED", "1")
    routes = _density_routes(_google_text())
    fetch = FakeFetch(routes, raising={GOOGLE_00Z_URL})
    manifest = run(fetch=fetch, store=FakeStore())
    assert GOOGLE_18Z_URL not in fetch.calls
    codes = [e["message"] for e in manifest["errors"] if e["product"] == "al022026.density.google"]
    assert codes == ["google_unavailable"]


def test_failed_rebuild_does_not_advertise_a_stale_fallback(density_clock):
    class FlakyStore(FakeStore):
        fail = False

        def put_bytes(self, path, data, content_type):
            if "density-gefs" in path and self.fail:
                raise RuntimeError("simulated store failure")
            super().put_bytes(path, data, content_type)

    store = FlakyStore()
    old = _density_routes()
    old[BERTHA_ADECK_URL] = FakeResponse(content=_adeck_gz(BERTHA_ADECK_TEXT + _gefs_rows(cycle="2026072200")))
    assert run(fetch=FakeFetch(old), store=store)["storms"][0]["density"]["gefs"]["cycle"] == "2026072200"
    store.fail = True  # 18Z is now available but its image cannot be uploaded
    manifest = run(fetch=FakeFetch(_density_routes()), store=store)
    assert "gefs" not in manifest["storms"][0].get("density", {})  # 00Z is 18 h behind 18Z
    assert any(e["product"] == "al022026.density.gefs" for e in manifest["errors"])
