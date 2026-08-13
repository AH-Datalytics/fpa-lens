"""Live GOES satellite overlay for the tropical map.

Two facts drive every choice here, both established by measurement rather than
by copying the Ida replay builder (2026-08-12):

**GOES-19, not GOES-16.** GOES-19 took over as GOES-East, and the noaa-goes16
bucket no longer carries this product at all -- its current-hour prefixes list
zero keys. The replay builder still points at noaa-goes16, which is correct for
2021 archive frames and silently produces nothing for live ones.

**Infrared, from the single-band product.** The multi-band file (ABI-L2-MCMIPC,
all 16 bands) is 52 MB; the single band we actually need (ABI-L2-CMIPC C13,
clean infrared) is 3.9 MB -- thirteen times smaller, and it downloads in under a
second. Infrared also renders cloud tops far more clearly than visible does at a
low sun angle, and it works at night, so there is no day/night switch to get
wrong and no black frame at 3am.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

GOES_BUCKET_URL = "https://noaa-goes19.s3.amazonaws.com"
GOES_PRODUCT = "ABI-L2-CMIPC"
GOES_BAND = "C13"
GOES_SOURCE_LABEL = "GOES-19 infrared"
GOES_SOURCE_URL = "https://www.star.nesdis.noaa.gov/goes/"

# The Gulf crop the map draws the overlay into (matches the replay's framing).
SATELLITE_BOUNDS = [[-95.5, 19], [-80, 32]]

# How far back to look for a scene before giving up. CONUS scans every 5
# minutes, so anything beyond an hour means an outage, not a quiet period.
LOOKBACK_HOURS = 3

_SCAN_START_RE = re.compile(r"_s(\d{4})(\d{3})(\d{2})(\d{2})(\d{2})")


def hour_prefixes(now: datetime, lookback_hours: int = LOOKBACK_HOURS) -> list[str]:
    """S3 key prefixes for this hour and the ones before it, newest first.

    The bucket is partitioned year/day-of-year/hour, so "the latest scene"
    cannot be expressed as a single listing -- at HH:02 the current hour holds
    one scene, or none if the scan is still uploading.
    """
    out = []
    for back in range(lookback_hours + 1):
        moment = now - timedelta(hours=back)
        out.append(
            "%s/%04d/%03d/%02d/"
            % (GOES_PRODUCT, moment.year, moment.timetuple().tm_yday, moment.hour)
        )
    return out


def latest_band_key(listing_xml: str, band: str = GOES_BAND) -> str | None:
    """Newest key for `band` in one S3 listing, or None.

    Keys sort chronologically because the scan-start stamp is fixed-width and
    zero-padded, so lexical order is time order.
    """
    keys = [k for k in re.findall(r"<Key>([^<]+)</Key>", listing_xml) if band in k]
    return sorted(keys)[-1] if keys else None


def scan_started_at(key: str) -> str | None:
    """ISO-8601 UTC scan start parsed from the ABI filename stamp.

    `_sYYYYDDDHHMMSSm` -- day-of-year, and a trailing tenths digit that is
    dropped. Returns None rather than guessing if the stamp is missing, so a
    caller never publishes an invented timestamp next to a real image.
    """
    match = _SCAN_START_RE.search(key)
    if not match:
        return None
    year, doy, hour, minute, second = (int(g) for g in match.groups())
    try:
        moment = datetime(year, 1, 1, tzinfo=timezone.utc) + timedelta(
            days=doy - 1, hours=hour, minutes=minute, seconds=second
        )
    except ValueError:
        return None
    return moment.strftime("%Y-%m-%dT%H:%M:%SZ")


def image_path(issued: str) -> str:
    """Blob path for a scene, keyed by its own scan time.

    A per-scene name means each new image is a new URL, so the browser caches
    it forever and still sees the next scan immediately -- an overwritten
    fixed name would need cache-busting the advisory version cannot provide,
    since imagery refreshes every few minutes and advisories do not.
    """
    slug = issued.replace("-", "").replace(":", "").replace("Z", "")
    return f"satellite/goes19-{slug}.webp"
