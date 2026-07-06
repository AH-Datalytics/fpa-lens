# FPA Lens — Automated Data Refresh Pipeline

**Goal:** A weekly (Friday) GitHub Action that pulls the newest source files from the
SharePoint `LensRepository`, regenerates the dashboard JSON, commits the changes, and lets
Vercel auto-deploy. Full-auto for every recurring category, including SITREP via Claude.

**Status (Jun 8 2026): BUILT on `feature/data-automation`, awaiting merge to `main`.**

All six categories are wired, tested, and committed. Merging to `main` activates the
Friday cron; the first manual run publishes the SharePoint data.

| Category | Mechanism | Has data in SharePoint? |
|---|---|---|
| IDIQ | newest `idiq-contracts_*.xlsx` (in `Finance/IDIQ/`), merge-by-cycle | yes |
| Finance | newest `budget-actuals_*.xlsm`, period auto-derived | yes |
| Safety | frozen anonymized history + current-year upload | yes |
| Staffing | current-counts overlay; capacity/thresholds stay policy | yes |
| SITREP | PDF → Claude digest → engineering maintenance list (narrative only) | folder empty — activates on first upload |
| Turf | newer-month overlay onto `grassCutting` (no regression) | folder empty — activates on first upload |

- Friday cron `0 13 * * 5`, `workflow_dispatch`, commit-only-what-changed, **per-run digest email to Oscar** (`scripts/notify-digest.mjs`: changes published, per-source status, failures; sent every run).
- SITREP feeds narrative only; readiness/financial/safety come from their own pipelines.
- Turf/SITREP overlay safely: unmatched/older data falls back to curated values.
- `Engineering/` SharePoint folder is empty/unused (IDIQ lives in `Finance/IDIQ/`).

---

_Original plan below (kept for reference)._

---

## 1. How data refreshes today (manual)

`source file → drop in data/sources/<cat>/ with the exact expected name → run extract script →
writes public/data/*.json → git commit + push → Vercel redeploys.`

Data is static JSON committed in `public/data/`. We keep that model; the Action just automates
the manual steps.

## 2. Verified facts (Jun 3 2026)

- SharePoint app creds already in Vercel: `SHAREPOINT_HOST/SITE/LIBRARY/TENANT_ID/CLIENT_ID/CLIENT_SECRET`.
- `gh` CLI authed as Oscar with `repo` scope → can set Actions secrets.
- Existing GH Action `collect-forecasts.yml` proves the cron+secrets pattern.
- Site `slfpae.sharepoint.com/sites/SLFPAE-Lens`, library `LensRepository`, root folder `FPA Lens Data`.

## 3. SharePoint layout + category map

| Category | Folder (`FPA Lens Data/…`) | Newest-file glob | Extract script | Output | Populated? |
|---|---|---|---|---|---|
| Finance (actuals) | `Finance/` | `budget-actuals_YYYY-MM.xlsm` | `extractActualsData.py` | `actuals-fy26.json` | ✅ |
| Finance (budget) | `Finance/` (same file?) | — | `extractBudgetData.py` | `budget-fy26.json` | ⚠️ verify source |
| IDIQ | `Finance/IDIQ/` | `idiq-contracts_YYYY-MM.xlsx` | `extractIdiqData.py` | `idiq-contracts.json` | ❌ empty |
| Safety | `Safety/` | `safety-events_YYYY-MM.xlsx` | `extractSafetyData.py` | `safety-events.json` | ✅ |
| Staffing | `Staffing/` | `staffing_YYYY-MM.xlsx` | _none yet_ | `staffing.json` (new) | ✅ |
| SITREP | `SITREP/` | `sitrep_YYYY-MM.pdf` | _new, Claude_ | `sitrep.json` (new) | ❌ empty |
| Turf | `Turf/` | `turf-maintenance_YYYY-MM-DD.xlsx` | _new_ | updates `grassCutting.ts` %s | ❌ empty |

Static GIS (`kmz/`, `shapefiles/`) and the lakefront `closures/` log are **not** in this pipeline —
they change rarely and stay manual.

## 4. Architecture

- **`scripts/sharepoint/graph.mjs`** — Graph client-credentials auth + helpers (resolve site/drive,
  list folder, download item). Trims the bogus `\n` in env values defensively.
- **`scripts/sharepoint/fetch.mjs`** — for a category, find newest file matching
  `descriptor_YYYY-MM(-DD).ext`, download into `data/sources/<cat>/`. Skip/flag names that don't match.
- **Generalize extract scripts** to take the input path as an arg/env (instead of a hardcoded
  filename) and tolerate the `"2022 IDIQ "` trailing-space tab quirk.
- **`scripts/refresh-data.mjs`** — orchestrator. Per category: fetch newest → if file changed,
  run its extractor. Per-category try/catch so one bad file doesn't sink the rest; non-zero exit
  if any category errors (so GitHub flags the run).
- **SITREP** — `scripts/extractSitrep.mjs`: download PDF → Claude API with a strict structured-output
  schema + prompt caching → `public/data/sitrep.json`. Full-auto per Oscar.
