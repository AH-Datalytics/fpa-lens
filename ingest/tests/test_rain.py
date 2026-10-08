"""WPC rainfall: the New Orleans 3-day middle estimate + range, and the 5-day
map. GRIB decoding needs ecCodes (Linux only), so it is checked in Docker; the
pure parts are tested here."""

import io
import tarfile
from datetime import datetime, timezone

import shapefile

from gulfwatch import rain


def test_summary_rounds_to_tenths_of_an_inch_and_labels_the_window():
    issued = datetime(2026, 10, 8, 12, tzinfo=timezone.utc)
    s = rain.summary(issued, 72, low_mm=7.8, mid_mm=62.2, high_mm=152.6)
    assert s == {
        "issued": "2026-10-08T12:00:00Z",
        "start": "2026-10-08T12:00:00Z",
        "end": "2026-10-11T12:00:00Z",
        "lowIn": 0.3,
        "midIn": 2.4,
        "highIn": 6.0,
        "lowPct": 10,
        "highPct": 90,
    }


def test_summary_never_reports_negative_rain():
    issued = datetime(2026, 10, 8, 12, tzinfo=timezone.utc)
    assert rain.summary(issued, 72, -0.4, 0.0, 1.0)["lowIn"] == 0.0


def _qpf_tar(polys):
    """A tiny WPC-style 5-day QPF shapefile in a tar, built in memory."""
    shp, shx, dbf = io.BytesIO(), io.BytesIO(), io.BytesIO()
    w = shapefile.Writer(shp=shp, shx=shx, dbf=dbf, shapeType=shapefile.POLYGON)
    for name, typ, size, dec in [("QPF", "N", 10, 2), ("UNITS", "C", 10, 0), ("ISSUE_TIME", "C", 25, 0),
                                 ("START_TIME", "C", 25, 0), ("END_TIME", "C", 25, 0)]:
        w.field(name, typ, size, dec)
    for qpf, ring in polys:
        w.poly([ring])
        w.record(qpf, "Inches", "2026-10-08 10:17:25", "2026-10-08 12:00:00", "2026-10-13 12:00:00")
    w.close()
    out = io.BytesIO()
    with tarfile.open(fileobj=out, mode="w") as tar:
        for ext, buf in (("shp", shp), ("shx", shx), ("dbf", dbf)):
            data = buf.getvalue()
            info = tarfile.TarInfo(f"95e0812.{ext}")
            info.size = len(data)
            tar.addfile(info, io.BytesIO(data))
    return out.getvalue()


def test_map_clips_to_the_gulf_coast_and_keeps_wpc_metadata():
    gulf = [(-92, 29), (-88, 29), (-88, 32), (-92, 32), (-92, 29)]
    plains = [(-102, 40), (-98, 40), (-98, 44), (-102, 44), (-102, 40)]  # Nebraska: outside
    straddle = [(-110, 30), (-100, 30), (-100, 33), (-110, 33), (-110, 30)]  # clipped at -107
    fc, meta = rain.map_geojson(_qpf_tar([(2.0, gulf), (1.0, plains), (0.5, straddle)]))
    values = sorted(f["properties"]["qpf"] for f in fc["features"])
    assert values == [0.5, 2.0]
    xs = [x for f in fc["features"] for ring in f["geometry"]["coordinates"] for x, _ in ring]
    assert min(xs) >= rain.MAP_BBOX[0]
    assert meta == {"issued": "2026-10-08T10:17:25Z", "start": "2026-10-08T12:00:00Z", "end": "2026-10-13T12:00:00Z"}


def test_map_drops_trace_bands_below_a_tenth_of_an_inch():
    ring = [(-92, 29), (-88, 29), (-88, 32), (-92, 32), (-92, 29)]
    fc, _ = rain.map_geojson(_qpf_tar([(0.01, ring), (0.1, ring)]))
    assert [f["properties"]["qpf"] for f in fc["features"]] == [0.1]


