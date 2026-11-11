import { isValidTin, MAX_GOV_ID_LENGTH } from "@/shared/utils/input-sanitizers";

export { MAX_GOV_ID_LENGTH };

/** Citizenship allows letters (with diacritics), spaces, periods, hyphens, and apostrophes. */
const CITIZENSHIP_CHARS_RE = /^[A-Za-zÀ-ÿ.' -]+$/;
const MAX_CITIZENSHIP_LENGTH = 80;

/** Optional citizenship: blank, or up to 80 letters, spaces, periods, hyphens, and apostrophes. */
export function validateCitizenship(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_CITIZENSHIP_LENGTH) {
    return "Citizenship must be 80 characters or less.";
  }
  if (!CITIZENSHIP_CHARS_RE.test(trimmed)) {
    return "Citizenship may only contain letters, spaces, hyphens, and apostrophes.";
  }
  return null;
}

/** Philippine government ID letters are always uppercase; lowercase is invalid. */
const LOWERCASE_LETTER_RE = /[a-z]/;
/** Spaces, hyphens, and periods are display separators in printed ID numbers, not significant characters. */
const ID_SEPARATORS_RE = /[\s.-]/g;
/** Voter's/Postal/Other/unknown: uppercase letters, digits, spaces, periods, and hyphens. */
const OTHER_ID_CHARS_RE = /^[A-Z0-9 .-]+$/;

/** Digital National ID (PhilSys): 6-character uppercase alphanumeric security code. */
const DIGITAL_NATIONAL_ID_RE = /^[A-Z0-9]{6}$/;
/** National ID: 12-digit PSN or 16-digit PCN. */
const NATIONAL_ID_RE = /^(?:\d{12}|\d{16})$/;
/** Passport: 8-9 characters, starting with an uppercase letter. */
const PASSPORT_RE = /^[A-Z][A-Z0-9]{7,8}$/;
/** Driver's License: an uppercase letter followed by 6-11 digits. */
const DRIVERS_LICENSE_RE = /^[A-Z]\d{6,11}$/;
/** SSS/GSIS/UMID/PRC: 7-12 digits. */
const NUMERIC_ID_RE = /^\d{7,12}$/;

/** Display names for the digit-only ID types, matched against the lowercase type. */
const DIGIT_ID_TYPES: ReadonlyArray<{ key: string; label: string }> = [
  { key: "sss", label: "SSS" },
  { key: "gsis", label: "GSIS" },
  { key: "umid", label: "UMID" },
  { key: "prc", label: "PRC" },
];

/**
 * Government ID number, with per-type formats when the ID type is known.
 * Philippine government ID letters are always uppercase, so a lowercase
 * letter is rejected before the per-type checks. The optional idType keeps
 * every existing single-argument call unchanged: unknown or unlisted types
 * still use the 4–40 character fallback. Checks apply only to a filled value;
 * requiredness is decided by the caller.
 */
export function validateGovIdNumber(value: string, idType?: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "ID number required.";
  if (LOWERCASE_LETTER_RE.test(value)) return "Use uppercase letters only.";
  const kind = (idType ?? "").trim().toLowerCase();
  const compact = trimmed.replace(ID_SEPARATORS_RE, "");
  // "digital" must be checked before "national": its label contains both words.
  if (kind.includes("digital")) {
    if (DIGITAL_NATIONAL_ID_RE.test(compact)) return null;
    return "Enter a valid Digital National ID (6 uppercase letters and digits).";
  }
  if (kind.includes("national")) {
    if (NATIONAL_ID_RE.test(compact)) return null;
    return "Enter a valid National ID number (12-digit PSN or 16-digit PCN).";
  }
  if (kind.includes("passport")) {
    if (PASSPORT_RE.test(compact)) return null;
    return "Enter a valid Passport number (8-9 uppercase letters and digits, starting with a letter).";
  }
  if (kind.includes("driver")) {
    if (DRIVERS_LICENSE_RE.test(compact)) return null;
    return "Enter a valid Driver's License number (an uppercase letter followed by 6-11 digits).";
  }
  if (kind.includes("tin")) {
    if (/^(?:\d{9}|\d{12})$/.test(compact)) return null;
    return "TIN must be 9 or 12 digits.";
  }
  const digitType = DIGIT_ID_TYPES.find((entry) => kind.includes(entry.key));
  if (digitType) {
    if (NUMERIC_ID_RE.test(compact)) return null;
    return `Enter a valid ${digitType.label} number (7-12 digits).`;
  }
  if (trimmed.length < 4 || trimmed.length > MAX_GOV_ID_LENGTH || !OTHER_ID_CHARS_RE.test(trimmed)) {
    return "ID number must be 4 to 40 uppercase letters, digits, spaces, or hyphens.";
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
