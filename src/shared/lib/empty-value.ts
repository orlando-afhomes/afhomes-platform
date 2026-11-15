/** The one placeholder every screen shows for a missing value (never words such as "None" or "N/A"). */
export const EMPTY = "—";

/**
 * Returns the em dash for null, undefined, empty or whitespace-only text.
 * Anything else, including the number 0 and `false`, is returned unchanged.
 */
export function displayValue<T>(value: T, fallback: string = EMPTY): T | string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string" && value.trim() === "") return fallback;
  return value;
}
