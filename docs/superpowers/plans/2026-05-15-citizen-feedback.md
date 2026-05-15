# Citizen Feedback Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/feedback` page with a form that emails submissions to Lawrence Williams at SLFPA-E via Resend.

**Architecture:** A client-component form page POSTs to a Next.js App Router API route that rate-limits, checks a honeypot, validates with Zod, and sends via Resend. Two existing files (Footer, About page) gain a link to `/feedback`.

**Tech Stack:** Next.js 16 App Router, Resend SDK, Zod, Tailwind CSS v4

---

## Pre-Code: DNS + Resend Domain Setup (manual, do before deploying)

These steps must be completed before the email feature can send in production. They are independent of the code tasks and can be done in parallel.

- [ ] **Step 1: Add fpalens.org as a verified domain in Resend**

  Log in to Resend dashboard → Domains → Add Domain → enter `fpalens.org`.
  Resend will display two DNS records to add.

- [ ] **Step 2: Add DNS records in GoDaddy**

  Log in to GoDaddy → My Products → fpalens.org → DNS.
  Add the two records Resend showed you (one TXT for SPF, one CNAME for DKIM).
  DNS propagation takes up to 30 minutes.

- [ ] **Step 3: Verify domain in Resend**

  Back in the Resend dashboard, click "Verify" on the fpalens.org domain.
  Status should change to "Verified". If not, wait 10 minutes and retry.

- [ ] **Step 4: Add RESEND_API_KEY to Vercel**

  Vercel dashboard → fpa project → Settings → Environment Variables.
  Add `RESEND_API_KEY` with the API key from Resend dashboard → API Keys.
  Apply to Production + Preview + Development environments.

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install resend and zod**

```bash
cd /Users/OscarBoochever/Development/fpa
npm install resend zod
```

Expected output: both packages appear in `package.json` dependencies.

- [ ] **Step 2: Add RESEND_API_KEY to local env**

Add to `.env.local` (create the file if it doesn't exist):

```
RESEND_API_KEY=re_your_key_here
```

> Note: `.env.local` is gitignored. Paste your real Resend API key from the Resend dashboard. For local testing you can use a test key — Resend won't deliver but will return 200.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install resend and zod for feedback form"
```

---

## Task 2: Create the API Route

**Files:**
- Create: `src/app/api/feedback/route.ts`

- [ ] **Step 1: Create the file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

const resend = new Resend(process.env.RESEND_API_KEY);

// In-memory rate limiter — fine for low volume; swap to Upstash if abused
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const prev = (rateLimitMap.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (prev.length >= RATE_LIMIT) return true;
  rateLimitMap.set(ip, [...prev, now]);
  return false;
}

const TOPICS = [
  "Levees / Floodgates",
  "Turf maintenance",
  "Lakefront flooding",
  "Media inquiry",
  "Other",
] as const;

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().min(5).max(200),
  topic: z.enum(TOPICS),
  message: z.string().min(10).max(5000),
  company: z.string(),
});

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Honeypot: silent 204 so bots don't learn they tripped it
  const company = typeof body.company === "string" ? body.company : "";
  if (company !== "") {
    return new NextResponse(null, { status: 204 });
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { name, email, topic, message } = result.data;

  const { error } = await resend.emails.send({
    from: "FPA Lens Feedback <feedback@fpalens.org>",
    to: "lwilliams@slfpae.gov",
    replyTo: email,
    subject: `[FPA Lens] ${topic} — from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\nMessage:\n${message}\n\n---\nSubmitted: ${new Date().toISOString()}`,
  });

  if (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual test — valid submission**

Start the dev server (`npm run dev`), then in a separate terminal:

```bash
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","topic":"Other","message":"This is a test message with enough length.","company":""}'
```

Expected: `{"ok":true}` and an email arrives in Lawrence's inbox (or a logged Resend response if DNS isn't verified yet).

- [ ] **Step 4: Manual test — honeypot trip**

```bash
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"name":"Bot","email":"bot@spam.com","topic":"Other","message":"spam","company":"botvalue"}'
```

Expected: HTTP 204, no response body, no email.

- [ ] **Step 5: Manual test — validation failure**

```bash
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"name":"","email":"notanemail","topic":"InvalidTopic","message":"short","company":""}'
```

Expected: HTTP 400 with a JSON error object.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/feedback/route.ts
git commit -m "feat: add /api/feedback route with rate limiting, honeypot, and Resend"
```

---

## Task 3: Create the Feedback Page

