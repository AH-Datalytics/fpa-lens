# FPA Lens CMS — Action Item Checklist

**Active action items only.** When one is done: mark it `[x]`, then move it out of this file into
`cms-completed.md` with a date/time stamp. Rationale and parking-lot ideas live in `cms-notes.md`.

**Plan:** Build Option 3 (Phase 1) now, deploy it, present it to Jeff W in ~2 weeks.

**Status:** Feature-complete locally on branch `feature/cms-payload`. Branded portal at `/admin` with
login/how-to, content + editors seeded, staff/footer/home wired to Payload, live preview working,
"view public site" link, instant revalidation. Everything below is the production cutover.

---

## BLOCKED ON OSCAR — provision the database (then I finish the rest)
- [ ] Create a **Neon Postgres** DB and connect it to the `fpa-lens` Vercel project
      (Vercel dashboard → Storage → Create Database → Neon), which auto-injects the connection string
- [ ] (Optional, for editor photo *uploads*) create a **public** Vercel Blob store; seeded staff
      photos already work without it. Then set `CMS_MEDIA_BLOB=true` in Vercel

## Deploy (I do these once the DB exists)
- [ ] Add `PAYLOAD_SECRET` to Vercel env (I can generate + set via `vercel env`)
- [ ] `vercel env pull`, generate/run Postgres migrations, run the seed against prod
- [ ] Deploy; smoke test `/admin` login + an edit round-trip on the live URL

## Follow-ups (post-deploy)
- [ ] Send the 4 editors their password-reset invite (Resend); confirm the email flow
- [ ] Runtime check: an `admin` can create / edit / revoke an `editor`; an `editor` cannot
- [ ] Add page-copy globals for other pages as desired (About, section explainers)
