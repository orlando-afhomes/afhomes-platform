/**
 * Date-only display helper (Asia/Manila semantics live in
 * `@/modules/accreditation/dates`; this is presentation only). Returns an
 * em dash for missing values and the raw value when it is not a date.
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
