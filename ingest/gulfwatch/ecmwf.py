"""ECMWF ensemble (IFS ENS) tropical-cyclone tracks, for the density layer.

ECMWF open data publishes every ensemble member's cyclone track as BUFR,
four times a day: 00/12Z files run to 360 h, 06/18Z files to 144 h
(listing checked 2026-10-07). No key; licensed CC BY 4.0, so the page
credits ECMWF wherever this layer is shown.

File layout (read from the 2026100700 file in Docker, 2026-10-07): one BUFR
message per storm, `stormIdentifier` like "09L" (number + basin letter), one
subset per member (`ensembleMemberNumber` 1..51). `#1#latitude/longitude` is
the observed storm center, `#2#` each member's perturbed analysis; forecast period i (`#i#timePeriod`, 6-hourly)
has its storm-center position at rank 2*i+2. A member whose storm has died out
carries the missing value (-1e100) from then on.

The decode needs the ecCodes C library (pip `eccodeslib`), which ships for
Linux -- the GitHub runner -- but not Windows, so `eccodes` is imported only
inside decode_members.
"""

from __future__ import annotations

import os
import tempfile
from datetime import datetime, timedelta, timezone

from gulfwatch import density
from gulfwatch.adeck import MemberPoint

BASE_URL = "https://data.ecmwf.int/forecasts"
CANDIDATE_CYCLES = 4
TIMEOUT_S = 30
_BASIN_LETTER = {"al": "L", "ep": "E", "cp": "C"}
_MISSING_ABOVE = 1e90


class EcmwfError(Exception):
    """ECMWF data is public (CC BY 4.0), so plain messages are fine here."""


# Track files ECMWF publishes beside each run's weather maps (listings
# checked 2026-10-07): key -> (model folder, stream). The two ensembles feed
# the density layer; the two single runs are drawn as model lines.
PRODUCTS = {
    "ecmwf": ("ifs", "enfo"),  # Euro ensemble, 51 members
    "aifs": ("aifs-ens", "enfo"),  # Euro AI ensemble, 51 members (+ 1 single run, skipped)
    "EMXI": ("ifs", "oper"),  # Euro high-resolution single run
    "AIFS": ("aifs-single", "oper"),  # Euro AI single run
}
ENSEMBLES = ("ecmwf", "aifs")
SINGLE_RUNS = {"EMXI": ("Euro (ECMWF)", "physics"), "AIFS": ("Euro AI (AIFS)", "ai")}


def file_url(cycle_dt: datetime, model: str = "ifs", stream: str = "enfo") -> str:
    # IFS runs at 06/18Z only go to 144 h; AIFS runs all go to 360 h.
    step = 360 if model.startswith("aifs") or cycle_dt.hour in (0, 12) else 144
    return (
        f"{BASE_URL}/{cycle_dt:%Y%m%d}/{cycle_dt:%H}z/{model}/0p25/{stream}/"
        f"{cycle_dt:%Y%m%d%H}0000-{step}h-{stream}-tf.bufr"
    )


def storm_identifier(storm_id: str) -> str:
    """NHC id ("al092026") -> ECMWF stormIdentifier ("09L")."""
    return f"{storm_id[2:4]}{_BASIN_LETTER[storm_id[:2].lower()]}"


def _missing(value: float) -> bool:
    return abs(value) > _MISSING_ABOVE


def members_from_periods(cycle, member_numbers, analysis, periods, forecast_types=None) -> list[MemberPoint]:
    """Decoded arrays -> member positions. `analysis` is (lats, lons) at tau 0;
    `periods` is [(tau, lats, lons), ...], each array one value per member.
    With `forecast_types`, a subset of type 0 (a single run mixed into an
    ensemble file, as AIFS ensemble files carry) is skipped -- unless it is
    the file's only subset, which is how single-run files come."""
    points: list[MemberPoint] = []
    steps = [(0, analysis[0], analysis[1]), *periods]
    for i, member in enumerate(member_numbers):
        if forecast_types is not None and len(member_numbers) > 1 and int(forecast_types[i]) == 0:
            continue
        tech = f"EN{int(member):02d}"
        for tau, lats, lons in steps:
            lat, lon = float(lats[i]), float(lons[i])
            if _missing(lat) or _missing(lon):
                continue
            points.append(MemberPoint(cycle, tech, int(tau), round(lat, 1), round(lon, 1)))
    return points


