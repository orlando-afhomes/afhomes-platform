// Government ID normalization and display helpers. Never log raw values;
// never place full ID numbers in query keys, audit events, or public views.

/** Trim outer whitespace and collapse repeated internal whitespace. */
export function normalizeGovIdNumber(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Mask all but the last four characters for directory-safe display. */
export function maskGovIdNumber(value: string, visibleTail = 4): string {
  const trimmed = value.trim();
  if (trimmed.length <= visibleTail) return "••••";
  return `••••${trimmed.slice(-visibleTail)}`;
}
