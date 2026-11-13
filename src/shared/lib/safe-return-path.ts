/**
 * Validates a "return to" path taken from the URL so sign-in can never send
 * the user off-site. Only same-origin relative paths under /admin pass.
 */
export function safeReturnPath(value: string | null | undefined, fallback = "/admin"): string {
  if (!value || value.length > 2000) return fallback;
  // Reject backslashes, control characters and whitespace tricks.
  if (/[\\\u0000-\u001f\u007f\s]/.test(value)) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (!/^\/admin(?:$|[/?#])/.test(value)) return fallback;
  return value;
}
