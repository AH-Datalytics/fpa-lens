# FPA Lens CMS — Completed Log

Running, append-only log of finished CMS action items, newest first. Items land here when they are
checked off and removed from `cms-checklist.md`. Reasoning and context live in `cms-notes.md`.

---

## 2026-07

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
    StaffMembers (from `siteData.leadership`), and the 4 editor users (jwilliams editor; the three
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
