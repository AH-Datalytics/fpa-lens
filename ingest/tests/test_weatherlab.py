"""Weather Lab fetch. All Google-format rows here are SYNTHETIC: the repo is
public and real-time Google data may not be committed (see the spec)."""

from datetime import datetime, timezone

import pytest

from gulfwatch import weatherlab

NOW = datetime(2026, 10, 7, 16, 30, tzinfo=timezone.utc)


def google_file(cycle, members, basin="AL", number="09", lat0=12.3, lon0=-61.7):
    lines = ["# SYNTHETIC test data in the Weather Lab ATCF layout", "# BEGIN DATA"]
    for m in range(members):
        for tau in range(0, 121, 12):
            lat = round(lat0 + tau / 12 * 0.3 + m * 0.01, 1)
            lon = round(lon0 - tau / 12 * 0.4, 1)
            lines.append(
                f"{basin}, {number}, {cycle}, 03, F{m:03d}, {tau:3d}, "
                f"{int(round(lat * 10))}N, {int(round(-lon * 10)):4d}W,  45,  998, XX,  34, NEQ"
            )
    return "\n".join(lines) + "\n"


class Resp:
    def __init__(self, status_code=200, text=""):
        self.status_code = status_code
        self.text = text


class Fetch:
    def __init__(self, routes):
        self.routes = routes
        self.calls = []

    def __call__(self, url, timeout=None):
        self.calls.append(url)
        r = self.routes.get(url, Resp(404))
        if isinstance(r, Exception):
            raise r
        return r


def url(cycle):
    return weatherlab.file_url(datetime.strptime(cycle, "%Y%m%d%H").replace(tzinfo=timezone.utc))


def test_file_url_matches_weather_lab_layout():
    assert url("2026100706") == (
        "https://deepmind.google.com/science/weatherlab/download/cyclones/OPER/"
        "ensemble/paired/atcf/OPER_2026_10_07T06_00_atcf_a_deck.txt"
    )


def test_cycle_candidates_newest_first_on_six_hour_grid():
    assert [c.hour for c in weatherlab.cycle_candidates(NOW)] == [12, 6, 0, 18]


def test_skips_unposted_newest_cycle_and_returns_members():
    fetch = Fetch({url("2026100706"): Resp(200, google_file("2026100706", 50))})
    cycle, members = weatherlab.fetch_members("al092026", fetch, NOW, minimum=40)
    assert cycle == "2026100706"
    assert len(members) == 50
    assert fetch.calls[0] == url("2026100712")


def test_continues_past_a_file_below_minimum():
    fetch = Fetch({
        url("2026100712"): Resp(200, google_file("2026100712", 12)),
        url("2026100706"): Resp(200, google_file("2026100706", 50)),
    })
    cycle, _ = weatherlab.fetch_members("al092026", fetch, NOW, minimum=40)
    assert cycle == "2026100706"


def test_too_few_everywhere_is_a_code():
    fetch = Fetch({url("2026100706"): Resp(200, google_file("2026100706", 12))})
    with pytest.raises(weatherlab.GoogleError) as exc:
        weatherlab.fetch_members("al092026", fetch, NOW, minimum=40)
    assert exc.value.code == "google_too_few_members"
    assert str(exc.value) == "google_too_few_members"


def test_storm_missing_from_posted_files_is_no_storm():
    fetch = Fetch({url("2026100706"): Resp(200, google_file("2026100706", 50, basin="EP", number="15"))})
    with pytest.raises(weatherlab.GoogleError) as exc:
        weatherlab.fetch_members("al092026", fetch, NOW, minimum=40)
    assert exc.value.code == "google_no_storm"


def test_nothing_posted_or_network_error_is_unavailable():
    fetch = Fetch({url("2026100712"): RuntimeError("boom 123N 617W")})
    with pytest.raises(weatherlab.GoogleError) as exc:
        weatherlab.fetch_members("al092026", fetch, NOW, minimum=40)
    assert exc.value.code == "google_unavailable"


def test_parse_failure_is_a_code_without_input_text(monkeypatch):
    def boom(*a, **k):
        raise ValueError("F001 123N 617W")
    monkeypatch.setattr(weatherlab.adeck, "extract_members", boom)
    fetch = Fetch({url("2026100712"): Resp(200, google_file("2026100712", 50))})
    with pytest.raises(weatherlab.GoogleError) as exc:
        weatherlab.fetch_members("al092026", fetch, NOW, minimum=40)
    assert str(exc.value) == "google_parse_failed"
    assert exc.value.__cause__ is None and exc.value.__suppress_context__


def test_unknown_code_rejected():
    with pytest.raises(ValueError):
        weatherlab.GoogleError("F001 123N")


def test_fetch_respects_the_run_deadline():
    fetch = Fetch({url("2026100706"): Resp(200, google_file("2026100706", 50))})
    with pytest.raises(weatherlab.GoogleError) as exc:
        weatherlab.fetch_members("al092026", fetch, NOW, minimum=40, deadline=10.0, clock=lambda: 10.0)
    assert exc.value.code == "google_unavailable"
    assert fetch.calls == []
