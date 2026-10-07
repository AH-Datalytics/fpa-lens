# Tropical page: ensemble track-density layer (Phase 1)

Date: 2026-10-07
Branch: `tropical-density` (worktree `C:\Users\jeffm\fpa-lens-density`, cut from `origin/main` 77e5081; not pushed)
Status: design, awaiting review (uncommitted; the repo is public)

## Problem

The tropical page (`/environment/tropical-weather`) draws ensemble guidance only
as spaghetti: the GEFS members (AP01–AP30) parsed from NHC's public a-deck. That
is hard to read at a glance once 30+ lines overlap. Jeff wants the "track density"
view polarwx.com shows (e.g. `polarwx.com/tropical/#al092026/ensembles`): a
color field giving the chance the storm's center passes near each point.

He also wants Google DeepMind's AI ensemble on the page. NHC's public a-deck
carries only its ensemble mean (`GDMN`, already drawn). The individual members
are published by Google Weather Lab, but under terms that rule out drawing them
as spaghetti on a public site (see "Google terms" below). A density field built
from them is permitted.

## Goals

- A track-density layer for two ensembles: **GEFS** (from the NHC a-deck the
  pipeline already downloads) and **Google DeepMind** (from Weather Lab).
- Matches the polarwx look closely enough that Jeff recognizes it: blue → green
  → yellow → red, under the cone and model lines.
- The Google member tracks never reach the public blob store or the browser.
  Only the finished density image does.
- Missing or late data degrades to a greyed-out option, never an error banner or
  a blank map, following the existing "advertise only what landed" rule.

## Non-goals (Phase 2 or later)

- ECMWF ensemble (IFS ENS, open-data BUFR `enfo-tf`) tracks or density.
- ECMWF AIFS single-run track (needs GRIB decode + a home-built MSLP tracker).
- A combined "all ensembles" density.
- A radius selector (polarwx offers 100/150/200 km; Phase 1 is fixed at 100 km).
- Google WeatherNext 3 (`WNV3`, 64 members). Phase 1 uses Weather Lab's `OPER`
  model (50 members). Assumed, not verified, to be the model behind NHC's `GDMN`.
- Google member spaghetti on the map (terms; see below).

## Data sources (verified 2026-10-07 against TS Isaias, AL092026)

| Ensemble | Source | Members for AL09 | Cycles | License |
|---|---|---|---|---|
| GEFS | NHC `aid_public/aal092026.dat.gz` (already fetched hourly), techs `AP01`–`AP30` | 30 | 00/06/12/18Z, latest seen 2026100706 | US Gov public |
| Google DeepMind | `https://deepmind.google.com/science/weatherlab/download/cyclones/OPER/ensemble/paired/atcf/OPER_YYYY_MM_DDTHH_00_atcf_a_deck.txt` | 50 (`F000`–`F049`) | 00/06/12/18Z. At 15:38Z the 06Z file existed and 12Z returned 404 | GDM Real-Time Experimental Data Terms |

Notes:
- The Google file is plain ATCF a-deck text with `#` comment header lines, all
  basins in one file (~1.3 MB). AL09 rows use the same basin/number as NHC
  (`AL, 09, 2026100706, 03, F000, ...`), so storm matching is by basin + number.
- No sign-in, no API key. URL pattern taken from the `weathernext-download`
  PyPI package (`cli.py`, `BASE_URL` + `filename_for`), then confirmed with
  live requests.
- NHC's public a-deck has no ECMWF ensemble (`UE*`) and no `EMXI` for AL09, so
  the existing "ECMWF ensemble" legend row is empty for live storms. Out of scope
  here; noted for Phase 2.
- `adeck.parse_adeck` keeps each tech's *own* latest cycle, so GEFS members can
  straddle two cycles while a cycle is partially posted. Density must use one
  cycle (see below).

## Google terms (read 2026-10-07; not legal advice)

Source: `https://storage.googleapis.com/weathernext-public/terms-of-use.pdf`,
which every Weather Lab file says the user agrees to by using it.

- Real-Time Experimental Data may be used internally, shared only with
  identified third parties under controlled distribution, or used to create a
  **Value Added Service (VAS)** (Section 2).
