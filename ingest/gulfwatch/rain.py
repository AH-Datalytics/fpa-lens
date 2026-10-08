"""WPC rainfall for the tropical page: a New Orleans 3-day "middle estimate"
with a range, and the 5-day rainfall forecast map.

Two different WPC products, on purpose (Jeff, 2026-10-08):

- The row uses WPC's probabilistic QPF percentiles for the next 72 hours
  (10th / 50th / 90th, `pqpf/conus/pqpf_72hr/prcntil_p72i_*`). On 2026-10-08
  12Z WPC's single deterministic forecast for New Orleans was 0.6 in while the
  middle of its own distribution was 2.5 in (range 0.3-6.0 in): a lone number
  would have hidden the real chance of several inches.
- The map uses WPC's official 5-day QPF shapefile (the familiar product NHC's
  rainfall graphics use). It can show less rain at New Orleans than the row's
  middle estimate; the labels say which product each is.

Both are public domain. GRIB decoding needs ecCodes (Linux wheels only), so
`eccodes` is imported lazily, like gulfwatch.ecmwf.
"""

from __future__ import annotations

import io
import os
import tarfile
import tempfile
from datetime import datetime, timedelta, timezone

import shapefile
from shapely import clip_by_rect
from shapely.geometry import mapping, shape

PCT_URL = "https://ftp-wpc.ncep.noaa.gov/pqpf/conus/pqpf_72hr/prcntil_p72i_{pct}pt_conus_latest_f072.grb"
MAP_URL = "https://ftp-wpc.ncep.noaa.gov/shapefiles/qpf/5day/QPF120hr_Day1-5_latest.tar"
NOLA = (29.95, -90.07)
LOW_PCT, MID_PCT, HIGH_PCT = 10, 50, 90
# Well beyond the map's opening view (19-32N, 95.5-80W) so the clip edge is
# not drawn across the Gulf; WPC's data reaches ~20N. A 24N edge showed as a
# hard line through the Gulf (2026-10-08).
MAP_BBOX = (-108.0, 18.0, -74.0, 38.0)
SIMPLIFY_DEGREES = 0.03  # ~3 km; 9 MB national file -> ~275 KB, ~73 KB gzipped (2026-10-08)
MIN_QPF_IN = 0.1  # trace bands (0.01 in) would wash the whole map
MM_PER_IN = 25.4


def _iso(moment: datetime) -> str:
    return moment.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def summary(issued: datetime, hours: int, low_mm: float, mid_mm: float, high_mm: float) -> dict:
    """The row's numbers, in inches to one decimal."""
    def inches(mm: float) -> float:
        return round(max(0.0, mm) / MM_PER_IN, 1)

    return {
        "issued": _iso(issued),
        "start": _iso(issued),
        "end": _iso(issued + timedelta(hours=hours)),
        "lowIn": inches(low_mm),
        "midIn": inches(mid_mm),
        "highIn": inches(high_mm),
        "lowPct": LOW_PCT,
        "highPct": HIGH_PCT,
    }


def grib_point(data: bytes, lat: float = NOLA[0], lon: float = NOLA[1]) -> tuple[datetime, int, float]:
    """(issue time, window hours, value in mm) at the grid point nearest lat/lon."""
    import eccodes  # noqa: PLC0415 - needs the C library; Linux runner only

    # Read through a file: a handle made with codes_new_from_message did not
    # expose dataDate for these WPC files (checked in Docker, 2026-10-08).
    with tempfile.NamedTemporaryFile(suffix=".grb", delete=False) as tmp:
        tmp.write(data)
        path = tmp.name
    try:
        with open(path, "rb") as f:
            handle = eccodes.codes_grib_new_from_file(f)
        try:
            date, time_ = eccodes.codes_get(handle, "dataDate"), eccodes.codes_get(handle, "dataTime")
            issued = datetime.strptime(f"{date}{int(time_):04d}", "%Y%m%d%H%M").replace(tzinfo=timezone.utc)
            start, end = (int(x) for x in str(eccodes.codes_get(handle, "stepRange")).split("-"))
            value = eccodes.codes_grib_find_nearest(handle, lat, lon)[0]["value"]
            return issued, end - start, float(value)
        finally:
            eccodes.codes_release(handle)
    finally:
        os.unlink(path)


def _wpc_time(value: str) -> str:
    return _iso(datetime.strptime(value.strip(), "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc))


def map_geojson(tar_bytes: bytes) -> tuple[dict, dict]:
    """WPC 5-day QPF tar -> (FeatureCollection clipped to MAP_BBOX and
    simplified, {issued, start, end}). Each feature is the area with at least
    `qpf` inches."""
    parts: dict[str, bytes] = {}
    with tarfile.open(fileobj=io.BytesIO(tar_bytes)) as tar:
        for member in tar.getmembers():
            ext = member.name.rsplit(".", 1)[-1].lower()
            if ext in ("shp", "shx", "dbf"):
                parts[ext] = tar.extractfile(member).read()
    reader = shapefile.Reader(shp=io.BytesIO(parts["shp"]), shx=io.BytesIO(parts["shx"]), dbf=io.BytesIO(parts["dbf"]))
    features, meta = [], {}
    for shape_record in reader.shapeRecords():
        record = shape_record.record.as_dict()
        if not meta:
            meta = {
                "issued": _wpc_time(record["ISSUE_TIME"]),
                "start": _wpc_time(record["START_TIME"]),
                "end": _wpc_time(record["END_TIME"]),
            }
        qpf = float(record["QPF"])
        if qpf < MIN_QPF_IN:
            continue
        geom = clip_by_rect(shape(shape_record.shape.__geo_interface__), *MAP_BBOX)
        geom = geom.simplify(SIMPLIFY_DEGREES, preserve_topology=True)
        if geom.is_empty:
            continue
        features.append({"type": "Feature", "geometry": _rounded(mapping(geom)), "properties": {"qpf": qpf}})
    features.sort(key=lambda f: f["properties"]["qpf"])  # light bands first, heavy on top
    return {"type": "FeatureCollection", "features": features}, meta


def _rounded(geometry: dict) -> dict:
    def walk(value):
        if isinstance(value, (list, tuple)):
            if value and isinstance(value[0], (int, float)):
                return [round(float(v), 3) for v in value]
            return [walk(v) for v in value]
        return value

    return {"type": geometry["type"], "coordinates": walk(geometry["coordinates"])}
