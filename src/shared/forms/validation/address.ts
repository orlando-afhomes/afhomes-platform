import { isValidPostalCode, MAX_ADDRESS_LENGTH, MAX_CITY_LENGTH, MAX_ZIP_LENGTH } from "@/shared/utils/input-sanitizers";

const MAX_SUBDIVISION_LENGTH = 120;

/** Street address: 2–160 characters, digits and punctuation allowed. */
export function validateStreet(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Street address required.";
  if (trimmed.length < 2 || trimmed.length > MAX_ADDRESS_LENGTH) {
    return "Street address must be 2 to 160 characters.";
  }
  return null;
}

/** Province: required, 2–100 characters. */
export function validateProvince(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Province is required.";
  if (trimmed.length < 2 || trimmed.length > MAX_CITY_LENGTH) {
    return "Province must be 2 to 100 characters.";
  }
  return null;
}

/** City/Municipality: required, 2–100 characters. */
export function validateCity(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "City is required.";
  if (trimmed.length < 2 || trimmed.length > MAX_CITY_LENGTH) {
    return "City must be 2 to 100 characters.";
  }
  return null;
}

/** Barangay: required, 1–100 characters. */
export function validateBarangay(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Barangay is required.";
  if (trimmed.length > MAX_CITY_LENGTH) {
    return "Barangay must be 100 characters or fewer.";
  }
  return null;
}

/** Subdivision/Village: optional, 2–120 characters when present. */
export function validateSubdivision(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length < 2) return "Subdivision must be longer.";
  if (trimmed.length > MAX_SUBDIVISION_LENGTH) {
    return "Subdivision must be 120 characters or fewer.";
  }
  return null;
}

/** ZIP/Postal code: exactly 4 digits, leading zeros preserved. */
export function validatePostalCode(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "ZIP code required.";
  if (!isValidPostalCode(trimmed) || trimmed.length !== MAX_ZIP_LENGTH) {
    return "ZIP code must be 4 digits.";
  }
  return null;
}

/** Business/Employer name: optional, 2–150 characters. */
export function validateBusinessName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length < 2) return "Employer name too short.";
  if (trimmed.length > 150) return "Employer name too long.";
  return null;
}

/** Business/Employer address: optional, 3–200 characters. */
export function validateBusinessAddress(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length < 3) return "Employer address too short.";
  if (trimmed.length > 200) return "Employer address too long.";
  return null;
}

/** Team Name: required for SVD roots, 2–100 characters. */
export function validateTeamName(value: string, required = true): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return required ? "Team name is required." : null;
  }
  if (trimmed.length < 2 || trimmed.length > 100) {
    return "Team name must be 2 to 100 characters.";
  }
  return null;
}

/** Job position: optional, 2–100 characters. */
export function validateJobPosition(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length < 2) return "Job position too short.";
  if (trimmed.length > 100) return "Job position too long.";
  return null;
}
