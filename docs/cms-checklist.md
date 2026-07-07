# FPA Lens CMS — Action Item Checklist

**Active action items only.** When one is done: mark it `[x]`, then move it out of this file into
`cms-completed.md` with a date/time stamp. Rationale and parking-lot ideas live in `cms-notes.md`.

**Status:** **LIVE in production on fpalens.org** (team Neon DB + public Blob store for photos).
Admin-portal polish pass done + verified in a real browser (Playwright): editability audit
(prose-only), **real-time Live Preview** (updates as you type), a custom grouped/described admin
dashboard, editor-role hardening (Users hidden from editors), and Jeff→admin in the seed. Held
items: editor invites (until Oscar says go) and the prod-DB role change for Jeff.

---

## On hold (do NOT start until Oscar finishes testing)
- [ ] Send the 4 editors their set-password invites (Resend) — **HOLD per Oscar**

## Handoff / follow-ups
- [ ] Add Ben/Jeff Asher as co-admins on the Neon project (team already owns the Vercel project)
- [ ] (Optional) serve media via direct blob CDN URLs instead of the `/api/media/file` proxy
- [ ] (Optional) lift the client pages that show edited copy on first paint (currently a brief
      defaults-then-edited flash on reworded strings) into server wrappers, if that flash matters
