import { getCurrentAccreditationRecord } from "@/modules/accreditation/eligibility";
import type { AccreditationRecord } from "@/modules/accreditation/types";
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
    else if (pendingIds.has(memberId)) errors[field] = `The selected ${label} has pending accreditation. Choose another OST or clear the selection.`;
  }
  return errors;
}
