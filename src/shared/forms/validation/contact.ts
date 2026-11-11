import {
  isValidEmail,
  isValidLandline,
  isValidPhilippineMobile,
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

/**
 * Optional landline. When an area code is shown as the field prefix the value is
 * the local subscriber number only: 8 digits for Metro Manila (02) and 7 for
 * every provincial code. Without an area code the 7–10 digit domestic form is
 * accepted. Never blocks an empty submit.
 */
export function validateLandline(value: string, areaCode?: string | null): string | null {
  if (!value.trim()) return null;
  if (isValidLandline(value, areaCode)) return null;
  const code = (areaCode ?? "").replace(/\D/g, "");
  if (code === "2" || code === "02") return "Landline must be 8 digits for Metro Manila (02).";
  if (code) return "Landline must be 7 digits for this area code.";
  return "Landline must be 7 to 10 digits.";
}

/** Optional Facebook handle/URL: 2–150 characters, no whitespace. */
export function validateFacebook(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length < 2) return "Facebook handle too short.";
  if (/\s/.test(trimmed)) return "Facebook handle invalid.";
  return null;
}
