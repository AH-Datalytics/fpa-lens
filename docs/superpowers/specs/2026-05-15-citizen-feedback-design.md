# Citizen Feedback Form — Design Spec

**Date:** 2026-05-15
**Feature:** Citizen feedback form on FPA Lens
**Recipient:** Lawrence Williams, SLFPA-E (lwilliams@slfpae.gov)

---

## Overview

Add a citizen-facing feedback form to FPA Lens so visitors can send questions or comments directly to the Flood Authority following the site's public launch and media coverage. The form replaces the existing external "Contact form" footer link and is also surfaced on the About page.

---

## Entry Points

- **Footer:** Replace the existing "Contact form" external link with an internal "Send feedback" link pointing to `/feedback`.
- **About page (`/about`, line 255):** Wire the existing "contact us" prose to link to `/feedback` instead of the external floodauthority.org contact page.

---

## Page: `/feedback`

### Layout

Standard content page wrapper (`max-w-3xl mx-auto px-4 py-12`), matching existing page typography (Inter, FPA navy `#21355a`).

### Header

```
Send Feedback
"Have a question or comment for the Flood Authority? Send us a note below."
```

### S&WB callout (muted, above form)

```
"For street flooding, drainage, water service, or sewage issues, contact the
Sewerage & Water Board of New Orleans at swbno.org"
```

### Form fields

| Field     | Type     | Required | Constraints              |
|-----------|----------|----------|--------------------------|
| Name      | text     | yes      | 1–100 chars              |
| Email     | email    | yes      | valid email, 5–200 chars |
| Topic     | select   | yes      | enum (see below)         |
| Message   | textarea | yes      | 10–5000 chars            |
| `company` | text     | hidden   | honeypot — must be empty |

**Topic options:**
- Levees / Floodgates
- Turf maintenance
- Lakefront flooding
- Media inquiry
- Other

### Submit button

Labeled "Send feedback". Disabled + shows loading state while the POST is in flight.

### Success state (replaces form on 200)

```
"Thanks. Your message has been sent to the Flood Authority.
 We'll follow up if a response is needed."
```

### Error state (banner above form, form retained)

```
"Something went wrong. Please try again, or contact the Flood Authority directly at
 floodauthority.org/about-us/contact-us/"
```

Link opens in new tab.

---

## API Route: `POST /api/feedback`

### Request body

```ts
{
  name: string;
  email: string;
  topic: string;
  message: string;
  company: string; // honeypot
}
```

### Processing order

1. **Rate limit** — parse `x-forwarded-for` for IP (fallback: `"unknown"`). Reject `429` if > 5 submissions from the same IP in the last hour. Uses an in-memory `Map<ip, number[]>` of timestamps.
2. **Honeypot** — if `company !== ""`, return `204` silently (no email sent, bots don't learn the trip).
3. **Zod validation** — validate all fields against schema. Return `400` with field errors on failure.
4. **Send via Resend SDK:**
   - `from`: `FPA Lens Feedback <feedback@fpalens.org>`
   - `to`: `lwilliams@slfpae.gov`
   - `replyTo`: citizen's email address
   - `subject`: `[FPA Lens] {topic} — from {name}`
   - `text`: plain-text body with name, email, topic, message, and submitted-at ISO timestamp
5. Resend failure → `console.error`, return `500`.
6. Resend success → return `200 { ok: true }`.

No BCC.

---

## Email Infrastructure

- **Sending domain:** `fpalens.org` (registered on GoDaddy)
- **DNS setup required:** Add Resend's SPF (TXT) and DKIM (CNAME) records in GoDaddy DNS manager for `fpalens.org`. Resend dashboard generates the exact record values.
- **Dependency:** `resend` npm package + `RESEND_API_KEY` env var added to Vercel project settings.

---

## Spam Protection

- Honeypot field (`company`) — hidden via CSS, must be empty. Silent 204 on trip.
- Per-IP rate limit — 5 submissions / hour, in-memory. Upgrade to Upstash Redis if abuse warrants it.
- No captcha at launch.

---

## Files to Create / Modify

| Action | Path |
|--------|------|
| Create | `src/app/feedback/page.tsx` |
| Create | `src/app/api/feedback/route.ts` |
| Modify | `src/components/Footer.tsx` — replace external contact link with `/feedback` |
| Modify | `src/app/about/page.tsx` line ~255 — wire "contact us" to `/feedback` |

---

## Out of Scope

- Auto-reply email to citizen
- Analytics / submission logging
- Admin dashboard for viewing past submissions
- Captcha (revisit if spam becomes a problem)
- Routing logic by topic (Lawrence receives all topics)
