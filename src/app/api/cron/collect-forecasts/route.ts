/**
 * Cron endpoint for collecting forecast snapshots and sending risk-level alerts.
 *
 * Triggered by Vercel Cron every 5 minutes. Calls the lakefront API
 * internally to fetch fresh data, store forecast snapshots, and send email
 * alerts when the Lakefront flood risk level changes.
 *
 * Protected by CRON_SECRET to prevent unauthorized invocation.
 */

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getLastRiskLevel, saveRiskLevel } from "@/lib/riskAlertStore";
import type { RiskLevel } from "@/lib/lakefrontRisk";

export const dynamic = "force-dynamic";

const ALERT_TO = "police@leveepolice.org";
const ALERT_BCC = "oboochever@ahdatalytics.com";
const ALERT_FROM = "FPA Lens Alerts <feedback@fpalens.org>";
const DASHBOARD_URL = "https://fpalens.org/environment";

let resend: Resend | null = null;
function getResend() {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

const LEVEL_LABELS: Record<RiskLevel, string> = {
  GREEN: "GREEN — Normal",
  YELLOW: "YELLOW — Risk Developing",
  ORANGE: "ORANGE — Elevated Risk",
  RED: "RED — High Risk",
};

const LEVEL_ACTIONS: Record<RiskLevel, string> = {
  GREEN: "No action required.",
  YELLOW: "Monitor conditions. Risk is developing.",
  ORANGE: "Consider staging barricades and preparing for potential roadway closures.",
  RED: "Conditions indicate active or imminent Lakeshore Drive flooding. Implement roadway closures.",
};

async function sendRiskAlert(current: RiskLevel, previous: RiskLevel | null) {
  const isAllClear = current === "GREEN";
  const subject = isAllClear
    ? "[FPA Lens] All Clear — Lakeshore Drive Flood Risk"
    : `[FPA Lens] Flood Risk Alert: ${current} — Lakeshore Drive`;

  const previousLine = previous
    ? `Previous level: ${LEVEL_LABELS[previous]}\n`
    : "";

  const text = [
    isAllClear
      ? "The Lakeshore Drive flood risk has returned to normal."
      : "The Lakeshore Drive flood risk level has changed.",
    "",
    `Current level: ${LEVEL_LABELS[current]}`,
    previousLine,
    `Recommended action: ${LEVEL_ACTIONS[current]}`,
    "",
    `View live conditions: ${DASHBOARD_URL}`,
    "",
    `---`,
    `Sent: ${new Date().toISOString()}`,
    `This alert is generated automatically by FPA Lens.`,
  ].join("\n");

  await getResend().emails.send({
    from: ALERT_FROM,
    to: ALERT_TO,
    bcc: ALERT_BCC,
    subject,
    text,
  });
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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
    const currentLevel = data.risk?.level as RiskLevel | undefined;

    let alertSent = false;

    if (currentLevel) {
      const lastLevel = await getLastRiskLevel();
      const levelChanged = lastLevel !== currentLevel;

      const LEVEL_ORDER: Record<RiskLevel, number> = { GREEN: 0, YELLOW: 1, ORANGE: 2, RED: 3 };
      const prevOrder = lastLevel ? LEVEL_ORDER[lastLevel] : -1;
      const currOrder = LEVEL_ORDER[currentLevel];

      // Alert on any upward escalation, or when returning to GREEN (all-clear).
      // Never alert on de-escalation within elevated tiers (ORANGE→YELLOW).
      const isEscalation = levelChanged && currOrder > prevOrder && currentLevel !== "GREEN";
      const isAllClear = levelChanged && currentLevel === "GREEN" && lastLevel !== null && lastLevel !== "GREEN";
      const shouldAlert = isEscalation || isAllClear;

      if (shouldAlert) {
        try {
          await sendRiskAlert(currentLevel, lastLevel);
          alertSent = true;
        } catch (err) {
          console.error("Risk alert email failed:", err);
        }
      }

      await saveRiskLevel(currentLevel);
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      snapshotCount,
      riskLevel: currentLevel,
      alertSent,
    });
  } catch (error) {
    console.error("Cron collect-forecasts error:", error);
    return NextResponse.json(
      { error: "Failed to collect forecasts" },
      { status: 500 }
    );
  }
}