- Recoloring, reformatting, geometric transformation or subsetting counts as
  *unmodified* data (Section 3). Spaghetti lines are therefore not a VAS and
  cannot be published.
- A **Non-Retrievable VAS** (the data "cannot be retrieved or reverse
  engineered without significant technical effort") may be shared "including by
  publication" (Section 3). A banded density image built from at least 40
  buffered tracks is intended to be this (see the member minimum below).
- Publishing requires the citation in Section 4(b), verbatim (see UI below).
- **Open item for Jeff:** Section 4 ("Use Restrictions") forbids "making these
  available in a Restricted Country" (Japan, South Korea, Indonesia, Cuba, Iran,
  North Korea, Crimea, DNR/LNR) "unless otherwise agreed with Google in writing
  (email being sufficient)". A public page is reachable from those countries.
  Recommended: email weathernext@google.com for written agreement before the
  Google layer goes live. The build can proceed
  either way; the Google layer stays behind a config flag, with nothing Google uploaded, until
  this is settled. Geo-blocking the page is not sufficient, because the blob
  store is public.
- The file header and the PDF disagree on when data becomes CC BY 4.0 (48 h vs
  1 h). Forecast positions relate to future times, so the stricter terms apply
  regardless. The design does not rely on the CC BY switch.

## Design

Revised 2026-10-07 after Codex CLI review (verdict ACCEPT WITH CHANGES, seven
findings, all verified against the code and adopted; see "Review record").

### 1. What the layer measures (definitions)

- **Value shown:** the share of an ensemble's member tracks whose center passes
  within 100 km (60 mi) of a point during the window. It is a frequency across
  model runs, not a calibrated probability, and it says nothing about wind,
  surge or rain, which reach far beyond the center. Labels say so (section 3).
- **Eligible members:** members of the selected cycle that have a usable
  position at or before the window start (so they can be placed at the
  beginning of the window). A member whose track ends early (dissipation,
  absorption, end of output) counts as a non-pass for the rest of the window.
  Members are never silently dropped. Rows with junk positions (0N/0W) are
  skipped as `parse_adeck` already does.
