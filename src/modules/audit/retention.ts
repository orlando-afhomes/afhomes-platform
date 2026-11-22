import { addYearsToDate, parseManilaDateOnly } from "@/shared/lib/dates";

/**
 * Records retention schedule. Owner decision 2026-11-22: the company has not issued its own schedule, so this
 * ten-year schedule is the working rule until the Data Protection Officer and Legal replace it. It is not legal advice.
 * The prototype never deletes anything automatically (mock data lives in browser memory); this module only states the rule
 * and computes the earliest disposal date for a record class.
 */
export type RetentionClassId = "finance" | "contracts" | "audit" | "personal" | "rejected_application" | "verify_log" | "marketing";

export type RetentionRule = {
  id: RetentionClassId;
  label: string;
  /** Null: kept until the person withdraws consent. */
  years: number | null;
  /** Plain words for when the period starts. */
  start: string;
};

export const RETENTION_SCHEDULE: readonly RetentionRule[] = [
  { id: "finance", label: "Payments, receipts, commissions and payouts", years: 10, start: "End of the calendar year of the transaction" },
  { id: "contracts", label: "Contracts, VIP Grants, property sale (IGP) records and memberships", years: 10, start: "End or expiry of the contract" },
  { id: "audit", label: "Audit log", years: 10, start: "Date of the event" },
  { id: "personal", label: "Customer and seller personal data", years: 10, start: "End of the relationship with AFhomes" },
  { id: "rejected_application", label: "Rejected or withdrawn applications", years: 2, start: "Date of the decision" },
  { id: "verify_log", label: "Public accreditation check records", years: 1, start: "Date of the check" },
  { id: "marketing", label: "Marketing consent", years: null, start: "Until the person withdraws consent" },
];

/**
 * Earliest date a record of this class may be disposed of (deleted or anonymised), or null when it may not be disposed of:
 * a legal hold suspends disposal, and marketing consent has no end date. `startDate` is a date-only value (Asia/Manila).
 */
export function retentionDisposalDate(recordClass: RetentionClassId, startDate: string, onLegalHold = false): string | null {
  const rule = RETENTION_SCHEDULE.find(({ id }) => id === recordClass);
  const parts = parseManilaDateOnly(startDate);
  if (!rule || rule.years === null || onLegalHold || !parts) return null;
  const base = recordClass === "finance" ? `${parts.year}-12-31` : startDate;
  return addYearsToDate(base, rule.years);
}
