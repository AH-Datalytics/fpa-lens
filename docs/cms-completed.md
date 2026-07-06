# FPA Lens CMS — Completed Log

Running, append-only log of finished CMS action items, newest first. Items land here when they are
checked off and removed from `cms-checklist.md`. Reasoning and context live in `cms-notes.md`.

---

## 2026-07

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
