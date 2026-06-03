# FPA Lens — Automated Data Refresh Pipeline

**Goal:** A weekly (Friday) GitHub Action that pulls the newest source files from the
SharePoint `LensRepository`, regenerates the dashboard JSON, commits the changes, and lets
Vercel auto-deploy. Full-auto for every recurring category, including SITREP via Claude.

**Status:** Plan / not yet built. This is `main`-branch work (separate from the permitting branch).

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

## 6. Failure handling

- Rely on GitHub's built-in failed-scheduled-run email to Oscar (confirm notification settings;
  cron committed under his account).
- Orchestrator exits non-zero on any category error → GitHub marks the run failed → email.
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
