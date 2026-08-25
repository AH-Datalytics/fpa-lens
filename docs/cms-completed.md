# FPA Lens CMS — Completed Log

Running, append-only log of finished CMS action items, newest first. Items land here when they are
checked off and removed from `cms-checklist.md`. Reasoning and context live in `cms-notes.md`.

---

## 2026-07

- **2026-07-08** — **Field consolidation + WYSIWYG rich text across all pages, deployed with a prod schema migration.**
  - **Consolidation:** About page went 49 → 28 fields — the `lead / emphasis / rest` sentence
    splits merged into one field each, and per-bullet fields (`item1..5`) merged into single
    "one item per line" textareas (the page splits on newlines). Other pages were already
    one-field-per-idea.
  - **Rich text:** all body-prose fields (43 across every page except Protection, which is
    headings-only) are now Payload **Lexical richText** — a WYSIWYG bold/italic/underline toolbar,
    so editors select a word and toggle formatting (the original bold/color phrases became bold).
    New helpers: `src/lib/richText.ts` (`rt(md)` builds a Lexical default from a markdown-ish
    string; `**bold**` marks bold), `src/components/Prose.tsx` (renders a richText value via
    `@payloadcms/richtext-lexical/react`), and `src/components/MaybeRich.tsx` (renders
    richText-or-string, used for prose passed as a component prop — Engineering inspection
    descriptions, IDIQ service micro-descriptions). Single-line subtitles/taglines stayed plain
    `text` (they pass through shared title components). The editor font was overridden from
    Payload's default serif to the admin sans-serif (`custom.scss`, `.ContentEditable__root`).
  - **Gotchas handled:** richText `defaultValue` must be a **function** (`() => X_DEFAULTS.field`)
    — a static object is inlined into the SQL column DEFAULT and JSON-with-apostrophes breaks the
    DDL. And `payload generate:importmap` must run with `CMS_MEDIA_BLOB_TOKEN` set to a
    **valid-format** token (the lakefront `BLOB_READ_WRITE_TOKEN` works) so it adds the Lexical
    RSC/feature components AND keeps the blob handler; a fake token fails the adapter's format check.
  - **Prod migration:** turning fields into richText changes their storage (text → `jsonb`), so the
    prod page-content tables needed recreating. All 10 were confirmed empty (0 rows — no saved
    content), so with Oscar's explicit OK they were dropped (+ the orphaned `home_content.hero_subtext`
    column) and recreated fresh via `push-schema.ts` (clean CREATE, no data-loss prompt). Verified
    the new columns (richText = jsonb, headings/items = varchar, no orphaned split columns). The
    public site rendered from code defaults throughout, unaffected. Verified locally end-to-end
    (editors pre-fill, bold renders, live preview, public pages render, no `[object Object]`,
    `next build` green).
- **2026-07-07 11:50 EDT** — **Hotfix: prod admin was rendering blank; restored the Blob component in `importMap.js`.** After the merge, `src/app/(payload)/admin/importMap.js` was missing `VercelBlobClientUploadHandler` because it had been regenerated locally without `CMS_MEDIA_BLOB_TOKEN` (blob plugin disabled → component stripped). Prod enables the blob plugin, so the admin referenced a component absent from the map and rendered **blank on every admin route** (login + password-reset included; 0 console errors — a silent resolution failure, not a thrown error). It had been broken since the merge deploy; missed because only *public* pages were browser-checked on prod, not the admin. Fix: added the blob import + map entry back (kept the Dashboard view), deployed, and **verified in a real browser** that the prod login and reset-password forms render. Recorded the trap in CLAUDE.md.
  - Related, same session: set `serverURL` (production → `https://fpalens.org`) so password-reset email links are absolute — Payload couldn't infer the host behind Vercel's proxy and had been emitting a hostless `http:///admin/reset/<token>`. Verified the reset link + page end-to-end and re-sent a working test email.
  - Lessons: browser-check the prod **admin** after any admin/config deploy, not just public pages; never call an email flow "verified" off a 200 without checking the actual link and destination page.