**Files:**
- Create: `src/app/feedback/page.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useState } from "react";
import SectionHeader from "@/components/SectionHeader";

const TOPICS = [
  "Levees / Floodgates",
  "Turf maintenance",
  "Lakefront flooding",
  "Media inquiry",
  "Other",
] as const;

type Status = "idle" | "submitting" | "success" | "error";

export default function FeedbackPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");

    const form = e.currentTarget;
    const company = (
      form.elements.namedItem("company") as HTMLInputElement
    ).value;

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, topic, message, company }),
      });

      if (res.ok || res.status === 204) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeader title="Send Feedback" />
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <p className="text-green-800">
              Thanks. Your message has been sent to the Flood Authority.
              We&apos;ll follow up if a response is needed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Send Feedback"
          subtitle="Have a question or comment for the Flood Authority? Send us a note below."
        />

        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-500">
          For street flooding, drainage, water service, or sewage issues,
          contact the Sewerage &amp; Water Board of New Orleans at{" "}
          <a
            href="https://www.swbno.org"
            className="text-[#21355a] underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            swbno.org
          </a>
          .
        </div>

        {status === "error" && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            Something went wrong. Please try again, or{" "}
            <a
              href="https://www.floodauthority.org/about-us/contact-us/"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              contact the Flood Authority directly
            </a>
            .
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Honeypot — hidden from humans, filled by bots */}
          <input
            type="text"
            name="company"
            defaultValue=""
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ display: "none" }}
          />

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#21355a] focus:border-[#21355a]"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              required
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#21355a] focus:border-[#21355a]"
            />
          </div>

          <div>
            <label
              htmlFor="topic"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Topic <span className="text-red-500">*</span>
            </label>
            <select
              id="topic"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#21355a] focus:border-[#21355a] bg-white"
            >
              <option value="" disabled>
                Select one
              </option>
              {TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="message"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              required
              minLength={10}
              maxLength={5000}
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#21355a] focus:border-[#21355a] resize-y"
            />
          </div>

          <button
            type="submit"
            disabled={status === "submitting"}
            className="bg-[#21355a] text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-[#1a2847] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === "submitting" ? "Sending..." : "Send feedback"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual test in browser**

Visit `http://localhost:3000/feedback`.

Verify:
- S&WB callout renders above the form
- All four fields are present with correct labels
- Submit with a blank required field → browser native validation blocks submission
- Submit a valid form → button shows "Sending...", then success message replaces the form

- [ ] **Step 4: Commit**

```bash
git add src/app/feedback/page.tsx
git commit -m "feat: add /feedback page with citizen feedback form"
```

---

## Task 4: Update Footer and About Page

**Files:**
- Modify: `src/components/Footer.tsx`
- Modify: `src/app/about/page.tsx`

- [ ] **Step 1: Update Footer.tsx**

In `src/components/Footer.tsx`, the Contact section currently has an external link to floodauthority.org/contact/. Replace it with an internal Link.

Change the import line at the top — add `MessageSquare` to the lucide import:

```tsx
import { MapPin, Phone, ExternalLink, Scissors, FileText, MessageSquare } from "lucide-react";
```

Replace the existing `<a>` tag for the contact form (the one with `href="https://www.floodauthority.org/contact/"`) with:

```tsx
<Link
  href="/feedback"
  className="flex items-center gap-2 hover:text-white transition-colors"
>
  <MessageSquare className="h-4 w-4" />
  Send feedback
</Link>
```

> `Link` is already imported from `next/link` at the top of Footer.tsx. No new import needed.

- [ ] **Step 2: Update About page**

In `src/app/about/page.tsx`, find line 255:

```tsx
For concerns about levees, floodgates, or storm surge protection, contact us.
```

Replace with:

```tsx
For concerns about levees, floodgates, or storm surge protection,{" "}
<Link href="/feedback" className="text-[#21355a] underline">
  contact us
</Link>
.
```

Add the Link import at the top of `src/app/about/page.tsx` if not present:

```tsx
import Link from "next/link";
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual test in browser**

- Visit `http://localhost:3000` — scroll to footer, confirm "Send feedback" link appears and navigates to `/feedback`
- Visit `http://localhost:3000/about` — scroll to the reporting-an-issue callout (bottom of page), confirm "contact us" is a link that navigates to `/feedback`

- [ ] **Step 5: Commit**

```bash
git add src/components/Footer.tsx src/app/about/page.tsx
git commit -m "feat: wire footer and about page contact links to /feedback"
```
