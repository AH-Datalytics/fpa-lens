import {
  ZoneGroup,
  computeZoneLevel,
  positionPercent,
  zoneColor,
  zoneLabel,
} from "@/lib/staffingZones";

interface StaffingZoneBarProps {
  group: ZoneGroup;
  variant?: "full" | "compact";
}

export default function StaffingZoneBar({
  group,
  variant = "full",
}: StaffingZoneBarProps) {
  const { full, current, thresholds, label } = group;
  const level = computeZoneLevel(current, thresholds);
  const colors = zoneColor(level);

  const redPct = positionPercent(thresholds.redMax, full);
  const amberPct = positionPercent(thresholds.amberMax, full) - redPct;
  const greenPct = 100 - redPct - amberPct;

  const markerPct = current !== null ? positionPercent(current, full) : null;
  const barHeight = variant === "compact" ? "h-2.5" : "h-5";
  const ariaLabel =
    current !== null
      ? `${label}: ${current} of ${full} staff, ${zoneLabel(level)} zone`
      : `${label}: ${full} full headcount, current headcount pending`;

  return (
    <div className="w-full">
      {/* Header row */}
      <div className="flex items-baseline justify-between mb-1.5">
        <span
          className={
            variant === "compact"
              ? "text-xs font-semibold text-[#21355a]"
              : "text-sm font-semibold text-[#21355a]"
          }
        >
          {label}
        </span>
        <span
          className={`${variant === "compact" ? "text-xs" : "text-sm"} font-medium ${colors.text}`}
        >
          {current !== null ? (
            <>
              {zoneLabel(level)} zone · {current} of {full}
            </>
          ) : (
            <>Awaiting data · Full {full}</>
          )}
        </span>
      </div>

      {/* Marker row — reserved space above the bar for pin + value label */}
      {variant === "full" && markerPct !== null && (
        <div className="relative h-5 mb-0.5">
          <div
            className="absolute flex flex-col items-center"
            style={{ left: `${markerPct}%`, transform: "translateX(-50%)" }}
          >
            <span
              className={`text-xs font-bold ${colors.text} leading-none mb-0.5`}
            >
              {current}
            </span>
            <span
              className={`inline-block w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent ${colors.text}`}
              style={{ borderTopColor: "currentColor" }}
              aria-hidden="true"
            />
          </div>
        </div>
      )}

      {/* Bar */}
      <div
        role="img"
        aria-label={ariaLabel}
        className={`relative ${barHeight} rounded overflow-hidden border border-gray-200`}
      >
        <div className="flex h-full w-full">
          <div
            className="bg-red-200"
            style={{ width: `${redPct}%` }}
            aria-hidden="true"
          />
          <div
            className="bg-amber-200"
            style={{ width: `${amberPct}%` }}
            aria-hidden="true"
          />
          <div
            className="bg-green-200"
            style={{ width: `${greenPct}%` }}
            aria-hidden="true"
          />
        </div>
        {markerPct !== null && (
          <div
            className={`absolute top-0 bottom-0 w-[2px] ${colors.marker}`}
            style={{ left: `${markerPct}%`, transform: "translateX(-1px)" }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Tick labels — full variant only */}
      {variant === "full" && (
        <div className="relative mt-1 h-4 text-[10px] text-gray-500">
          <span className="absolute left-0">0</span>
          <span
            className="absolute"
            style={{ left: `${redPct}%`, transform: "translateX(-50%)" }}
          >
            {thresholds.redMax}
          </span>
          <span
            className="absolute"
            style={{
              left: `${redPct + amberPct}%`,
              transform: "translateX(-50%)",
            }}
          >
            {thresholds.amberMax}
          </span>
          <span className="absolute right-0">{full}</span>
        </div>
      )}
    </div>
  );
}
