import type { OrgMember } from "@/modules/organization/types";
import type { AccreditationRecord, AccreditationEligibilityResult } from "@/modules/accreditation/types";
import { getAccreditationExpiryState, getAccreditationReminder, manilaToday, type AccreditationReminder } from "@/modules/accreditation/dates";

// Canonical current-record selection: latest effective date wins. Ties and
// missing dates are left unresolved here; use hasAmbiguousAccreditation to
// detect them instead of silently inventing an authoritative choice.
export function getCurrentAccreditationRecord(
  records: readonly AccreditationRecord[],
): AccreditationRecord | null {
  if (records.length === 0) return null;
  return (
    [...records].sort((a, b) => (b.effectiveDate ?? "").localeCompare(a.effectiveDate ?? ""))[0] ?? null
  );
}

// True when two or more records share the latest effective-date key, meaning
// no single record can be established as current from dates alone.
export function hasAmbiguousAccreditation(records: readonly AccreditationRecord[]): boolean {
  if (records.length < 2) return false;
  const keys = records.map((record) => record.effectiveDate ?? "");
  const max = [...keys].sort((a, b) => b.localeCompare(a))[0];
  return keys.filter((key) => key === max).length > 1;
}

/**
 * What a seller's accreditation allows on a given date (doc 03 section 9, owner
 * ruling R3). Expired is NOT blocked: an expired seller may log in, sell, refer
 * and sponsor, with a reminder. Only a rights suspension, resignation or
 * termination blocks new sales and sponsoring. Login is decided elsewhere.
 */
export type SellerStanding =
  | { state: "valid" }
  | { state: "expired"; expiryDate: string; reminder: AccreditationReminder }
  | { state: "blocked"; reason: "NOT_ACTIVE" | "SUSPENDED" | "ENDED" | "INCOMPLETE_DATES" };

export function getSellerStanding(record: AccreditationRecord, onDate: string): SellerStanding {
  // A resignation or termination takes effect after its end date.
  if (record.endDate && onDate > record.endDate) return { state: "blocked", reason: "ENDED" };
  if (record.adminStatus === "revoked" && !record.endDate) return { state: "blocked", reason: "ENDED" };
  // A suspension blocks only sales dated on or after its effective date (OCT R28).
  if (record.adminStatus === "suspended" && (!record.suspensionEffectiveDate || onDate >= record.suspensionEffectiveDate)) {
    return { state: "blocked", reason: "SUSPENDED" };
  }
  if (record.adminStatus === "pending" || record.adminStatus === "cancelled") return { state: "blocked", reason: "NOT_ACTIVE" };
  const expiryState = getAccreditationExpiryState(record.expiryDate, onDate);
  if (expiryState === "incomplete" || !record.expiryDate) return { state: "blocked", reason: "INCOMPLETE_DATES" };
  if (expiryState === "expired") {
    const reminder = getAccreditationReminder(record.expiryDate, onDate) ?? "expired_grace";
    return { state: "expired", expiryDate: record.expiryDate, reminder };
  }
  return { state: "valid" };
}

/**
 * Resolve any AA number a person quotes, current or from the AA Number History,
 * to the record that holds it (doc 03 section 5.2.1).
 */
export function resolveAaNumber(
  records: readonly AccreditationRecord[],
  quoted: string,
): { record: AccreditationRecord; quotedNumberIsCurrent: boolean } | null {
  const normalized = quoted.trim().toUpperCase();
  if (!normalized) return null;
  for (const record of records) {
    if (record.aaNumber?.toUpperCase() === normalized) return { record, quotedNumberIsCurrent: true };
    if (record.aaNumberHistory?.some((entry) => entry.aaNumber.toUpperCase() === normalized)) return { record, quotedNumberIsCurrent: false };
  }
  return null;
}

// Compatibility resolver for the Phase 05 `mockAccreditationEligible` fixture.
// When an authoritative mock AccreditationRecord exists for the member, the
// record governs. Otherwise the legacy fixture is used. Phase 06.7 owns full
// integration; existing Phase 05 call sites are intentionally untouched.
export function resolveEffectiveAccreditationEligibility(
  member: OrgMember,
  accreditations: readonly AccreditationRecord[],
  asOfDate: string = manilaToday(),
): AccreditationEligibilityResult {
  const records = accreditations.filter((record) => record.memberId === member.id);
  if (records.length > 0) {
    const current = getCurrentAccreditationRecord(records);
    if (!current) {
      return { eligible: false, source: "missing", reason: "NO_RECORD" };
    }
    const standing = getSellerStanding(current, asOfDate);
    if (standing.state === "blocked") return { eligible: false, source: "record", reason: standing.reason };
    return standing.state === "expired" ? { eligible: true, source: "record", expired: true } : { eligible: true, source: "record" };
  }
  if (member.mockAccreditationEligible === true) {
    return { eligible: true, source: "fixture" };
  }
  if (member.mockAccreditationEligible === false) {
    return { eligible: false, source: "fixture", reason: "INELIGIBLE_FIXTURE" };
  }
  return { eligible: false, source: "missing", reason: "NO_RECORD" };
}
