/**
 * Customer ID (RA Number) allocation and validation. The owner-approved format is
 * `YYYY-NNNN` (for example `2026-0001`) and may be assigned automatically or entered
 * manually. Automatic IDs take the highest sequence already issued for the requested
 * year plus one; malformed values and values from other years are ignored.
 *
 * The sequence is capped at 9999. When the next value would be 10000,
 * `nextCustomerId` throws instead of wrapping or emitting an out-of-format ID, so an
 * operator must resolve the exhausted year explicitly. `formatCustomerId` itself never
 * truncates and would render 10000 as five digits; allocation must use
 * `nextCustomerId`.
 */
import { manilaToday } from "@/shared/lib/dates";

export const CUSTOMER_ID_PATTERN = /^(\d{4})-(\d{4})$/;

export type ParsedCustomerId = { year: string; sequence: string };

/** Parses a `YYYY-NNNN` Customer ID; surrounding whitespace is ignored. */
export function parseCustomerId(value: string | null | undefined): ParsedCustomerId | null {
  const candidate = value?.trim();
  if (!candidate) return null;
  const match = CUSTOMER_ID_PATTERN.exec(candidate);
  return match ? { year: match[1], sequence: match[2] } : null;
}

/** Formats a Customer ID, zero-padding the sequence to four digits. */
export function formatCustomerId(year: number | string, sequence: number): string {
  return `${String(year).trim()}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Next automatic Customer ID for `year`: the highest sequence found in `existing` for
 * that year plus one, starting at 0001. Malformed and other-year values are ignored.
 * Throws when the year's sequence is exhausted (the next value would be 10000).
 */
export function nextCustomerId(
  existing: ReadonlyArray<{ customerNumber?: string | null }>,
  year: number | string,
): string {
  const targetYear = String(year).trim();
  let highest = 0;
  for (const item of existing) {
    const parsed = parseCustomerId(item.customerNumber);
    if (!parsed || parsed.year !== targetYear) continue;
    highest = Math.max(highest, Number(parsed.sequence));
  }
  const next = highest + 1;
  if (next > 9999) {
    throw new Error(`The Customer ID sequence for ${targetYear} is exhausted.`);
  }
  return formatCustomerId(targetYear, next);
}

/**
 * Validates a manually entered Customer ID. Comparison against `existing` is
 * case- and whitespace-insensitive and skips the record identified by `selfId`, so a
 * customer's own ID is not reported as a duplicate of itself.
 */
export function validateCustomerId(
  value: string,
  existing: ReadonlyArray<{ id: string; customerNumber?: string | null }>,
  selfId?: string,
): string | null {
  const candidate = value.trim();
  if (!CUSTOMER_ID_PATTERN.test(candidate)) {
    return "Customer ID must use the format YYYY-NNNN, for example 2026-0001.";
  }
  const normalized = candidate.toLowerCase();
  const duplicate = existing.some(
    (item) =>
      item.id !== selfId &&
      item.customerNumber?.trim().toLowerCase() === normalized,
  );
  return duplicate ? "This Customer ID is already in use." : null;
}

/** Current Asia/Manila business year as a four-digit string. */
export function currentManilaYear(): string {
  return manilaToday().slice(0, 4);
}
