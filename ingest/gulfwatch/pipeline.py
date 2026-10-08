"""Gulf Watch ingest orchestrator: poll -> convert -> upload -> manifest.json.

Ties together gulfwatch.nhc / gulfwatch.adeck / gulfwatch.shp /
gulfwatch.outlook / gulfwatch.aifs into one pipeline run. See
shared-contracts.md for the exact manifest.json shape, blob paths, source
URLs, error rules, and Gulf box this module must honor exactly.

`run(fetch=requests.get, store=blob)` is the sole public entry point; both
`fetch` and `store` are injectable so tests can pass fake doubles (see
tests/test_pipeline.py) instead of hitting the network / a real Blob store.
`ingest.py` is the CLI entry point that calls `run()` with the real
defaults.

Network policy (shared-contracts.md Global Constraints): every fetch gets a
30s timeout and exactly one retry after a 10s backoff, all funneled through
the single `_fetch_with_retry` helper below. Every product's fetch/convert/
upload is wrapped in its own try/except and recorded in manifest["errors"]
on failure -- one bad product (or one malformed storm entry) must never
take down the whole run.
"""

from __future__ import annotations

import gzip
import os
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

from gulfwatch import adeck, aifs, blob, density, ecmwf, nhc, rain, outlook, probs, satellite, shp, text, weatherlab, windprob

FETCH_TIMEOUT_S = 30
RETRY_BACKOFF_S = 10

# A-deck (model guidance) URL template -- see shared-contracts.md. This
# lives here rather than in adeck.py: adeck.py is a pure text parser with no
# network I/O or URL constants of its own (unlike nhc.py/outlook.py, which
# already own the URLs they're associated with); pipeline.py is the one
# place that owns every fetch URL it uses directly.
ADECK_URL_TEMPLATE = "https://ftp.nhc.noaa.gov/atcf/aid_public/a{stormid}.dat.gz"


def _fetch_with_retry(fetch, url):
    """Fetch `url` via the injected `fetch(url, timeout=...)` callable, with
    one retry after a 10s backoff on any exception (network error or a
    raise_for_status() 4xx/5xx). Re-raises the second attempt's exception if
    it also fails."""
    last_exc = None
    for attempt in (1, 2):
        try:
            resp = fetch(url, timeout=FETCH_TIMEOUT_S)
            resp.raise_for_status()
            return resp
        except Exception as exc:  # noqa: BLE001 - deliberately broad, single retry point
            last_exc = exc
            if attempt == 1:
                time.sleep(RETRY_BACKOFF_S)
    raise last_exc


def _iso_z_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------------------------------------------------------------------------
# GIS zip splitting
#
# NHC now ships one bundled "_5day_" zip per advisory containing the cone
# polygon, forecast track line, forecast track points, and watch/warning
# lines together (controller-verified against a live advisory, 2026-07-22;
# confirmed against the committed fixture ingest/tests/fixtures/
# sample_cone.zip, whose four members are:
#   al022026-014A_5day_pgn   (cone polygon)
#   al022026-014A_5day_lin   (forecast track line)
#   al022026-014A_5day_pts   (forecast track points)
#   al022026-014A_ww_wwlin   (watch/warning lines)
# shp.zip_to_geojson merges every shapefile in a zip into one
# FeatureCollection, tagging each feature with a "shapefile" property
# holding the source .shp member's basename. The predicates below split
# that merged FeatureCollection back into the three per-product layers.
# They're also correct for the CurrentStorms.json *_latest.zip fallback
# pattern, where cone/track/ww are three separate single-layer zips --
# each zip's own single layer just matches its own predicate and no other.
#
#   - cone:    "pgn" in the shapefile name.
#   - wwlines: "ww" in the shapefile name -- checked as its own independent
#              predicate (not "elif" ordering) because "..._ww_wwlin" also
#              contains the substring "lin", so the track predicate below
#              explicitly excludes anything with "ww" in it.
#   - track:   ("lin" or "pts" in the name) AND "ww" not in it. track.
#              geojson ends up holding BOTH the line and the point features.
# ---------------------------------------------------------------------------


def _is_not_found(exc: Exception) -> bool:
    """True for an HTTP 404, however the fetch layer reported it."""
    response = getattr(exc, "response", None)
    if response is not None and getattr(response, "status_code", None) == 404:
        return True
    return "404" in str(exc)


def _select_features(geojson: dict, predicate) -> dict:
    features = [
        f
        for f in geojson.get("features", [])
        if predicate(f.get("properties", {}).get("shapefile", ""))
    ]
    return {"type": "FeatureCollection", "features": features}


def _is_cone(name: str) -> bool:
    return "pgn" in name


def _is_wwlines(name: str) -> bool:
    return "ww" in name


def _is_track(name: str) -> bool:
    return ("lin" in name or "pts" in name) and "ww" not in name


def _is_windfield(name: str) -> bool:
    return "initialradii" in name.lower()


def _storm_paths(stormid: str) -> dict:
    base = f"storms/{stormid}"
    return {
        "cone": f"{base}/cone.geojson",
        "track": f"{base}/track.geojson",
        "wwlines": f"{base}/wwlines.geojson",
        "windfield": f"{base}/windfield.geojson",
        "models": f"{base}/models.geojson",
        "intensity": f"{base}/intensity.json",
        "text": f"{base}/text.json",
        "probs": f"{base}/probs.json",
        # Products the Ida replay always had but live storms did not, so the
        # live map showed fewer options than the demo (Aug 2026).
        "history": f"{base}/history.geojson",
        "windprob": f"{base}/windprob.geojson",
        "windprob50": f"{base}/windprob-58mph.geojson",
        "windprob64": f"{base}/windprob-74mph.geojson",
    }


# Observed track so far, from NHC's per-storm GIS best-track archive. Published
# for storms while they are active, not only after post-analysis (verified
# 2026-08-10: al012026/al022026/ep062026 all 200).
BEST_TRACK_URL = "https://www.nhc.noaa.gov/gis/best_track/{stormid}_best_track.zip"

# Wind speed probabilities, latest issuance. NHC's GIS index lists this under
# forecast/archive/ (not /gis/ directly) and states plainly that it is a
# basin-wide forecast-cycle product, not per-storm -- hence the geographic
# attribution in gulfwatch.windprob.
WSP_LATEST_URL = "https://www.nhc.noaa.gov/gis/forecast/archive/wsp_120hr5km_latest.zip"


