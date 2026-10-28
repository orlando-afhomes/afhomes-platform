// Shared input sanitizers and formatters for modal forms.
// Block invalid characters as typed; submit handlers still validate.
const NAME_CHARS_RE = /[^A-Za-zÀ-ÿ\s'.-]/g;
const WORD_START_RE = /(^|\s|-|'|\.)([a-zà-ÿ])/g;

/** Letters, spaces, hyphens, apostrophes and periods only. */
export function cleanNameInput(value: string): string {
  return value.replace(NAME_CHARS_RE, "");
}

/** Capitalize the first letter of each word (after spaces, hyphens, apostrophes, periods). */
export function capitalizeWords(value: string): string {
  return value.replace(WORD_START_RE, (_, sep, char) => sep + char.toUpperCase());
}

/** Clean + capitalize in one pass for name/title fields. */
export function cleanTitleInput(value: string): string {
  return capitalizeWords(cleanNameInput(value));
}

/** Names may contain letters, spaces, hyphens, apostrophes and periods only. */
export function isValidName(value: string): boolean {
  return /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'.-]*$/.test(value.trim());
}

/** Lowercase, no spaces: emails always start with a small letter. */
export function cleanEmailInput(value: string): string {
  return value.toLowerCase().replace(/\s/g, "");
}

export function isValidEmail(value: string): string | boolean {
  const trimmed = value.trim();
  if (trimmed.length < 6 || trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;
export const MAX_NAME_LENGTH = 80;
export const MAX_ADDRESS_LENGTH = 160;
export const MAX_CITY_LENGTH = 100;
export const MAX_ZIP_LENGTH = 4;
export const MAX_TIN_LENGTH = 12;

/** Display a status value with a capital first letter (Active, Suspended, …). */
export function formatStatusLabel(value: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : trimmed;
}

/** Normalize a Philippine mobile number to canonical 09XXXXXXXXX form. */
export function normalizePhilippineMobile(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("63") && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith("09") && digits.length === 11) return digits;
  return digits;
}

/** Display a Philippine mobile number as XXXX-XXX-XXXX. */
export function formatPhilippineMobile(value: string): string {
  const digits = normalizePhilippineMobile(value);
  if (digits.length !== 11) return value.trim();
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
}

/** Progressive mask while typing: 0909 → 0909-598 → 0909-598-4478. */
export function formatPartialPhilippineMobile(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
}

/** Validate a Philippine mobile number (11 digits, 09 prefix). */
export function isValidPhilippineMobile(value: string): boolean {
  const digits = normalizePhilippineMobile(value);
  return /^09\d{9}$/.test(digits);
}

/** Format a TIN as 123-456-789 or 123-456-789-000. */
export function formatTin(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, MAX_TIN_LENGTH);
  if (digits.length <= 9) {
    return digits.replace(/(\d{3})(?=\d)/g, "$1-").replace(/-$/, "");
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/** Validate a TIN (9 or 12 digits). */
export function isValidTin(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 9 || digits.length === 12;
}

/** Normalize a Philippine ZIP code to 4 digits as a string. */
export function normalizePostalCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, MAX_ZIP_LENGTH);
}

/** Validate a 4-digit Philippine ZIP code. */
export function isValidPostalCode(value: string): boolean {
  return /^\d{4}$/.test(value.trim());
}

/** Normalize a Philippine landline to canonical digits. */
export function normalizeLandline(value: string): string {
  return value.replace(/\D/g, "");
}

/** Validate a Philippine landline (7 to 11 digits). */
export function isValidLandline(value: string): boolean {
  const digits = normalizeLandline(value);
  return digits.length >= 7 && digits.length <= 11;
}
