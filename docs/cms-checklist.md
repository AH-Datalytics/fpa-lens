# FPA Lens CMS — Action Item Checklist

**Active action items only.** When one is done: mark it `[x]`, then move it out of this file into
`cms-completed.md` with a date/time stamp. Rationale and parking-lot ideas live in `cms-notes.md`.

**Status:** **LIVE in production on fpalens.org** (team Neon DB + public Blob store for photos),
verified end-to-end incl. edit-to-live and staff photo uploads. Portal is branded + fully wired
(home/staff/footer) with live preview. The only held item is editor invites (until Oscar finishes
testing).

---

## Pending review
- [ ] Merge `cms-polish` → main (staff-list thumbnails, editor user-list scoping, bio-aware cards,
      README/CLAUDE CMS docs) — verified locally, awaiting Oscar's OK

## On hold (do NOT start until Oscar finishes testing)
- [ ] Send the 4 editors their set-password invites (Resend) — **HOLD per Oscar**

## Handoff / follow-ups
- [ ] Add Ben/Asher as co-admins on the Neon project (team already owns the Vercel project)
- [ ] Add page-copy globals for other pages as desired (About, section explainers)
- [ ] (Optional) serve media via direct blob CDN URLs instead of the `/api/media/file` proxy
