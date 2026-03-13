import { CheckCircle, AlertTriangle, AlertOctagon, XOctagon } from "lucide-react";
import type { RiskLevel } from "@/lib/lakefrontRisk";

// ============================================================================
// CONFIGURATION
// ============================================================================

const riskConfig = {
  GREEN: {
    bgColor: "bg-green-100",
    textColor: "text-green-800",
    borderColor: "border-green-300",
    borderLeft: "border-green-500",
    bgLight: "bg-green-50",
    icon: CheckCircle,
    iconColor: "text-green-600",
    label: "Low Risk",
  },
  YELLOW: {
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-800",
    borderColor: "border-yellow-300",
    borderLeft: "border-yellow-500",
    bgLight: "bg-yellow-50",
    icon: AlertTriangle,
    iconColor: "text-yellow-600",
    label: "Moderate Risk",
  },
  ORANGE: {
    bgColor: "bg-orange-100",
    textColor: "text-orange-800",
    borderColor: "border-orange-300",
    borderLeft: "border-orange-500",
    bgLight: "bg-orange-50",
    icon: AlertOctagon,
    iconColor: "text-orange-600",
    label: "Elevated Risk",
  },
  RED: {
    bgColor: "bg-red-100",
    textColor: "text-red-800",
    borderColor: "border-red-300",
    borderLeft: "border-red-500",
    bgLight: "bg-red-50",
    icon: XOctagon,
    iconColor: "text-red-600",
    label: "High Risk",
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

// ============================================================================
// BADGE COMPONENT
// ============================================================================

interface RiskBadgeProps {
  level: RiskLevel;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  tooltip?: string;
  tooltipAlign?: "left" | "right";
}

export default function RiskBadge({
  level,
  size = "md",
  showLabel = true,
  tooltip,
  tooltipAlign = "left",
}: RiskBadgeProps) {
  const config = riskConfig[level];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  if (tooltip) {
    const alignClass = tooltipAlign === "right" ? "right-0" : "left-0";
    return (
      <span className="relative group/risk">
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full border cursor-default ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizes.badge}`}
        >
          <Icon className={`${sizes.icon} ${config.iconColor}`} />
          {showLabel && config.label}
        </span>
        <span
          className={`invisible group-hover/risk:visible absolute ${alignClass} top-full mt-2 w-56 rounded-lg bg-gray-800 text-white text-xs font-normal p-3 leading-relaxed shadow-lg z-50 whitespace-normal`}
        >
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
      {showLabel && config.label}
    </span>
  );
}

// ============================================================================
// LARGE INDICATOR (for environmental page hero)
// ============================================================================

export function RiskIndicator({
  level,
  action,
}: {
  level: RiskLevel;
  action: string;
}) {
  const config = riskConfig[level];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-4 p-6 rounded-xl border-2 ${config.bgColor} ${config.borderColor}`}
    >
      <Icon className={`h-12 w-12 ${config.iconColor}`} />
      <div>
        <div className={`text-2xl font-bold ${config.textColor}`}>
          {config.label}
        </div>
        <div className="text-sm text-gray-600 mt-1">{action}</div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS (for homepage card styling)
// ============================================================================

export function riskBorder(level: RiskLevel): string {
  return riskConfig[level].borderLeft;
}

export function riskBg(level: RiskLevel): string {
  return riskConfig[level].bgLight;
}

export function riskText(level: RiskLevel): string {
  return riskConfig[level].textColor.replace("800", "600");
}
