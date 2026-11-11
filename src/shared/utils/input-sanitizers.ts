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

/**
 * Uppercase the first letter of every word (word starts follow spaces, hyphens,
 * apostrophes and periods) while leaving the remaining letters exactly as typed,
 * so acronyms and brands survive: "HR manager" → "HR Manager",
 * "s&r trading" → "S&r Trading". Never trims, so a trailing space typed by the
 * user (live typing) is preserved.
 */
export function capitalizeAfterSpace(value: string): string {
  return capitalizeWords(value);
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
/** Street-address line cap; kept equal to MAX_ADDRESS_LENGTH for address forms. */
export const MAX_STREET_LENGTH = 160;
/** Street text input cap for address forms; reuses the street line cap. */
export const MAX_STREET_TEXT = MAX_STREET_LENGTH;
export const MAX_CITY_LENGTH = 100;
export const MAX_ZIP_LENGTH = 4;
export const MAX_TIN_LENGTH = 12;
export const MAX_TIN_DIGITS = 12;
export const MAX_LANDLINE_DIGITS = 10;
export const MAX_MOBILE_DIGITS = 11;
export const MAX_GOV_ID_LENGTH = 40;
/** Occupation, employed position, and type-of-business text cap (truncated, never rejected). */
export const MAX_BUSINESS_TEXT = 120;

/** Display a status value with a capital first letter (Active, Suspended, …). */
export function formatStatusLabel(value: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : trimmed;
}

/** Normalize a Philippine mobile number to canonical 09XXXXXXXXX form, capped at 11 digits. */
export function normalizePhilippineMobile(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("63") && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith("09") && digits.length === 11) return digits;
  return digits.slice(0, MAX_MOBILE_DIGITS);
}

/** Display a Philippine mobile number as XXXX-XXX-XXXX. */
export function formatPhilippineMobile(value: string): string {
  const digits = normalizePhilippineMobile(value);
  if (digits.length !== 11) return value.trim();
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
}

/** Progressive mask while typing: 0909 → 0909-598 → 0909-598-4478. */
export function formatPartialPhilippineMobile(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, MAX_MOBILE_DIGITS);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
}

/**
 * Validate a Philippine mobile number (exactly 11 digits, 09 prefix).
 * The raw length is checked before normalization so capped output can never
 * turn an over-long value into a valid one.
 */
export function isValidPhilippineMobile(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  const maxDigits = digits.startsWith("63") ? MAX_MOBILE_DIGITS + 1 : MAX_MOBILE_DIGITS;
  if (digits.length > maxDigits) return false;
  return /^09\d{9}$/.test(normalizePhilippineMobile(digits));
}

/** Format a TIN as 123-456-789 or 123-456-789-000. */
export function formatTin(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, MAX_TIN_DIGITS);
  if (digits.length <= 9) {
    return digits.replace(/(\d{3})(?=\d)/g, "$1-").replace(/-$/, "");
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/** Digits-only TIN for storage, capped at 12 digits. undefined stays "not provided", null stays null, blank becomes null. */
export function normalizeTin(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null) return value;
  return value.replace(/\D/g, "").slice(0, MAX_TIN_DIGITS) || null;
}

/** Validate a TIN (9 or 12 digits). */
export function isValidTin(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 9 || digits.length === MAX_TIN_DIGITS;
}

/** Normalize a Philippine ZIP code to 4 digits as a string. */
export function normalizePostalCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, MAX_ZIP_LENGTH);
}

/**
 * Validate a 4-digit Philippine ZIP code. ZIP is optional/derived in the
 * customer forms (filled from the selected city/barangay, field disabled), so
 * this format check must never be treated as a submit blocker.
 */
export function isValidPostalCode(value: string): boolean {
  return /^\d{4}$/.test(value.trim());
}

/** Normalize a Philippine landline to canonical digits, capped at 10 digits so pasted values cannot exceed. */
export function normalizeLandline(value: string): string {
  return value.replace(/\D/g, "").slice(0, MAX_LANDLINE_DIGITS);
}

/**
 * Digit count for the local subscriber number once the area code is shown as a
 * fixed prefix: Metro Manila (02) uses 8 digits, every provincial code uses 7.
 * With no area code the whole number is typed, so the legacy 7–10 range applies.
 */
export function landlineDigitRange(areaCode?: string | null): { min: number; max: number } {
  const code = (areaCode ?? "").replace(/\D/g, "");
  if (!code) return { min: 7, max: MAX_LANDLINE_DIGITS };
  if (code === "2" || code === "02") return { min: 8, max: 8 };
  return { min: 7, max: 7 };
}

/**
 * Validate a Philippine landline. With an area code shown as the prefix the
 * value is the local subscriber number only (8 digits for 02, 7 otherwise);
 * without one it stays the 7–10 digit domestic form.
 */
export function isValidLandline(value: string, areaCode?: string | null): boolean {
  // Count the raw digits so the normalize cap cannot turn an over-long value into a valid one.
  const digits = value.replace(/\D/g, "");
  const { min, max } = landlineDigitRange(areaCode);
  return digits.length >= min && digits.length <= max;
}

