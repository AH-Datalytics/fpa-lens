# Automated SITREP → siteData roll

Date: 2026-06-16
Branch: `feature/automate-sitedata-roll`

## Problem

The weekly SharePoint refresh pipeline (`scripts/refresh-data.mjs`, run by
`.github/workflows/refresh-data.yml`) pulls each source file and runs an
extractor that writes a JSON file in `public/data/`. The SITREP extractor
(`extractSitrep.mjs`) parses the monthly Regional Director SITREP into
`public/data/sitrep.json`.

`sitrep.json` is consumed by exactly one runtime surface: the "Current
Maintenance Work" card on `/engineering`. The footer, home System Readiness
card, homepage KPIs, the inspection readiness cards, and the capital-projects
list all read from `src/data/siteData.ts` — a hand-curated TypeScript file that
no extractor writes to. So a new SITREP rolls the maintenance card and the turf
data automatically, but the rest of the site (the footer "Data last updated"
date, readiness colors, permit counts, capital projects, inspection status)
stays on the prior month until someone edits `siteData.ts` by hand. That manual
step is the gap this project closes.

## Goals

- A new monthly SITREP automatically rolls the SITREP-derived fields of
  `siteData.ts` to the new month, with no human edit and no review gate, on the
  same Friday cadence and deploy path as the rest of the data pipeline.
- The automation is defensive: a missing, malformed, or older SITREP can never
  regress the live dashboard or publish a blank value.
- Running the automation against the current June 2026 `sitrep.json` reproduces
  the manual June roll already shipped on `main` (the regression anchor).

## Non-goals

- No human review gate / draft PR. The user chose fully automatic (consistent
  with how turf and finance data already deploy).
- No change to the SharePoint fetch layer, the CI schedule, or the other
  extractors.
- Fields owned by a dedicated, more granular pipeline (staffing headcount and
  vacancy count) are not driven by the SITREP. See Conflict policy.

## Architecture

Runtime overlay, mirroring the existing `applyTurfCycles` pattern in
`src/data/grassCutting.ts` (which overlays `turfCycles.json` onto a curated
baseline only when the JSON's reporting month is newer).

```
SharePoint SITREP .docx
   │  existing Friday GitHub Action (unchanged)
   ▼
extractSitrep.mjs  ──(extended schema)──►  public/data/sitrep.json
   │  existing: bot commits + Vercel deploys (unchanged)
   ▼
siteData.ts  ──reads──►  applySitrep(rawBaselines, sitrep.json)
   │  overlays SITREP-derived fields onto the curated baseline
   ▼
footer / readiness / KPIs / capital projects / inspections render the new month
```

No new CI step. The weekly Action already produces, commits, and deploys
`sitrep.json`; the overlay makes `siteData` consume it.

## Components

### 1. Extended SITREP extractor schema (`scripts/extractSitrep.mjs`)

Add an `inspections` object to the structured-output schema, capturing what the
SITREP states about each inspection program. Keep the existing system rule:
extract only explicitly stated facts; null/absent otherwise.

```
inspections: {
  cpra:   { status, note },
  usace:  { status, note },
  valves: { status, completed, total, note },
}
```

- `status`: one of `"complete" | "on-track" | "behind" | "not-reported"`.
  Narrative such as "nearing completion" → `on-track`; "complete with no
  significant findings" → `complete`; silence → `not-reported`.
- `completed` / `total`: integers when the SITREP states a count (e.g.
  "84 of 105 valves"); null otherwise.
- `note`: short verbatim-ish phrase for display, or null.

Status → `percentComplete` mapping used downstream (drives the existing on-pace
grading; explicit `completed`/`total` counts take precedence over status):
`complete` → 100%; `on-track` → the report-date expected % (sits on the pace
line); `behind` → a set fraction below expected; `not-reported` → the
report-date expected % (on pace, i.e. unmentioned = business as usual).

### 2. Overlay module (`src/data/sitrepOverlay.ts`, consumed by `siteData.ts`)

Pure functions, one per affected export, each taking the curated baseline plus
the parsed `sitrep.json` and returning the overlaid value. `siteData.ts` renames
its current SITREP-derived consts to `raw<Name>` and wraps each export:

```ts
export const readinessMetrics = overlayReadinessMetrics(rawReadinessMetrics, sitrep);
export const systemReadiness  = overlaySystemReadiness(rawSystemReadiness, sitrep);
// ...etc
```

Export names are unchanged, so no consumer (page/component) changes.

Fields overlaid:

| Target | Source in `sitrep.json` | Notes |
| --- | --- | --- |
| `readinessMetrics.dataAsOf` | `reportMonth` → first of month | drives footer + all month labels |
| `systemReadiness.categories[].status` + `.source` | `readiness.{infrastructure,staffing,financial,media}` | staffing **color** only |
| `kpiMetrics.systemReadiness` (value, source) | `readiness` overall + `reportMonth` | |
| `kpiMetrics.permitsIssued` (label, value, source) | `permits.{issued,period}` | label → "Permits Issued (<month>)" |
| `operationsData.permitsIssued[]` | `permits` | append/replace the latest-month entry |
| `financialData.capitalProjects` | `projects[]` | name + status text → status enum + description |
| `readinessMetrics.cpraQuarterlyInspection.percentComplete` | `inspections.cpra` | sets percent; on-pace grading unchanged (see §3) |
| `readinessMetrics.usaceSemiAnnualInspection.percentComplete` | `inspections.usace` | sets percent; on-pace grading unchanged (see §3) |
| `readinessMetrics.valveExercises` (percent, completed, total) | `inspections.valves` | sets percent; real count shown when present |

Fields **not** overlaid (stay curated): staffing vacancy count, staff headcount
(`kpiMetrics.staffCount`), PCCP repair detail (`operationsData.pccpRepairStatus`),
infrastructure asset counts. See Conflict policy.

### 3. Inspection cards stay on-pace (pace-bar), fed by the SITREP

The CPRA / USACE / valve cards keep their current "% on pace" pace-bar grading
unchanged (actual vs straight-line expected for the report date, Green >= 90 /
Amber >= 80 / Red < 80). The card UI is untouched. The only change is where each
inspection's `percentComplete` comes from: instead of a hand-curated number, the
overlay sets it from the SITREP each month, so it rolls in lockstep with
`dataAsOf` and is never stale. The flip bug fixed in the manual June roll
happened only because the percentage and the date moved independently; here they
are recomputed from the same SITREP, so they cannot drift apart.

`percentComplete` derivation per inspection:

| SITREP signal | `percentComplete` used | resulting card |
| --- | --- | --- |
| explicit count (e.g. valve 84/105) | the real percent (80%) | graded on pace |
| status `complete` | 100% | Green |
| status `on-track` ("nearing completion") | report-date expected % (on the pace line) | Green (on pace) |
| status `behind` | a set fraction below expected | Amber/Red |
| status `not-reported` | report-date expected % (on pace) | Green; unmentioned = business as usual |

Anchoring narrative-only items to the report-date expected percentage makes the
bar read honestly as "on pace" without fabricating an arbitrary number, and it
cannot go stale relative to `dataAsOf` because both derive from the same SITREP.
Hurricane/River gate seasonality (date-window driven, not percentage-graded) is
unchanged.

This touches the overlay plus the percentage inputs to the existing grading in
`src/lib/readinessRollups.ts` and the infra/engineering pages; the card markup
is unchanged.

### 4. Success-summary email (`scripts/refresh-data.mjs` + a small notifier)

Because there is no PR to glance at, the Friday Action sends a short
"what the SITREP roll changed this week" email on success (new month rolled,
readiness colors, permit count, capital-project changes, inspection statuses).
Reuses the existing Resend HTTP pattern from `scripts/notify-failure.mjs`.

- Recipients default to `["oboochever@ahdatalytics.com"]` (just the user for
  now), in a single array so adding addresses later is a one-line change.
- Sends only when the SITREP category actually rolled to a new month (not every
  run). Failure to send must never fail the run (exit 0), matching
  `notify-failure.mjs`.

## Guardrails

- **Month-rank guard:** overlay applies only if `reportMonth` parses to a month
  strictly newer than the curated baseline's `dataAsOf` month. An old or garbled
  SITREP cannot regress the site. (Same guard as `applyTurfCycles`.)
- **Per-field fallback:** any null/missing SITREP field keeps the curated value.
  Never publishes a blank.
- **Shape check:** if `sitrep.json` fails a minimal runtime shape validation, the
  overlay returns the curated baseline unchanged (full fallback).
- **Conflict policy — dedicated workbooks win:** SITREP staffing *color* is
  overlaid (it is the readiness signal), but the vacancy *count* and headcount
  stay sourced from the staffing workbook pipeline. PCCP repair detail stays
  curated. Rationale: the workbook is more granular and authoritative than the
  SITREP's round single-line figure (June SITREP said 45 vacancies; the May 7
  workbook said 50).

