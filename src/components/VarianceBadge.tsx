import { CheckCircle, AlertTriangle, XCircle, AlertOctagon } from "lucide-react";

type VarianceTier = "green" | "yellow" | "amber" | "red" | "unbudgeted";

interface VarianceBadgeProps {
  /** Variance percentage (e.g., -16.8 for -16.8%). Pass "unbudgeted" for $0 budget items. */
  variance: number | "unbudgeted";
  /** "revenue" = positive is favorable; "expense" = negative is favorable */
  type?: "revenue" | "expense";
  size?: "sm" | "md";
}

const tierConfig: Record<VarianceTier, {
  bg: string;
  text: string;
  border: string;
  icon: typeof CheckCircle;
  iconColor: string;
}> = {
  green: {
    bg: "bg-green-50",
    text: "text-green-800",
    border: "border-green-200",
    icon: CheckCircle,
    iconColor: "text-green-600",
  },
  yellow: {
    bg: "bg-yellow-50",
    text: "text-yellow-800",
    border: "border-yellow-200",
    icon: AlertTriangle,
    iconColor: "text-yellow-600",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
  },
  red: {
    bg: "bg-red-50",
    text: "text-red-800",
    border: "border-red-200",
    icon: XCircle,
    iconColor: "text-red-600",
  },
  unbudgeted: {
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "border-gray-200",
    icon: AlertOctagon,
    iconColor: "text-gray-500",
  },
};

function getTier(variance: number | "unbudgeted"): VarianceTier {
  if (variance === "unbudgeted") return "unbudgeted";
  const abs = Math.abs(variance);
  if (abs <= 5) return "green";
  if (abs <= 15) return "yellow";
  if (abs <= 25) return "amber";
  return "red";
}

function getDirectionLabel(variance: number, type: "revenue" | "expense"): string {
  if (variance === 0) return "";
  // Revenue: positive = favorable. Expense: negative = favorable (under budget).
  const favorable =
    type === "revenue" ? variance > 0 : variance < 0;
  return favorable ? "favorable" : "unfavorable";
}

export default function VarianceBadge({ variance, type = "expense", size = "sm" }: VarianceBadgeProps) {
  const tier = getTier(variance);
  const config = tierConfig[tier];
  const Icon = config.icon;

  const sizeClass = size === "sm"
    ? "px-1.5 py-0.5 text-[10px] gap-0.5"
    : "px-2 py-0.5 text-xs gap-1";
  const iconSize = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";

  if (variance === "unbudgeted") {
    return (
      <span className={`inline-flex items-center ${sizeClass} font-medium rounded-full border ${config.bg} ${config.text} ${config.border}`}>
        <Icon className={`${iconSize} ${config.iconColor}`} />
        Unbudgeted
      </span>
    );
  }

  const direction = getDirectionLabel(variance, type);
  const sign = variance > 0 ? "+" : "";
  const tooltip = direction ? `${Math.abs(variance).toFixed(1)}% ${direction}` : "";

  return (
    <span
      className={`inline-flex items-center ${sizeClass} font-medium rounded-full border ${config.bg} ${config.text} ${config.border}`}
      title={tooltip}
    >
      <Icon className={`${iconSize} ${config.iconColor}`} />
      {sign}{variance.toFixed(1)}%
    </span>
  );
}