- **Denominator:** eligible members. Expected members per ensemble are fixed
  constants (GEFS 30, Google OPER 50) and both numbers are shown ("28 of 30
  members").
- **Minimum to draw:** GEFS 24 of 30 (80%). Google 40 of 50 (80%). At 40+
  members one track contributes at most 2.5%, below the lowest drawn band
  (5%), so no single Google member is visible on its own. This is the main
  non-retrievability safeguard, alongside banding.
- **Window:** from the later of the storm's current advisory time and the
  cycle time, to cycle + 120 h. (A run newer than the advisory, which the map
  already draws, would otherwise have every member start after the window
  opens.) This is
  usually less than five days (advisories run 3 h after the cycle, and a
  12-hour-old cycle leaves 105 h). The label shows the actual end time, never
  "next 5 days".
- **Staleness:** a cycle is usable only if it is no more than 12 h behind the
  newest cycle seen for that ensemble and the window still has at least 24 h
  left. Otherwise no image (the same 12 h limit `adeck.MAX_STALENESS_HOURS`
  uses for drawn guidance).

### 2. Ingest (Python, `ingest/gulfwatch/`)

**Member extraction is separate from the display parser.** `parse_adeck`
keeps only each tech's latest cycle (`adeck.py:322-330`, `:376-377`) and emits
coordinates without forecast hours (`:434-440`), so a complete previous cycle
cannot be recovered from its output. A new function
`adeck.extract_members(text, tech_pattern) -> list[MemberRow]` reads the raw
rows before any filtering and returns `(cycle, tech, tau, lat, lon)`
records, deduplicating the repeated rows ATCF writes per wind radius (34/50/64
kt). GEFS uses `^AP\d{2}$` on the NHC deck text already downloaded this run.
Google uses `^F\d{3}$` on the Weather Lab file. Google rows never pass through
`parse_adeck` or `_model_meta`, so they cannot reach `models.geojson` (the
display whitelist excludes `F\d{3}` today, `adeck.py:127-139`).

New module `density.py`, pure functions, no I/O:

- `select_cycle(rows, expected, minimum, now) -> (cycle, members) | None`:
  groups by cycle, applies the staleness rule, and returns the newest cycle
  meeting the minimum, otherwise None.
- `strike_grid(members, start, end, radius_km=100) -> (counts, eligible,
  bounds)`:
  - Each track is interpolated (linear in lat/lon between ATCF points) to
    sample points no more than 10 km apart along the track, with exact
    interpolated points at `start` and `end`; earlier and later points are
    then dropped. With 100 km radius and 10 km sampling, the gap between
    a continuous buffer and the union of disks is under 0.2 km.
  - Grid: built in Web Mercator for placement as a MapLibre image source (as
    `ingest/scripts/build_goes_overlay.py:84-87` does). Mercator cell size is
    set so ground spacing at the window's mean latitude is about 10 km
    (Mercator size = 10 km / cos(lat)). Bounds are the windowed tracks'
    lat/lon box expanded geodesically by the radius (pyproj `Geod.fwd`), then
    projected, not padded with 100,000 Mercator meters.
  - Distances are great-circle (haversine) from each cell center's lat/lon.
  - One Boolean mask per member (cell within radius of any sample point),
    summed into counts. Fraction = counts / eligible.
- `render_png(fraction) -> bytes`: bands 5–10, 10–20, ..., 80–90, 90+%,
  transparent below 5%, RGBA PNG via Pillow, light blue → blue → green →
  yellow → orange → red (final colors reviewed with Jeff).

New module `weatherlab.py`:

- `cycle_candidates(now)`: the newest four 6-hourly cycles at or before `now`.
- `fetch_google_members(storm, fetch, now)`: tries candidates newest first and
  keeps going past a file that is missing (404) or has fewer than the minimum
  usable members for the storm, returning the first that qualifies, in memory
  only. Never writes or prints rows.
- **Errors from this module are allowlisted codes**, never exception text or
  response bodies: `google_unavailable`, `google_no_storm`,
  `google_too_few_members`, `google_parse_failed`, `google_render_failed`.
  The pipeline records only the code. A malformed row raises inside the
  conversion helpers (`adeck.py:156`, `:387-388`), and `str(exc)` of that
  would quote input; the Google path catches it and maps it to
  `google_parse_failed`.

`pipeline.py`, new `_process_density` inside `_process_storm`, after
`_process_adeck`:

- **Rebuild identity** per ensemble = (cycle, advisory time, input
  fingerprint). The fingerprint is a SHA-256 over the selected members'
  sorted `(tech, tau, lat, lon)` rows, so members or forecast hours that
  arrive later in the same cycle trigger a rebuild. The fingerprint is
  computed after selection and stored in `state.json`. It is a hash, from which
  rows cannot be recovered; state is public, so nothing else about Google rows
  is stored there.
- Image path: `storms/{id}/density-{ensemble}-{cycle}-{advisoryStamp}-{fp8}.png`
  (first 8 hex characters of the fingerprint). Every rebuild is a new URL.
- State records the identity **only after the upload succeeds**. A failed or
  missing upload is retried next run. Versioned with a new
  `_DENSITY_STATE_VERSION`, mirroring the `_GIS_STATE_VERSION` fix for
  poisoned records.
- Manifest storm entry gains, only for images that landed and still pass the
  staleness rule:
  `density: { gefs?: {image, bounds, cycle, members, expected, radiusKm, start, end}, google?: {...} }`.
- **Google release gate:** env `GOOGLE_DENSITY_ENABLED`, default off. When off:
  no Google fetch, no Google upload, and **no Google entry in the manifest even
  if state has one** (advertisement is gated, not just fetching). Turning it
  off cannot revoke an already-public blob URL, so the gate stays off until the
  Restricted Country item is resolved, and nothing Google is uploaded before
  then. Geo-blocking the page would not protect the blob store, so it is not an
  option; written agreement from Google is.
- Google is fetched on every hourly run while an Atlantic storm is active:
  newest candidate cycle first (usually a 404 until posted), then older ones
  until one qualifies. The raw members cannot be cached between runs (every
  store here is public), and re-reading the file each run is what lets the
  fingerprint catch late members for Google as well as GEFS. Cost is about
  1–2 requests and ~1.3–2.6 MB per run, roughly 30–50 MB a day during a
  storm. An image is only re-rendered and uploaded when the identity changes.
  No retry-with-sleep on these requests (a 404 is the normal "not posted
  yet" answer).
- GEFS errors are recorded as `{id}.density.gefs` with the existing pattern
  (NHC data, public domain). Google errors as `{id}.density.google` with only an
  allowlisted code.

No new Python dependencies: numpy, pyproj and Pillow are already in
`ingest/requirements.txt` for the satellite overlay.

### 3. Front end

- `types.ts`: `Manifest` storm entry gains the optional `density` object.
- `useDashboard.tsx`: resolve density image URLs the way `satellite` is
  resolved (`useDashboard.tsx:349-350`, `stormFileUrl`), and exclude
  `*.density.*` products from the public "Latest ingest was incomplete" list
  (`:409-411`), as `aifs` already is. A missing density layer greys out its
  option instead.
- `layers.ts`: density is not a boolean, so it gets its own state and setter
  (`densitySource: "off" | "gefs" | "google"`, default `"off"`), not a new
  key for the boolean toggle at `layers.ts:78-79`.
- `StormMap.tsx`: one MapLibre `image` source + `raster` layer, swapped by URL
  when the selection changes, inserted below the cone, model lines and storm
  icon, above the basemap and satellite. Opacity about 0.75 (radar uses 0.75).
- `ModelLegend.tsx`: the "Track density" control (Off / GFS ensemble /
  Google AI ensemble) sits **outside** the `ensemble.length > 0` block
  (`ModelLegend.tsx:189`). Google density exists without any Google
  spaghetti, and GEFS density should not depend on spaghetti being listed.
  Choosing "Official forecast" (`:107-109`) also sets density to Off, so
  that button keeps meaning "official forecast only". Options without an
  image are disabled with "not available for this storm".
- Legend, horizontal color bar 5% → 90%+:
  "Share of GFS ensemble tracks whose center passes within 60 miles
  (100 km), 4 PM Tue through 1 PM Sun. 28 of 30 members, 06Z Oct 7 run. Shows
  where the storm's center may go, not where wind, surge or rain will reach."
  Times in CT via the page's existing `cdtDateTime`.
- When the Google layer is on, a source line under the map with Google's
  required citation, verbatim from Section 4(b): "Google Weather Lab. © 2024-6
  Google LLC, whose machine learning models were used to create the experimental
  data made available under the following licence terms
  https://storage.googleapis.com/weathernext-public/terms-of-use.pdf. This data
  is intended for experimental modelling only and is not intended, validated, or
  approved for real world use."
- Demo modes (`?demo=ida`, `?demo=quiet`): no density fixtures; both options
  disabled. (Weather Lab's OPER coverage starts 2025-06-12, after Ida.)

### 4. Error handling

| Situation | Behavior |
|---|---|
| Newest Google candidate 404 or below minimum | Try older candidates; no error unless none qualify (`google_unavailable` / `google_too_few_members`) |
| Google has no rows for this storm | `google_no_storm`; option disabled |
| Below minimum members in every usable cycle | No image; option disabled |
| Cycle stale or window < 24 h | No image; carried-forward entry dropped from manifest |
| PNG upload fails | Not advertised; identity not saved; retried next run |
| `GOOGLE_DENSITY_ENABLED` off | No fetch, no upload, no manifest entry |
| Density error in manifest | Not shown in the public issues list; option disabled |

### 5. Testing

- `ingest/tests/test_density.py`:
  - **`AH-Datalytics/fpa-lens` is a PUBLIC repo** (see CLAUDE.md), so
    committing real-time Google rows would publish raw data. GEFS fixture: AL09
    rows trimmed from today's NHC deck (public domain). Google fixture:
    synthetic rows in the Weather Lab ATCF format, header lines included so the
    comment-skipping is tested. No real Google rows in the repo.
  - One straight synthetic track: 100% within 100 km of its line, 0% at 150 km.
  - Two members on opposite sides: 50% where only one passes.
  - A member ending early counts as a non-pass afterwards (denominator
    unchanged).
  - Mixed cycles: the newest cycle meeting the minimum is used; an older
    complete cycle wins over a newer partial one.
  - Window start/end interpolation: points before the advisory are excluded,
    and a pass that only happens between two ATCF points is still caught.
  - Grid spacing ≈ 10 km on the ground at 25N; geodesic bounds contain every
    cell within 100 km of every sample point.
  - Wind-radius duplicate rows don't double-count.
- `test_pipeline.py`:
  - Density appears in the manifest only after upload; a failed upload is
    retried; identity is saved only on success.
  - A new member or forecast hour within the same cycle and advisory rebuilds.
  - A Google failure doesn't block GEFS density or any other product.
  - With `GOOGLE_DENSITY_ENABLED` off and a Google entry in prior state, the
    manifest has no Google density.
- **Leak tests** (fake store, synthetic Google fixture with distinctive
  coordinates and techs, including malformed rows and forced fetch, parse and
  render failures): assert that no stored object (manifest, `state.json`,
  every JSON product) and no `manifest.errors` entry contains a Google
  coordinate, row fragment or `F\d{3}` tech, and that captured stdout and
  stderr don't either (Actions logs on a public repo are public). The PNG is
  the only Google-derived object.

### 6. Front-end and browser checks

- Front end: `layers.test.ts` for the new density state default and setter. The repo has no
  component-test setup, so the control and legend are verified in a browser.
- Browser: run the page against Isaias (or the latest live storm) and compare to
  polarwx's GEFS density for the same cycle. Local dev does not run on this
  ARM64 machine with native Node (no `@libsql/win32-arm64-msvc`). First attempt:
  x64 Node under Windows' emulation with a fresh x64 `npm install` in the
  worktree. Fallback: a Vercel preview of the branch, pushed only with Jeff's
  go-ahead.

## Risks

- **Retrievability judgment.** "Non-Retrievable" is Google's term, not ours to
  certify. Mitigations: 10% bands, a 40-member minimum so no single track is
  visible, and no per-member data published anywhere. If Google says otherwise, the Google option is removed with the
  config flag; GEFS density is unaffected.
- **Google URL is undocumented.** It comes from a third-party package and could
  change. Failure mode is a disabled option, not a broken page.
- **Hourly job budget.** Two grids per storm per rebuild. A 10 km grid over a
  ~3,000 km box is ~90k cells × ≤50 members × ~120 hourly points; vectorized in
  numpy this is seconds. Measure in the plan.
- **Merge conflicts with Ben**, who edited `TropicalWeatherContent.tsx` and the
  tropical ingest on 2026-10-06/07. Keep front-end changes to `StormMap.tsx`,
  `ModelLegend.tsx`, `layers.ts`, `types.ts` where possible and rebase before
  any push.

## Review record (Codex CLI, 2026-10-07)

Verdict ACCEPT WITH CHANGES. Findings and resolution:
1. Display parser discards older cycles and taus → separate `extract_members`
   before filtering; Google search continues past unqualified files. Adopted.
2. Rebuild identity incomplete, filename omitted advisory → identity = cycle +
   advisory + input fingerprint, all in the URL; save identity only after
   upload. Adopted.
3. Denominator and labels → definitions in section 1; label says "share of
   tracks", shows real end time and member counts, and separates center
   passage from wind/flood risk; staleness rule. Adopted.
4. Exception text could publish Google input → allowlisted error codes;
   Google rows never enter the display parser; leak tests cover errors,
   state, malformed input and failures. Adopted.
5. Kill switch gated only fetching; 10-member bands expose single tracks →
   advertisement gated too, nothing Google uploaded before the terms item is
   resolved; Google minimum 40 of 50 so one track (2.5%) is below the lowest
   band. Adopted.
6. Geometry → 10 km ground spacing via cos(lat), geodesic bounds, ≤10 km
   along-track sampling with exact window endpoints. Adopted.
7. Front-end wiring → URL resolution in `useDashboard`, dedicated setter,
   control outside the spaghetti gate, "Official forecast" clears density,
   density errors kept out of the public issues list. Adopted.
