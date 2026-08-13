"""GOES scene selection and timestamping.

The values here come from real bucket listings taken on 2026-08-12, when the
noaa-goes16 bucket was found to be empty for this product and GOES-19 had taken
over as GOES-East.
"""

from datetime import datetime, timezone

from gulfwatch import satellite


REAL_KEY = (
    "ABI-L2-CMIPC/2026/224/23/"
    "OR_ABI-L2-CMIPC-M6C13_G19_s20262242351179_e20262242353565_c20262242354041.nc"
)


def test_bucket_is_goes19_not_goes16():
    """GOES-19 is GOES-East; the goes16 bucket lists zero keys for this product,
    so pointing at it would silently produce no imagery, forever."""
    assert "noaa-goes19" in satellite.GOES_BUCKET_URL


def test_uses_the_single_band_infrared_product():
    """The multi-band file is 52 MB and the single infrared band is 3.9 MB."""
    assert satellite.GOES_PRODUCT == "ABI-L2-CMIPC"
    assert satellite.GOES_BAND == "C13"


def test_hour_prefixes_walk_backwards_newest_first():
    now = datetime(2026, 8, 12, 23, 51, tzinfo=timezone.utc)  # doy 224
    prefixes = satellite.hour_prefixes(now, lookback_hours=2)
    assert prefixes == [
        "ABI-L2-CMIPC/2026/224/23/",
        "ABI-L2-CMIPC/2026/224/22/",
        "ABI-L2-CMIPC/2026/224/21/",
    ]


def test_hour_prefixes_roll_back_across_midnight():
    """00:05Z must look into the previous day's 23Z partition, not 2026/224/-1."""
    now = datetime(2026, 8, 13, 0, 5, tzinfo=timezone.utc)  # doy 225
    assert satellite.hour_prefixes(now, lookback_hours=1) == [
        "ABI-L2-CMIPC/2026/225/00/",
        "ABI-L2-CMIPC/2026/224/23/",
    ]


def test_latest_band_key_picks_the_newest_matching_band():
    xml = (
        "<Key>ABI-L2-CMIPC/2026/224/23/OR_ABI-L2-CMIPC-M6C02_G19_s20262242356179_x.nc</Key>"
        "<Key>ABI-L2-CMIPC/2026/224/23/OR_ABI-L2-CMIPC-M6C13_G19_s20262242346179_x.nc</Key>"
        f"<Key>{REAL_KEY}</Key>"
    )
    key = satellite.latest_band_key(xml)
    assert key == REAL_KEY, "must take the newest C13, never the visible band"


def test_latest_band_key_returns_none_for_an_empty_hour():
    """A just-started hour lists nothing; that is a look-further-back, not an error."""
    assert satellite.latest_band_key("<ListBucketResult></ListBucketResult>") is None


def test_scan_started_at_decodes_the_day_of_year_stamp():
    # 2026 day 224 = Aug 12; stamp 23:51:17.9 -> seconds truncated, tenths dropped
    assert satellite.scan_started_at(REAL_KEY) == "2026-08-12T23:51:17Z"


def test_scan_started_at_returns_none_rather_than_inventing_a_time():
    """An unparseable name must not publish a made-up timestamp beside a real image."""
    assert satellite.scan_started_at("ABI-L2-CMIPC/2026/224/23/no_stamp_here.nc") is None


def test_image_path_is_keyed_by_scan_time():
    """A per-scene name means each scan is its own URL, so the browser caches
    it and still sees the next one -- imagery refreshes far faster than
    advisories, so the advisory version cannot bust it."""
    path = satellite.image_path("2026-08-12T23:51:17Z")
    assert path == "satellite/goes19-20260812T235117.webp"
    assert path != satellite.image_path("2026-08-12T23:56:17Z")


def test_bounds_cover_the_gulf():
    (west, south), (east, north) = satellite.SATELLITE_BOUNDS
    assert west < -90 < east, "New Orleans longitude must sit inside the crop"
    assert south < 29.95 < north, "New Orleans latitude must sit inside the crop"