- **2026-07-07 00:25 EDT** — **Shipped the admin-portal polish pass + prod follow-ups.**
  - **Merged `cms-admin-polish` → `main`, deployed, verified prod.** Public site unchanged (all pages
    HTTP 200; live `/finance` still renders its headings + the now-inlined data-notes; the finance
    global serves the reduced 5 fields; home = just `heroHeading`). Branch deleted; Playwright
    screenshots cleaned up.
  - **The FPA Regional Director promoted to `admin` in the prod Neon DB** via a direct SQL `UPDATE` (confirmed
    `editor` → `admin`). Note: `payload run scripts/set-role.ts` against prod **hangs on the dev
    schema-push `(y/N)` prompt** because prod Neon still has the removed columns — the orphaned columns
    are harmless (Payload ignores columns not in the config), but for one-off prod DB edits use direct
    SQL, or `NODE_ENV=production` to disable push. Do NOT accept that push prompt against prod.
  - **Admin/password emails now send from `password@fpalens.org`** (Payload Resend adapter
    `defaultFromAddress`, name "FPA Lens Content Portal"). Any local-part on the verified `fpalens.org`
    domain works; kept separate from the `alerts@fpalens.org` digest/alert sender.
  - **Forgot-password verified working.** `POST /api/users/forgot-password` returns `200 {"message":"Success"}`;
    Resend delivers from the verified domain, and because the login-page flow is REST-triggered Payload
    builds the reset link from the request host (`fpalens.org`) — so no `config.serverURL` is needed.
    Sent a live test to `oboochever@ahdatalytics.com` to confirm end-to-end.
- **2026-07-06 21:45 EDT** — **Admin-portal polish pass (branch `cms-admin-polish`), verified end-to-end in a real browser with Playwright.** Five things:
  1. **Editability audit — removed 65 non-prose fields.** Fan-out audit of all 12 globals against a strict rubric, then trimmed anything that isn't editorial prose to hardcoded literals in the page: chart/card/metric titles, status legends & values, thresholds, tooltips, abbreviation expansions (LNO), process-step labels, and — per Oscar — **all AHD-authored data-source / sourcing / methodology notes** (e.g. "sourced from…", data-note paragraphs, model disclaimers). Per-global counts now: about 49, finance 5, safety 10, engineering 8, environment 15, infrastructure 13, protection 8, staffing 6, turf 11, idiq 13 (home-content trimmed to just `heroHeading`; the dead `heroSubtext` field removed). **Principle:** editable = page/section headings + body/callout prose + staff bios/photos; NOT editable = anything bound to a data component, or that AHD authors. See cms-notes §8c.
  2. **Real-time Live Preview.** `usePageCopy` now layers in `@payloadcms/live-preview-react`'s `useLivePreview`, so the admin preview iframe updates **as you type, before Save** (not just on save). Converted the 3 server-rendered surfaces to client so they get it too: Protection → client; About → server shell (`getStaffMembers`) + `AboutContent` client; home hero → new client `HomeHero`. Verified live-typing updates on Finance, About, and Home.
  3. **Custom admin dashboard.** Replaced Payload's bare default card grid with a branded `Dashboard` view (`admin.components.views.dashboard`): a welcome header, the How-to guide, and grouped **described** cards (Website pages / People, home & settings / Portal administration). Fixed the `**edit**from` JSX spacing bug in HowToUse. (Gotcha: `RootPage` already wraps the dashboard view in `DefaultTemplate` — wrapping again double-rendered the header/nav; the view must render content only.)
  4. **Editor role hardening.** Users collection now `admin.hidden` for non-admins, so editors don't see the user roster in the nav (they manage their own login via the Account page); the dashboard's "Portal administration" section is admin-only. Verified as a test editor: content + staff + media editable, Users hidden, no admin section.
  5. **Director → admin (code).** Seed `EDITORS` now lists the FPA Regional Director as `admin` and the seed idempotently **enforces roles** on re-run; added `scripts/set-role.ts`. **Prod DB change still pending** (blocked — see checklist).
  - Verified: real-browser Playwright pass (admin + editor), `next build` clean (20 pages), tsc + eslint clean, 36/36 vitest. Live-preview test edits were never saved (unsaved-changes guard). **No live copy changed** — every remaining field defaults to its current wording.
- **2026-07-06 19:58 EDT** — **Merged the CMS polish + editable page copy to `main` and deployed.**
  Per Oscar: the *code* (editable-copy feature + fixes) ships; the *test content edits* never do
  (they were local-only, never committed; local DB reset). Every page global defaults to its current
  wording, so **no live copy changed** — verified on fpalens.org: all 11 pages HTTP 200 with normal
  copy (no test strings), and the client-page globals API returns 200 (page-content tables were
  provisioned on prod Neon via `scripts/push-schema.ts`, additive, no content change). `cms-polish`
  branch deleted.
