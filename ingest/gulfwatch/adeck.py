"""ATCF a-deck (model guidance) parser for Gulf Watch.

Parses ATCF a-deck text (as fetched from
https://ftp.nhc.noaa.gov/atcf/aid_public/a{stormid}.dat.gz and decompressed,
or from the historical https://ftp.nhc.noaa.gov/atcf/archive/{year}/
aal{stormid}.dat.gz archive) into the models.geojson / intensity.json shapes
used by the ingest pipeline.

Pure function, no network I/O.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone

KT_TO_MPH = 1.15078

# How far behind the dominant cycle a model's own latest run may be before its
# guidance is refused outright (track AND intensity series).
#
# This is the BACKSTOP to track clipping, not the primary fix. Clipping (see
# _clip_track) makes a stale run start at the storm rather than behind it, but
# it cannot make an old initialisation current: NAVGEM 18h behind was drawing a
# line halfway across the basin from where the storm actually was, and even
# clipped, its remaining forecast came off a run three cycles old.
#
# 12 hours, NOT one 6-hourly cycle. ECMWF/EMXI posts at 00z/12z only, so the
# moment the dominant cycle advances to 00z (before ECMWF's own 00z run lands)
# ECMWF legitimately sits a full 12h back -- a 6h cap would drop the single most
# useful model in the file roughly half the time. 12h keeps every model that is
# merely on a slower schedule and refuses only genuinely stale runs (NAVGEM at
# -18h in the 2026081218 Cristobal deck).
#
# Applies only to models BEHIND the dominant cycle. Models AHEAD of the advisory
# are deliberately kept -- newer guidance is useful, and that is the controller's
# explicit call (see the modelCycle "dominant, not max()" note in pipeline.py).
MAX_STALENESS_HOURS = 12

# Named model whitelist: ATCF tech code -> (display label, kind, group).
#
# `kind` matches the models.geojson / intensity.json contract:
# "physics" | "ai" | "consensus" | "official" (unchanged meaning -- drives
# solid-vs-dashed line style and the intensity panel's category-guidance
# styling).
#
# `group` is the newer, coarser grouping used by the frontend's unified
# legend/layers control: "official" | "deterministic" | "consensus" |
# "ensemble". Every NAMED model below is either official/deterministic/
# consensus; "ensemble" is reserved for the dynamically-recognized GEFS/
# ECMWF ensemble-member codes (see _ensemble_meta below) and is never a
# value in this dict.
#
# Round 2 (v2 addendum) expanded this from the original 6 map-drawn models
# (AVNO/EMXI/HFSA/HFSB/EGRR/TVCA) to the full quality set: those 6 remain
# (current, 2026-era ATCF codes), plus 2021-era equivalents actually present
# in the Hurricane Ida archive deck (CMC/CMCI, NVGM, CTCX/COTC, HMON, HWRF,
# EGRI) and additional consensus aids (TVCN, GFEX, HCCA, IVCN).
MODELS = {
    "OFCL": ("Official", "official", "official"),
    # Original 6 (current-era codes; drawn on the map today).
    "AVNO": ("GFS", "physics", "deterministic"),
    "EMXI": ("ECMWF", "physics", "deterministic"),
    "HFSA": ("HAFS-A", "physics", "deterministic"),
    "HFSB": ("HAFS-B", "physics", "deterministic"),
    "EGRR": ("UKMET", "physics", "deterministic"),
    "TVCA": ("Consensus", "consensus", "consensus"),
    # Additional major deterministic aids -- codes actually present in the
    # Hurricane Ida (al092021) archive a-deck; several are era-specific
    # (HWRF/HMON were the operational regional hurricane models in 2021,
    # ahead of HAFS-A/B's 2023 debut) or interpolated siblings of a model
    # above (CMCI/EGRI/COTC fill in the standard synoptic taus between that
    # model's native, sparser output times).
    "CMC": ("CMC", "physics", "deterministic"),
    "CMCI": ("CMC (interpolated)", "physics", "deterministic"),
    "NVGM": ("NAVGEM", "physics", "deterministic"),
    "CTCX": ("COAMPS-TC", "physics", "deterministic"),
    "COTC": ("COAMPS-TC (interpolated)", "physics", "deterministic"),
    "HMON": ("HMON", "physics", "deterministic"),
    "HWRF": ("HWRF", "physics", "deterministic"),
    "EGRI": ("UKMET (interpolated)", "physics", "deterministic"),
    # AI/ML guidance. NHC's model summary table lists Google's models under
    # GDMN/GDMI (DeepMind), GENC/GENI (GenCast) and GRPH/GRPI (GraphCast); only
    # GDM* was present in every a-deck sampled (2026-08-10: AL01, AL02, EP06,
    # EP07), where GDMN matched GFS/AVNO cycle-for-cycle and tau-for-tau, so it
    # is the one worth drawing. GDMI is its interpolated sibling and GDM2 a
    # sparse variant (1-2 cycles); both left out until asked for.
    #
    # Classified group "deterministic" DESPITE being an ensemble mean, because
    # that is the group the frontend actually renders a toggle for -- see
    # ModelLegend, which lists only "deterministic" and "ensemble" rows, and
    # mapStyle.resolveGroup's documented contract that kind "ai" maps to group
    # "deterministic". Filing it as "consensus" (where GFEX, the GFS ensemble
    # mean, sits) would draw the track but leave it with no way to turn it off.
    # kind "ai" is what earns it the dashed AI-guidance line style.
    "GDMN": ("Google DeepMind Ensemble Mean", "ai", "deterministic"),
    # Consensus aids (beyond TVCA above).
    "TVCN": ("TVCN Consensus", "consensus", "consensus"),
    "GFEX": ("GFS Ensemble Mean", "consensus", "consensus"),
    "HCCA": ("HFIP Corrected Consensus", "consensus", "consensus"),
    "IVCN": ("Intensity Consensus", "consensus", "consensus"),
    # Intensity-guidance-only statistical aids (see INTENSITY_ONLY below).
    "DSHP": ("SHIPS", "physics", "deterministic"),
    "LGEM": ("LGEM", "physics", "deterministic"),
}

# Intensity-guidance-only models: included in intensity.json but never drawn
# as a track on the map (excluded from models_geojson).
#
# IVCN (Intensity Consensus) structurally carries no position of its own in
# ATCF -- every row's lat/lon is the null "0N"/"0W" placeholder (confirmed
# against the real Ida archive deck) -- so it belongs here alongside
# DSHP/LGEM (which DO carry a valid mirrored position but are excluded from
# the map by choice). See the lat/lon==0 handling in parse_adeck below for
# why IVCN needs an additional carve-out that DSHP/LGEM don't.
INTENSITY_ONLY = {"DSHP", "LGEM", "IVCN"}

# GEFS ensemble members (AP01..AP30/31) and ECMWF ensemble members (UE00..)
# are not individually named above -- there can be ~30-50 of them and the
# exact count/numbering varies run to run. They're recognized dynamically by
# ATCF tech-code pattern instead, always placed in the "ensemble" group/kind,
# with a generic per-member label. Ensemble members get a map track (full
# spaghetti) but are deliberately excluded from intensity.json (an intensity
# chart with 30+ extra lines would be unreadable clutter, and there's no
# individual per-member toggle in the UI to isolate one anyway -- the
# legend's ensemble row is a single group checkbox).
_GEFS_ENSEMBLE_RE = re.compile(r"^AP\d{2}$")
_ECMWF_ENSEMBLE_RE = re.compile(r"^UE\d{2}$")


def _ensemble_meta(tech: str) -> tuple[str, str, str] | None:
    """Returns (label, kind, group) for a dynamically-recognized ensemble
    member tech code, or None if `tech` doesn't match either ensemble
    family's pattern."""
    if _GEFS_ENSEMBLE_RE.match(tech):
        return (f"GEFS {tech[2:]}", "ensemble", "ensemble")
    if _ECMWF_ENSEMBLE_RE.match(tech):
        return (f"ECMWF Ens {tech[2:]}", "ensemble", "ensemble")
    return None


