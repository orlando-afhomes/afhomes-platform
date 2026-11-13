import { getCurrentAccreditationRecord } from "@/modules/accreditation/eligibility";
import type { AccreditationRecord } from "@/modules/accreditation/types";
import type { OrgMember } from "@/modules/organization/types";
import type { CustomerDraftInput } from "./types";

export function pendingAttributionMemberIds(records: readonly AccreditationRecord[]): Set<string> {
  const byMember = new Map<string, AccreditationRecord[]>();
  for (const record of records) {
    const history = byMember.get(record.memberId);
    if (history) history.push(record);
    else byMember.set(record.memberId, [record]);
  }

  const pending = new Set<string>();
  for (const [memberId, history] of byMember) {
    const latestDate = getCurrentAccreditationRecord(history)?.effectiveDate ?? "";
    if (history.some((record) => record.adminStatus === "pending" && (record.effectiveDate ?? "") === latestDate)) {
      pending.add(memberId);
    }
  }
  return pending;
}

type AttributionInput = Pick<CustomerDraftInput, "recommenderMemberId" | "referrerMemberId">;

export function customerAttributionErrors(input: AttributionInput, pendingIds: ReadonlySet<string> | null): Partial<Record<keyof AttributionInput, string>> {
  const errors: Partial<Record<keyof AttributionInput, string>> = {};
  const fields = [
    ["recommenderMemberId", "recommender"],
    ["referrerMemberId", "referrer"],
  ] as const;

  for (const [field, label] of fields) {
    const memberId = input[field];
    if (!memberId) continue;
    if (!pendingIds) errors[field] = `The selected ${label}’s accreditation could not be checked.`;
    else if (pendingIds.has(memberId)) errors[field] = `The selected ${label} has pending accreditation. Choose another seller or clear the selection.`;
  }
  return errors;
}

export type SellerUpline = { sm: OrgMember | null; ssm: OrgMember | null; svd: OrgMember | null };

/**
 * SM, SSM and SVD of a closing seller, read from the Sales Network (doc 04 section 7.8). The seller counts as
 * their own rung, so an SM shows as their own SM. Inactive members are skipped; nothing is invented.
 */
export function sellerUpline(members: readonly OrgMember[], sellerId: string | null | undefined): SellerUpline {
  const upline: SellerUpline = { sm: null, ssm: null, svd: null };
  const byId = new Map(members.map((member) => [member.id, member]));
  const seen = new Set<string>();
  let current = sellerId ? byId.get(sellerId) : undefined;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    if (current.status === "active") {
      if (current.designation === "SM" && !upline.sm) upline.sm = current;
      else if (current.designation === "SSM" && !upline.ssm) upline.ssm = current;
      else if (current.designation === "SVD" && !upline.svd) upline.svd = current;
    }
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return upline;
}
