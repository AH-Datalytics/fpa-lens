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
  widthScale?: number;
  axisMode?: "raw" | "percent";
}

export default function StaffingZoneBar({
  group,
  variant = "full",
  widthScale = 1,
  axisMode = "raw",
}: StaffingZoneBarProps) {
  const { full, current, thresholds, label } = group;
  const level = computeZoneLevel(current, thresholds);
  const colors = zoneColor(level);

  const policy = group.policyThresholds;

  // In raw mode, scale to full+1 so integer positions align with tick labels.
  // E.g. for IT (full=6): scale is 0–7, marker "5" at 5/7, tick "6" at 6/7.
  const rawDisplayFull = axisMode === "raw" ? full + 1 : full;

  // Bar segment boundary positions (%).
  // In percent mode: snap to exact policy %s. In raw mode: (threshold+1)/rawDisplayFull.
  const redPosPct = axisMode === "percent" && policy
    ? policy.redPct
    : positionPercent(thresholds.redMax + 1, rawDisplayFull);
  const amberPosPct = axisMode === "percent" && policy
    ? policy.amberPct
    : positionPercent(thresholds.amberMax + 1, rawDisplayFull);

  const redPct = redPosPct;
  const amberPct = Math.max(0, amberPosPct - redPosPct);
  const greenPct = Math.max(0, 100 - amberPosPct);

  // Tick label text
  const redTickLabel = axisMode === "percent"
    ? `${Math.round(redPosPct)}%`
    : String(thresholds.redMax + 1);
  const amberTickLabel = axisMode === "percent"
    ? `${Math.round(amberPosPct)}%`
    : String(thresholds.amberMax + 1);

  const markerPct = current !== null ? positionPercent(current, rawDisplayFull) : null;
  const currentPct = current !== null && full > 0 ? Math.round((current / full) * 100) : null;
  const barHeight = variant === "compact" ? "h-2.5" : "h-5";
  const ariaLabel =
    current !== null
      ? `${label}: ${current} of ${full} staff (${currentPct}%), ${zoneLabel(level)} zone`
      : `${label}: ${full} full headcount, current headcount pending`;

  const clampedScale = Math.min(1, Math.max(0, widthScale));
  const barColumnWidth = `${clampedScale * 100}%`;

  return (
    <div className="w-full">
      {/* Header row — always full width so labels never crowd narrow bars */}
      <div className="flex items-baseline justify-between mb-1.5 gap-3">
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
          className={`${variant === "compact" ? "text-xs" : "text-sm"} font-medium ${colors.text} text-right`}
        >
          {current !== null ? (
            <>
              {variant === "compact" ? null : <>{zoneLabel(level)} zone · </>}
              {current} of {full}{" "}
              <span className="text-gray-500 font-normal">({currentPct}%)</span>
            </>
          ) : (
            <>Awaiting data · Full {full}</>
          )}
        </span>
      </div>

      {/* Bar column — scales with widthScale */}
      <div
        style={{ width: barColumnWidth }}
        className="transition-[width] duration-300 ease-out"
      >
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
                {axisMode === "percent" ? `${currentPct}%` : current}
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
            <span className="absolute left-0">
              {axisMode === "percent" ? "0%" : 0}
            </span>
            <span
              className="absolute"
              style={{ left: `${redPosPct}%`, transform: "translateX(-50%)" }}
            >
              {redTickLabel}
            </span>
            <span
              className="absolute"
              style={{ left: `${amberPosPct}%`, transform: "translateX(-50%)" }}
            >
              {amberTickLabel}
            </span>
            {axisMode === "percent" && (
              <span className="absolute right-0">100%</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