def _model_meta(tech: str) -> tuple[str, str, str] | None:
    """Returns (label, kind, group) for any whitelisted tech -- named
    (MODELS) or ensemble-pattern -- or None if `tech` isn't recognized at
    all (the original a-deck-wide skip-unknown-tech behavior)."""
    if tech in MODELS:
        return MODELS[tech]
    return _ensemble_meta(tech)


def _decode_coord(raw: str) -> float:
    """Decode an ATCF lat/lon field (e.g. '265N', '0897W') to signed degrees.

    Values are tenths of a degree; N/E are positive, S/W are negative.
    """
    value = float(raw[:-1]) / 10 * (-1 if raw[-1] in "WS" else 1)
    return round(value, 1)


def _parse_cycle(cycle: str) -> datetime | None:
    """Decode an ATCF cycle stamp ('YYYYMMDDHH') to an aware UTC datetime, or
    None if it isn't one. None disables the time-based logic (clipping,
    staleness) for that model rather than raising -- a malformed cycle should
    cost one model's refinement, not the whole storm's guidance."""
    try:
        return datetime.strptime(cycle, "%Y%m%d%H").replace(tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return None


def _parse_reference_time(value: str | None) -> datetime | None:
    """Decode the caller's reference time (ISO 8601 UTC, e.g.
    '2026-08-12T21:00:00Z' -- Storm.advisory_time's format) to an aware UTC
    datetime. None/unparseable means "don't clip", which degrades to the
    pre-clipping behaviour instead of failing the a-deck product."""
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (AttributeError, TypeError, ValueError):
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _clip_track(
    points: dict[int, list],
    cycle_dt: datetime | None,
    reference_dt: datetime | None,
) -> list[list]:
    """Drop the already-elapsed leg of one model's track.

    `points` is {tau: [lon, lat]} for a single model, `cycle_dt` that model's
    OWN initialisation time, and `reference_dt` the moment the track should
    begin (the advisory's issuance time -- i.e. the time the storm icon on the
    map represents).

    Why this exists: tau is hours from each model's own cycle, and the cycles
    are not aligned with each other or with the advisory. Models initialise on
    the synoptic grid (00/06/12/18z) while advisories are issued at 03/09/15/21z,
    so even a perfectly current model's tau=0 point sits ~3h -- about a degree --
    behind the plotted storm. A run a cycle or two old starts further back still,
    which is what put spaghetti west of the cone on the live map.

    Every point still in the future is kept unchanged. Where the reference time
    falls BETWEEN two forecast points, a position is linearly interpolated at
    exactly that time and prepended, so the line starts at the storm instead of
    jumping forward to the model's next available tau -- which matters most for
    the sparse-output models (12- or 24-hourly beyond tau 72), where that jump
    would be the largest.

    Returns the ordered coordinate list. An empty list means the whole run is
    already in the past (nothing left to draw). Clipping is skipped entirely
    when either time is unknown.
    """
    taus = sorted(points)
    if cycle_dt is None or reference_dt is None:
        return [points[tau] for tau in taus]

    # Hours from this model's own cycle to the reference time. Negative when the
    # model initialised AFTER the advisory (guidance newer than the advisory),
    # in which case nothing has elapsed and the run is drawn whole.
    reference_tau = (reference_dt - cycle_dt).total_seconds() / 3600.0

    future = [tau for tau in taus if tau >= reference_tau]
    if len(future) == len(taus):
        return [points[tau] for tau in taus]
    if not future:
        return []

    coords = [points[tau] for tau in future]
    first = future[0]
    if first > reference_tau:
        previous = max(tau for tau in taus if tau < reference_tau)
        fraction = (reference_tau - previous) / (first - previous)
        start_lon, start_lat = points[previous]
        end_lon, end_lat = points[first]
        # 2dp: the source is tenths of a degree, so rounding the interpolated
        # point back to 1dp could snap it onto the elapsed point we just
        # dropped, reintroducing the offset this is here to remove.
        coords.insert(0, [
            round(start_lon + (end_lon - start_lon) * fraction, 2),
            round(start_lat + (end_lat - start_lat) * fraction, 2),
        ])
    return coords


def parse_adeck(text: str, reference_time: str | None = None) -> dict:
    """Parse ATCF a-deck text into the models.geojson + intensity.json shapes.

    `reference_time` (ISO 8601 UTC -- pass the storm's advisory issuance time)
    is the moment every drawn track should begin. Given it, each model's
    already-elapsed leg is clipped off and a position interpolated at exactly
    that time (see _clip_track), so tracks start at the storm rather than
    trailing behind it. Omitted, tracks are emitted whole, as before.

    Independently, guidance whose own cycle is more than MAX_STALENESS_HOURS
    behind the dominant cycle is refused outright -- dropped from both the map
    and the intensity series, and reported in the returned "dropped_stale" list.
    Models AHEAD of the advisory are always kept.

    Each whitelisted model (named in MODELS, or a dynamically-recognized
    GEFS/ECMWF ensemble member -- see _model_meta) is filtered independently
    to its own latest cycle (YYYYMMDDHH) present in the file -- NOT a single
    file-wide latest cycle. Models run on different schedules (e.g.
    GFS/AVNO every 6h vs. ECMWF/EMXI only at 00z/12z), so a global-latest
    filter would silently drop a model entirely whenever some other model
    has a newer run in the file. The top-level "cycle" (and intensity.json's
    "cycle") reflect the cycle most of those models are on -- see below.

    Within each model's own latest cycle, per (tech, tau) duplicate rows
    (one per wind-radii threshold) are deduped, keeping the first. Rows with
    lat or lon of 0 are dropped entirely (junk/null position) UNLESS the
    tech is in INTENSITY_ONLY, where an all-zero position is the normal,
    structural case for a track-less intensity aid (IVCN) rather than junk.
    Rows with a missing OR malformed (non-numeric, non-blank -- e.g. a
    placeholder like "****") vmax field are also dropped entirely; rows with
    a present, well-formed but non-positive vmax keep their track point but
    are excluded from the intensity series.

    Ensemble-member techs (GEFS AP##/ECMWF UE##) contribute a map track like
    any other whitelisted model, but are excluded from intensity.json
    entirely (see _ensemble_meta's docstring above).

    Returns:
        {"models_geojson": <FeatureCollection dict>,
         "intensity": <intensity.json dict>,
         "cycle": "YYYYMMDDHH",
         "dropped_stale": [<tech>, ...],
         "dropped_elapsed": [<tech>, ...]}

    The two dropped_* lists exist so that guidance disappearing from the map is
    never silent. They are disjoint and mean different things: "stale" was
    refused by the cap, "elapsed" had every forecast hour already in the past by
    `reference_time` (which is also the only thing that catches an a-deck where
    ALL models are old -- the cap measures models against the dominant cycle, so
    it cannot see a wholesale stale file).
    """
    rows = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        fields = [f.strip() for f in line.split(",")]
        if len(fields) < 9:
            continue
        rows.append(fields)

    # Each whitelisted model's own latest cycle, independent of other models.
    latest_cycle_by_model: dict[str, str] = {}
    for fields in rows:
        tech = fields[4].upper()
        if _model_meta(tech) is None:
            continue
        cycle = fields[2]
        if tech not in latest_cycle_by_model or cycle > latest_cycle_by_model[tech]:
            latest_cycle_by_model[tech] = cycle

    # Top-level cycle: the cycle MOST of the drawn guidance is on, not the
    # newest one present. Taking the max let a couple of consensus aids that
    # post early set the headline: with 39 of 43 tracks on 18Z and only HCCA
    # and TVCN on 00Z, the panel advertised "guidance cycle 00Z" for a spread
    # that was overwhelmingly 18Z -- a label describing nothing on the map.
    # Ties break to the newer cycle. Models genuinely ahead of the advisory
    # are still drawn; they just no longer speak for the whole set.
    newest_cycle = None
    if latest_cycle_by_model:
        counts: dict[str, int] = {}
        for cycle_value in latest_cycle_by_model.values():
            counts[cycle_value] = counts.get(cycle_value, 0) + 1
        newest_cycle = max(counts, key=lambda c: (counts[c], c))

    # Refuse guidance too far behind the dominant cycle (see
    # MAX_STALENESS_HOURS). Done here, after the dominant cycle is known but
    # before any row is read, so a refused model contributes to neither the map
    # nor the intensity chart. Dropping only models BEHIND the dominant cannot
    # change which cycle is dominant, so newest_cycle stands.
    dropped_stale: list[str] = []
    dominant_dt = _parse_cycle(newest_cycle) if newest_cycle else None
    if dominant_dt is not None:
        for tech, cycle_value in sorted(latest_cycle_by_model.items()):
            cycle_dt = _parse_cycle(cycle_value)
            if cycle_dt is None:
                continue
            hours_behind = (dominant_dt - cycle_dt).total_seconds() / 3600.0
            if hours_behind > MAX_STALENESS_HOURS:
                dropped_stale.append(tech)
                del latest_cycle_by_model[tech]

    reference_dt = _parse_reference_time(reference_time)

    # tech -> {tau: [lon, lat]}
    track_points: dict[str, dict[int, list]] = {}
    # tech -> {tau: mph}
    intensity_points: dict[str, dict[int, int]] = {}

    for fields in rows:
        tech = fields[4].upper()
        if _model_meta(tech) is None:
            continue
        if tech not in latest_cycle_by_model:
            continue  # refused as stale above
        if fields[2] != latest_cycle_by_model[tech]:
            continue

        tau_str, lat_str, lon_str, vmax_str = fields[5], fields[6], fields[7], fields[8]
        if not tau_str or not lat_str or not lon_str:
            continue
        try:
            tau = int(tau_str)
        except ValueError:
            continue

        lat = _decode_coord(lat_str)
        lon = _decode_coord(lon_str)
        if tech not in INTENSITY_ONLY and (lat == 0 or lon == 0):
            continue  # junk/null position

        if vmax_str == "":
            continue  # vmax missing entirely: whole row is unusable

        try:
            vmax_kt = int(vmax_str)
        except ValueError:
            continue  # malformed vmax (non-numeric, non-blank): skip row, don't kill the storm

        tech_track = track_points.setdefault(tech, {})
        if tau not in tech_track:
            tech_track[tau] = [lon, lat]

        if vmax_kt > 0:
            tech_intensity = intensity_points.setdefault(tech, {})
            if tau not in tech_intensity:
                tech_intensity[tau] = round(vmax_kt * KT_TO_MPH)

    features = []
    series = []
    dropped_elapsed: list[str] = []
    for tech in latest_cycle_by_model:
        label, kind, group = _model_meta(tech)  # type: ignore[misc]

        pts = track_points.get(tech)
        if pts and tech not in INTENSITY_ONLY:
            coords = _clip_track(pts, _parse_cycle(latest_cycle_by_model[tech]), reference_dt)
            if not coords:
                dropped_elapsed.append(tech)
        else:
            coords = []
        # Clipping can leave nothing at all -- a run whose every forecast hour
        # is already in the past. That model contributes no track (and so no row
        # in the model picker, which derives from what is actually DRAWN).
        #
        # A single surviving point still emits a one-coordinate LineString,
        # which is invalid GeoJSON and draws nothing. That predates clipping
        # (any model with one usable row did it -- see
        # test_missing_vmax_skips_entire_row, which asserts it) so it is left
        # alone here rather than changed as a side effect of this fix.
        if coords:
            features.append({
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": coords},
                "properties": {
                    "model": tech,
                    "label": label,
                    "kind": kind,
                    "group": group,
                    "cycle": latest_cycle_by_model[tech],
                },
            })

        # Ensemble members are excluded from the intensity series entirely
        # (see _ensemble_meta's docstring) -- only named MODELS contribute.
        if tech in MODELS:
            ipts = intensity_points.get(tech)
            if ipts:
                points = [{"tauH": t, "mph": ipts[t]} for t in sorted(ipts)]
                series.append({
                    "model": tech,
                    "label": label,
                    "kind": kind,
                    "points": points,
                })

    return {
        "models_geojson": {"type": "FeatureCollection", "features": features},
        "intensity": {"cycle": newest_cycle, "series": series},
        "cycle": newest_cycle,
        "dropped_stale": dropped_stale,
        "dropped_elapsed": sorted(dropped_elapsed),
    }
