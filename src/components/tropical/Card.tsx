/**
 * Shared card shell for the summary grid above the map. Sections apply this
 * themselves rather than being wrapped by the grid, because several of them
 * (coastal watches/warnings, metro alerts) render nothing at all when there is
 * nothing to report — and a section that returns null must take its card with
 * it instead of leaving an empty box in the grid.
 */
export const CARD_CLASS =
  "min-w-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm";