# Bump when the meaning of state.json's "gis", "adeck" or "windprob" records
# changes, so stale entries are re-derived rather than trusted.
#
# 3 (2026-08-13): model tracks are now clipped to the advisory time, and the
# wind-probability record gained the cycle its field came from. Both are computed
# only when their product is rebuilt, and a rebuild normally waits for a new
# advisory or cycle -- so a storm already active at deploy time would have kept
# serving unclipped tracks and no probability cycle for up to six hours. Same
# shape as the bug that left Cristobal with no history/windprob layers at all.
_GIS_STATE_VERSION = 3

_GIS_PREDICATES = {
    "cone": _is_cone,
    "track": _is_track,
    "wwlines": _is_wwlines,
    "windfield": _is_windfield,
}


def _process_gis(storm, paths, fetch, store, errors):
    """Fetch+convert+upload cone/track/wwlines for one storm whose advisory
    just changed.

    Each unique URL across the three gis_urls keys is fetched and converted
    exactly once up front (whether that attempt succeeds or fails) -- the
    common case today is all three keys pointing at the same bundled zip,
    and a failure there must not trigger three separate fetch-and-retry
    attempts (six HTTP calls) for what is really one download. Each of the
    three product keys then gets its own try/except around
    extract-and-upload (or its own error entry, reusing the cached
    exception, if its URL's fetch failed) -- so one bad *upload* still
    can't take out the others, even when their downloads succeeded.

    Returns (track FeatureCollection or None for the storm_in_gulf check,
    set of product keys that actually landed on the store). The caller
    advertises only the keys that landed: NHC publishes {ID}_WW_latest.zip
    only while watches or warnings are in effect and 404s otherwise, so a
    storm with none -- a fish storm in the open Atlantic -- was leaving the
    manifest pointing at a wwlines blob that had never been written, and
    every page load 404'd on it.
    """
    active_products = {
        key: predicate
        for key, predicate in _GIS_PREDICATES.items()
        if storm.gis_urls.get(key)
    }
    unique_urls = {storm.gis_urls[key] for key in active_products}
    fetched: dict[str, dict] = {}
    fetch_errors: dict[str, Exception] = {}
    for url in unique_urls:
        try:
            resp = _fetch_with_retry(fetch, url)
            fetched[url] = shp.zip_to_geojson(resp.content)
        except Exception as exc:  # noqa: BLE001 - recorded per-product below
            fetch_errors[url] = exc

    track_fc = None
    landed: set[str] = set()
    for key, predicate in active_products.items():
        url = storm.gis_urls[key]
        if url in fetch_errors:
            # NHC serves a storm's WW zip only while watches or warnings are in
            # effect, so a 404 there is the documented "none in effect" signal,
            # not an outage. Recording it as an error told visitors safety
            # products were unavailable for a storm that simply had no warnings.
            # Any other failure -- 5xx, timeout, DNS -- is still a real error.
            if not (key == "wwlines" and _is_not_found(fetch_errors[url])):
                errors.append(
                    {"product": f"{storm.id}.{key}", "message": str(fetch_errors[url])}
                )
            continue
        try:
            fc = _select_features(fetched[url], predicate)
            store.put_json(paths[key], fc)
        except Exception as exc:
            errors.append({"product": f"{storm.id}.{key}", "message": str(exc)})
            continue
        landed.add(key)
        if key == "track":
            track_fc = fc

    return track_fc, landed


def build_history(best_track: dict, lon: float, lat: float) -> dict:
    """Observed track so far, as one LineString plus the individual fixes.

    Every point in the best-track product is by definition already observed, so
    unlike the Ida replay (which had to truncate at the advisory being replayed)
    a live storm needs no cutoff -- it takes the whole thing and appends the
    current analysed position, which is newer than the last archived fix.

    Points are ordered by DTG rather than trusted in file order: the shapefile
    is not guaranteed to be sorted, and an out-of-order fix would draw the past
    track doubling back on itself.
    """
    points = [
        f
        for f in best_track.get("features", [])
        if (f.get("geometry") or {}).get("type") == "Point"
    ]

    def _dtg(feature):
        raw = (feature.get("properties") or {}).get("DTG")
        try:
            return int(raw)
        except (TypeError, ValueError):
            return 0

    points.sort(key=_dtg)
    coordinates = [f["geometry"]["coordinates"] for f in points]
    current = [lon, lat]
    if not coordinates or coordinates[-1] != current:
        coordinates.append(current)

    features = []
    # A single-fix storm has no line to draw; emitting a 1-point LineString
    # would be invalid GeoJSON-ish and renders as nothing anyway.
    if len(coordinates) >= 2:
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "kind": "observed-history",
                    "source": "NHC GIS Best Track",
                },
                "geometry": {"type": "LineString", "coordinates": coordinates},
            }
        )
    features.extend(points)
    return {"type": "FeatureCollection", "features": features}


def _process_history(storm, paths, fetch, store, errors):
    """Fetch + upload the observed past track. Returns True when it lands.

    Its own try/except so a missing or malformed best-track product costs only
    the "Past track" layer, never the advisory refresh around it.
    """
    try:
        resp = _fetch_with_retry(fetch, BEST_TRACK_URL.format(stormid=storm.id))
        best_track = shp.zip_to_geojson(resp.content)
        history = build_history(best_track, storm.lon, storm.lat)
        if not history["features"]:
            return False
        store.put_json(paths["history"], history)
        return True
    except Exception as exc:  # noqa: BLE001 - recorded, never fatal
        errors.append({"product": f"{storm.id}.history", "message": str(exc)})
        return False


def _fetch_windprob(fetch, errors):
    """The basin-wide WSP field, fetched ONCE per run.

    One file covers every active system, so fetching it per storm would pull
    the same megabytes several times during a busy Atlantic. Returns None on
    failure; every storm then simply skips the layer.
    """
    try:
        resp = _fetch_with_retry(fetch, WSP_LATEST_URL)
        return shp.zip_to_geojson(resp.content)
    except Exception as exc:  # noqa: BLE001 - recorded once, never fatal
        errors.append({"product": "windprob", "message": str(exc)})
        return None


def _windprob_pairing(storm, wsp_fc):
    """Check the basin-wide WSP product against this storm's advisory.

    Returns (actual_cycle, cycles_behind) -- either may be None when unknown.
    A mismatch is NEVER a reason to drop the layer (see windprob.py: NHC posts
    a cycle ~20 minutes after the advisory it belongs to, so a run can honestly
    hold the previous cycle). It is reported so the map can say which cycle the
    probabilities came from instead of implying they match the cone.
    """
    actual = windprob.cycle_from_features(wsp_fc)
    behind = windprob.cycles_behind(actual, windprob.expected_cycle(storm.advisory_time))
    if behind:
        direction = "behind" if behind > 0 else "ahead of"
        print(
            f"gulf-watch ingest: {storm.id} wind probability cycle {actual} is "
            f"{abs(behind)} cycle(s) {direction} advisory {storm.advisory_num} "
            f"({storm.advisory_time}) -- layer kept, labelled with its own cycle"
        )
    return actual, behind


