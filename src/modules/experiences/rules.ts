import type { ExperienceStatusTone } from "./types";
import { EXPERIENCE_STATUS_TONES } from "./types";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const EXPERIENCE_SLUG_MAX = 60;
export const EXPERIENCE_TEXT_MAX = 600;
export const EXPERIENCE_HIGHLIGHT_TEXT_MAX = 400;
export const EXPERIENCE_HIGHLIGHT_TITLE_MAX = 80;

/** Why a page address cannot be used, or null when it is valid. */
export function experienceSlugProblem(
  slug: string,
  existing: ReadonlyArray<{ id: string; slug: string }>,
  currentId?: string,
): string | null {
  const value = slug.trim();
  if (!value) return "Enter a page address for the experience.";
  if (value.length > EXPERIENCE_SLUG_MAX) return `The page address must be ${EXPERIENCE_SLUG_MAX} characters or fewer.`;
  if (!SLUG_PATTERN.test(value)) return "Use lowercase letters, numbers, and single hyphens, for example night-market.";
  if (existing.some((item) => item.id !== currentId && item.slug === value)) return "This page address is already used by another experience.";
  return null;
}

export function isExperienceStatusTone(value: string): value is ExperienceStatusTone {
  return (EXPERIENCE_STATUS_TONES as readonly string[]).includes(value);
}
