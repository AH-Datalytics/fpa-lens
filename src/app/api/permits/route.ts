import { NextResponse } from "next/server";

export const revalidate = 3600; // cache 1 hour

export async function GET() {
  const url = process.env.PERMIT_API_URL;
  const password = process.env.PERMIT_API_PASSWORD;

  if (!url || !password) {
    return NextResponse.json({ error: "Permit API not configured" }, { status: 503 });
  }

  try {
    const credentials = Buffer.from(`analytics:${password}`).toString("base64");
    const res = await fetch(url, {
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
