import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

const resend = new Resend(process.env.RESEND_API_KEY);

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