## Data flow / error handling summary

1. Friday Action runs `refresh-data.mjs` → `extractSitrep.mjs` writes extended
   `sitrep.json`. On extractor failure the existing failure email fires and the
   prior `sitrep.json` is retained (no regression).
2. Bot commits changed JSON `[skip ci]` as `oboochever@ahdatalytics.com` →
   Vercel deploys.
3. At build, `siteData.ts` overlays `sitrep.json`. If the month is not newer, or
   the file fails the shape check, the curated baseline renders unchanged.
4. On a successful new-month roll, the summary email is sent to the recipient
   list.

## Testing

Unit tests for the overlay (pure functions, fixture `sitrep.json` inputs):

- newer month → fields overlaid; older/equal month → no-op (curated unchanged)
- null/missing field → curated value preserved
- malformed `sitrep.json` → full fallback to curated baseline
- staffing vacancy count preserved even though staffing color overlays
- inspection signal → correct `percentComplete` (explicit count used directly;
  status anchored to report-date pace); existing on-pace grading then yields the
  expected GREEN/AMBER/RED
- capital `projects[]` map to the expected status enum + description

Extractor: schema-mapping test against a saved SITREP-text fixture (mock the
Anthropic call; assert the `inspections` block populates from narrative).

**Regression anchor (success criterion):** the overlay applied to a June 2026
`sitrep.json` reproduces the manual June roll on `main` — footer "June 2026",
readiness colors unchanged, permits "May / 19", valve Green with 84/105, and the
9 capital projects. Note the current `sitrep.json` predates the schema
extension, so it has no `inspections` block; the anchor uses a June `sitrep.json`
regenerated by the extended extractor (or a fixture with the `inspections` block
added) so the inspection statuses are present. If the automation cannot
reproduce the hand roll, the design is not met.

## Rollout

1. Build and test on `feature/automate-sitedata-roll`.
2. Validate the regression anchor against June `sitrep.json` locally.
3. Merge to `main`; the next Friday Action (or a manual `workflow_dispatch`)
   exercises the full path. The curated baseline guarantees safety if anything
   in the SITREP parse is off.
