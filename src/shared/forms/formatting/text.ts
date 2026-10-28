// Shared text normalization helpers. Pure functions; no business logic.

export {
  cleanNameInput,
  cleanTitleInput,
  capitalizeWords,
} from "@/shared/utils/input-sanitizers";

/** Trim outer whitespace and collapse repeated internal whitespace. */
export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Uppercase initials of a full name, e.g. for avatars ("Ramon Del Rosario" → "RD"). */
export function initialsOf(fullName: string, maxLength = 2): string {
  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxLength)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
