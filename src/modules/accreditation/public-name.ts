/**
 * Masked holder name for the public seller check (copied from the v2 rule, owner decision UI21).
 * Every word except the last stays whole; the last word keeps its first letter and the rest become
 * `*`. A one-letter last word gets one added `*` so a full name never shows. Empty input gives null.
 */
export function maskPublicName(displayName: string | null | undefined): string | null {
  const words = (displayName ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const last = Array.from(words[words.length - 1]);
  const masked = last[0] + "*".repeat(Math.max(1, last.length - 1));
  return [...words.slice(0, -1), masked].join(" ");
}
