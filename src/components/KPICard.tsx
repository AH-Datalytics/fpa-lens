import { ReactNode } from "react";
import StatusBadge from "./StatusBadge";
import { StatusLevel } from "@/data/siteData";

interface KPICardProps {
  label: string;
  value: string | number;
  total?: number;
  unit?: string;
  status?: StatusLevel;
  goal?: number;
  goalLabel?: string;
  subtitle?: string;
  icon?: ReactNode;
  source?: string;
}

export default function KPICard({
  label,
  value,
  total,
  unit,
  status,
  goal,
  goalLabel,
  subtitle,
  icon,
  source,
}: KPICardProps) {
  const isStatusCard = status !== undefined;
  const hasProgress = total !== undefined && typeof value === "number";
  const progressPercent = hasProgress ? (value / total) * 100 : 0;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </span>
        {icon && <span className="text-[#21355a]">{icon}</span>}
      </div>

      {isStatusCard ? (
        <div className="mt-2">
          <StatusBadge status={status} size="lg" />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#21355a]">{value}</span>
            {total && (
              <span className="text-lg text-gray-400">/ {total}</span>
            )}
            {unit && <span className="text-sm text-gray-500">{unit}</span>}
          </div>

          {hasProgress && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#65bc7b] h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
          )}

          {goal !== undefined && typeof value === 'number' && (
            <div className="flex items-center gap-2 text-sm">
              <span className={value <= goal ? "text-green-600" : "text-red-600"}>
                {value <= goal ? "On track" : "Exceeds goal"}
              </span>
              {goalLabel && <span className="text-gray-400">({goalLabel})</span>}
            </div>
          )}
        </div>
      )}

      {subtitle && (
        <p className="mt-2 text-xs text-gray-500">{subtitle}</p>
      )}

      {source && (
        <p className="mt-3 text-xs text-gray-400 border-t border-gray-100 pt-2">
          Source: {source}
        </p>
      )}
    </div>
  );
}
