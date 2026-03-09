import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { StatusLevel } from "@/data/siteData";

interface StatusBadgeProps {
  status: StatusLevel;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const statusConfig = {
  GREEN: {
    bgColor: "bg-green-100",
    textColor: "text-green-800",
    borderColor: "border-green-300",
    icon: CheckCircle,
    iconColor: "text-green-600",
  },
  AMBER: {
    bgColor: "bg-amber-100",
    textColor: "text-amber-800",
    borderColor: "border-amber-300",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
  },
  RED: {
    bgColor: "bg-red-100",
    textColor: "text-red-800",
    borderColor: "border-red-300",
    icon: XCircle,
    iconColor: "text-red-600",
  },
};

const sizeConfig = {
  sm: {
    badge: "px-2 py-0.5 text-xs",
    icon: "h-3 w-3",
  },
  md: {
    badge: "px-3 py-1 text-sm",
    icon: "h-4 w-4",
  },
  lg: {
    badge: "px-4 py-2 text-base",
    icon: "h-5 w-5",
  },
};

export default function StatusBadge({ status, size = "md", showLabel = true, tooltip }: StatusBadgeProps & { tooltip?: string }) {
  const config = statusConfig[status];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  if (tooltip) {
    return (
      <span className="relative group/status">
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full border cursor-default ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizes.badge}`}
        >
          <Icon className={`${sizes.icon} ${config.iconColor}`} />
          {showLabel && status}
        </span>
        <span className="invisible group-hover/status:visible absolute left-0 top-full mt-2 w-56 rounded-lg bg-gray-800 text-white text-xs font-normal p-3 leading-relaxed shadow-lg z-50 whitespace-normal">
          {tooltip}
        </span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizes.badge}`}
    >
      <Icon className={`${sizes.icon} ${config.iconColor}`} />
      {showLabel && status}
    </span>
  );
}

// Large status indicator for dashboards
export function StatusIndicator({ status, label }: { status: StatusLevel; label: string }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-3 p-4 rounded-lg border-2 ${config.bgColor} ${config.borderColor}`}>
      <Icon className={`h-8 w-8 ${config.iconColor}`} />
      <div>
        <div className={`text-lg font-bold ${config.textColor}`}>{status}</div>
        <div className="text-sm text-gray-600">{label}</div>
      </div>
    </div>
  );
}
