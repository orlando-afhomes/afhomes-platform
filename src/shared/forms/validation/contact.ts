import {
  isValidEmail,
  isValidLandline,
  isValidPhilippineMobile,
  isValidTin,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from "@/shared/utils/input-sanitizers";

/** Required Philippine mobile number: exactly 11 digits starting with 09. */
export function validateMobileNumber(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || !isValidPhilippineMobile(trimmed)) {
    return "Mobile number required.";
  }
  return null;
}

/** Email address between 6 and 254 characters with valid syntax. */
export function validateEmailAddress(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length < 6 || trimmed.length > 254 || !isValidEmail(trimmed)) {
    return "Email must be valid.";
  }
  return null;
}

/** Temporary password policy: 12–128 characters, never transformed. */
export function validatePassword(value: string): string | null {
  if (!value || value.length < MIN_PASSWORD_LENGTH) {
    return "Password too short.";
  }
  if (value.length > MAX_PASSWORD_LENGTH) {
    return "Password too long.";
  }
  return null;
}

/** Confirmation must match the original password exactly. */
export function validateConfirmPassword(password: string, confirm: string): string | null {
  if (password !== confirm) {
    return "Passwords do not match.";
  }
  return null;
}

/** Optional landline: blank or 7–11 digits. */
export function validateLandline(value: string): string | null {
  if (!value.trim()) return null;
  if (!isValidLandline(value)) {
    return "Landline must be 7 to 11 digits.";
  }
  return null;
}

/** Optional Facebook handle/URL: 2–150 characters, no whitespace. */
export function validateFacebook(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length < 2) return "Facebook handle too short.";
  if (/\s/.test(trimmed)) return "Facebook handle invalid.";
  return null;
}
