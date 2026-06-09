import { NextRequest, NextResponse } from "next/server";
import {
  computeStageTiming,
  normalizePermit,
  type PermitsResponse,
  type RawPermit,
} from "@/lib/permits";

export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const base = process.env.PERMIT_API_URL;
  const password = process.env.PERMIT_API_PASSWORD;

  if (!base || !password) {
    return NextResponse.json({ error: "Permit API not configured" }, { status: 503 });
  }

  const { searchParams } = request.nextUrl;
  const startDate = searchParams.get("startDate") ?? "2024-01-01";
  const endDate = searchParams.get("endDate") ?? new Date().toISOString().slice(0, 10);

  const upstream = new URL(base);
  upstream.searchParams.set("startDate", startDate);
  upstream.searchParams.set("enddate", endDate); // Vinformatix uses lowercase 'enddate'

  try {
    const credentials = Buffer.from(`analytics:${password}`).toString("base64");
    const res = await fetch(upstream.toString(), {
      headers: { Authorization: `Basic ${credentials}` },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      // Surface the upstream status so failures (401 auth vs 403 IP-block vs 5xx)
      // are diagnosable without leaking credentials.
      console.error(`Permit upstream returned ${res.status} ${res.statusText}`);
      return NextResponse.json(
        { error: "Upstream API error", upstreamStatus: res.status },
        { status: 502 },
      );
    }

    const raw = (await res.json()) as RawPermit[];
    const rows = Array.isArray(raw) ? raw : [];

    // Normalize to the UI vocabulary and drop unsubmitted drafts.
    const permits = rows.map(normalizePermit).filter((p) => p !== null);
    const stageTiming = computeStageTiming(rows);

    const payload: PermitsResponse = {
      asOf: new Date().toISOString(),
      windowStart: startDate,
      windowEnd: endDate,
      count: permits.length,
      stageTiming,
      permits,
    };

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Failed to fetch permits" }, { status: 500 });
  }
}
