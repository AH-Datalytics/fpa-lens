# FPA Lens CMS — Action Item Checklist

**Active action items only.** When one is done: mark it `[x]`, then move it out of this file into
`cms-completed.md` with a date/time stamp. Rationale and parking-lot ideas live in `cms-notes.md`.

**Status:** **LIVE in production on fpalens.org** (team Neon DB + public Blob store for photos),
verified end-to-end incl. edit-to-live and staff photo uploads. Portal is branded + fully wired
(home/staff/footer) with live preview. The only held item is editor invites (until Oscar finishes
testing).

---

## Pending review
- [ ] Merge `cms-polish` → main — verified locally, awaiting Oscar's OK. Includes: editable copy on
      every page (Page Content globals), staff-list thumbnails, editor user-list scoping, bio-aware
      cards, and README/CLAUDE CMS docs.

## On hold (do NOT start until Oscar finishes testing)
- [ ] Send the 4 editors their set-password invites (Resend) — **HOLD per Oscar**

## Handoff / follow-ups
- [ ] Add Ben/Asher as co-admins on the Neon project (team already owns the Vercel project)
- [ ] (Optional) serve media via direct blob CDN URLs instead of the `/api/media/file` proxy
- [ ] (Optional) lift the client pages that show edited copy on first paint (currently a brief
      defaults-then-edited flash on reworded strings) into server wrappers, if that flash matters
