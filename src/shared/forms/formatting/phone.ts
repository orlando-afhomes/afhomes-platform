// Shared Philippine phone/postal formatting helpers. Pure functions that never
// touch business records; canonical digit-only values stay in the repository.

export {
  normalizePhilippineMobile,
  formatPhilippineMobile,
  formatPartialPhilippineMobile,
  isValidPhilippineMobile,
  normalizePostalCode,
  isValidPostalCode,
  formatTin,
  isValidTin,
  normalizeLandline,
  isValidLandline,
  MAX_TIN_LENGTH,
  MAX_ZIP_LENGTH,
} from "@/shared/utils/input-sanitizers";

/** Grouped landline display: 7 digits → XXX-XXXX, 8 → XXXX-XXXX (with area codes as typed). */
export function formatPhilippineLandlineDisplay(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, digits.length - 4)}-${digits.slice(-4)}`;
  const head = digits.slice(0, digits.length - 8);
  const tail = digits.slice(-8);
  return `${head}-${tail.slice(0, 4)}-${tail.slice(4)}`;
}
