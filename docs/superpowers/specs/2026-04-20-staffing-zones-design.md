# Staffing Zones — Design Spec

**Date:** 2026-04-20
**Status:** Shipped (initial iteration, Core FPU only)
**Source email:** Darren Austin to Shannon Fazande, Apr 1 2026, "RE: FPA Lens: Staffing"

## Background

Regional Director Jeff Williams and HR Director Shannon Fazande asked Darren
Austin (Ops), Carlos Metoyer (Maintenance), and Ryan Foster (Engineering) to
define a traffic-light staffing framework for the Core Flood Protection Unit
(MTC + OPS + ENG). They returned numeric thresholds for each department and
the aggregate. Operational Support (Exec/HR/IT/Finance) thresholds are being
worked out separately between Shannon and Jeff.

Current `/our-team` uses total headcount (256) + agency vacancies (45) + a
stale `departmentStatus` array of "Fully Staffed" entries from Dec 2025. The
new framework replaces the stale department-status view with operationally-
defined zone bars.

## Scope

**In scope (this iteration):**

- New zone-framework visualization on `/our-team`:
  - Core FPU aggregate bar (Full = 202)
  - Three per-department sub-bars (MTC 151, OPS 34, ENG 17)
- Compact Core FPU aggregate bar on the homepage (replaces the Total Staff /
  Vacancies mini-stats inside the Staffing Readiness gauge card)
- Subtle "Operational Support — framework in development" stub on `/our-team`
- Removal of stale `departmentStatus` entries
- Total headcount preserved as a compact summary line

**Out of scope:**

- Op Support thresholds (blocked on Shannon/Jeff)
- Historical zone trend over time
- Changes to the monthly SITREP refresh checklist

## Data model

`staffingData.coreFPU` in `src/data/siteData.ts`:

```ts
coreFPU: {
  asOfDate: "April 1, 2026",
  thresholdsSetBy: "Austin (Ops), Metoyer (Maintenance), Foster (Engineering)",
  thresholdsDate: "April 2026",
  thresholdsSource: "Darren Austin email, Apr 1 2026",
  aggregate: {
    key: "CORE_FPU",
    label: "Core Flood Protection Unit",
    full: 202,
    current: null,
    thresholds: { amberMax: 175, redMax: 95 },
  },
  departments: [
    { key: "MTC", label: "Maintenance", full: 151, current: null,
      thresholds: { amberMax: 136, redMax: 71 } },
    { key: "OPS", label: "Operations", full: 34, current: null,
      thresholds: { amberMax: 26, redMax: 16 } },
    { key: "ENG", label: "Engineering", full: 17, current: null,
      thresholds: { amberMax: 13, redMax: 8 } },
  ],
},
opSupport: {
  status: "placeholder",
  label: "Operational Support",
  groups: ["Executive", "Human Resources", "Information Technology", "Finance"],
  note: "Framework in development with Regional Director; thresholds to come",
},
```

**Decisions baked in:**

- `current: null` means "awaiting data" — the bar renders the zone bands but no position marker. Swap to real integers when HR provides per-department headcount (expected week of 2026-04-27).
- `full` and the two thresholds are stored explicitly (not as `full - 25%` etc.) because Darren's numbers don't match those percentages literally (175/202 ≈ 13%, not 25%). The numeric boundaries are the authoritative operational thresholds.
- Aggregate Core FPU thresholds are stored independently from the sum of the departments. Today they match exactly (151+34+17=202, 136+26+13=175, 71+16+8=95). `assertAggregateMatchesSum` warns in dev if they ever drift.
- Red thresholds are provisional. Darren asked HR for 2020 COVID-era low headcount to validate the Red line; those may tighten when HR replies.

## Zone logic (`src/lib/staffingZones.ts`)

Pure-logic module, unit-testable:

- `computeZoneLevel(current, thresholds) → "GREEN" | "AMBER" | "RED" | null`
- `zoneColor(level)` — Tailwind class bundle for border/bg/text/marker
- `zoneLabel(level)` — human-readable ("Green", "Amber", "Red", "Awaiting data")
- `positionPercent(value, full)` — clamp + percentage for bar marker placement
- `assertAggregateMatchesSum(aggregate, departments)` — dev-only consistency check

Zone convention: `current <= redMax` → RED; `current <= amberMax` → AMBER;
otherwise GREEN.

## UI component (`src/components/StaffingZoneBar.tsx`)

Props: `group: ZoneGroup`, `variant: "full" | "compact"`.

- **Full variant:** header with label + zone status, horizontal 3-band bar
  (red / amber / green in proportional widths), position marker for current
  value, tick labels below (0, redMax, amberMax, full).
- **Compact variant:** same header + bar, no tick labels, smaller heights.
  Used on the homepage inside the Staffing Readiness gauge card.

Accessibility: `role="img"` on the bar with an `aria-label` summarizing the
current headcount and zone. Band divs are `aria-hidden`.

## Page integration

**`/our-team`:**

1. Summary line (total 256, 244 classified + 12 unclassified, 45 vacancies, as-of date)
2. **Core Flood Protection Unit** section: methodology paragraph, aggregate bar, divider, 3 department bars, footer caveat about provisional Red thresholds
3. **Operational Support** stub (dashed border, "framework in development")
4. Leadership list (unchanged)

Removed: the 3-card headcount overview, the pie chart + headcount details,
the `departmentStatus` section.

**Homepage:**

Inside the existing Staffing Readiness gauge card, replaced the Total Staff /
Vacancies 2-up mini-stats with a compact Core FPU aggregate zone bar. The
StatusBadge on the card still reflects agency-wide SITREP readiness (AMBER).

## Terminology

"Amber" throughout, matching the site's existing `StatusLevel` union
("GREEN" | "AMBER" | "RED") and the homepage readiness gauge cards. Darren's
email used "Yellow" informally; Shannon and Jeff used "Amber" in the original
asks. One word across the site avoids a reader wondering whether Amber and
Yellow are different things.

## Testing

- Build passes (`npm run build`) — TypeScript clean.
- Visual spot-check via `npm run dev` on localhost:3000.
- `assertAggregateMatchesSum` guards against accidental threshold drift.

## Follow-ups (when real actuals arrive)

1. Replace `current: null` with the HR-provided headcount integers (one per
   department; the aggregate can be computed from the sum or stored
   independently — pick one convention).
2. Update `coreFPU.asOfDate` to match the HR snapshot date.
3. Consider raising/lowering Red thresholds based on 2020 COVID-era low
   headcount once HR supplies those numbers.
4. When Shannon/Jeff finalize Op Support thresholds, follow the same data
   shape: add an `opSupport.aggregate` + `opSupport.departments` structure
   and wire it into the page where the placeholder stub currently sits.
