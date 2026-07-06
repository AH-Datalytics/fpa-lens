# FPA Lens CMS — Action Item Checklist

**Active action items only.** When one is done: mark it `[x]`, then move it out of this file into
`cms-completed.md` with a date/time stamp, so this checklist stays a clean list of what's left.
Rationale and future/parking-lot ideas live in `cms-notes.md` (those are not action items).

**Plan:** Build Option 3 (Phase 1) now, deploy it, and present it to Jeff W in ~2 weeks. If they
want more, adding onto it is incremental. No separate options-presentation step.

**Status:** On branch `feature/cms-payload`. Payload installed + configured, 3 collections + 2
globals defined, config validated, and `type: module` verified safe (build + tests pass). Remaining:
mount the admin panel, seed, and wire the frontend reads. Alert banner is Phase 2.

---

## Phase C — Build Option 3 (Phase 1: content-editing CMS)

### Mount the admin panel
- [ ] Move existing routes into an `(frontend)` route group (own root layout); add the `(payload)`
      route group (admin + api) so each has its own root layout
- [ ] Wrap `next.config.ts` with `withPayload` (preserve existing redirects/headers)
- [ ] Boot `/admin`, create the first admin user, confirm the panel loads

### Collections / globals (remaining)
- [ ] Add page-copy globals beyond `HomeContent` as needed (About, section explainers)

### Editor management (verify)
- [ ] Runtime check: an `admin` can create / edit / revoke an `editor`; an `editor` cannot
- [ ] Test the Resend invite / password-reset email flow end-to-end

### Content wiring
- [ ] Seed script: pull current copy from `siteData.ts` + About/leadership into Payload; seed the
      four editor users (`jwilliams@slfpae.gov` editor; `oboochever@`/`jasher@`/`bhorwitz@ahdatalytics.com` admin)
- [ ] Refactor server pages to read curated content from Payload (keep `siteData.ts` fallback)

### Database + deploy
- [ ] Provision Vercel Postgres (Neon) in the Vercel dashboard — the one manual step; then `vercel env pull`
- [ ] Run migrations + seed against the DB
- [ ] Deploy to Vercel; smoke test `/admin` login + an edit round-trip
- [ ] Verify end-to-end + prep the demo for the Jeff W meeting