def _process_windprob(storm, paths, wsp_fc, others, store, errors):
    """Cut this storm's field out of the basin-wide product and upload one
    file per wind threshold. Returns the manifest keys that landed.

    Each threshold is independent so a failure on one does not cost the others,
    and a threshold with no nearby component is skipped rather than uploaded
    empty -- a legend with nothing behind it is worse than an absent layer.
    """
    if wsp_fc is None:
        return set()
    landed = set()
    for key, fragment in windprob.THRESHOLD_LAYERS.items():
        try:
            fc = windprob.features_for_storm(
                wsp_fc, fragment, (storm.lon, storm.lat), others
            )
            if not fc["features"]:
                continue
            store.put_json(paths[key], fc)
            landed.add(key)
        except Exception as exc:  # noqa: BLE001 - recorded per threshold
            errors.append({"product": f"{storm.id}.{key}", "message": str(exc)})
    return landed


def _process_satellite(fetch, store, errors, now=None):
    """Fetch the newest GOES-19 infrared scene and upload a Gulf overlay.

    Built once per run and shared by every storm: the crop is a fixed Gulf box,
    not a per-storm frame, so there is nothing storm-specific to rebuild.
    Returns the manifest satellite object, or None -- imagery is the most
    optional product here, and a failure must cost only that layer.
    """
    now = now or datetime.now(timezone.utc)
    key = None
    for prefix in satellite.hour_prefixes(now):
        try:
            resp = _fetch_with_retry(
                fetch,
                f"{satellite.GOES_BUCKET_URL}?list-type=2&prefix={prefix}&max-keys=600",
            )
        except Exception as exc:  # noqa: BLE001 - recorded once below
            errors.append({"product": "satellite", "message": str(exc)})
            return None
        key = satellite.latest_band_key(resp.text)
        if key:
            break
    if not key:
        errors.append({"product": "satellite", "message": "no GOES scene in the lookback window"})
        return None

    issued = satellite.scan_started_at(key)
    if not issued:
        errors.append({"product": "satellite", "message": f"unparseable scan time: {key}"})
        return None

    path = satellite.image_path(issued)
    raw = None
    try:
        resp = _fetch_with_retry(fetch, f"{satellite.GOES_BUCKET_URL}/{key}")
        raw = Path(tempfile.gettempdir()) / Path(key).name
        raw.write_bytes(resp.content)
        out = Path(tempfile.gettempdir()) / "goes-overlay.webp"
        west, south = satellite.SATELLITE_BOUNDS[0]
        east, north = satellite.SATELLITE_BOUNDS[1]
        script = Path(__file__).resolve().parent.parent / "scripts" / "build_goes_overlay.py"
        result = subprocess.run(
            [sys.executable, str(script), str(raw), str(out),
             "--bounds", str(west), str(south), str(east), str(north), "--infrared"],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            raise RuntimeError((result.stderr or "").strip()[-400:] or "overlay build failed")
        store.put_bytes(path, out.read_bytes(), "image/webp")
    except Exception as exc:  # noqa: BLE001 - imagery never blocks a run
        errors.append({"product": "satellite", "message": str(exc)})
        return None
    finally:
        if raw is not None:
            raw.unlink(missing_ok=True)

    return {
        "image": path,
        "issued": issued,
        "sourceLabel": satellite.GOES_SOURCE_LABEL,
        "sourceUrl": satellite.GOES_SOURCE_URL,
        "bounds": satellite.SATELLITE_BOUNDS,
    }


def _process_text_products(storm, paths, fetch, store, errors):
    """Fetch+build+upload text.json (Forecast Discussion + Public Advisory)
    and probs.json (wind speed probabilities) for one storm whose advisory
    just changed.

    text.json and probs.json are two independent products, each wrapped in
    its own try/except and labeled "{storm.id}.text" / "{storm.id}.probs"
    in manifest.errors -- one's failure (a missing URL field on this
    storm's CurrentStorms.json entry, a bad fetch, or a parse error) must
    never block the other's upload, same isolation guarantee as
    cone/track/wwlines in _process_gis above.

    Returns the next-advisory time the public advisory text announces (ISO
    8601 Z), or None when text.json failed or the text names none. The
    caller prefers it over the Storm record's +6h assumption: NHC drops to
    3-hourly intermediate advisories once watches/warnings are up, and the
    text is the only place the feed says so.
    """
    next_advisory_time = None
    try:
        if not storm.discussion_url:
            raise ValueError("forecastDiscussion.url missing from CurrentStorms.json")
        if not storm.advisory_url:
            raise ValueError("publicAdvisory.url missing from CurrentStorms.json")
        discussion_resp = _fetch_with_retry(fetch, storm.discussion_url)
        advisory_resp = _fetch_with_retry(fetch, storm.advisory_url)
        text_json = text.build_text_json(
            discussion_shtml=discussion_resp.text,
            discussion_issued=storm.discussion_issued,
            advisory_shtml=advisory_resp.text,
            advisory_issued=storm.advisory_time,
        )
        store.put_json(paths["text"], text_json)
        next_advisory_time = nhc.next_advisory_from_text(
            text_json["publicAdvisory"]["text"], storm.advisory_time
        )
    except Exception as exc:
        errors.append({"product": f"{storm.id}.text", "message": str(exc)})

    try:
        if not storm.probs_url:
            raise ValueError("windSpeedProbabilities.url missing from CurrentStorms.json")
        probs_resp = _fetch_with_retry(fetch, storm.probs_url)
        probs_json = probs.parse_probs(probs_resp.text)
        store.put_json(paths["probs"], probs_json)
    except Exception as exc:
        errors.append({"product": f"{storm.id}.probs", "message": str(exc)})

    return next_advisory_time


def _process_adeck(
    storm, paths, prev_cycle, fetch, store, errors, force=False, rebuild=False, sink=None, extra_features=()
):
    """Fetch+decompress+parse this storm's a-deck, re-uploading
    models.geojson/intensity.json only if the parsed cycle differs from the
    prior known cycle (state.json). The a-deck is fetched every run
    regardless of whether the cycle turns out to have changed --
    CurrentStorms.json carries no field that reveals the a-deck's cycle
    without downloading and parsing the file itself, so "did the cycle
    change" can only be answered after the fact.

    Also folds in gulfwatch.aifs.fetch_aifs_tracks (ECMWF's AI-model TC
    track, an optional product with its own independent 00z/12z cycle --
    see aifs.py) whenever models.geojson is (re)built. AIFS is currently
    stubbed to always return [] (see aifs.py's SPIKE OUTCOME); the
    try/except here is what actually delivers the "AIFS never blocks a run"
    guarantee and is exercised directly in test_pipeline.py by monkeypatching
    a raising fetch_aifs_tracks.

    Model tracks are clipped to the storm's advisory time (see
    adeck.parse_adeck's `reference_time`) so they start at the plotted storm
    rather than behind it. That makes models.geojson depend on the ADVISORY as
    well as the a-deck cycle, which is why `rebuild` exists: advisories are
    issued at 03/09/15/21z and models initialise at 00/06/12/18z, so a new
    advisory routinely arrives while the cycle is unchanged. Without rebuilding
    on it, tracks would stay clipped to the PREVIOUS advisory and drift back
    behind the storm by up to six hours -- the exact defect this fixes.

    Returns the (possibly unchanged) cycle to persist in state.json.
    """
    url = ADECK_URL_TEMPLATE.format(stormid=storm.id)
    try:
        resp = _fetch_with_retry(fetch, url)
        # A-decks can contain odd/non-UTF-8 bytes -- decode latin-1 per
        # shared-contracts.md.
        text = gzip.decompress(resp.content).decode("latin-1")
        # The raw text is also the GEFS member source for the density layer,
        # so it is handed back rather than downloaded twice.
        if sink is not None:
            sink["text"] = text
        parsed = adeck.parse_adeck(text, reference_time=storm.advisory_time)
    except Exception as exc:
        errors.append({"product": f"{storm.id}.adeck", "message": str(exc)})
        return prev_cycle, None

    # Guidance disappearing from the map must never be silent -- that is how a
    # wrong staleness rule, or an a-deck that quietly stopped updating, would go
    # unnoticed until someone spotted an empty model picker.
    if parsed.get("dropped_stale"):
        print(
            f"gulf-watch ingest: {storm.id} refused guidance more than "
            f"{adeck.MAX_STALENESS_HOURS}h behind cycle {parsed['cycle']}: "
            f"{', '.join(parsed['dropped_stale'])}"
        )
    if parsed.get("dropped_elapsed"):
        print(
            f"gulf-watch ingest: {storm.id} dropped guidance with no forecast "
            f"hours left after {storm.advisory_time}: "
            f"{', '.join(parsed['dropped_elapsed'])}"
        )

    new_cycle = parsed["cycle"]
    landed: set[str] | None = None
    # `force` covers the case where we have no record of which model products
    # exist -- rebuild once to establish it rather than assume, the same rule
    # the GIS layers follow. Without it a storm carried across this change
    # would silently lose its model guidance until the next a-deck cycle.
    if new_cycle != prev_cycle or rebuild or force:
        landed = set()
        # AIFS (ECMWF's AI model) is an optional, independently-cycled
        # product (see aifs.py) -- concatenated onto the a-deck-derived
        # models.geojson here rather than uploaded separately. It gets its
        # own try/except (product "aifs", not "{storm.id}.aifs" -- see
        # shared-contracts.md's manifest.errors example) so that ANY
        # failure (fetch, BUFR decode, or even an import error surfacing at
        # call time) degrades to "no AIFS features this run" without
        # touching the a-deck models that already succeeded.
        try:
            aifs_features = aifs.fetch_aifs_tracks(storm.id)
        except Exception as exc:  # noqa: BLE001 - AIFS must never block a run
            aifs_features = []
            errors.append({"product": "aifs", "message": str(exc)})

        models_geojson = parsed["models_geojson"]
        # ECMWF single runs read straight from ECMWF (see _ecmwf_model_lines).
        # Skip one whose code the a-deck already carries, so a model is never
        # drawn twice if NHC's public deck starts including it.
        # They also obey the a-deck's staleness cap: a run more than
        # MAX_STALENESS_HOURS behind the dominant cycle is not drawn (Codex
        # review, 2026-10-07).
        have = {f["properties"]["model"] for f in models_geojson["features"]}
        dominant = adeck._parse_cycle(new_cycle)

        def fresh(feature):
            run_dt = adeck._parse_cycle(feature["properties"]["cycle"])
            if dominant is None or run_dt is None:
                return True
            return (dominant - run_dt).total_seconds() / 3600 <= adeck.MAX_STALENESS_HOURS

        aifs_features = [
            *aifs_features,
            *(f for f in extra_features if f["properties"]["model"] not in have and fresh(f)),
        ]
        if aifs_features:
            models_geojson = {
                "type": "FeatureCollection",
                "features": [*models_geojson["features"], *aifs_features],
            }

        # models.geojson and intensity.json are two separate uploads with
        # their own failure modes -- label and isolate them independently
        # rather than blaming both on "models" if only one put fails.
        try:
            store.put_json(paths["models"], models_geojson)
            landed.add("models")
        except Exception as exc:
            errors.append({"product": f"{storm.id}.models", "message": str(exc)})
        try:
            store.put_json(paths["intensity"], parsed["intensity"])
            landed.add("intensity")
        except Exception as exc:
            errors.append({"product": f"{storm.id}.intensity", "message": str(exc)})
    return new_cycle, landed


def _resolve_track_for_gulf_check(advisory_changed, fresh_track_fc, track_path, store):
    """The FeatureCollection to feed storm_in_gulf: freshly built this run
    if the advisory changed and that build succeeded, otherwise whatever is
    already on the blob store from a prior run (best-effort; a storm whose
    advisory hasn't changed still has a valid prior track on the store)."""
    if advisory_changed and fresh_track_fc is not None:
        return fresh_track_fc
    try:
        return store.get_json(track_path)
    except Exception:
        return None


# Bump when the meaning of state.json's "density" record changes (same reason
# as _GIS_STATE_VERSION: a stale record must be re-derived, not trusted).
#
# 2 (2026-10-07): 5 km grid, rendered 4x finer with smoothed band edges; the
# identity (cycle, advisory, inputs) is unchanged, so only a version bump
# re-renders images already on the store.
_DENSITY_STATE_VERSION = 2
# Total seconds per run for the density layer's outside downloads (ECMWF and
# Google Weather Lab together). The job has a 15-minute limit and a normal run
# takes well under a minute; this keeps a slow outside server from holding up
# the cone, warnings and every other product (Jeff, 2026-10-07). Each request
# is also capped to what remains. A response that keeps trickling bytes is
# bounded only by its per-request timeout, so this is a strong cap, not an
# absolute one.
EXTERNAL_BUDGET_S = 180

_DENSITY_PUBLIC_KEYS = ("image", "bounds", "cycle", "members", "expected", "radiusKm", "start", "end")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _google_density_enabled() -> bool:
    # Release gate for the Google layer, default off. Off means no fetch, no
    # upload and no manifest entry. Stays off until Google agrees in writing to
    # the Restricted Country clause of its terms (see the density spec).
    return os.environ.get("GOOGLE_DENSITY_ENABLED") == "1"


class _DensityStepError(Exception):
    def __init__(self, step: str, cycle: str):
        super().__init__(step)
        self.step = step  # "render" | "upload"
        self.cycle = cycle  # the cycle that failed to build


def _fallback(prev_entry, attempted_cycle=None):
    """The previous image to keep showing after a failed rebuild, unless it is
    more than STALE_HOURS behind the cycle we tried to build -- the same limit
    select_cycle applies, so a failure never revives guidance the staleness
    rule would refuse (Codex review, 2026-10-07)."""
    if not prev_entry:
        return None
    if attempted_cycle is not None:
        behind = density.parse_cycle(attempted_cycle) - density.parse_cycle(prev_entry["cycle"])
        if behind > timedelta(hours=density.STALE_HOURS):
            return None
    return prev_entry


def _build_density(kind, storm, selected, store, prev):
    """Return the state entry for one ensemble's density, re-rendering only
    when (cycle, advisory, input fingerprint) changed. None = no image."""
    if selected is None:
        return None
    cycle, members = selected
    span = density.window(cycle, storm.advisory_time)
    if span is None:
        return None
    fp = density.fingerprint(members)
    if prev and (prev.get("cycle"), prev.get("advisory"), prev.get("fp")) == (cycle, storm.advisory_time, fp):
        return prev
    try:
        grid = density.strike_grid(members, cycle, span[0], span[1], minimum=density.MINIMUM_MEMBERS[kind])
        if grid is None:
            return None
        png = density.render_png(grid.fraction, scale=density.RENDER_SCALE)
    except Exception as exc:  # noqa: BLE001
        raise _DensityStepError("render", cycle) from exc
    stamp = density.parse_iso(storm.advisory_time).strftime("%Y%m%dT%H%MZ")
    path = f"storms/{storm.id}/density-{kind}-{cycle}-{stamp}-{fp[:8]}.png"
    try:
        store.put_bytes(path, png, "image/png")
    except Exception as exc:  # noqa: BLE001
        raise _DensityStepError("upload", cycle) from exc
    return {
        "image": path,
        "bounds": [list(grid.bounds[0]), list(grid.bounds[1])],
        "cycle": cycle,
        "members": grid.eligible,
        "expected": density.EXPECTED_MEMBERS[kind],
        "radiusKm": int(density.RADIUS_KM),
        "start": density.iso_z(span[0]),
        "end": density.iso_z(span[1]),
        "advisory": storm.advisory_time,
        "fp": fp,
    }


def _process_density(storm, adeck_text, fetch, store, errors, prev_state, ecmwf_files=None, deadline=None):
    ecmwf_files = ecmwf_files or {}
    """Track-density entries for one storm. Identity is saved only once its
    image has uploaded, so a failed upload is retried next run."""
    prev = prev_state.get("entries", {}) if prev_state.get("version") == _DENSITY_STATE_VERSION else {}
    entries: dict = {}

    # GEFS: members from the a-deck already downloaded this run (public domain).
    if adeck_text is None:
        if prev.get("gefs"):
            entries["gefs"] = prev["gefs"]  # a-deck failed this run: carry forward
    else:
        try:
            points = adeck.extract_members(adeck_text, adeck.GEFS_MEMBER_RE)
            selected = density.select_cycle(
                points, density.MINIMUM_MEMBERS["gefs"], advisory_time=storm.advisory_time
            )
            entry = _build_density("gefs", storm, selected, store, prev.get("gefs"))
            if entry:
                entries["gefs"] = entry
        except _DensityStepError as exc:
            errors.append({"product": f"{storm.id}.density.gefs", "message": f"{exc.step} failed: {exc.__cause__}"})
            if _fallback(prev.get("gefs"), exc.cycle):
                entries["gefs"] = prev["gefs"]
        except Exception as exc:  # noqa: BLE001
            errors.append({"product": f"{storm.id}.density.gefs", "message": str(exc)})

    # ECMWF ensembles (Euro, Euro AI): public CC BY 4.0 data, so no gate and
    # plain messages. "Nothing posted yet" / "storm not in the file" are normal
    # states, like a storm with no watches: the option greys out, no error.
    for kind in ecmwf.ENSEMBLES:
        try:
            # Files are downloaded once per run in run() and shared by every storm.
            selected = ecmwf.members_for_storm(
                list(ecmwf_files.get(kind, ())), storm.id, density.MINIMUM_MEMBERS[kind], storm.advisory_time
            )
            entry = _build_density(kind, storm, selected, store, prev.get(kind))
            if entry:
                entries[kind] = entry
        except ecmwf.EcmwfError:
            pass
        except _DensityStepError as exc:
            errors.append({"product": f"{storm.id}.density.{kind}", "message": f"{exc.step} failed: {exc.__cause__}"})
            if _fallback(prev.get(kind), exc.cycle):
                entries[kind] = prev[kind]
        except Exception as exc:  # noqa: BLE001
            errors.append({"product": f"{storm.id}.density.{kind}", "message": str(exc)})

    # Google: in memory only; every failure is an allowlisted code, never text.
    if _google_density_enabled():
        product = f"{storm.id}.density.google"
        try:
            selected = weatherlab.fetch_members(
                storm.id, fetch, _utcnow(), density.MINIMUM_MEMBERS["google"],
                advisory_time=storm.advisory_time, deadline=deadline,
            )
            entry = _build_density("google", storm, selected, store, prev.get("google"))
            if entry:
                entries["google"] = entry
        except weatherlab.GoogleError as exc:
            errors.append({"product": product, "message": exc.code})
            if exc.code == "google_unavailable" and prev.get("google"):
                entries["google"] = prev["google"]
        except _DensityStepError as exc:
            errors.append({"product": product, "message": f"google_{exc.step}_failed"})
            if _fallback(prev.get("google"), exc.cycle):
                entries["google"] = prev["google"]
        except Exception:  # noqa: BLE001
            errors.append({"product": product, "message": "google_failed"})
    return entries


def _ecmwf_model_lines(storm, ecmwf_files, errors):
    """Euro and Euro AI single-run tracks as models.geojson features, plus
    {code: cycle} so a new ECMWF run can trigger a rebuild on its own."""
    features, cycles = [], {}
    for code, (label, kind) in ecmwf.SINGLE_RUNS.items():
        try:
            feature = ecmwf.single_track_feature(
                list(ecmwf_files.get(code, ())), storm.id, code, label, kind, storm.advisory_time
            )
        except Exception as exc:  # noqa: BLE001
            errors.append({"product": f"{storm.id}.models.{code}", "message": str(exc)})
            continue
        if feature:
            features.append(feature)
            cycles[code] = feature["properties"]["cycle"]
    return features, cycles


def _density_manifest(entries, storm):
    out = {}
    for kind, entry in entries.items():
        if kind == "google" and not _google_density_enabled():
            continue
        if density.window(entry["cycle"], storm.advisory_time) is None:
            continue  # stale: under 24 h of window left
        out[kind] = {key: entry[key] for key in _DENSITY_PUBLIC_KEYS}
    return out


def _process_storm(
    storm, prev_storm_state, fetch, store, errors, wsp_fc=None, others=None, sat=None, ecmwf_files=None,
    deadline=None,
):
    """Process one Atlantic storm: conditionally refresh its GIS + a-deck
    products, then build its manifest entry and next state.json entry."""
    paths = _storm_paths(storm.id)
    prev_advisory = prev_storm_state.get("advisory")
    prev_cycle = prev_storm_state.get("cycle")

    advisory_changed = storm.advisory_num != prev_advisory
    fresh_track_fc = None
    # Which optional GIS layers are known to exist. A record is trusted only if
    # it was written by the current logic: an earlier build defaulted the
    # unknown case to "every layer landed" and persisted that, so entries from
    # it keep advertising a wwlines blob that was never written. The version
    # marker forces those to be re-derived once instead of believed.
    prev_gis = (
        prev_storm_state.get("gis")
        if prev_storm_state.get("gisVersion") == _GIS_STATE_VERSION
        else None
    )
    gis_keys = set(prev_gis) if prev_gis is not None else set()
    if advisory_changed or prev_gis is None:
        fresh_track_fc, gis_keys = _process_gis(storm, paths, fetch, store, errors)
    # The announced next-advisory time is read from the public advisory text,
    # which is only fetched when the advisory changes -- so it is persisted in
    # state.json and carried forward on the runs in between (same advisory,
    # same announcement). Absent both, the manifest falls back to +6h.
    if advisory_changed:
        next_advisory_time = _process_text_products(storm, paths, fetch, store, errors)
    else:
        next_advisory_time = prev_storm_state.get("nextAdvisoryTime")

    # History and wind probability refresh on a new advisory like everything
    # else, but ALSO build when they are simply missing. Without that second
    # condition a storm already active when this shipped would show neither
    # layer until its next advisory -- up to six hours of a map that is missing
    # options for no reason the viewer can see.
    has_history = prev_storm_state.get("history", False)
    # Version-gated like "gis" and "adeck": a record written before the pairing
    # existed carries no cycle, and trusting it would leave the layer on screen
    # with nothing to label it. Gating forces exactly one rebuild, which derives
    # the cycle -- and then stops, because the fresh record matches the version.
    prev_windprob = (
        prev_storm_state.get("windprob")
        if prev_storm_state.get("gisVersion") == _GIS_STATE_VERSION
        else None
    )
    windprob_keys = set(prev_windprob) if prev_windprob is not None else set()
    if advisory_changed or not has_history:
        has_history = _process_history(storm, paths, fetch, store, errors)
    # Which cycle the probabilities on screen actually came from. Persisted like
    # windprob_keys so it survives the runs that don't rebuild the layer -- a
    # stale label would be as misleading as no label.
    windprob_cycle = prev_storm_state.get("windprobCycle")
    windprob_behind = prev_storm_state.get("windprobCyclesBehind")
    if advisory_changed or not windprob_keys:
        windprob_keys = _process_windprob(storm, paths, wsp_fc, others or [], store, errors)
        if wsp_fc is not None:
            windprob_cycle, windprob_behind = _windprob_pairing(storm, wsp_fc)

    prev_adeck = (
        prev_storm_state.get("adeck")
        if prev_storm_state.get("gisVersion") == _GIS_STATE_VERSION
        else None
    )
    adeck_sink: dict = {}
    ecmwf_lines, ecmwf_line_cycles = _ecmwf_model_lines(storm, ecmwf_files or {}, errors)
    new_cycle, fresh_adeck = _process_adeck(
        storm,
        paths,
        prev_cycle,
        fetch,
        store,
        errors,
        force=prev_adeck is None,
        # Tracks are clipped to the advisory time, so a new advisory needs a
        # rebuild even when the a-deck cycle hasn't moved -- see _process_adeck.
        # ...and so does a new ECMWF single run, which arrives on its own clock.
        rebuild=advisory_changed or ecmwf_line_cycles != prev_storm_state.get("ecmwfModels", {}),
        sink=adeck_sink,
        extra_features=ecmwf_lines,
    )
    # None means nothing was uploaded this run (cycle unchanged, or the a-deck
    # itself failed), so carry forward what a prior run confirmed.
    adeck_keys = set(fresh_adeck) if fresh_adeck is not None else set(prev_adeck or [])
    ecmwf_state = (
        ecmwf_line_cycles
        if fresh_adeck is not None and "models" in fresh_adeck
        else prev_storm_state.get("ecmwfModels", {})
    )
    density_entries = _process_density(
        storm, adeck_sink.get("text"), fetch, store, errors, prev_storm_state.get("density", {}),
        ecmwf_files=ecmwf_files, deadline=deadline,
    )

    track_for_check = _resolve_track_for_gulf_check(
        advisory_changed, fresh_track_fc, paths["track"], store
    )
    in_gulf = nhc.storm_in_gulf(storm, track_for_check)

    manifest_entry = {
        "id": storm.id,
        "name": storm.name,
        "classification": storm.classification,
        "intensityMph": round(storm.intensity_kt * adeck.KT_TO_MPH),
        "pressureMb": storm.pressure_mb,
        "movementDir": nhc.deg_to_compass(storm.movement_dir),
        "movementMph": storm.movement_mph,
        "lat": storm.lat,
        "lon": storm.lon,
        "advisoryNum": storm.advisory_num,
        "advisoryTime": storm.advisory_time,
        "nextAdvisoryTime": next_advisory_time or storm.next_advisory_time,
        "inGulfBox": in_gulf,
        "modelCycle": new_cycle,
        # Wind probability is the one storm layer NOT fetched from an
        # advisory-numbered url, so it is the one that can silently disagree with
        # the cone. Advertise its cycle (and how far it lags the advisory)
        # alongside the layer, only when there is a layer to describe.
        **(
            {"windprobCycle": windprob_cycle}
            if windprob_keys and windprob_cycle
            else {}
        ),
        **(
            {"windprobCyclesBehind": windprob_behind}
            if windprob_keys and windprob_cycle and windprob_behind
            else {}
        ),
        "files": {
            "cone": paths["cone"],
            "track": paths["track"],
            "text": paths["text"],
            "probs": paths["probs"],
            # Model guidance depends on the a-deck, which can fail or simply
            # not exist yet for a freshly-formed storm -- advertise each only
            # once it is on the store, same rule as the GIS layers.
            **({"models": paths["models"]} if "models" in adeck_keys else {}),
            **({"intensity": paths["intensity"]} if "intensity" in adeck_keys else {}),
            # Advertise the optional GIS layers only once they exist on the
            # store -- see _process_gis.
            **({"wwlines": paths["wwlines"]} if "wwlines" in gis_keys else {}),
            **({"windfield": paths["windfield"]} if "windfield" in gis_keys else {}),
            # Only advertise the past track once it is actually on the store --
            # a manifest key pointing at a missing blob is a 404 in the browser,
            # which is worse than the layer being unavailable.
            **({"history": paths["history"]} if has_history else {}),
            **{key: paths[key] for key in sorted(windprob_keys)},
        },
    }
    if sat:
        manifest_entry["satellite"] = sat
    # The page fetches storm files as ?v=<advisory>-<modelCycle>. Euro lines
    # arrive on ECMWF's own clock, so publish their identity too; otherwise a
    # new Euro run reuses the old URL and browsers keep the cached file.
    if ecmwf_state:
        manifest_entry["guidanceVersion"] = ".".join(f"{code}{ecmwf_state[code]}" for code in sorted(ecmwf_state))
    density_manifest = _density_manifest(density_entries, storm)
    if density_manifest:
        manifest_entry["density"] = density_manifest
    next_state = {
        "advisory": storm.advisory_num,
        "cycle": new_cycle,
        # Only once read from the advisory text (see above); absent means
        # "fall back to +6h", not "no next advisory".
        **({"nextAdvisoryTime": next_advisory_time} if next_advisory_time else {}),
        "history": has_history,
        "windprob": sorted(windprob_keys),
        # Recorded only once known, so state.json doesn't carry a pair of nulls
        # for every storm whose product simply hasn't been read yet.
        **({"windprobCycle": windprob_cycle} if windprob_cycle else {}),
        **({"windprobCyclesBehind": windprob_behind} if windprob_behind else {}),
        "gis": sorted(gis_keys),
        "adeck": sorted(adeck_keys),
        "gisVersion": _GIS_STATE_VERSION,
        # Advance the ECMWF line identity only once models.geojson actually
        # uploaded this run; otherwise keep the old one so the next run retries
        # (Codex review, 2026-10-07).
        **({"ecmwfModels": ecmwf_state} if ecmwf_state else {}),
    }
    if density_entries:
        next_state["density"] = {"version": _DENSITY_STATE_VERSION, "entries": density_entries}
    return manifest_entry, next_state


def _process_outlook(state, fetch, store, errors):
    """Refresh outlook.geojson/outlook.json when the Atlantic TWO RSS
    pubDate has changed since the last run. Returns the issued time to
    persist in state.json (unchanged from `state` if nothing changed, or if
    a fetch/parse/upload failed along the way)."""
    prev_issued = state.get("outlook_issued")

    try:
        rss_resp = _fetch_with_retry(fetch, outlook.INDEX_AT_URL)
        rss_xml = rss_resp.text
        issued = outlook.parse_outlook_text(rss_xml)["issued"]
    except Exception as exc:
        errors.append({"product": "outlook", "message": str(exc)})
        return prev_issued

    if issued == prev_issued:
        return issued

    try:
        gtwo_resp = _fetch_with_retry(fetch, outlook.GTWO_SHAPEFILES_URL)
        geojson, outlook_json = outlook.build_outlook(gtwo_resp.content, rss_xml)
        store.put_json("outlook.geojson", geojson)
        store.put_json("outlook.json", outlook_json)
    except Exception as exc:
        errors.append({"product": "outlook", "message": str(exc)})
        return prev_issued

    return issued


def _last_modified(head, url, timeout):
    """WPC's Last-Modified header, or None. A cheap HEAD lets the hourly run
    skip the 2 MB / 9 MB downloads until WPC actually publishes."""
    try:
        resp = head(url, timeout=timeout, allow_redirects=True)
    except Exception:  # noqa: BLE001
        return None
    return resp.headers.get("Last-Modified") if resp.status_code == 200 else None


def _timeout(deadline):
    if deadline is None:
        return FETCH_TIMEOUT_S
    return max(0.0, min(FETCH_TIMEOUT_S, deadline - time.monotonic()))


def _process_rain(fetch, head, store, errors, prev_state, deadline=None):
    """WPC rainfall (gulfwatch.rain): the New Orleans 3-day middle estimate +
    range for the row above the map, and the 5-day map. Not storm-specific, so
    it runs every hour, but downloads only when WPC's Last-Modified changes.
    A failure keeps the last good values. Returns (state, manifest["rain"])."""
    state = dict(prev_state or {})

    # Row: three percentile GRIBs for the next 72 hours.
    modified = _last_modified(head, rain.PCT_URL.format(pct=rain.MID_PCT), _timeout(deadline))
    if not state.get("nola") or (modified and modified != state.get("nolaModified")):
        try:
            values = {}
            for pct in (rain.LOW_PCT, rain.MID_PCT, rain.HIGH_PCT):
                if deadline is not None and deadline - time.monotonic() <= 0:
                    raise RuntimeError("download budget spent")
                resp = fetch(rain.PCT_URL.format(pct=pct), timeout=_timeout(deadline))
                resp.raise_for_status()
                values[pct] = rain.grib_point(resp.content)
            issued, hours, _ = values[rain.MID_PCT]
            state["nola"] = rain.summary(
                issued, hours, values[rain.LOW_PCT][2], values[rain.MID_PCT][2], values[rain.HIGH_PCT][2]
            )
            state["nolaModified"] = modified
        except Exception as exc:  # noqa: BLE001
            errors.append({"product": "rain.nola", "message": str(exc)})

    # Map: WPC's 5-day QPF shapefile, clipped and simplified.
    modified = _last_modified(head, rain.MAP_URL, _timeout(deadline))
    if not state.get("map") or (modified and modified != state.get("mapModified")):
        try:
            if deadline is not None and deadline - time.monotonic() <= 0:
                raise RuntimeError("download budget spent")
            resp = fetch(rain.MAP_URL, timeout=_timeout(deadline))
            resp.raise_for_status()
            fc, meta = rain.map_geojson(resp.content)
            stamp = meta["issued"].replace("-", "").replace(":", "")
            path = f"rain/qpf-5day-{stamp}.geojson"  # new issue = new URL
            store.put_json(path, fc)
            state["map"] = {"geojson": path, **meta}
            state["mapModified"] = modified
        except Exception as exc:  # noqa: BLE001
            errors.append({"product": "rain.map", "message": str(exc)})

    # Advertise only what exists and is not over: stale rain is worse than none.
    now = _utcnow()
    manifest = {}
    for key in ("nola", "map"):
        entry = state.get(key)
        if entry and density.parse_iso(entry["end"]) > now:
            manifest[key] = entry
    return state, manifest


def run(fetch=requests.get, store=blob, head=None) -> dict:
    """Poll NHC feeds, convert, upload changed products, and return the
    manifest dict written to manifest.json (see shared-contracts.md)."""
    state = store.get_json("state.json") or {"storms": {}, "outlook_issued": None}
    errors: list[dict] = []

    try:
        current_resp = _fetch_with_retry(fetch, nhc.CURRENT_STORMS_URL)
        current_data = current_resp.json()
    except Exception as exc:
        # CurrentStorms.json is the one feed whose failure must NOT degrade
        # to "synthesize an empty/quiet run": doing so would write a fresh
        # quiet manifest.json + state.json over whatever storm is currently
        # live on the public site during a transient NHC outage, silently
        # erasing it. Distinct from a legitimately empty activeStorms list
        # (a normal, valid quiet run -- that keeps writing normally below).
        # Write nothing to the store and propagate: ingest.py's top-level
        # try/except prints "FAILED - {exc}" and exits 1 for this run,
        # leaving last-good manifest/state untouched for the next run to
        # retry against.
        print(
            "gulf-watch ingest: CurrentStorms.json fetch failed after retry -- "
            f"aborting run, last-good manifest/state left untouched: {exc}"
        )
        raise

    # Parse one raw storm entry at a time (rather than the whole payload in
    # one nhc.parse_current_storms() call) so a single malformed entry
    # raises and is recorded per-storm without discarding every other
    # storm in the feed -- nhc.parse_current_storms itself has no
    # per-item try/except (see task-4-report.md).
    all_storms = []
    for raw in current_data.get("activeStorms", []):
        try:
            all_storms.extend(nhc.parse_current_storms({"activeStorms": [raw]}))
        except Exception as exc:
            errors.append({"product": raw.get("id", "unknown_storm"), "message": str(exc)})

    prev_storms_state = state.get("storms", {})
    new_storms_state: dict = {}
    manifest_storms = []

    # One basin-wide wind-probability file serves every storm, so fetch it once
    # per run -- and only when some storm's advisory actually changed, matching
    # how the GIS products refresh. Fetching it every 15 minutes regardless
    # would re-download the whole basin to rebuild fields nothing had moved.
    needs_wsp = any(
        s.id.startswith("al")
        and (
            s.advisory_num != prev_storms_state.get(s.id, {}).get("advisory")
            or not prev_storms_state.get(s.id, {}).get("windprob")
        )
        for s in all_storms
    )
    wsp_fc = _fetch_windprob(fetch, errors) if needs_wsp else None
    # Imagery is fetched only while something is active: it is the one product
    # with nothing to show in a quiet season, and skipping it keeps the
    # every-15-minutes off-season run exactly as cheap as it was.
    # ECMWF ensemble track files cover every basin: download once per run and
    # share them, so a slow ECMWF server costs one timeout, not one per storm.
    deadline = time.monotonic() + EXTERNAL_BUDGET_S
    ecmwf_files = {
        key: ecmwf.download_files(
            fetch, _utcnow(), keep=2 if key in ecmwf.ENSEMBLES else 1, model=model, stream=stream,
            deadline=deadline,
        )
        for key, (model, stream) in ecmwf.PRODUCTS.items()
    } if any(s.id.startswith("al") for s in all_storms) else {}
    sat = _process_satellite(fetch, store, errors) if any(
        s.id.startswith("al") for s in all_storms
    ) else None
    # Attribution needs EVERY active system, Atlantic and eastern Pacific
    # alike: the file merges both basins, so a Pacific storm left out of the
    # comparison would have its field handed to an Atlantic one.
    storm_positions = {s.id: (s.lon, s.lat) for s in all_storms}

    for storm in all_storms:
        if not storm.id.startswith("al"):
            continue  # Atlantic basin only, per task brief
        try:
            others = [pos for sid, pos in storm_positions.items() if sid != storm.id]
            entry, next_state = _process_storm(
                storm, prev_storms_state.get(storm.id, {}), fetch, store, errors,
                wsp_fc=wsp_fc, others=others, sat=sat, ecmwf_files=ecmwf_files, deadline=deadline,
            )
            manifest_storms.append(entry)
            new_storms_state[storm.id] = next_state
        except Exception as exc:
            # A bad storm mid-processing must not kill the whole run;
            # carry its previous state forward unchanged so it isn't lost.
            errors.append({"product": storm.id, "message": str(exc)})
            if storm.id in prev_storms_state:
                new_storms_state[storm.id] = prev_storms_state[storm.id]

    outlook_issued = _process_outlook(state, fetch, store, errors)
    rain_state, rain_manifest = _process_rain(
        fetch, head or requests.head, store, errors, state.get("rain", {}), deadline
    )

    mode = "active" if any(s["inGulfBox"] for s in manifest_storms) else "quiet"

    manifest = {
        "generated": _iso_z_now(),
        "mode": mode,
        "storms": manifest_storms,
        "outlook": {
            "geojson": "outlook.geojson",
            "text": "outlook.json",
            "issued": outlook_issued,
        },
        **({"rain": rain_manifest} if rain_manifest else {}),
        "errors": errors,
    }

    store.put_json("manifest.json", manifest)
    # state.json written last, per task brief.
    store.put_json(
        "state.json",
        {"storms": new_storms_state, "outlook_issued": outlook_issued, **({"rain": rain_state} if rain_state else {})},
    )

    return manifest
