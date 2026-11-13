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

function monthIndex(parts: ManilaDateParts): number {
  return parts.year * 12 + (parts.month - 1);
}

/** Calendar-month shift that clamps to the last day of a shorter month. */
export function addMonths(parts: ManilaDateParts, months: number): ManilaDateParts {
  const index = monthIndex(parts) + months;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { year, month, day: Math.min(parts.day, daysInMonth) };
}

/**
 * Doc 03 section 5.1 (owner ruling R3): a renewal is recorded in the expiry
 * month or later, never earlier. Papers received before that month are held.
 */
export type RenewalTiming = "invalid" | "too_early" | "in_expiry_month" | "late";

export function classifyRenewalTiming(expiryDate: string | null, renewalDate: string | null): RenewalTiming {
  const expiry = parseManilaDateOnly(expiryDate);
  const renewal = parseManilaDateOnly(renewalDate);
  if (!expiry || !renewal) return "invalid";
  const monthsAfterExpiry = monthIndex(renewal) - monthIndex(expiry);
  if (monthsAfterExpiry < 0) return "too_early";
  if (monthsAfterExpiry === 0) return "in_expiry_month";
  return "late";
}

export function isRenewalAllowed(expiryDate: string | null, renewalDate: string | null): boolean {
  const timing = classifyRenewalTiming(expiryDate, renewalDate);
  return timing === "in_expiry_month" || timing === "late";
}

/** A renewal is valid for one year from the actual renewal date (doc 03 section 5.2). */
export function calculateRenewedExpiry(existingExpiryDate: string, renewalDate: string): string | null {
  if (!isRenewalAllowed(existingExpiryDate, renewalDate)) return null;
  const base = parseManilaDateOnly(renewalDate);
  return base ? formatManilaDateParts(addOneYear(base)) : null;
}

export type AccreditationReminder = "renewal_due" | "expired_grace" | "closed_not_renewed";

export const ACCREDITATION_REMINDER_LABELS: Record<AccreditationReminder, string> = {
  renewal_due: "Renewal due",
  expired_grace: "Expired - grace",
  closed_not_renewed: "Closed - not renewed",
};

/**
 * Doc 03 section 5.5 reminder labels. Status and report label only: nothing is blocked.
 * Renewal due from one month before the valid-until date; grace for one month after.
 */
export function getAccreditationReminder(expiryDate: string | null, asOfDate: string): AccreditationReminder | null {
  const expiry = parseManilaDateOnly(expiryDate);
  const asOf = parseManilaDateOnly(asOfDate);
  if (!expiry || !asOf) return null;
  if (diffCalendarDays(asOf, addMonths(expiry, -1)) > 0) return null;
  if (diffCalendarDays(asOf, expiry) >= 0) return "renewal_due";
  if (diffCalendarDays(asOf, addMonths(expiry, 1)) >= 0) return "expired_grace";
  return "closed_not_renewed";
}

export function isAccreditationEligibleOnDate(expiryDate: string | null, asOfDate: string): boolean {
  const state = getAccreditationExpiryState(expiryDate, asOfDate);
  return state === "valid" || state === "expires_today";
}
