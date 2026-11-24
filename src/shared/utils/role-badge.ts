import type { CSSProperties } from "react";

/** The seeded roles are spaced evenly around the color wheel (at least 30 degrees apart) so no two look alike. */
const SEEDED_ROLE_HUES: Readonly<Record<string, number>> = {
  // The three staff roles (HR, Finance, Operations) sit far apart (orange, green, blue) because they are listed together.
  "role-super-admin": 0, "role-hr-staff": 32, "role-admin": 64, "role-finance": 96, "role-fin-staff": 128,
  "role-sm": 160, "role-ost": 192, "role-ops-staff": 224, "role-hr": 256, "role-svd": 288, "role-ssm": 320,
};

/**
 * Stable FNV-1a hash of the role id. Badge color follows the role itself,
 * so it stays put when roles are added, removed, filtered, or re-sorted.
 */
export function getRoleBadgeHue(roleId: string): number {
  const fixed = SEEDED_ROLE_HUES[roleId];
  if (fixed !== undefined) return fixed;
  let hash = 0x811c9dc5;
  for (let index = 0; index < roleId.length; index += 1) {
    hash ^= roleId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash) % 360;
}

/** Distinct pastel badge per role id with dark, readable text. */
export function getRoleBadgeStyle(roleId: string): CSSProperties {
  const hue = getRoleBadgeHue(roleId);
  return {
    backgroundColor: `hsl(${hue}, 70%, 92%)`,
    borderColor: `hsl(${hue}, 55%, 70%)`,
    color: `hsl(${hue}, 45%, 26%)`,
  };
}
