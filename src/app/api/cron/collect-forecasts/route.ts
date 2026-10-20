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
import { getRiskAlertState, saveRiskAlertState } from "@/lib/riskAlertStore";
import { getRiskAction, getRiskDescription } from "@/lib/lakefrontRisk";
import type { RiskLevel } from "@/lib/lakefrontRisk";
import { buildRiskAlertEmail } from "@/lib/riskAlertEmail";
import { decideRiskAlert, type AlertKind } from "@/lib/riskAlertDecision";

export const dynamic = "force-dynamic";

// Recipients come from RISK_ALERT_TO (comma-separated) so the rollout can be
// staged without a code change: Ben's inbox for testing, then the Chief and
// Captain, then police@leveepolice.org (which reaches every officer). Unset
// falls back to the data-ops inbox only, never to Police.
const ALERT_TO = (process.env.RISK_ALERT_TO || "admin@ahdatalytics.com")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const ALERT_BCC = "admin@ahdatalytics.com";
const ALERT_FROM = "FPA Lens Alerts <alerts@fpalens.org>";
const DASHBOARD_URL = "https://fpalens.org/environment";

let resend: Resend | null = null;
function getResend() {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

const PREVIEW_TO = "admin@ahdatalytics.com";

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
  to: string | string[],
  bcc?: string,
  subjectPrefix = "",
  kind?: AlertKind,
) {
  const email = buildRiskAlertEmail({
    current,
    previous,
    kind,
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
      // Stored state = the level we last NOTIFIED about, when, and any drop
      // still on hold. See riskAlertDecision.ts for the policy.
      const state = await getRiskAlertState();
      const { send, kind, next } = decideRiskAlert(state, currentLevel);

      if (send) {
        try {
          await sendRiskAlert(currentLevel, state?.level ?? null, data.risk, ALERT_TO, ALERT_BCC, "", kind);
          alertSent = true;
          await saveRiskAlertState(next); // advance only after a successful send
        } catch (err) {
          console.error("Risk alert email failed:", err);
          // Leave the state unchanged so the alert retries on the next run.
        }
      } else if (JSON.stringify(next) !== JSON.stringify(state)) {
        await saveRiskAlertState(next); // first seed, or a drop's hold starting/ending
      }
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
