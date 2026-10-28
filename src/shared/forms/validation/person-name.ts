import { isValidName, MAX_NAME_LENGTH } from "@/shared/utils/input-sanitizers";
import type { FieldOption } from "../types";

export type NameSuffix = "Jr." | "Sr." | "II" | "III" | "IV" | "V";

/** Shared name-suffix options for person-name forms (staff, sellers, customers). */
export const SUFFIX_OPTIONS: ReadonlyArray<FieldOption<NameSuffix>> = [
  { value: "Jr.", label: "Jr." },
  { value: "Sr.", label: "Sr." },
  { value: "II", label: "II" },
  { value: "III", label: "III" },
  { value: "IV", label: "IV" },
  { value: "V", label: "V" },
];

/** Optional suffix: blank or one of the shared suffix options. */
export function validateSuffix(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return SUFFIX_OPTIONS.some((option) => option.value === trimmed) ? null : "Suffix is invalid.";
}

/**
 * Validate a person-name field. Returns the first error or null.
 * Accepts letters, spaces, hyphens, apostrophes, and periods (e.g. O'Neil,
 * Anne-Marie, José, M. Cristina); rejects digits and other symbols.
 */
export function validatePersonName(
  value: string,
  label: string,
  options?: { required?: boolean; maxLength?: number },
): string | null {
  const required = options?.required ?? true;
  const maxLength = options?.maxLength ?? MAX_NAME_LENGTH;
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? `${label} is required.` : null;
  }
  if (!isValidName(trimmed)) {
    return `${label} required, letters only.`;
  }
  if (trimmed.length > maxLength) {
    return `${label} must be ${maxLength} characters or fewer.`;
  }
  return null;
}

/**
 * Validate an optional middle name with No-middle-name support. A checked box
 * means explicit absence (stored as null), never a placeholder string.
 */
export function validateMiddleName(
  value: string,
  noMiddleName: boolean,
  label = "Middle name",
): string | null {
  if (noMiddleName) return null;
  return validatePersonName(value, label);
}
