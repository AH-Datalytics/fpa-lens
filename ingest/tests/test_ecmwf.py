"""ECMWF ensemble tropical-cyclone tracks (open data, CC BY 4.0).

The BUFR decode itself needs the ecCodes C library, which has no Windows
build, so it is exercised against a real file in Docker (see ecmwf.py), and
everything around it is tested here with the decode stubbed.
"""

from datetime import datetime, timezone

import pytest

from gulfwatch import ecmwf
from gulfwatch.adeck import MemberPoint

MISSING = -1e100


def test_file_url_uses_360h_for_00_12_and_144h_for_06_18():
    assert ecmwf.file_url(datetime(2026, 10, 7, 0, tzinfo=timezone.utc)) == (
        "https://data.ecmwf.int/forecasts/20261007/00z/ifs/0p25/enfo/20261007000000-360h-enfo-tf.bufr"
    )
    assert ecmwf.file_url(datetime(2026, 10, 7, 6, tzinfo=timezone.utc)).endswith(
        "/20261007/06z/ifs/0p25/enfo/20261007060000-144h-enfo-tf.bufr"
    )


def test_storm_identifier_from_nhc_id():
    assert ecmwf.storm_identifier("al092026") == "09L"
    assert ecmwf.storm_identifier("ep182026") == "18E"
    assert ecmwf.storm_identifier("cp012026") == "01C"


def test_members_from_periods_drops_missing_positions():
    # Two members; member 2 dissipates after tau 6.
    analysis = ([22.1, 21.5], [-95.8, -95.0])
    periods = [
        (6, [22.3, 22.4], [-95.2, -94.9]),
        (12, [22.2, MISSING], [-95.0, MISSING]),
    ]
    points = ecmwf.members_from_periods("2026100700", [1, 2], analysis, periods)
    assert points == [
        MemberPoint("2026100700", "EN01", 0, 22.1, -95.8),
        MemberPoint("2026100700", "EN01", 6, 22.3, -95.2),
        MemberPoint("2026100700", "EN01", 12, 22.2, -95.0),
        MemberPoint("2026100700", "EN02", 0, 21.5, -95.0),
        MemberPoint("2026100700", "EN02", 6, 22.4, -94.9),
    ]


class Resp:
    def __init__(self, status_code=200, content=b""):
        self.status_code = status_code
        self.content = content


def test_download_files_walks_back_past_unposted_cycles_and_keeps_two():
    now = datetime(2026, 10, 7, 13, 0, tzinfo=timezone.utc)
    posted = {
        ecmwf.file_url(datetime(2026, 10, 7, 6, tzinfo=timezone.utc)): b"06",
        ecmwf.file_url(datetime(2026, 10, 7, 0, tzinfo=timezone.utc)): b"00",
        ecmwf.file_url(datetime(2026, 10, 6, 18, tzinfo=timezone.utc)): b"18",
    }
    calls = []

    def fetch(url, timeout=None):
        calls.append(url)
        return Resp(200, posted[url]) if url in posted else Resp(404)

    files = ecmwf.download_files(fetch, now)
    assert files == [("2026100706", b"06"), ("2026100700", b"00")]
    assert calls[0].endswith("20261007120000-360h-enfo-tf.bufr")
    assert len(calls) == 3  # stops once two files are in hand


def test_download_files_stops_at_first_network_failure():
    # One timeout must not become four: the hourly job has a 15-minute limit.
    calls = []

    def fetch(url, timeout=None):
        calls.append(url)
        raise TimeoutError("read timed out")

    assert ecmwf.download_files(fetch, datetime(2026, 10, 7, 13, tzinfo=timezone.utc)) == []
    assert len(calls) == 1


def _pts(cycle, n):
    return [MemberPoint(cycle, f"EN{m:02d}", t, 22.0, -95.0) for m in range(1, n + 1) for t in (0, 6, 120)]


def test_members_for_storm_uses_newest_qualifying_file(monkeypatch):
    by_data = {b"12": _pts("2026100712", 10), b"06": _pts("2026100706", 51)}
    monkeypatch.setattr(ecmwf, "decode_members", lambda data, ident, cycle: by_data[data])
    files = [("2026100712", b"12"), ("2026100706", b"06")]
    cycle, members = ecmwf.members_for_storm(files, "al092026", 41, "2026-10-07T15:00:00Z")
    assert cycle == "2026100706" and len(members) == 51


