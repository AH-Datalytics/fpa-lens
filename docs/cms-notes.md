# FPA Lens CMS — Notes

**What this doc is:** the knowledge base for the CMS effort. Reasoning, decisions, the tier
options, the editable-content inventory, and future considerations. **These are notes, not
action items.** Future phases and add-ons live here in a parking lot and only become action
items once that upgrade is actually decided upon.

**Companion docs:**
- `cms-checklist.md` — active action items. When one is done, mark it `[x]`, then move it out of
  the checklist into `cms-completed.md`.
- `cms-completed.md` — running, timestamped log of finished action items.

---

## 0. Plan & locked decisions (Phase B, 2026-07-06)

**Plan:** Build Option 3 now, deploy it, present to Jeff W in ~2 weeks. Expand incrementally if he
wants more. No separate options-presentation step.

**Locked decisions:**
- **CMS:** Payload 3.85.2. Compatibility spike passed — `@payloadcms/next` peer dep allows
  `>=16.2.6 <17.0.0` and the app is on Next 16.2.9, so no Next downgrade is needed.
- **Database:** Vercel Postgres (Neon-backed) via `@payloadcms/db-postgres`. Chosen for least manual
  effort: same Vercel account, auto-injected env vars, everything else automated. One manual "Create
  Database" click at deploy; media via the existing Vercel Blob token
  (`@payloadcms/storage-vercel-blob`).
- **Editor access:** Payload's built-in `Users` auth collection with two roles:
  - `admin` — manage the editor list (assign/revoke/edit) + edit content. AHD accounts.
  - `editor` — edit content only. FPA Director.
  Invite / password-reset emails go through the existing Resend key (`@payloadcms/email-resend`).
- **Initial editor list (seed):** (confirmed 2026-07-06)
  - `jwilliams@slfpae.gov` — Director, role `editor`
  - `oboochever@ahdatalytics.com` — role `admin`
  - `jasher@ahdatalytics.com` — role `admin`
  - `bhorwitz@ahdatalytics.com` — role `admin`

---

## 1. The principle that defines the tiers

FPA Lens has two classes of content, and they behave completely differently:

- **Automated content** comes from the weekly SharePoint refresh pipeline: finance (budget vs
  actuals), safety metrics, staffing counts, turf progress, and the SITREP-derived pieces
  (readiness colors, permits issued, and the capital-projects list). Updates itself every Friday.
- **Curated content** is human-authored and changes rarely to occasionally: page intro/hero copy,
  section explainers, contact info, leadership/staff cards, site config, educational blurbs.

**A CMS should own the curated layer.** Making the automated layer editable fights the pipeline: a
hand-edit to finance or capital projects would be overwritten by the next Friday cron, or we'd
have to switch automation off. That single fact is what separates the three options, and it is the
most useful thing to explain to Jeff.

---

## 2. The three options

### Option 1 — Complete CMS (everything, including data)
- Edits all content plus the underlying data.
- Architecturally at odds with the SharePoint automation. Advise against; the right lever to fix
  data is the source workbook in SharePoint, not the website.

### Option 2 — Partial CMS (text, colors, formats, staff, projects, alerts)
- Option 3 plus theming, structural changes (adding sections/pages), and capital projects.
- Feasible, but theming and structural building are the expensive/risky parts. Colors should be
  exposed as a small set of safe theme tokens, never raw CSS. Capital projects collide with the
  SITREP automation and need an explicit "CMS overrides SITREP or not" rule. Strong "phase 2."

### Option 3 — Core CMS (the content they touch most) — RECOMMENDED
- The genuinely curated, frequently-changing content, plus a new alert banner.
- Clean boundary with the pipeline, genuinely useful, demoable in ~2 weeks.

---

## 3. Option 3 (Phase 1) scope

Core content editing only (no alert banner):
1. **Page & section copy** — hero/intro text and section explainers. The core "text they update most."
2. **Leadership / staff cards** — add/remove/reorder/edit people (seeded from
   `staffingData.leadership`), photos in the Vercel Blob storage the app already uses.
3. **Contact info & site settings** — footer address/phone and small config values.

