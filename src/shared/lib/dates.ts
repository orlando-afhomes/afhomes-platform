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

import { formatManilaDateParts, manilaToday, parseManilaDateOnly } from "@/modules/accreditation/dates";

/** Asia/Manila business date of a date-only value or an ISO timestamp (a UTC instant is shifted, never sliced). */
export function manilaDateOf(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(time));
}

/** Adds whole years to a date-only value (Feb 29 clamps to Feb 28). */
export function addYearsToDate(dateOnly: string, years: number): string | null {
  const parts = parseManilaDateOnly(dateOnly);
  if (!parts) return null;
  const year = parts.year + years;
  const dim = new Date(Date.UTC(year, parts.month, 0)).getUTCDate();
  return formatManilaDateParts({ year, month: parts.month, day: Math.min(parts.day, dim) });
}

/** Adds whole calendar days to a date-only value. */
export function addDaysToDate(dateOnly: string, days: number): string | null {
  const parts = parseManilaDateOnly(dateOnly);
  if (!parts) return null;
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return formatManilaDateParts({ year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() });
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

/** First calendar day of the month after a date-only value (2026-11-20 -> 2026-12-01; 2026-12-31 -> 2027-01-01). */
export function startOfNextMonthDate(dateOnly: string): string | null {
  const parts = parseManilaDateOnly(dateOnly);
  if (!parts) return null;
  const year = parts.month === 12 ? parts.year + 1 : parts.year;
  const month = parts.month === 12 ? 1 : parts.month + 1;
  return formatManilaDateParts({ year, month, day: 1 });
}

/** Whole-year age for a date-only birth date; null when invalid or in the future. Defaults to today's Asia/Manila business date. */
export function computeAge(dateOfBirth: string, todayYMD?: string): number | null {
  const birth = parseManilaDateOnly(dateOfBirth);
  const today = parseManilaDateOnly(todayYMD ?? manilaToday());
  if (!birth || !today) return null;
  let age = today.year - birth.year;
  if (today.month < birth.month || (today.month === birth.month && today.day < birth.day)) age -= 1;
  if (age < 0) return null;
  return age;
}
