import type { OrgMember } from "@/modules/organization/types";
import type { AccreditationRecord, AccreditationEligibilityResult } from "@/modules/accreditation/types";
import { isAccreditationEligibleOnDate, manilaToday } from "@/modules/accreditation/dates";

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
    if (current.adminStatus !== "active") {
      return { eligible: false, source: "record", reason: "NOT_ACTIVE" };
    }
    if (current.expiryDate && !isAccreditationEligibleOnDate(current.expiryDate, asOfDate)) {
      return { eligible: false, source: "record", reason: "EXPIRED" };
    }
    if (!current.expiryDate) {
      return { eligible: false, source: "record", reason: "INCOMPLETE_DATES" };
    }
    return { eligible: true, source: "record" };
  }
  if (member.mockAccreditationEligible === true) {
    return { eligible: true, source: "fixture" };
  }
  if (member.mockAccreditationEligible === false) {
    return { eligible: false, source: "fixture", reason: "INELIGIBLE_FIXTURE" };
  }
  return { eligible: false, source: "missing", reason: "NO_RECORD" };
}