/** Letters, spaces, hyphens, apostrophes, periods, and slashes only (work roles). */
const OCCUPATION_CHARS_RE = /[^A-Za-zÀ-ÿ\s'./-]/g;
/** Work-role characters plus digits, &, comma, parentheses, and # (business names). */
const BUSINESS_CHARS_RE = /[^A-Za-zÀ-ÿ0-9\s'./&,()#-]/g;

/** Uppercase only the very first character; the rest (acronyms like HR, S&R) is untouched. */
function uppercaseFirst(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/** Collapse inner whitespace, trim, then truncate (never reject) at the business text cap. */
function collapseBusinessText(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_BUSINESS_TEXT).trimEnd();
}

/**
 * Person-name cleanup: letters, spaces, hyphens, apostrophes, and periods only;
 * inner whitespace collapsed; only the first character uppercased; capped at 80.
 */
export function cleanPersonNameInput(value: string): string {
  return uppercaseFirst(cleanNameInput(value).replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH).trimEnd());
}

/**
 * Work-role cleanup (occupation, employed position, type of business/industry):
 * trim, collapse inner whitespace, strip characters outside the allowlist,
 * truncate at MAX_BUSINESS_TEXT, and uppercase the first letter of every word.
 * The remaining letters of each word are preserved so acronyms survive.
 */
export function cleanOccupationInput(value: string): string {
  return capitalizeAfterSpace(collapseBusinessText(value.replace(OCCUPATION_CHARS_RE, "")));
}

/**
 * Business-name cleanup: occupation rules plus digits, &, comma, parentheses,
 * and #. Every word is capitalized; the remaining letters are untouched.
 */
export function cleanBusinessInput(value: string): string {
  return capitalizeAfterSpace(collapseBusinessText(value.replace(BUSINESS_CHARS_RE, "")));
}

/**
 * Live-typing variants: strip disallowed characters and cap the length, but
 * keep a single space between words and allow a trailing space while the user
 * is still typing. Full trimming/collapsing happens on blur.
 */
function liveFilter(value: string, disallowed: RegExp): string {
  const kept = value.replace(disallowed, "").replace(/\s{2,}/g, " ");
  return kept.slice(0, MAX_BUSINESS_TEXT);
}

/** Live variant of `cleanOccupationInput` (typing-safe; no trim/collapse). */
export function cleanOccupationLiveInput(value: string): string {
  return capitalizeAfterSpace(liveFilter(value, OCCUPATION_CHARS_RE));
}

/** Live variant of `cleanBusinessInput` (typing-safe; no trim/collapse). */
export function cleanBusinessLiveInput(value: string): string {
  return capitalizeAfterSpace(liveFilter(value, BUSINESS_CHARS_RE));
}

/**
 * Letters, digits, whitespace, periods, commas, apostrophes, hyphens, slashes,
 * #, &, and parentheses only (street-address lines).
 */
const STREET_CHARS_RE = /[^A-Za-zÀ-ÿ0-9\s.,'/#&()-]/g;

/**
 * Street-address cleanup for live typing: strip characters outside the
 * allowlist, collapse repeated whitespace to one space, capitalize every word,
 * and cap at MAX_STREET_TEXT. Never trims, so a trailing space is preserved
 * while the user is still typing (callers trim on blur).
 */
export function cleanStreetInput(value: string): string {
  const kept = value.replace(STREET_CHARS_RE, "").replace(/\s{2,}/g, " ");
  return capitalizeAfterSpace(kept.slice(0, MAX_STREET_TEXT));
}

/**
 * Government ID number entry policy.
 *
 * Uppercase-only is the official Philippine format on printed and filed IDs, so
 * `uppercaseGovId` converts lowercase input to uppercase as the user types.
 * Lowercase is auto-converted, never rejected silently at submit time.
 */
export type GovIdPolicy = "numeric" | "alphanumeric";

/** Lowercase, trimmed ID-type key so type matching ignores casing and padding. */
function govIdTypeKey(idType?: string | null): string {
  return typeof idType === "string" ? idType.trim().toLowerCase() : "";
}

/** Character policy for a government ID type. */
export function govIdPolicyFor(idType?: string | null): GovIdPolicy {
  const kind = govIdTypeKey(idType);
  // Digital National ID is a 6-character uppercase alphanumeric code.
  if (kind.includes("digital")) return "alphanumeric";
  // PSN (12 digits) and PCN (16 characters).
  if (kind.includes("national")) return "numeric";
  if (
    kind.includes("tin") ||
    kind.includes("sss") ||
    kind.includes("gsis") ||
    kind.includes("umid") ||
    kind.includes("prc")
  ) {
    return "numeric";
  }
  // Passport, driver's license, voter's, postal, other, and blank stay alphanumeric.
  return "alphanumeric";
}

/** Letters, digits, spaces, periods and hyphens only; everything else is dropped. */
const GOV_ID_ALLOWED_RE = /[^A-Za-z0-9 .-]/g;
const GOV_ID_LETTERS_RE = /[A-Za-z]/g;

/**
 * Strip characters outside `A-Za-z0-9 .-`, drop all letters under the numeric
 * policy, then uppercase. Separators (spaces, periods, hyphens) are preserved.
 * Client input is capped by `govIdMaxLengthFor`; this helper never throws.
 */
export function uppercaseGovId(value: string, policy: GovIdPolicy = "alphanumeric"): string {
  const raw = typeof value === "string" ? value : "";
  const kept = raw.replace(GOV_ID_ALLOWED_RE, "");
  const digitsOnly = policy === "numeric" ? kept.replace(GOV_ID_LETTERS_RE, "") : kept;
  return digitsOnly.toUpperCase();
}

/** Maximum input length for a government ID type. */
export function govIdMaxLengthFor(idType?: string | null): number {
  const kind = govIdTypeKey(idType);
  // Digital National ID must be checked first: its label also contains "national".
  if (kind.includes("digital")) return 6;
  if (kind.includes("national")) return 16;
  // Passport: 9 significant characters plus separators.
  if (kind.includes("passport")) return 12;
  if (kind.includes("driver")) return 14;
  if (kind.includes("tin")) return 15;
  if (kind.includes("sss") || kind.includes("gsis") || kind.includes("umid") || kind.includes("prc")) return 14;
  return MAX_GOV_ID_LENGTH;
}
