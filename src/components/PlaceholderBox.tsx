import { AlertCircle, FileQuestion, Map, Users, BarChart3 } from "lucide-react";

interface PlaceholderBoxProps {
  title: string;
  description?: string;
  stakeholderNeeded?: string;
  type?: "map" | "data" | "content" | "chart" | "team";
  height?: string;
}

const iconMap = {
  map: Map,
  data: FileQuestion,
  content: AlertCircle,
  chart: BarChart3,
  team: Users,
};

export default function PlaceholderBox({
  title,
  description,
  stakeholderNeeded,
  type = "content",
  height = "h-48",
}: PlaceholderBoxProps) {
  const Icon = iconMap[type];

  return (
    <div
      className={`${height} bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-6 text-center`}
    >
      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-gray-400" />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          [PLACEHOLDER]
        </p>
        <p className="text-lg font-medium text-gray-700">{title}</p>
        {description && (
          <p className="text-sm text-gray-500 max-w-md">{description}</p>
        )}
        {stakeholderNeeded && (
          <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full inline-block mt-2">
            Awaiting input from: {stakeholderNeeded}
          </p>
        )}
      </div>
    </div>
  );
}

// Inline placeholder for text content
export function PlaceholderText({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-amber-700 text-sm">
      <AlertCircle className="h-3 w-3" />
      {text}
    </span>
  );
}
