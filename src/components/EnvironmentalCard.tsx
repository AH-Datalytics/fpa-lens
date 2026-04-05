"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wind, ArrowRight } from "lucide-react";
import RiskBadge, { riskBorder, riskBg, riskText } from "@/components/RiskBadge";
import type { LakefrontData } from "@/lib/lakefrontRisk";

export default function EnvironmentalCard() {
  const [data, setData] = useState<LakefrontData | null>(null);

  useEffect(() => {
    fetch("/api/lakefront")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json && !json.error) setData(json);
      })
      .catch(() => {});
  }, []);

  // Loading skeleton
  if (!data) {
    return (
      <div className="bg-white rounded-xl shadow-lg border-l-4 border-gray-300 p-6">
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

  const { risk, current } = data;

  return (
    <Link
      href="/environmental"
      className={`group bg-white rounded-xl shadow-lg border-l-4 ${riskBorder(risk.level)} p-6 hover:shadow-2xl transition-shadow duration-200`}
    >
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div
            className={`w-10 h-10 flex-shrink-0 ${riskBg(risk.level)} rounded-lg flex items-center justify-center`}
          >
            <Wind className="h-5 w-5 text-[#21355a]" />
          </div>
          <h3 className="font-semibold text-[#21355a] leading-tight">Environmental Conditions</h3>
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
          <div className="text-xl font-bold text-[#21355a]">
            {current.waterLevel.anomaly > 0 ? "+" : ""}
            {current.waterLevel.anomaly.toFixed(1)}
            <span className="text-sm font-normal text-gray-400"> ft</span>
          </div>
          <div className="text-xs text-gray-500">Surge Anomaly</div>
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
