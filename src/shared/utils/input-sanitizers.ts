// Shared input sanitizers for modal forms (Departments, Roles, Staff).
// Block invalid characters as typed; submit handlers still validate.
const NAME_CHARS_RE = /[^A-Za-zÀ-ÿ\s'-]/g;
const WORD_START_RE = /(^|\s|-|')[a-zà-ÿ]/g;

/** Letters, spaces, hyphens, and apostrophes only. */
export function cleanNameInput(value: string): string {
  return value.replace(NAME_CHARS_RE, "");
}

/** Capitalize the first letter of each word (after spaces, hyphens, apostrophes). */
export function capitalizeWords(value: string): string {
  return value.replace(WORD_START_RE, (char) => char.toUpperCase());
}

/** Clean + capitalize in one pass for name/title fields. */
export function cleanTitleInput(value: string): string {
  return capitalizeWords(cleanNameInput(value));
}

/** Names may contain letters, spaces, hyphens, and apostrophes only. */
export function isValidName(value: string): boolean {
  return /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]*$/.test(value.trim());
}

/** Lowercase, no spaces: emails always start with a small letter. */
export function cleanEmailInput(value: string): string {
  return value.toLowerCase().replace(/\s/g, "");
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export const MIN_PASSWORD_LENGTH = 8;

/** Display a status value with a capital first letter (Active, Suspended, …). */
export function formatStatusLabel(value: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : trimmed;
}
