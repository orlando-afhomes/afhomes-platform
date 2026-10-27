import type { CSSProperties } from "react";

/**
 * Stable FNV-1a hash of the role id. Badge color follows the role itself,
 * so it stays put when roles are added, removed, filtered, or re-sorted.
 */
export function getRoleBadgeHue(roleId: string): number {
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