- **2026-07-06 19:39 EDT** — **Editable copy on every page** (branch `cms-polish`, tested locally). Added per-page **Page Content** globals for all 10 pages (About, Finance, Safety,
  Engineering, Environment, Infrastructure, Protection, Staffing, Turf, IDIQ) — each field's
  `defaultValue` is the current wording, so admin forms pre-fill and unsaved globals return the text
  (no seed needed). Discovery: 8 of 10 pages are Client Components, so instead of risky server/client
  refactors they read copy via a new client hook `usePageCopy` (fetches the public global); the 2
  server pages (About, Protection) use `getPageContent` (SSR). Globals grouped under "Page Content"
  in the admin; Live Preview maps each to its page. Data-coupled strings stay computed (e.g. turf
  plan/legend text embedding live acreage/month was trimmed from its global). Verified end-to-end:
  all 10 pages render identically; editing copy on a server page (About) and a client page (Finance)
  both reflect on the site; build + 36 tests pass. **Awaiting Oscar's OK to merge.**
- **2026-07-06 19:01 EDT** — End-to-end admin test pass + polish (branch `cms-polish`, NOT yet merged;
  tested locally against isolated SQLite so nothing touched prod). All flows verified working:
  login (admin + editor), staff create with bio array, **photo upload via the UI**, edit, delete,
  and Home/Site Settings global edits — all persist and reflect on the site in ~5-8s, no console
  errors. Fixes made: (1) Photo column added to the staff list; (2) editors now see only their own
  user record (admins still see all) and have no user-create access — confirmed; (3) leadership
  cards only show "Read bio"/open the modal when a bio exists. README + CLAUDE.md gained CMS
  sections. Full build passes. **Awaiting Oscar's OK to merge `cms-polish` → main.**
- **2026-07-06 18:29 EDT** — **Staff photo uploads live.** Created a dedicated **public** Vercel Blob
  store (separate from the lakefront `BLOB_READ_WRITE_TOKEN` store, which was left untouched). Wired
  the Media adapter to `CMS_MEDIA_BLOB_TOKEN` (set in Vercel Production + Preview), uploaded the 12
  seeded headshots into it, and deployed. Verified: `/about` on fpalens.org serves the photos from
  the store (`/api/media/file/*` → HTTP 200, image/png), and editors can now upload/replace staff
  photos in the portal. (Note: media serves through the Payload proxy route, not direct blob CDN —
  fine for this scale; a future optimization if needed.)
- **2026-07-06 16:29 EDT** — **CMS live in production.** Merged `feature/cms-payload` → `main`;
  Vercel production deploy succeeded. Verified end-to-end on **fpalens.org**: home (CMS hero),
  branded `/admin`, and `/about` (staff) all HTTP 200. Proved edit-to-live in prod via the API
  (changed the hero, live site updated in ~20s, reverted, confirmed restored). Revalidation runs
  within the ISR window (~20–40s); the "within a minute" promise holds.
