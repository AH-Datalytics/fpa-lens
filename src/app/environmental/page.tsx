"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Wind,
  Waves,
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Info,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import SectionHeader, { SectionSubheader } from "@/components/SectionHeader";
import DataCard from "@/components/DataCard";
import { RiskIndicator } from "@/components/RiskBadge";
import RiskBadge from "@/components/RiskBadge";
import type { LakefrontData, RiskLevel } from "@/lib/lakefrontRisk";
import { RISK_THRESHOLDS } from "@/lib/lakefrontRisk";

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

const RISK_COLORS: Record<RiskLevel, string> = {
  GREEN: "#16a34a",
  YELLOW: "#ca8a04",
  ORANGE: "#ea580c",
  RED: "#dc2626",
};

const TRENDING_ICONS = {
  improving: TrendingDown,
  stable: Minus,
  worsening: TrendingUp,
};

const TRENDING_LABELS = {
  improving: "Improving",
  stable: "Stable",
  worsening: "Worsening",
};

const TRENDING_COLORS = {
  improving: "text-green-600",
  stable: "text-gray-500",
  worsening: "text-red-600",
};

function formatTime(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoStr;
  }
}

function formatDateTime(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoStr;
  }
}

export default function EnvironmentalPage() {
  const [data, setData] = useState<LakefrontData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await fetch("/api/lakefront");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch {
      if (!data) setError("Unable to load environmental data.");
    } finally {
      if (manual) setRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Loading state
  if (!data && !error) {
    return (
      <div className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-96 flex items-center justify-center text-gray-500">
            Loading environmental data...
          </div>
        </div>
      </div>
    );
  }

  // Error state (no data at all)
  if (!data && error) {
    return (
      <div className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="h-96 flex flex-col items-center justify-center gap-4 text-gray-500">
            <p>{error}</p>
            <button
              onClick={() => fetchData(true)}
              className="px-4 py-2 bg-[#21355a] text-white rounded-lg text-sm hover:bg-[#2c3859] transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { risk, current, forecast, alerts } = data;
  const TrendIcon = TRENDING_ICONS[risk.trending];

  // Build forecast chart data
  const chartData = forecast
    .filter((p) => p.windSpeed !== null || p.waterLevel !== null)
    .map((p) => ({
      time: formatTime(p.timestamp),
      fullTime: formatDateTime(p.timestamp),
      windSpeed: p.windSpeed !== null ? Math.round(p.windSpeed * 10) / 10 : null,
      waterLevel: p.waterLevel !== null ? Math.round(p.waterLevel * 100) / 100 : null,
    }))
    .filter((_, i) => i % 2 === 0); // Every 2 hours for readability

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          title="Environmental Conditions"
          subtitle="Real-time lakefront flood risk assessment for Lakeshore Drive"
          source={`NOAA Station ${data.stationId} (${data.stationName}) & NWS`}
        />

        {/* Stale data warning */}
        {error && data && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>Data may be stale. Last successful update: {formatDateTime(data.lastUpdated)}</span>
          </div>
        )}

        {/* Hero Risk Indicator */}
        <section className="mb-12">
          <div className="bg-white rounded-xl shadow-md p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
              <div className="flex-1">
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                  Lakefront Flood Risk
                </h2>
                <RiskIndicator level={risk.level} action={risk.action} />
              </div>
              <div className="flex flex-col items-end gap-3">
                <div className="flex items-center gap-2">
                  <TrendIcon className={`h-4 w-4 ${TRENDING_COLORS[risk.trending]}`} />
                  <span className={`text-sm font-medium ${TRENDING_COLORS[risk.trending]}`}>
                    {TRENDING_LABELS[risk.trending]}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>Updated {formatDateTime(data.lastUpdated)}</span>
                  <button
                    onClick={() => fetchData(true)}
                    disabled={refreshing}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Refresh data"
                  >
                    <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Contributing Factors */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Contributing Factors
              </h3>
              <ul className="space-y-1">
                {risk.factors.map((factor, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: RISK_COLORS[risk.level] }}
                    />
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Current Conditions */}
        <section className="mb-12">
          <SectionSubheader title="Current Conditions" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Wind */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Wind
                </span>
                <Wind className="h-6 w-6 text-[#21355a]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#21355a]">
                  {current.wind.speed.toFixed(0)}
                </span>
                <span className="text-sm text-gray-500">kt from {current.wind.cardinal}</span>
              </div>
              {current.wind.gust > current.wind.speed && (
                <p className="text-xs text-gray-500 mt-1">
                  Gusts to {current.wind.gust.toFixed(0)} kt
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                {risk.isOnshore ? "Onshore (pushing toward Lakeshore Dr.)" : "Offshore (away from shore)"}
              </p>
            </div>

            {/* Lake Level */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Lake Level
                </span>
                <Waves className="h-6 w-6 text-[#21355a]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#21355a]">
                  {current.waterLevel.level.toFixed(2)}
                </span>
                <span className="text-sm text-gray-500">ft MLLW</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Predicted: {current.waterLevel.predicted.toFixed(2)} ft
              </p>
            </div>

            {/* Surge Anomaly */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Surge Anomaly
                </span>
                <TrendingUp className="h-6 w-6 text-[#21355a]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${
                  current.waterLevel.anomaly >= RISK_THRESHOLDS.SURGE_ORANGE
                    ? "text-orange-600"
                    : current.waterLevel.anomaly >= RISK_THRESHOLDS.SURGE_YELLOW
                      ? "text-yellow-600"
                      : "text-[#21355a]"
                }`}>
                  {current.waterLevel.anomaly > 0 ? "+" : ""}
                  {current.waterLevel.anomaly.toFixed(2)}
                </span>
                <span className="text-sm text-gray-500">ft</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Difference from tidal prediction
              </p>
            </div>

            {/* Barometric Pressure */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Pressure
                </span>
                <Gauge className="h-6 w-6 text-[#21355a]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#21355a]">
                  {current.pressure.value.toFixed(1)}
                </span>
                <span className="text-sm text-gray-500">mb</span>
              </div>
            </div>
          </div>
        </section>

        {/* Forecast Timeline */}
        {chartData.length > 0 && (
          <section className="mb-12">
            <SectionSubheader title="48-Hour Forecast" />
            <DataCard title="Wind Speed & Water Level Forecast" source="NWS Hourly Forecast & NOAA NGOFS2 Model">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      yAxisId="wind"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                      label={{ value: "Wind (kt)", angle: 90, position: "insideRight", style: { fontSize: 11 } }}
                    />
                    <YAxis
                      yAxisId="water"
                      orientation="left"
                      tick={{ fontSize: 11 }}
                      label={{ value: "Water Level (ft)", angle: -90, position: "insideLeft", style: { fontSize: 11 } }}
                    />
                    <Tooltip
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime || ""}
                      formatter={(value, name) => {
                        if (name === "Wind Speed") return [`${value} kt`, name];
                        if (name === "Water Level") return [`${value} ft`, name];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <ReferenceLine
                      yAxisId="wind"
                      y={RISK_THRESHOLDS.WIND_YELLOW}
                      stroke="#ca8a04"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                      label={{ value: "15 kt", position: "right", fontSize: 10, fill: "#ca8a04" }}
                    />
                    <ReferenceLine
                      yAxisId="wind"
                      y={RISK_THRESHOLDS.WIND_ORANGE}
                      stroke="#ea580c"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                      label={{ value: "25 kt", position: "right", fontSize: 10, fill: "#ea580c" }}
                    />
                    <Area
                      yAxisId="water"
                      type="monotone"
                      dataKey="waterLevel"
                      fill="#60a5fa"
                      fillOpacity={0.2}
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Water Level"
                      connectNulls
                    />
                    <Line
                      yAxisId="wind"
                      type="monotone"
                      dataKey="windSpeed"
                      stroke="#21355a"
                      strokeWidth={2}
                      dot={false}
                      name="Wind Speed"
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Wind speed thresholds shown assume onshore (northerly) direction. Water level from NOAA NGOFS2 model.
              </p>
            </DataCard>
          </section>
        )}

        {/* Active NWS Alerts */}
        {alerts.length > 0 && (
          <section className="mb-12">
            <SectionSubheader title="Active Weather Alerts" />
            <div className="space-y-4">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`bg-white rounded-r-lg p-4 shadow-sm border-l-4 ${
                    alert.severity === "Extreme" || alert.severity === "Severe"
                      ? "border-red-500"
                      : alert.severity === "Moderate"
                        ? "border-orange-400"
                        : "border-amber-400"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{alert.event}</h3>
                      <p className="text-sm text-gray-700 mt-1">{alert.headline}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                      alert.severity === "Extreme" || alert.severity === "Severe"
                        ? "bg-red-100 text-red-700"
                        : alert.severity === "Moderate"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-amber-100 text-amber-700"
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                  {alert.expires && (
                    <p className="text-xs text-gray-400 mt-2">
                      Expires: {formatDateTime(alert.expires)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Threshold Reference */}
        <section className="mb-12">
          <SectionSubheader title="Risk Level Thresholds" />
          <DataCard title="What triggers each risk level" source="SLFPA-E Operational Thresholds">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 font-semibold text-gray-700">Wind (onshore)</th>
                    <th className="text-left py-3 font-semibold text-gray-700">Surge Anomaly</th>
                    <th className="text-left py-3 font-semibold text-gray-700">Recommended Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 bg-green-50/50">
                    <td className="py-3"><RiskBadge level="GREEN" size="sm" /></td>
                    <td className="py-3 text-gray-600">&lt; 15 kt or offshore</td>
                    <td className="py-3 text-gray-600">&lt; 0.5 ft</td>
                    <td className="py-3 text-gray-600">No action</td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-yellow-50/50">
                    <td className="py-3"><RiskBadge level="YELLOW" size="sm" /></td>
                    <td className="py-3 text-gray-600">15 - 25 kt</td>
                    <td className="py-3 text-gray-600">0.5 - 1.0 ft</td>
                    <td className="py-3 text-gray-600">Monitor conditions</td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-orange-50/50">
                    <td className="py-3"><RiskBadge level="ORANGE" size="sm" /></td>
                    <td className="py-3 text-gray-600">25 - 35 kt</td>
                    <td className="py-3 text-gray-600">1.0 - 1.5 ft</td>
                    <td className="py-3 text-gray-600">Stage barricades</td>
                  </tr>
                  <tr className="bg-red-50/50">
                    <td className="py-3"><RiskBadge level="RED" size="sm" /></td>
                    <td className="py-3 text-gray-600">&gt; 35 kt</td>
                    <td className="py-3 text-gray-600">&gt; 1.5 ft</td>
                    <td className="py-3 text-gray-600">Close roadway</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Wind thresholds apply when wind direction is onshore (roughly NW through N to NE, 315-045 degrees),
              which pushes Lake Pontchartrain water toward the south shore and Lakeshore Drive.
              The risk level is the <strong>higher</strong> of the wind-based and surge-based assessments.
              If the forecast shows worse conditions within 6 hours, the current level is escalated by one tier.
            </p>
            <p className="text-xs text-amber-600 mt-2">
              These thresholds are preliminary and subject to calibration based on operational experience.
            </p>
          </DataCard>
        </section>

        {/* Data Sources */}
        <section>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-gray-500 space-y-1">
                <p>
                  Current conditions from{" "}
                  <a
                    href="https://tidesandcurrents.noaa.gov/stationhome.html?id=8761927"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#21355a] underline inline-flex items-center gap-0.5"
                  >
                    NOAA CO-OPS Station 8761927 (New Canal Station)
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  , updated every 6 minutes.
                </p>
                <p>
                  Wind forecasts from the National Weather Service (NWS Slidell, LA office).
                  Water level forecasts from NOAA&apos;s NGOFS2 operational model.
                  Weather alerts from NWS.
                </p>
                <p>
                  The risk indicator is a rule-based decision-support tool. It does not replace
                  professional judgment or official NWS warnings. Always follow official
                  SLFPA-E operational procedures.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