# ---------------------------------------------------------------------------
# Pipeline wiring (_process_rain), with fake fetch/head/store.
# ---------------------------------------------------------------------------
import gulfwatch.pipeline as pipeline


class Resp:
    def __init__(self, status_code=200, content=b"", headers=None):
        self.status_code = status_code
        self.content = content
        self.headers = headers or {}

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")


class Store:
    def __init__(self):
        self.data = {}

    def put_json(self, path, obj):
        self.data[path] = obj


RING = [(-92, 29), (-88, 29), (-88, 32), (-92, 32), (-92, 29)]


def _wire(monkeypatch, modified="Thu, 08 Oct 2026 10:35:23 GMT"):
    calls = {"get": [], "head": []}
    tar = _qpf_tar([(2.0, RING)])

    def fetch(url, timeout=None):
        calls["get"].append(url)
        return Resp(200, tar if url == rain.MAP_URL else url.encode())

    def head(url, timeout=None, allow_redirects=True):
        calls["head"].append(url)
        return Resp(200, headers={"Last-Modified": modified})

    mm = {rain.PCT_URL.format(pct=p): v for p, v in ((10, 7.8), (50, 62.2), (90, 152.6))}
    issued = datetime(2026, 10, 8, 12, tzinfo=timezone.utc)
    monkeypatch.setattr(rain, "grib_point", lambda data: (issued, 72, mm[data.decode()]))
    monkeypatch.setattr(pipeline, "_utcnow", lambda: datetime(2026, 10, 8, 14, tzinfo=timezone.utc))
    return fetch, head, calls


def test_rain_row_and_map_land_and_are_advertised(monkeypatch):
    fetch, head, _ = _wire(monkeypatch)
    store, errors = Store(), []
    state, manifest = pipeline._process_rain(fetch, head, store, errors, {})
    assert errors == []
    assert manifest["nola"]["midIn"] == 2.4 and manifest["nola"]["lowIn"] == 0.3
    assert manifest["map"]["geojson"] in store.data
    assert manifest["map"]["start"] == "2026-10-08T12:00:00Z"
    assert state["nolaModified"] and state["mapModified"]


def test_rain_is_not_downloaded_again_until_wpc_publishes(monkeypatch):
    fetch, head, calls = _wire(monkeypatch)
    state, _ = pipeline._process_rain(fetch, head, Store(), [], {})
    calls["get"].clear()
    state2, manifest = pipeline._process_rain(fetch, head, Store(), [], state)
    assert calls["get"] == []  # only the cheap HEAD checks
    assert manifest["nola"]["midIn"] == 2.4 and "map" in manifest


def test_failed_decode_keeps_the_last_good_row_and_records_an_error(monkeypatch):
    fetch, head, _ = _wire(monkeypatch)
    state, _ = pipeline._process_rain(fetch, head, Store(), [], {})
    fetch2, head2, _ = _wire(monkeypatch, modified="Thu, 08 Oct 2026 22:35:23 GMT")

    def boom(data):
        raise RuntimeError("bad GRIB")
    monkeypatch.setattr(rain, "grib_point", boom)
    errors = []
    _, manifest = pipeline._process_rain(fetch2, head2, Store(), errors, state)
    assert manifest["nola"]["midIn"] == 2.4
    assert {"product": "rain.nola", "message": "bad GRIB"} in errors


def test_expired_rain_is_not_advertised(monkeypatch):
    fetch, head, _ = _wire(monkeypatch)
    state, _ = pipeline._process_rain(fetch, head, Store(), [], {})
    monkeypatch.setattr(pipeline, "_utcnow", lambda: datetime(2026, 10, 14, tzinfo=timezone.utc))
    _, manifest = pipeline._process_rain(fetch, head, Store(), [], state)
    assert manifest == {}  # both windows over: show nothing rather than stale rain
