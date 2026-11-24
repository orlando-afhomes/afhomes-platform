import { isEditableRegistration } from "./review";
import { composeCustomerName } from "./rules";
import type { Customer, CustomerDraftInput } from "./types";

/** Fields a submitted or approved record may still change through Submit and Correct. */
export const COPY_KEYS = [
  "customerNumber", "firstName", "middleName", "lastName", "suffix", "gender", "civilStatus", "dateOfBirth", "mobileNumber",
  "email", "address", "governmentIdType", "governmentIdNumber", "vipPlan", "supplementaryHolder", "paymentSchemeId", "contractClassification",
  "recommenderMemberId", "referralReference", "acquisitionChannel", "consentDataPrivacy", "idReceivedCertified",
] as const;

/** Extra fields a draft or sent-back record may change. */
export const DRAFT_COPY_KEYS = [
  ...COPY_KEYS, "referrerMemberId", "customerIdMode", "noMiddleName", "citizenship", "landline", "tinNumber",
  "occupation", "businessIndustry", "employedPosition", "officeAddress", "governmentIdImage",
] as const;

/** Copies the allowed input fields onto the record and recomposes the display name. */
export function applyCustomerInput(customer: Customer, input: CustomerDraftInput): void {
  const target = customer as unknown as Record<string, unknown>;
  const keys = isEditableRegistration(customer.status) ? DRAFT_COPY_KEYS : COPY_KEYS;
  for (const key of keys) {
    const value = (input as Record<string, unknown>)[key];
    if (value !== undefined) target[key] = value;
  }
  const composed = composeCustomerName(customer);
  const clearsDraftName = customer.status === "draft" && (input.firstName !== undefined || input.lastName !== undefined);
  customer.displayName = composed || input.displayName.trim() || (clearsDraftName ? "" : customer.displayName);
}
