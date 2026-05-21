import { NextRequest, NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const base = process.env.PERMIT_API_URL;
  const password = process.env.PERMIT_API_PASSWORD;

  if (!base || !password) {
    return NextResponse.json({ error: "Permit API not configured" }, { status: 503 });
  }

  const { searchParams } = request.nextUrl;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const upstream = new URL(base);
  if (startDate) upstream.searchParams.set("startDate", startDate);
  if (endDate)   upstream.searchParams.set("enddate", endDate); // Vinformatix uses lowercase 'enddate'

  try {
    const credentials = Buffer.from(`analytics:${password}`).toString("base64");
    const res = await fetch(upstream.toString(), {
      headers: { Authorization: `Basic ${credentials}` },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Upstream API error" }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch permits" }, { status: 500 });
  }
}
