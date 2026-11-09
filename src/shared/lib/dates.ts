/**
 * Asia/Manila business-date helpers (date-only, no timezone shifts). The
 * implementation stays with the accreditation module that introduced it and is
 * re-exported here so every module shares one entry point.
 */
export {
  addOneYear,
  diffCalendarDays,
  formatManilaDateParts,
  manilaToday,
  parseManilaDateOnly,
  type ManilaDateParts,
} from "@/modules/accreditation/dates";

import { formatManilaDateParts, parseManilaDateOnly } from "@/modules/accreditation/dates";

/** Adds whole years to a date-only value (Feb 29 clamps to Feb 28). */
export function addYearsToDate(dateOnly: string, years: number): string | null {
  const parts = parseManilaDateOnly(dateOnly);
  if (!parts) return null;
  const year = parts.year + years;
  const dim = new Date(Date.UTC(year, parts.month, 0)).getUTCDate();
  return formatManilaDateParts({ year, month: parts.month, day: Math.min(parts.day, dim) });
}

/** Adds whole months to a date-only value, clamping to the month end. */
export function addMonthsToDate(dateOnly: string, months: number): string | null {
  const parts = parseManilaDateOnly(dateOnly);
  if (!parts) return null;
  const total = parts.year * 12 + (parts.month - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  const dim = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return formatManilaDateParts({ year, month, day: Math.min(parts.day, dim) });
}
