interface ZoneDefinition {
  label: string;
  rangeLabel: string;
  description: string;
  swatch: string;
  text: string;
}

const zones: ZoneDefinition[] = [
  {
    label: "Green",
    rangeLabel: "Above Amber threshold",
    description: "Adequate staffing; routine operations and storm response sustainable.",
    swatch: "bg-green-200 border-green-400",
    text: "text-green-700",
  },
  {
    label: "Amber",
    rangeLabel: "At or below Amber threshold",
    description: "Meaningful reduction; management attention and mitigation required.",
    swatch: "bg-amber-200 border-amber-400",
    text: "text-amber-700",
  },
  {
    label: "Red",
    rangeLabel: "At or below Red threshold",
    description: "Critical understaffing; ability to respond during storm events compromised.",
    swatch: "bg-red-200 border-red-400",
    text: "text-red-700",
  },
];

export default function ZoneLegend() {
  return (
    <div className="grid md:grid-cols-3 gap-3">
      {zones.map((zone) => (
        <div
          key={zone.label}
          className="flex items-start gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100"
        >
          <div
            className={`w-5 h-5 rounded border flex-shrink-0 mt-0.5 ${zone.swatch}`}
            aria-hidden="true"
          />
          <div>
            <div className={`text-sm font-semibold ${zone.text}`}>
              {zone.label}
            </div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">
              {zone.rangeLabel}
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              {zone.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