def test_members_for_storm_raises_when_storm_absent(monkeypatch):
    monkeypatch.setattr(ecmwf, "decode_members", lambda data, ident, cycle: [])
    with pytest.raises(ecmwf.EcmwfError, match="no tracks for 09L"):
        ecmwf.members_for_storm([("2026100700", b"x")], "al092026", 41, "2026-10-07T03:00:00Z")


def test_members_for_storm_raises_when_nothing_downloaded():
    with pytest.raises(ecmwf.EcmwfError, match="no ECMWF track file"):
        ecmwf.members_for_storm([], "al092026", 41, "2026-10-07T03:00:00Z")


def test_file_url_for_each_product():
    t06 = datetime(2026, 10, 7, 6, tzinfo=timezone.utc)
    assert ecmwf.file_url(t06, "aifs-ens", "enfo").endswith(
        "/20261007/06z/aifs-ens/0p25/enfo/20261007060000-360h-enfo-tf.bufr"
    )
    assert ecmwf.file_url(t06, "aifs-single", "oper").endswith(
        "/20261007/06z/aifs-single/0p25/oper/20261007060000-360h-oper-tf.bufr"
    )
    assert ecmwf.file_url(t06, "ifs", "oper").endswith(
        "/20261007/06z/ifs/0p25/oper/20261007060000-144h-oper-tf.bufr"
    )


def test_members_from_periods_skips_the_single_run_mixed_into_an_ensemble():
    # AIFS ensemble files carry 50 perturbed members (type 4), the control
    # (type 1) and one single-run track (type 0) that is not a member.
    analysis = ([22.1, 22.1, 22.1], [-95.8, -95.8, -95.8])
    periods = [(6, [22.3, 22.4, 22.5], [-95.2, -94.9, -94.8])]
    points = ecmwf.members_from_periods("2026100700", [1, 2, 3], analysis, periods, forecast_types=[4, 1, 0])
    assert {p.tech for p in points} == {"EN01", "EN02"}


def test_single_track_feature_is_clipped_to_the_advisory():
    files = [("2026100700", b"x")]
    pts = [MemberPoint("2026100700", "EN00", tau, 22.0 + tau / 60, -95.0 + tau / 30) for tau in (0, 6, 12, 18)]
    feature = ecmwf.single_track_feature(
        files, "al092026", "AIFS", "Euro AI (AIFS)", "ai", "2026-10-07T09:00:00Z",
        decode=lambda data, ident, cycle: pts,
    )
    coords = feature["geometry"]["coordinates"]
    assert feature["properties"] == {
        "model": "AIFS", "label": "Euro AI (AIFS)", "kind": "ai", "group": "deterministic", "cycle": "2026100700",
    }
    assert coords[0] == [-94.7, 22.15]  # interpolated at 09Z between tau 6 and 12
    assert coords[-1] == [-94.4, 22.3]


def test_single_track_feature_none_when_storm_absent():
    assert ecmwf.single_track_feature(
        [("2026100700", b"x")], "al092026", "AIFS", "Euro AI (AIFS)", "ai", "2026-10-07T09:00:00Z",
        decode=lambda data, ident, cycle: [],
    ) is None


def test_members_from_periods_keeps_the_ifs_control_run():
    # IFS ENS: 50 perturbed (type 4) + the control (type 0, member 51) and NO
    # type-1 subset. Type 0 is the control there and must be kept (real files,
    # 2026100700 and 2026100712, checked in Docker 2026-10-07).
    analysis = ([22.1, 22.1], [-95.8, -95.8])
    periods = [(6, [22.3, 22.5], [-95.2, -94.8])]
    points = ecmwf.members_from_periods("2026100700", [1, 51], analysis, periods, forecast_types=[4, 0])
    assert {p.tech for p in points} == {"EN01", "EN51"}


def test_download_files_respects_the_run_deadline():
    calls = []

    def fetch(url, timeout=None):
        calls.append(timeout)
        return Resp(404)

    t13 = datetime(2026, 10, 7, 13, tzinfo=timezone.utc)
    # Deadline already passed: no request at all.
    assert ecmwf.download_files(fetch, t13, deadline=100.0, clock=lambda: 100.0) == []
    assert calls == []
    # 5 s left: each request's timeout is capped to what remains.
    ecmwf.download_files(fetch, t13, deadline=105.0, clock=lambda: 100.0)
    assert calls and max(calls) <= 5.0
