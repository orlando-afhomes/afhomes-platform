import type { AccreditationRecord } from "@/modules/accreditation/types";
import type { OrgMember } from "@/modules/organization/types";
import { isAccreditationEligibleOnDate, manilaToday } from "@/modules/accreditation/dates";
import { getCurrentAccreditationRecord, hasAmbiguousAccreditation } from "@/modules/accreditation/eligibility";
import { resolveTeamName } from "@/modules/sales-network/genealogy";

export const UNASSIGNED_TEAM = "Unassigned team";

/** User-facing labels for the accreditation action dropdown and read-only states. */
export const ACCREDITATION_ACTION_LABELS = {
  pending: "Pending",
  active: "Accredited",
  cancel: "Cancelled",
  expired: "Expired",
} as const;

export function designationLabel(designation: string): string {
  switch (designation) {
    case "SVD":
      return "Sales Vice Director";
    case "SSM":
      return "Senior Sales Manager";
    case "SM":
      return "Sales Manager";
    case "OST":
      return "OST";
    default:
      return designation;
  }
}

export const DESIGNATION_COLORS: Record<string, string | undefined> = {
  SVD: "purple",
  SSM: "blue",
  SM: "cyan",
  OST: "orange",
};

/** Human-readable Team inherited from the root; never an internal branch ID. */
export function teamDisplayName(member: OrgMember, members: readonly OrgMember[]): string {
  return resolveTeamName(member, members) ?? UNASSIGNED_TEAM;
}

/** Visible seller ID: official AA number or an honest pending placeholder. */
export function aaDisplay(member: Pick<OrgMember, "aaNumber">): string {
  return member.aaNumber ?? "Pending AA Issuance";
}

export type AccreditationDisplay =
  | { kind: "none" }
  | { kind: "ambiguous" }
  | { kind: "static"; label: string; color?: string }
  | { kind: "action"; recordId: string; value: "pending" | "active" };

/**
 * Single shared accreditation display resolver for the Members table, member
 * details, and related summaries. Cancelled stays Cancelled even past expiry;
 * suspended/revoked keep their truthful states; expiry remains date-derived.
 */
export function resolveAccreditationDisplay(
  records: readonly AccreditationRecord[] | undefined,
): AccreditationDisplay {
  if (!records || records.length === 0) return { kind: "none" };
  if (hasAmbiguousAccreditation(records)) return { kind: "ambiguous" };
  const record = getCurrentAccreditationRecord(records);
  if (!record) return { kind: "none" };
  if (record.adminStatus === "suspended") return { kind: "static", label: "Suspended", color: "red" };
  if (record.adminStatus === "revoked") return { kind: "static", label: "Revoked", color: "red" };
  if (record.adminStatus === "cancelled") return { kind: "static", label: "Cancelled", color: "red" };
  if (record.adminStatus === "active") {
    if (record.expiryDate && !isAccreditationEligibleOnDate(record.expiryDate, manilaToday())) {
      return { kind: "static", label: "Expired" };
    }
    return { kind: "action", recordId: record.id, value: "active" };
  }
  return { kind: "action", recordId: record.id, value: "pending" };
}
