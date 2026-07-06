# FPA Lens CMS — Action Item Checklist

**Active action items only.** When one is done: mark it `[x]`, then move it out of this file into
`cms-completed.md` with a date/time stamp, so this checklist stays a clean list of what's left.
Rationale and future/parking-lot ideas live in `cms-notes.md` (those are not action items).

**Plan:** Build Option 3 (Phase 1) now, deploy it, and present it to Jeff W in ~2 weeks. If they
want more, adding onto it is incremental. No separate options-presentation step.

**Status:** On branch `feature/cms-payload`. Branded admin live at `/admin`; content + editors
seeded; home hero wired to Payload with edit-to-live proven. Remaining: wire the rest of the pages,
verify editor management, and deploy. Alert banner is Phase 2.

---

## Phase C — Build Option 3 (Phase 1: content-editing CMS)

### Content wiring (remaining)
- [ ] Wire the remaining curated content to Payload (home hero done): staff cards
      (`LeadershipSection` from `StaffMembers`), Footer/contact (`SiteSettings`), and page copy on
      other pages. Keep the `siteData.ts` fallback throughout.
- [ ] Seed staff **photos** (skipped so far) — upload headshots into Media and link them
- [ ] Add page-copy globals beyond `HomeContent` as pages get wired (About, section explainers)

### Editor management (verify)
- [ ] Runtime check: an `admin` can create / edit / revoke an `editor`; an `editor` cannot
- [ ] Test the Resend invite / password-reset email flow end-to-end

### Database + deploy
- [ ] Provision Vercel Postgres (Neon) in the Vercel dashboard — the one manual step; then `vercel env pull`
- [ ] Run migrations + seed against the DB
- [ ] Deploy to Vercel; smoke test `/admin` login + an edit round-trip
- [ ] Verify end-to-end + prep the demo for the Jeff W meeting