def decode_members(data: bytes, ident: str, cycle: str) -> list[MemberPoint]:
    """Member positions for one storm from an enfo-tf BUFR file."""
    import eccodes  # noqa: PLC0415 - needs the C library; Linux runner only

    with tempfile.NamedTemporaryFile(suffix=".bufr", delete=False) as tmp:
        tmp.write(data)
        path = tmp.name
    try:
        with open(path, "rb") as f:
            while True:
                handle = eccodes.codes_bufr_new_from_file(f)
                if handle is None:
                    return []
                try:
                    eccodes.codes_set(handle, "unpack", 1)
                    if eccodes.codes_get(handle, "#1#stormIdentifier").strip() != ident:
                        continue
                    try:
                        members = list(eccodes.codes_get_array(handle, "ensembleMemberNumber"))
                        types = list(eccodes.codes_get_array(handle, "ensembleForecastType"))
                    except eccodes.CodesInternalError:  # single-run file
                        members, types = [0], None
                    if types is not None and len(types) == 1:
                        types = types * len(members)

                    def per_member(key):
                        values = list(eccodes.codes_get_array(handle, key))
                        return values * len(members) if len(values) == 1 else values

                    # Start every member at the observed center (#1#). Each
                    # member's own perturbed analysis (#2#) sat up to ~1.5 deg
                    # off it for Isaias (2026100700), which drew a jump at t=0.
                    analysis = (per_member("#1#latitude"), per_member("#1#longitude"))
                    periods = []
                    i = 1
                    while True:
                        try:
                            tau = eccodes.codes_get_array(handle, f"#{i}#timePeriod")[0]
                        except eccodes.CodesInternalError:
                            break
                        rank = 2 * i + 2
                        periods.append((tau, per_member(f"#{rank}#latitude"), per_member(f"#{rank}#longitude")))
                        i += 1
                    return members_from_periods(cycle, members, analysis, periods, forecast_types=types)
                finally:
                    eccodes.codes_release(handle)
    finally:
        os.unlink(path)


def cycle_candidates(now: datetime, count: int = CANDIDATE_CYCLES) -> list[datetime]:
    now = now.astimezone(timezone.utc)
    newest = now.replace(hour=now.hour - now.hour % 6, minute=0, second=0, microsecond=0)
    return [newest - timedelta(hours=6 * i) for i in range(count)]


def download_files(
    fetch, now: datetime, keep: int = 2, model: str = "ifs", stream: str = "enfo"
) -> list[tuple[str, bytes]]:
    """The newest `keep` posted track files, newest first, downloaded ONCE per
    ingest run and shared by every storm (each file covers all basins).

    A 404 is the normal "not posted yet" answer (no retry-with-sleep). A
    network failure stops the walk: four timeouts per storm could otherwise
    outlast the job's 15-minute limit and block every other product (Codex
    review, 2026-10-07)."""
    files: list[tuple[str, bytes]] = []
    for cycle_dt in cycle_candidates(now):
        try:
            resp = fetch(file_url(cycle_dt, model, stream), timeout=TIMEOUT_S)
        except Exception:  # noqa: BLE001
            break
        if resp.status_code != 200:
            continue
        files.append((cycle_dt.strftime("%Y%m%d%H"), resp.content))
        if len(files) >= keep:
            break
    return files


def members_for_storm(
    files: list[tuple[str, bytes]], storm_id: str, minimum: int, advisory_time: str
) -> tuple[str, density.Members]:
    """Newest qualifying cycle's members for one storm from downloaded files."""
    ident = storm_identifier(storm_id)
    if not files:
        raise EcmwfError("no ECMWF track file posted in the last 24 h")
    newest_posted = files[0][0]
    saw_storm = False
    for cycle, data in files:
        points = decode_members(data, ident, cycle)
        if not points:
            continue
        saw_storm = True
        selected = density.select_cycle(
            points, minimum, newest_cycle=newest_posted, advisory_time=advisory_time
        )
        if selected is not None:
            return selected
    if not saw_storm:
        raise EcmwfError(f"no tracks for {ident} in ECMWF files")
    raise EcmwfError(f"too few ECMWF members for {ident}")


def single_track_feature(
    files, storm_id: str, code: str, label: str, kind: str, reference_time: str, decode=None
) -> dict | None:
    """A single-run track as a models.geojson LineString, from the newest file
    that has the storm, clipped to start at the advisory like every a-deck
    model (adeck._clip_track). None when no file has the storm."""
    from gulfwatch import adeck  # noqa: PLC0415 - avoid a top-level cycle

    decode = decode or decode_members
    ident = storm_identifier(storm_id)
    for cycle, data in files:
        points = decode(data, ident, cycle)
        if not points:
            continue
        by_tau = {p.tau: [p.lon, p.lat] for p in points}
        coords = adeck._clip_track(
            by_tau, density.parse_cycle(cycle), density.parse_iso(reference_time)
        )
        if len(coords) < 2:
            return None
        return {
            "type": "Feature",
            "geometry": {"type": "LineString", "coordinates": coords},
            "properties": {"model": code, "label": label, "kind": kind, "group": "deterministic", "cycle": cycle},
        }
    return None
