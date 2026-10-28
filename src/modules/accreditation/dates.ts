export type ManilaDateParts = { year: number; month: number; day: number };

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseManilaDateOnly(value: string | null | undefined): ManilaDateParts | null {
  if (!value) return null;
  const match = DATE_ONLY_RE.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) return null;
  return { year, month, day };
}

export function formatManilaDateParts(parts: ManilaDateParts): string {
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${parts.year}-${month}-${day}`;
}

export function manilaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

// Leap-day assumption: Feb 29 + 1 year = Feb 28. Canonical rule is silent;
// owner confirmation required before relying on this contractually.
export function addOneYear(parts: ManilaDateParts): ManilaDateParts {
  const daysInMonth = new Date(Date.UTC(parts.year + 1, parts.month, 0)).getUTCDate();
  return { year: parts.year + 1, month: parts.month, day: Math.min(parts.day, daysInMonth) };
}

function toUtcDay(parts: ManilaDateParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

export function diffCalendarDays(from: ManilaDateParts, to: ManilaDateParts): number {
  return Math.round((toUtcDay(to) - toUtcDay(from)) / 86_400_000);
}

export type AccreditationExpiryState = "valid" | "expires_today" | "expired" | "incomplete";

export function getAccreditationExpiryState(expiryDate: string | null, asOfDate: string): AccreditationExpiryState {
  const expiry = parseManilaDateOnly(expiryDate);
  const asOf = parseManilaDateOnly(asOfDate);
  if (!expiry || !asOf) return "incomplete";
  const diff = diffCalendarDays(asOf, expiry);
  if (diff > 0) return "valid";
  if (diff === 0) return "expires_today";
  return "expired";
}

export type RenewalTiming = "invalid" | "too_early" | "early" | "on_date" | "late";

export function classifyRenewalTiming(expiryDate: string | null, renewalDate: string | null): RenewalTiming {
  const expiry = parseManilaDateOnly(expiryDate);
  const renewal = parseManilaDateOnly(renewalDate);
  if (!expiry || !renewal) return "invalid";
  const diff = diffCalendarDays(renewal, expiry);
  if (diff < 0) return "late";
  if (diff === 0) return "on_date";
  if (diff <= 30) return "early";
  return "too_early";
}

export function isRenewalAllowed(expiryDate: string | null, renewalDate: string | null): boolean {
  const timing = classifyRenewalTiming(expiryDate, renewalDate);
  return timing === "early" || timing === "on_date" || timing === "late";
}

export function calculateRenewedExpiry(existingExpiryDate: string, renewalDate: string): string | null {
  const timing = classifyRenewalTiming(existingExpiryDate, renewalDate);
  if (timing === "invalid" || timing === "too_early") return null;
  const base = timing === "late" ? parseManilaDateOnly(renewalDate) : parseManilaDateOnly(existingExpiryDate);
  if (!base) return null;
  return formatManilaDateParts(addOneYear(base));
}

export function isAccreditationEligibleOnDate(expiryDate: string | null, asOfDate: string): boolean {
  const state = getAccreditationExpiryState(expiryDate, asOfDate);
  return state === "valid" || state === "expires_today";
}
