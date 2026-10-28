import { manilaToday, parseManilaDateOnly } from "@/modules/accreditation/dates";

/** Required calendar date in YYYY-MM-DD Philippine-local semantics. */
export function validateDateString(value: string, label: string): string | null {
  if (!parseManilaDateOnly(value.trim())) {
    return `${label} must be valid.`;
  }
  return null;
}

/** Required date that must not be in the future. */
export function validatePastDate(value: string, label: string, futureMessage?: string): string | null {
  const invalid = validateDateString(value, label);
  if (invalid) return invalid;
  if (value.trim() > manilaToday()) {
    return futureMessage ?? `${label} cannot be future.`;
  }
  return null;
}
