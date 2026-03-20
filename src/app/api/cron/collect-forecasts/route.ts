/**
 * Cron endpoint for collecting forecast snapshots.
 *
 * Triggered by Vercel Cron every 5 minutes. Calls the lakefront API
 * internally to fetch fresh data and store forecast snapshots.
 *
 * Protected by CRON_SECRET to prevent unauthorized invocation.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify cron secret to prevent public access
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Call the lakefront API internally — this triggers data fetch + snapshot storage
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/lakefront`, {
      headers: { "Cache-Control": "no-cache" },
    });

    if (!res.ok) {
      throw new Error(`Lakefront API returned ${res.status}`);
    }

    const data = await res.json();
    const snapshotCount = Object.keys(data.storedForecasts || {}).length;

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      snapshotCount,
      riskLevel: data.risk?.level,
    });
  } catch (error) {
    console.error("Cron collect-forecasts error:", error);
    return NextResponse.json(
      { error: "Failed to collect forecasts" },
      { status: 500 }
    );
  }
}