**Tabled to Phase 2 (decided 2026-07-06):** the site-wide alert/notice banner. Ideally not needed.
Raise it with Jeff W after the demo and add it only if he wants it — it is a small, self-contained
add-on on top of this foundation (see parking lot in section 9).

**Excluded (Option 2):** colors/theming, adding whole pages/sections, anything on the automated
data path.

---

## 4. Why Payload (and the honest tradeoffs)

**Right pick:** Next.js-native, lives in this same app (admin at `/admin`, one deploy), our
most-used CMS, and building Option 3's collections in Payload makes expanding to Option 2 later
incremental rather than a rebuild.

**Tradeoffs:**
- **No database today** (pure static JSON + TS on Vercel). Payload adds one. Hosted Postgres (Neon;
  Vercel Postgres is Neon underneath) covers this on a free tier, so "within current budget" is
  realistic on infrastructure.
- **Media reuse:** staff headshots can use the **Vercel Blob storage already configured** here, via
  Payload's Vercel Blob adapter.
- **Auth built in:** Director gets a content-only editor login.
- **Compatibility to verify first:** app runs **Next 16.2.9 / React 19.2**; Payload 3 officially
  targets Next 15. Run a short spike to confirm Payload runs clean on Next 16 before locking the
  two-week timeline. This is the main schedule risk.

(A lighter DB-free alternative like TinaCMS exists but caps out fast and gives a weaker admin UX.
Bare-bones floor only, not a real contender.)

---

## 5. How it works

- **Coexistence with the pipeline:** the SharePoint cron keeps owning `public/data/*.json` as-is;
  Payload owns only the curated collections. They never touch the same fields.
- **Data flow:** server page components fetch from Payload's local API and pass values down. Note
  **15 of 29 components are client components**, so the refactor happens at the server-page boundary
  (pages that currently `import` from `siteData.ts` instead fetch from Payload). This is the bulk of
  the build effort.
- **Seeding:** define collections/globals, then a one-time seed script reads current values out of
  `siteData.ts` and the About page and inserts them as documents. Keep `siteData.ts` as a fallback
  during the transition (same "curated baseline plus live layer" pattern the SITREP overlay uses),
  so there is never a broken state.
- **Access control:** one editor role, content-only.

---

## 6. Editable content inventory

Class key: **Curated** = human-authored (CMS candidate). **Automated** = pipeline / live API (leave
to automation). **Mixed** = automated values with curated labels.

| Area / route | Content | Class | Tier |
|---|---|---|---|
| Global | Alert/notice banner (new) | Curated | 2 (tabled) |
| Global (footer) | Address, phone, resource links | Curated | 3 |
| Global | Contact info (Director, etc.) | Curated | 3 |
| Global | Data-last-updated label | Automated | — |
| `/` Home | Hero, tagline, intro copy | Curated | 3 |
| `/` Home | Infrastructure & System Readiness cards | Automated (SITREP/pipeline) | — |
| `/` Home | KPI cards | Mixed (labels curated) | 3 (labels) |
| `/about` | Org description, section copy | Curated | 3 |
| `/about`, `/staffing` | Leadership / staff cards (`staffingData.leadership`) | Curated | 3 |
| `/staffing` | Page copy | Curated | 3 |
| `/staffing` | Vacancy count | Automated | — |
| `/finance` | Page intro / framing copy | Curated | 3 |
| `/finance` | Budget vs actuals | Automated | — |
| `/finance` | Capital projects list | Automated (SITREP) | 2 (override decision) |
| `/engineering`, `/engineering/idiq` | Intros, service descriptions, process boxes, IDIQ copy | Curated | 3 |
| `/engineering/idiq` | Contract KPIs / tracker | Automated | — |
| `/engineering` | Permits issued | Automated (SITREP/pipeline) | — |
| `/safety` | Page copy, Safety Officer info | Curated | 3 |
| `/safety` | Accident/incident metrics | Automated (pipeline + overrides) | — |
| `/infrastructure/turf-maintenance` | Maintenance-plan verbiage, district notes | Curated | 3 |
| `/infrastructure/turf-maintenance` | Per-zone cutting progress | Automated (turf pipeline) | — |
| `/environment` | Risk methodology copy | Curated | 3 |
| `/environment` | Threshold tables (config values) | Curated (config) | 2 |
| `/environment` | Live wind/water/gauge data + risk level | Automated (API) | — |
| `/protection` | Page copy | Curated | 3 |
| Global | Educational content, hurricane-season info | Curated | 3 |
| Global | Colors / theming | Curated (risky) | 2 (via tokens) |
| Global | New pages / sections | Structural | 2 / 1 |