- **2026-07-06 16:23 EDT** — Phase C: production database + first deploy.
  - Provisioned **Neon Postgres** via the Vercel Storage integration under the **AHD team** (region
    Washington DC / us-east-1, Neon Auth off, no deploy branches, prefix `POSTGRES` → `POSTGRES_URL`).
    Env vars are marked Sensitive (can't be pulled via CLI — seed from the dashboard string).
  - Set `PAYLOAD_SECRET` in Vercel (Production + Preview); stored locally in `.cms-payload-secret`
    (gitignored).
  - Seeded the team Neon (schema auto-created via push over the direct/unpooled connection): home,
    site settings, 12 staff, 4 editors.
  - **Preview deploy verified end-to-end:** public site (hero from Neon) + branded `/admin` both
    HTTP 200 on `fpa-lens-jw6kv6b6c-ahdatalytics.vercel.app`. Set a temp password on
    `oboochever@ahdatalytics.com` for testing (`scripts/set-password.ts`).
- **2026-07-06 14:31 EDT** — Phase C: full content wiring + portal polish.
  - Wired staff/leadership cards (About) and the footer to Payload (`StaffMembers`, `SiteSettings`)
    via cached helpers with `siteData` fallbacks. Seeded staff photos render from the curated
    `/headshots` assets (Media-to-Blob gated behind `CMS_MEDIA_BLOB` until a PUBLIC store exists).
  - **Live Preview**: admin shows the site in an iframe as you edit — verified it renders the real
    home page with CMS content. Relaxed `X-Frame-Options` DENY→SAMEORIGIN for same-origin framing;
    `RefreshRouteOnSave` refreshes the preview on save.
  - **Instant updates**: afterChange/afterDelete hooks call `updateTag('cms')` (read-your-own-writes),
    with 60s ISR as the fallback. All frontend pages are ISR.
  - **"View public site"** link in the admin nav. Optional dev admin in the seed (`SEED_DEV_ADMIN`).
  - Verified: `next build` passes, staff photos + footer + live preview all render from the CMS.
- **2026-07-06 13:57 EDT** — Phase C: seeded content + editors and wired the first page.
  - Idempotent seed (`scripts/seed-cms.ts`, run via `payload run`): HomeContent, SiteSettings, 12
    StaffMembers (from `siteData.leadership`), and the 4 editor users (the Director as editor; the three
    AHD accounts admin; created with temp passwords, they reset via Resend email).
  - Home hero heading now reads from the `HomeContent` global via a resilient server helper
    (`src/lib/cms.ts`, falls back to `siteData` on any error); page is ISR (`revalidate = 60`).
  - **Proven edit-to-live:** set a distinct hero value in the DB and confirmed the live home page
    rendered it. Build passes (`/` is ISR 1m), 36 tests pass.
  - Not yet wired: staff photos (skipped in seed), and the other pages/Footer still read `siteData`.
- **2026-07-06 13:36 EDT** — Phase C: mounted the branded admin panel at `/admin`.
  - Route-group refactor: moved the site into `(frontend)`, added `(payload)` (admin + api) so each
    has its own root layout; wrapped `next.config.ts` with `withPayload` (redirects/headers kept).
    Fixed the graphql route OPTIONS export for Payload 3.85.
  - Custom FPA branding: logo + "FPA Lens / Content Portal" wordmark, navy (#21355a) + green
    (#65bc7b) palette, a welcome line on login, and a **"How to use" guide on the dashboard**.
    Components in `src/components/admin/`, styles in `(payload)/custom.scss`.
  - Verified: `next build` passes (public site + `/admin` + Payload API coexist with existing
    `/api/*` routes), 36 tests pass, created a first user, and screenshotted the login + dashboard.
- **2026-07-06 13:13 EDT** — Phase C setup (on branch `feature/cms-payload`):
  - Installed Payload 3.85.2 + `db-postgres`, `db-sqlite`, `storage-vercel-blob`, `email-resend`,
    `richtext-lexical`, `sharp`. Next 16 peer-dep held (clean install).
  - Set `"type": "module"` in package.json (Payload CLI needs ESM). Verified safe: `next build`
    passes all 18 routes + eslint clean, and all 36 vitest tests pass.
  - `payload.config.ts`: env-driven adapter (SQLite for local dev, Postgres for prod), Resend email
    (`alerts@fpalens.org`), Vercel Blob storage for media (reuses existing `BLOB_READ_WRITE_TOKEN`).
  - Collections: `Users` (auth, admin/editor roles + access control), `Media` (upload),
    `StaffMembers` (modeled on `staffingData.leadership`). Globals: `SiteSettings` (footer/contact),
    `HomeContent` (home copy).
  - Wired `@payload-config` tsconfig path, dev env vars (gitignored), `cms-dev.db` gitignored.
  - Validated the whole config compiles: `payload generate:types` wrote `src/payload-types.ts`.
- **2026-07-06 12:55 EDT** — Phase B: confirmed editor-access model. Payload built-in `Users` auth
  collection with `admin`/`editor` roles, managed in the admin panel (assign/revoke/edit), invites
  via the existing Resend key. Seed list defined (4 addresses; 2 flagged to confirm).
- **2026-07-06 12:55 EDT** — Phase B: chose the database. Vercel Postgres (Neon-backed,
  `@payloadcms/db-postgres`), least-friction because it lives in the existing Vercel account and
  auto-injects env vars. Media via the existing Vercel Blob token. One manual "Create Database"
  click at deploy; everything else automated.
- **2026-07-06 12:55 EDT** — Phase B: Payload-on-Next-16 compatibility spike passed. `@payloadcms/next`
  peer dep allows `>=16.2.6 <17.0.0`; app is on Next 16.2.9, so Payload 3.85.2 works with no Next
  downgrade. Cleared the main schedule risk.
- **2026-07-06 12:43 EDT** — Produced the CMS options write-up + editable-content inventory: three
  tiers (complete / partial / core), the automated-vs-curated content principle, Payload
  recommendation with the Next-16 compatibility caveat, and Option 3 scope led by the alert/notice
  banner. Filed in `cms-notes.md`.
