# FPA Lens CMS — Action Item Checklist

**Active action items only.** When one is done: mark it `[x]`, then move it out of this file into
`cms-completed.md` with a date/time stamp. Rationale and parking-lot ideas live in `cms-notes.md`.

**Status:** **LIVE in production on fpalens.org** (team Neon DB), verified end-to-end incl. edit-to-live.
Portal is branded + fully wired (home/staff/footer) with live preview. Remaining: staff photo
uploads (needs a public Blob store, Oscar setting up), and editor invites (on hold until testing done).

---

## Staff photo uploads (Oscar is creating the store)
- [ ] Oscar: create a **public** Vercel Blob store (Storage → Create → Blob)
- [ ] Wire it: set a dedicated token env var + `CMS_MEDIA_BLOB=true`; point the Media adapter at it
- [ ] Re-seed staff photos into the store (optional) and verify upload/replace works in the portal

## On hold (do NOT start until Oscar finishes testing)
- [ ] Send the 4 editors their set-password invites (Resend) — **HOLD per Oscar**

## Handoff / follow-ups
- [ ] Add Ben/Asher as co-admins on the Neon project (team already owns the Vercel project)
- [ ] Runtime check: an `admin` can create/edit/revoke an `editor`; an `editor` cannot
- [ ] Add page-copy globals for other pages as desired (About, section explainers)
