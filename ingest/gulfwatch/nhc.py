"""NHC current storms (CurrentStorms.json) parser for Gulf Watch.

Parses the NHC "CurrentStorms.json" feed into Storm records carrying the
fields the manifest storm entry needs (see shared-contracts.md), plus the
Gulf-of-Mexico "relevant storm" rule used to decide dashboard mode
(quiet vs. active).

Pure function, no network I/O.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

CURRENT_STORMS_URL = "https://www.nhc.noaa.gov/CurrentStorms.json"

# Fallback GIS zip URL patterns (see shared-contracts.md), used only when
# CurrentStorms.json doesn't carry an explicit zipFile for a product.
# {id} must be the uppercase storm id, e.g. AL092026.
GIS_LATEST_URL_PATTERNS = {
    "cone": "https://www.nhc.noaa.gov/storm_graphics/api/{id}_CONE_latest.zip",
    "track": "https://www.nhc.noaa.gov/storm_graphics/api/{id}_TRACK_latest.zip",
    "wwlines": "https://www.nhc.noaa.gov/storm_graphics/api/{id}_WW_latest.zip",
}

# CurrentStorms.json fields that carry each GIS product's zipFile, keyed to
# the gis_urls dict key we expose on Storm.
_GIS_FIELD_BY_KEY = {
    "cone": "trackCone",
    "track": "forecastTrack",
    "wwlines": "windWatchesWarnings",
    "windfield": "initialWindExtent",
}

# Gulf of Mexico box (mode rule + "relevant storm"): lon -98..-80, lat 18..31.
GULF_LON_MIN, GULF_LON_MAX = -98.0, -80.0
GULF_LAT_MIN, GULF_LAT_MAX = 18.0, 31.0

# 16-point compass rose, index 0 = N, each sector 22.5 deg wide centered on
# its point (e.g. W covers [258.75, 281.25)).
_COMPASS_POINTS = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
]


def deg_to_compass(deg: int) -> str:
    """Convert a compass bearing in degrees (0-360) to a 16-point compass label."""
    idx = int(((deg % 360) + 11.25) // 22.5) % 16
    return _COMPASS_POINTS[idx]


def in_gulf_box(lat: float, lon: float) -> bool:
    """True if (lat, lon) falls in the Gulf of Mexico box used for mode/relevance."""
    return GULF_LAT_MIN <= lat <= GULF_LAT_MAX and GULF_LON_MIN <= lon <= GULF_LON_MAX


@dataclass
class Storm:
    id: str
    name: str
    classification: str
    intensity_kt: int
    pressure_mb: int
    movement_dir: int  # raw numeric compass bearing in degrees, 0-360
    movement_mph: int
    lat: float
    lon: float
    advisory_num: str
    advisory_time: str  # ISO 8601 UTC, e.g. "2026-07-23T00:00:00Z"
    next_advisory_time: str  # ISO 8601 UTC
    gis_urls: dict
    # Text-product URLs (gulfwatch.text / gulfwatch.probs), all from
    # CurrentStorms.json fields that may legitimately be missing on a
    # given storm entry -- default to "" rather than requiring callers to
    # pass them, so every existing Storm(...) construction stays valid.
    # publicAdvisory's own issued time is advisory_time above (same field,
    # not duplicated); only the discussion needs its own issuance since it
    # can differ from the public advisory's.
    discussion_url: str = ""
    discussion_issued: str = ""  # ISO 8601 UTC
    advisory_url: str = ""
    probs_url: str = ""


def _parse_nhc_time(raw: str) -> datetime:
    return datetime.fromisoformat(raw.replace("Z", "+00:00"))


def _iso_z(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _next_advisory_time(advisory_time: str) -> str:
    """Fallback rule: advisory_time + 6h, the standard full-advisory cadence.

    CurrentStorms.json carries no nextAdvisoryTime, so this is all the feed
    alone can say. Once coastal watches or warnings are up NHC moves to
    3-hourly intermediate advisories, and the public advisory text says
    exactly when the next one is due -- next_advisory_from_text reads that,
    and the pipeline prefers it (see pipeline._process_text_products).
    """
    return _iso_z(_parse_nhc_time(advisory_time) + timedelta(hours=6))


# "Next intermediate advisory at 800 PM EDT." / "Next complete advisory at
# 1100 PM EDT." / occasionally "Next advisory at 400 AM CDT." -- the NEXT
# ADVISORY block that closes every NHC public advisory. Times are local to the
# zone NHC quotes, with no date, so the date is resolved against the advisory's
# own issuance below.
_NEXT_ADVISORY_RE = re.compile(
    r"Next\s+(?:intermediate\s+|complete\s+|public\s+)?advisory\s+at\s+"
    r"(\d{1,2})(\d{2})\s*(AM|PM)\s+([A-Z]{3,4})",
    re.IGNORECASE,
)

# Fixed offsets for the abbreviations NHC uses. The product names the zone
# explicitly, so a fixed table is exact here (no zoneinfo guesswork).
_TZ_OFFSET_HOURS = {
    "UTC": 0, "GMT": 0,
    "AST": -4, "ADT": -3,
    "EST": -5, "EDT": -4,
    "CST": -6, "CDT": -5,
    "MST": -7, "MDT": -6,
    "PST": -8, "PDT": -7,
    "AKST": -9, "AKDT": -8,
    "HST": -10,
}

# An announced next advisory further out than this is a parse gone wrong
# (a stray "at 1000 PM" from elsewhere in the text), not a schedule.
_MAX_NEXT_ADVISORY_GAP = timedelta(hours=12)


def next_advisory_from_text(advisory_text: str, advisory_time: str) -> str | None:
    """The earliest next-advisory time announced in a public advisory's text,
    as ISO 8601 Z, or None when the text names none that can be resolved.

    Intermediate advisories (3-hourly, issued while watches/warnings are in
    effect) and complete advisories (6-hourly) are both announced; the
    earlier one is what "Next update" on the storm header should count down
    to. Each quoted local time is placed on the advisory's own local date,
    rolling to the next day when it has already passed (a 7 PM advisory
    announcing "1000 PM" is tonight; one announcing "100 AM" is tomorrow).
    """
    try:
        advisory_dt = _parse_nhc_time(advisory_time)
    except (TypeError, ValueError, AttributeError):
        return None
    if advisory_dt.tzinfo is None:
        advisory_dt = advisory_dt.replace(tzinfo=timezone.utc)

    candidates = []
    for hour_text, minute_text, meridiem, zone in _NEXT_ADVISORY_RE.findall(advisory_text or ""):
        offset = _TZ_OFFSET_HOURS.get(zone.upper())
        hour, minute = int(hour_text), int(minute_text)
        if offset is None or hour > 12 or minute > 59:
            continue
        hour = hour % 12 + (12 if meridiem.upper() == "PM" else 0)
        local_advisory = advisory_dt + timedelta(hours=offset)
        local_candidate = local_advisory.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if local_candidate <= local_advisory:
            local_candidate += timedelta(days=1)
        candidate = local_candidate - timedelta(hours=offset)
        if timedelta(0) < candidate - advisory_dt <= _MAX_NEXT_ADVISORY_GAP:
            candidates.append(candidate)

    return _iso_z(min(candidates).astimezone(timezone.utc)) if candidates else None


def resolve_next_advisory_time(advisory_time: str, advisory_text: str | None = None) -> str:
    """What the storm header counts down to: the time the public advisory
    text announces when it can be read, else the +6h fallback."""
    if advisory_text:
        announced = next_advisory_from_text(advisory_text, advisory_time)
        if announced:
            return announced
    return _next_advisory_time(advisory_time)


def _gis_url(storm_json: dict, key: str) -> str:
    """Explicit zipFile from CurrentStorms.json if present, else the
    {ID}_*_latest.zip fallback pattern."""
    product = storm_json.get(_GIS_FIELD_BY_KEY[key])
    if product and product.get("zipFile"):
        return product["zipFile"]
    pattern = GIS_LATEST_URL_PATTERNS.get(key)
    return pattern.format(id=storm_json["id"].upper()) if pattern else ""


def parse_current_storms(data: dict) -> list[Storm]:
    """Parse a CurrentStorms.json payload (`{"activeStorms": [...]}`) into a
    list of Storm records."""
    storms = []
    for s in data.get("activeStorms", []):
        public_advisory = s.get("publicAdvisory") or {}
        advisory_num = public_advisory.get("advNum") or ""
        raw_time = public_advisory.get("issuance") or s.get("lastUpdate") or ""
        advisory_time = _iso_z(_parse_nhc_time(raw_time)) if raw_time else ""
        advisory_url = public_advisory.get("url") or ""

        forecast_discussion = s.get("forecastDiscussion") or {}
        discussion_url = forecast_discussion.get("url") or ""
        raw_discussion_time = forecast_discussion.get("issuance") or ""
        discussion_issued = (
            _iso_z(_parse_nhc_time(raw_discussion_time)) if raw_discussion_time else ""
        )

        wind_speed_probabilities = s.get("windSpeedProbabilities") or {}
        probs_url = wind_speed_probabilities.get("url") or ""

        storms.append(
            Storm(
                id=s["id"],
                name=s["name"],
                classification=s["classification"],
                intensity_kt=int(s["intensity"]),
                pressure_mb=int(s["pressure"]),
                movement_dir=int(s["movementDir"]),
                movement_mph=int(s["movementSpeed"]),
                lat=float(s["latitudeNumeric"]),
                lon=float(s["longitudeNumeric"]),
                advisory_num=advisory_num,
                advisory_time=advisory_time,
                next_advisory_time=_next_advisory_time(advisory_time) if advisory_time else "",
                gis_urls={key: _gis_url(s, key) for key in _GIS_FIELD_BY_KEY},
                discussion_url=discussion_url,
                discussion_issued=discussion_issued,
                advisory_url=advisory_url,
                probs_url=probs_url,
            )
        )
    return storms


def _iter_lonlat(coordinates, geom_type):
    """Yield (lon, lat) pairs from a GeoJSON geometry's coordinates, across
    Point/LineString/MultiPoint/Polygon/MultiLineString/MultiPolygon nesting."""
    if coordinates is None:
        return
    if geom_type == "Point":
        yield coordinates[0], coordinates[1]
    elif geom_type in ("LineString", "MultiPoint"):
        for c in coordinates:
            yield c[0], c[1]
    elif geom_type in ("Polygon", "MultiLineString"):
        for part in coordinates:
            for c in part:
                yield c[0], c[1]
    elif geom_type == "MultiPolygon":
        for poly in coordinates:
            for ring in poly:
                for c in ring:
                    yield c[0], c[1]


def storm_in_gulf(storm: Storm, track_geojson: dict | None) -> bool:
    """True if the storm's current position OR any forecast track point is
    inside the Gulf box."""
    if in_gulf_box(storm.lat, storm.lon):
        return True
    if not track_geojson:
        return False
    for feature in track_geojson.get("features", []):
        geometry = feature.get("geometry") or {}
        for lon, lat in _iter_lonlat(geometry.get("coordinates"), geometry.get("type")):
            if in_gulf_box(lat, lon):
                return True
    return False
