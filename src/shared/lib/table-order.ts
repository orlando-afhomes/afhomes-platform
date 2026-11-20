/**
 * Shared list ordering for admin tables (owner ruling 2026-11-20): the newest
 * record by its business date comes first, and records sharing a date put the
 * ones that need attention ahead of the rest. Stable, non-mutating.
 */
export type TableOrder<T> = {
  /** Business date for the newest-first order. Rows without a valid date sort last. */
  date: (row: T) => string | number | Date | null | undefined;
  /** Higher ranks move ahead of other rows with the same date; default 0. */
  attention?: (row: T) => number;
};

const toTime = (value: string | number | Date | null | undefined): number => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (!value) return Number.NaN;
  return Date.parse(value);
};

export function sortForTable<T>(rows: readonly T[], order?: TableOrder<T>): T[] {
  if (!order) return rows as T[];
  return [...rows].sort((a, b) => {
    const timeA = toTime(order.date(a));
    const timeB = toTime(order.date(b));
    const validA = Number.isFinite(timeA);
    const validB = Number.isFinite(timeB);
    if (validA !== validB) return validA ? -1 : 1;
    if (validA && validB && timeA !== timeB) return timeB - timeA;
    const rankA = order.attention?.(a) ?? 0;
    const rankB = order.attention?.(b) ?? 0;
    return rankB - rankA;
  });
}
