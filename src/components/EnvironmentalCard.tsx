"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wind, ArrowRight, AlertTriangle } from "lucide-react";
import RiskBadge, { riskBorder, riskBg, riskText } from "@/components/RiskBadge";
import type { LakefrontData } from "@/lib/lakefrontRisk";

/** How long the home card waits on /api/lakefront before giving up. The
 *  route itself caps each upstream fetch at 10 s, so a hang past this is the
 *  route, not NOAA, and the visitor should see "unavailable", not a pulse. */
const FETCH_TIMEOUT_MS = 10_000;

type Status = "loading" | "ready" | "unavailable";

export default function EnvironmentalCard() {
  const [data, setData] = useState<LakefrontData | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let cancelled = false;

    fetch("/api/lakefront", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        if (json && !json.error) {
          setData(json);
          setStatus("ready");
        } else {
          setStatus("unavailable");
        }
      })
      .catch(() => {
        // Network error, non-JSON body, or our own abort on timeout: every
        // one of these used to leave the skeleton pulsing forever.
        if (!cancelled) setStatus("unavailable");
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  // Loading skeleton
  if (status === "loading") {
    return (
      <div className="bg-white rounded-xl shadow-lg border-l-4 border-gray-300 p-6" role="status" aria-label="Loading environmental conditions">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              <div className="h-4 w-36 bg-gray-200 rounded" />
            </div>
            <div className="h-6 w-20 bg-gray-200 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="text-center">
              <div className="h-6 w-12 bg-gray-200 rounded mx-auto mb-1" />
              <div className="h-3 w-16 bg-gray-200 rounded mx-auto" />
            </div>
            <div className="text-center">
              <div className="h-6 w-12 bg-gray-200 rounded mx-auto mb-1" />
              <div className="h-3 w-20 bg-gray-200 rounded mx-auto" />
            </div>
          </div>
          <div className="h-4 w-full bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  // Explicit unavailable state: the card still leads to the full page, where
  // the retry button and the per-sensor notes live.
  if (status === "unavailable" || !data) {
    return (
      <Link
        href="/environment"
        className="group bg-white rounded-xl shadow-lg border-l-4 border-gray-300 p-6 hover:shadow-2xl transition-shadow duration-200"
      >
        <div className="mb-4">
          <div className="flex items-start gap-3 mb-2">
            <div className="w-10 h-10 flex-shrink-0 bg-gray-100 rounded-lg flex items-center justify-center">
              <Wind className="h-5 w-5 text-[#21355a]" />
            </div>
            <div className="leading-tight">
              <h3 className="font-semibold text-[#21355a]">Environmental Conditions</h3>
              <p className="text-xs text-gray-500 mt-0.5">Lakeshore Drive flood risk</p>
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2 text-sm text-amber-700 mb-4">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>Live conditions unavailable. Do not read this as an all-clear.</span>
        </div>
        <div className="mt-4 flex items-center text-sm font-medium text-[#21355a]">
          Open the environment page
          <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </Link>
    );
  }

  const { risk, current, dataGaps = [] } = data;
  // The route fills a failed water-level or prediction fetch with 0, so the
  // anomaly is only a reading when neither source is in dataGaps.
  const anomalyUnavailable = dataGaps.includes("water level") || dataGaps.includes("predictions");

  return (
    <Link
      href="/environment"
      className={`group bg-white rounded-xl shadow-lg border-l-4 ${riskBorder(risk.level)} p-6 hover:shadow-2xl transition-shadow duration-200`}
    >
      <div className="mb-4">
        <div className="flex items-start gap-3 mb-2">
          <div
            className={`w-10 h-10 flex-shrink-0 ${riskBg(risk.level)} rounded-lg flex items-center justify-center`}
          >
            <Wind className="h-5 w-5 text-[#21355a]" />
          </div>
          <div className="leading-tight">
            <h3 className="font-semibold text-[#21355a]">Environmental Conditions</h3>
            <p className="text-xs text-gray-500 mt-0.5">Lakeshore Drive flood risk</p>
          </div>
        </div>
        <RiskBadge
          level={risk.level}
          size="sm"
          tooltip={risk.action}
          tooltipAlign="left"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center">
          {current.wind.cardinal === "N/A" && current.wind.speed === 0 ? (
            <>
              <div className="text-xl font-semibold text-gray-300">N/A</div>
              <div className="text-xs text-amber-600">Sensor offline</div>
            </>
          ) : (
            <>
              <div className="text-xl font-bold text-[#21355a]">
                {current.wind.speed.toFixed(0)}
                <span className="text-sm font-normal text-gray-400"> kt</span>
              </div>
              <div className="text-xs text-gray-500">Wind ({current.wind.cardinal})</div>
            </>
          )}
        </div>
        <div className="text-center">
          {anomalyUnavailable ? (
            <>
              <div className="text-xl font-semibold text-gray-300">N/A</div>
              <div className="text-xs text-amber-600">Surge data offline</div>
            </>
          ) : (
            <>
              <div className="text-xl font-bold text-[#21355a]">
                {current.waterLevel.anomaly > 0 ? "+" : ""}
                {current.waterLevel.anomaly.toFixed(1)}
                <span className="text-sm font-normal text-gray-400"> ft</span>
              </div>
              <div className="text-xs text-gray-500">Surge Anomaly</div>
            </>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-600 line-clamp-2">{risk.action}</p>
      <div
        className={`mt-4 flex items-center text-sm font-medium ${riskText(risk.level)}`}
      >
        View details
        <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}