---

## 7. Timelines (for cost/schedule framing)

| Option | Scope | Rough timeline |
|---|---|---|
| **3 (recommended)** | Alert banner + core copy + staff + contacts | ~2 weeks to a solid MVP |
| **2** | Option 3 + safe theming tokens + structural building + capital-projects override | +3 to 4 weeks |
| **1** | Everything including data | Not recommended; conflicts with automation |

---

## 8. Open questions / decisions

Resolved in Phase B (Payload/Next 16 compatibility, database host) are recorded in section 0.
Still open:

1. **Capital projects** — confirm they stay automated (SITREP) for now; CMS override is Option 2.
2. **Colors** — confirm "safe tokens, not raw CSS" for whenever theming lands (Option 2).

---

## 8b. Deploy & operations (2026-07-06)

- **Hosting:** Vercel (AHD team). **Database:** Neon Postgres provisioned via the Vercel Storage
  integration under the team (region us-east-1). The integration created `POSTGRES_URL` (pooled,
  used at runtime) + `POSTGRES_URL_NON_POOLING` (direct, use for schema/seed) and marked them
  **Sensitive** — so they can't be read via `vercel env pull`; grab the string from the Neon/Vercel
  dashboard when you need to seed.
- **Env:** `PAYLOAD_SECRET` is set in Vercel (Production + Preview) and mirrored locally in the
  gitignored `.cms-payload-secret`. Local dev uses SQLite (`DATABASE_URI=file:./cms-dev.db` in
  `.env.local`); prod uses Neon (`POSTGRES_URL`). The config auto-selects based on `POSTGRES_URL`.
- **Seed prod:** `POSTGRES_URL="<direct/unpooled neon>" PAYLOAD_SECRET="<secret>" npx payload run
  scripts/seed-cms.ts` (idempotent; push auto-creates the schema on a fresh DB). Add `SEED_DEV_ADMIN=1`
  only for a throwaway local login — never in prod.
- **Grant initial access:** `PW_EMAIL=... PW_VALUE=... npx payload run scripts/set-password.ts`
  (before editors use the Resend "Forgot password" flow).
- **Staff photos:** live. A dedicated **public** Vercel Blob store backs the Media collection,
  addressed by `CMS_MEDIA_BLOB_TOKEN` (Vercel Production + Preview) — kept separate from the
  lakefront `BLOB_READ_WRITE_TOKEN` store. The plugin is enabled whenever that token is set (prod);
  local dev without it uses disk / the curated `/headshots` fallback. Re-seed photos by running the
  seed with `CMS_MEDIA_BLOB_TOKEN` set. Media serves via the `/api/media/file/*` proxy (blob-backed).
- **Constraints from Oscar (2026-07-06):** do NOT send editor invites until he finishes testing;
  the Neon password stays as-is (not rotating).

## 9. Future considerations / parking lot (NOT action items)

These become action items only if/when that upgrade is decided upon.

- **Alert/notice banner (tabled from Phase 1 on 2026-07-06):** site-wide toggle + severity + message
  + optional link. Was the Option 3 flagship; moved out to keep Phase 1 lean. Raise with Jeff W after
  the demo; build only if he wants it. Small, self-contained add-on on top of the Phase 1 CMS.
- **Option 2 pieces:** safe theming tokens; a structural page/section builder; capital-projects CMS
  override (vs SITREP) with a clear precedence rule.
- **Option 1:** full data editing. Advise against; it undermines the SharePoint pipeline.
- **CMS add-ons to consider later:** draft/preview mode + publish workflow; scheduled or
  auto-expiring alerts; content versioning + audit log; multi-user roles; Payload live-preview
  in-place editing; richer media library; localization.
- **Cross-feature idea:** the alert banner could optionally auto-post from the lakefront risk engine
  at ORANGE/RED (tie the curated banner to the automated risk level). Future only.
