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
import { getRiskAction, getRiskDescription } from "@/lib/lakefrontRisk";
import type { RiskLevel } from "@/lib/lakefrontRisk";
import { buildRiskAlertEmail } from "@/lib/riskAlertEmail";

export const dynamic = "force-dynamic";

const ALERT_TO = "police@leveepolice.org";
const ALERT_BCC = "oboochever@ahdatalytics.com";
const ALERT_FROM = "FPA Lens Alerts <alerts@fpalens.org>";
const DASHBOARD_URL = "https://fpalens.org/environment";

let resend: Resend | null = null;
function getResend() {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

const PREVIEW_TO = "oboochever@ahdatalytics.com";

type RiskInfo = {
  trending: "improving" | "stable" | "worsening";
  action: string;
  description: string;
  factors: string[];
};

async function sendRiskAlert(
  current: RiskLevel,
  previous: RiskLevel | null,
  risk: RiskInfo,
  to: string,
  bcc?: string,
  subjectPrefix = "",
) {
  const email = buildRiskAlertEmail({
    current,
    previous,
    trending: risk.trending,
    action: risk.action,
    description: risk.description,
    factors: risk.factors ?? [],
    dashboardUrl: DASHBOARD_URL,
    sentAt: new Date().toISOString(),
  });
  await getResend().emails.send({
    from: ALERT_FROM,
    to,
    bcc,
    subject: subjectPrefix + email.subject,
    text: email.text,
    html: email.html,
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

    // Preview/test mode: emails a styled sample to the data-ops contact ONLY,
    // without saving state or notifying ops. Auth-gated by CRON_SECRET above.
    //   ?preview=1                      -> current real conditions
    //   ?preview=1&level=ORANGE&trend=worsening -> sample of any level
    const { searchParams } = new URL(request.url);
    if (searchParams.get("preview")) {
      const lvl = ((searchParams.get("level")?.toUpperCase() as RiskLevel) || currentLevel || "YELLOW");
      const risk: RiskInfo =
        lvl === currentLevel && data.risk
          ? { trending: data.risk.trending, action: data.risk.action, description: data.risk.description, factors: data.risk.factors }
          : {
              trending: (searchParams.get("trend") as RiskInfo["trending"]) || "improving",
              action: getRiskAction(lvl),
              description: getRiskDescription(lvl),
              factors: [],
            };
      await sendRiskAlert(lvl, null, risk, PREVIEW_TO, undefined, "[TEST] ");
      return NextResponse.json({ ok: true, preview: lvl, sentTo: PREVIEW_TO });
    }

    let alertSent = false;

    if (currentLevel) {
      const lastLevel = await getLastRiskLevel();
      const levelChanged = lastLevel !== currentLevel;

      const LEVEL_ORDER: Record<RiskLevel, number> = { GREEN: 0, YELLOW: 1, ORANGE: 2, RED: 3 };
      const prevOrder = lastLevel ? LEVEL_ORDER[lastLevel] : -1;
      const currOrder = LEVEL_ORDER[currentLevel];

      // Alert on any level change except first-run GREEN (no news is no news).
      // All changes between elevated tiers (up or down) and all-clear are notified.
      const isFirstRunGreen = lastLevel === null && currentLevel === "GREEN";
      const shouldAlert = levelChanged && !isFirstRunGreen;

      if (shouldAlert) {
        try {
          await sendRiskAlert(currentLevel, lastLevel, data.risk, ALERT_TO, ALERT_BCC);
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
