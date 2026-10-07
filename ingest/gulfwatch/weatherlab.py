"""Google DeepMind Weather Lab ensemble members, for the track-density layer.

Weather Lab publishes every member track (OPER model, 50 members, techs
F000-F049) as ATCF a-deck text, no sign-in. The URL layout comes from the
`weathernext-download` package (cli.py BASE_URL + filename_for) and was
confirmed against live files 2026-10-07.

TERMS: every file binds the user to
https://storage.googleapis.com/weathernext-public/terms-of-use.pdf. Raw or
recolored tracks may not be published; a non-retrievable derived product may,
with Google's citation. So members stay in memory: this module never writes,
prints, or puts file content in an exception. Errors are allowlisted codes.
The repo, its Actions logs, the blob store and manifest.errors are all public.
"""

from __future__ import annotations

import re
import time
from datetime import datetime, timedelta, timezone

from gulfwatch import adeck, density

BASE_URL = "https://deepmind.google.com/science/weatherlab/download/cyclones"
MODEL = "OPER"
MEMBER_RE = re.compile(r"^F\d{3}$")
CANDIDATE_CYCLES = 4
TIMEOUT_S = 30

ERROR_CODES = frozenset({
    "google_unavailable",
    "google_no_storm",
    "google_too_few_members",
    "google_parse_failed",
    "google_render_failed",
    "google_upload_failed",
    "google_failed",
})


class GoogleError(Exception):
    """Carries only an allowlisted code -- never input text."""

    def __init__(self, code: str):
        if code not in ERROR_CODES:
            raise ValueError("unknown Weather Lab error code")
        super().__init__(code)
        self.code = code


def file_url(cycle_dt: datetime) -> str:
    stamp = cycle_dt.strftime("%Y_%m_%dT%H")
    return f"{BASE_URL}/{MODEL}/ensemble/paired/atcf/{MODEL}_{stamp}_00_atcf_a_deck.txt"


def cycle_candidates(now: datetime, count: int = CANDIDATE_CYCLES) -> list[datetime]:
    now = now.astimezone(timezone.utc)
    newest = now.replace(hour=now.hour - now.hour % 6, minute=0, second=0, microsecond=0)
    return [newest - timedelta(hours=6 * i) for i in range(count)]


def fetch_members(
    storm_id: str, fetch, now: datetime, minimum: int, advisory_time: str | None = None,
    deadline: float | None = None, clock=time.monotonic,
) -> tuple[str, density.Members]:
    """Newest qualifying cycle's members for `storm_id` (e.g. "al092026").

    Walks the newest CANDIDATE_CYCLES synoptic cycles newest first. A 404 is
    the normal "not posted yet" answer, so there is no retry-with-sleep. Keeps
    going past a file with fewer than `minimum` members for this storm.
    """
    basin, number = storm_id[:2].upper(), storm_id[2:4]
    newest_posted: str | None = None
    saw_storm = False
    too_few = False
    for cycle_dt in cycle_candidates(now):
        # Shared run budget for outside downloads (pipeline.EXTERNAL_BUDGET_S).
        timeout = TIMEOUT_S
        if deadline is not None:
            remaining = deadline - clock()
            if remaining <= 0:
                break
            timeout = min(TIMEOUT_S, remaining)
        try:
            resp = fetch(file_url(cycle_dt), timeout=timeout)
        except Exception:  # noqa: BLE001
            # A network failure stops the walk: four timeouts per storm could
            # outlast the job's 15-minute limit (Codex review, 2026-10-07).
            break
        if resp.status_code != 200:
            continue
        cycle = cycle_dt.strftime("%Y%m%d%H")
        newest_posted = newest_posted or cycle
        try:
            points = adeck.extract_members(resp.text, MEMBER_RE, basin=basin, number=number)
        except Exception:  # noqa: BLE001
            raise GoogleError("google_parse_failed") from None
        if not points:
            continue
        saw_storm = True
        selected = density.select_cycle(
            points, minimum, newest_cycle=newest_posted, advisory_time=advisory_time
        )
        if selected is not None:
            return selected
        too_few = True
    if too_few:
        raise GoogleError("google_too_few_members")
    if newest_posted and not saw_storm:
        raise GoogleError("google_no_storm")
    raise GoogleError("google_unavailable")
