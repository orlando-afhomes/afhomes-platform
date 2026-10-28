import { isValidTin } from "@/shared/utils/input-sanitizers";

/**
 * Government ID number: required, 4–40 characters. The canonical rules do
 * not define per-type formats, so alphanumeric values (including official
 * hyphens and separators) are accepted for every ID type rather than forcing
 * a single numeric-only pattern.
 */
export function validateGovIdNumber(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "ID number required.";
  if (trimmed.length < 4 || trimmed.length > 40) {
    return "ID number must be 4 to 40 characters.";
  }
  return null;
}

/** TIN: optional, 9 digits or 12 digits (with branch code). */
export function validateTinNumber(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isValidTin(trimmed)) {
    return "TIN must be 9 or 12 digits.";
  }
  return null;
}
