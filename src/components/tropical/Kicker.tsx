/**
 * Section label shared by every rail panel and map-options group. Matches the
 * uppercase micro-headings used elsewhere in FPA Lens (turf zone cards,
 * infrastructure KPI tiles).
 */
export function Kicker({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <div
      id={id}
      className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#21355a]"
    >
      {children}
    </div>
  );
}