- **`.github/workflows/refresh-data.yml`** — `cron: '0 13 * * 5'` (Fri ~7–8am Central; UTC, no DST).
  Setup Python + Node, run orchestrator, commit changed `public/data/` (+ archived sources), push.

## 5. Secrets (GitHub Actions)

- Mirror `SHAREPOINT_*` from Vercel (cleaned of the `\n`).
- `ANTHROPIC_API_KEY` — **new, does not exist anywhere yet.**

## 6. Notifications & failure handling

- **Per-run digest email** (`scripts/notify-digest.mjs`, `if: always()` before the commit step):
  one Resend email to Oscar on *every* run with (a) data changes published this run (diffed from
  the working tree vs HEAD), (b) per-source pull status (REFRESHED/SKIPPED/FAILED), and (c) any
  failures. Sends on no-change weeks too, so a green run is always confirmed. Never fails the job
  (always exits 0). Consolidates + replaces the old failure-only and SITREP-roll-only emails
  (July 2026). Pure logic unit-tested in `notify-digest.test.mjs`.
- Orchestrator exits non-zero on any category error → GitHub marks the run failed; the digest still
  sends (it reads `steps.refresh.outcome` to flag a hard error even if no per-source summary was
  written). GitHub's built-in failed-run email is a backstop.
- Naming guard: a file not matching `descriptor_YYYY-MM(-DD).ext` is skipped + logged, never parsed.

## 7. Open issues / cleanups

1. **`SHAREPOINT_*` Vercel values contain a literal `\n`** — re-set cleanly (and use clean values in GH secrets).
2. **`budget-actuals_2026-05.xlsm.xlsm`** in SharePoint has a double extension — have FPA rename (parser will also defend against it).
3. **Empty folders** (IDIQ, SITREP, Turf) can't be end-to-end tested until populated per convention.
4. **Budget vs actuals source** — confirm whether the monthly `budget-actuals_*.xlsm` feeds *both*
   `extractActualsData.py` and `extractBudgetData.py`, or if the budget baseline is separate/annual.
5. **Turf parser** must update only the weekly C1/C2 percentages; cadence overrides (LBBLD 1×/mo,
   LPV-115 rollup, EJLD) stay in code.
6. **Staffing** is intentionally minimal today (vacancy count); low-value, simple parser.
7. **`Engineering/` folder** purpose unclear — confirm with FPA.

## 7b. Reconnaissance findings (Jun 3 2026, against live LensRepository)

- **Fetch core built + live-tested** (`scripts/sharepoint/`). Auth, newest-by-convention,
  doubled-extension tolerance, empty-folder handling, binary download all verified.
- **GitHub secrets set:** all `SHAREPOINT_*` (cleaned) + `ANTHROPIC_API_KEY`. Also in Vercel.
- **`data/sources/` is gitignored** → CI must fetch sources fresh each run; the generated
  `public/data/*.json` is what gets committed. Implication: the **safety historical logs
  (2022–2025) must be committed** (they're static) so the aggregation works in Actions.
- **Per-category file reality:**
  - **Finance ✅** `budget-actuals_2026-05.xlsm` has all required entity sheets. Wires cleanly
    once `extractActualsData.py` takes a dynamic input path. (May file had the `.xlsm.xlsm`
    typo — now handled by the fetcher.)
  - **Safety ✅** `safety-events_2026-05.xlsx` = current-year log, `Sheet1`, exact columns.
    Wire by saving it as the current-year file; confirm Recordable fill-color classification
    survives the round-trip; commit historical logs.
  - **IDIQ ⚠ decision needed** `idiq-contracts_2026-05.xlsx` columns match A–Q exactly, but it's
    a **single flat `Sheet1` for the current (2025) cycle**, while the extractor + IDIQ page use
    **two pools (2022 + 2025)**. Options: (a) freeze 2022 as historical, refresh 2025 from the
    upload; (b) move the page to a single current-contracts list; (c) ask FPA to upload both
    cycles as two tabs. Recommend (a).
  - **Staffing** populated (`staffing_2026-06.xlsx`) but no extractor exists yet + intentionally
    minimal today; low priority.
  - **SITREP / Turf** folders still empty.

## 8. Build order

- **Phase A (unblocked, testable now):** Graph lib + fetch + secrets + workflow skeleton + Tier-1
  (Finance actuals, Safety) against the already-populated folders.
- **Phase B:** IDIQ (once `Finance/IDIQ/` has a file) + Staffing parser.
- **Phase C:** Turf parser.
- **Phase D:** SITREP via Claude (needs `ANTHROPIC_API_KEY`).

## 9. What's needed from Oscar

- **Anthropic API key** (console.anthropic.com → I add to GH secret + Vercel). Only hard blocker (for Phase D).
- Fix/rename the double-extension Finance file (or accept the defensive skip).
- Confirm IDIQ/SITREP/Turf folders will be populated per the naming convention, and the `Engineering/` folder's purpose.
