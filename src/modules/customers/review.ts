import type { AccreditationRecord } from "@/modules/accreditation/types";
import { evaluateSaleParties, salePartyBlockMessage } from "@/modules/sales/accreditation-standing";
import type { Customer, CustomerStatus } from "./types";

/** Only a submitted registration waits for the Administrator (doc 04 section 10). */
export function canReviewRegistration(status: CustomerStatus): boolean {
  return status === "submitted";
}

/** A draft, or a registration sent back to the Clerk, is edited directly and can be (re)submitted. */
export function isEditableRegistration(status: CustomerStatus): boolean {
  return status === "draft" || status === "sent_back";
}

/**
 * Approval checks (doc 04 section 7.8 and the 2026-11-12 follow-up): the actual closing seller is required,
 * an expired seller is eligible (doc 03 section 9, R3) while a suspended or ended one is not, and a closing
 * seller who is also the referrer needs the Clerk's short reference to an existing dated referral.
 */
export function approvalErrors(
  customer: Pick<Customer, "ownerMemberId" | "referrerMemberId" | "recommenderMemberId" | "referralReference">,
  accreditations: readonly AccreditationRecord[],
  onDate: string,
): Partial<Record<"ownerMemberId" | "referralReference", string>> {
  const errors: Partial<Record<"ownerMemberId" | "referralReference", string>> = {};
  if (!customer.ownerMemberId) {
    errors.ownerMemberId = "Choose the closing seller before approval.";
    return errors;
  }
  const { blocked } = evaluateSaleParties([{ role: "seller", memberId: customer.ownerMemberId }], accreditations, onDate);
  if (blocked.length > 0) errors.ownerMemberId = salePartyBlockMessage(blocked[0]);
  const referrer = customer.referrerMemberId || customer.recommenderMemberId;
  if (referrer && referrer === customer.ownerMemberId && !customer.referralReference?.trim()) {
    errors.referralReference = "Record the existing dated referral when the closing seller is also the referrer.";
  }
  return errors;
}
