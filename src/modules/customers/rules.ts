import type { Customer, CustomerDraftInput } from "./types";
import { CUSTOMER_CIVIL_STATUSES, CUSTOMER_GENDERS } from "./types";

export type CustomerErrors = Partial<Record<string, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Compose the directory name from structured name parts. */
export function composeCustomerName(input: Pick<CustomerDraftInput, "firstName" | "middleName" | "lastName" | "suffix">): string {
  return [input.firstName, input.middleName, input.lastName, input.suffix].map((part) => (part ?? "").trim()).filter(Boolean).join(" ");
}

/**
 * Submit validation (04 section 10), in the documented order. The exhaustive
 * mandatory matrix is an open owner decision (D3); the interim set below is the
 * minimum needed to start a VIP application. A failed Submit keeps the draft.
 */
export function validateCustomerForSubmit(input: CustomerDraftInput, existing: readonly Customer[], selfId?: string): CustomerErrors {
  const errors: CustomerErrors = {};
  const need = (key: string, value: unknown, message: string) => {
    if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) errors[key] = message;
  };
  need("firstName", input.firstName, "First name is required.");
  need("lastName", input.lastName, "Last name is required.");
  need("dateOfBirth", input.dateOfBirth, "Date of birth is required.");
  need("gender", input.gender, "Gender is required.");
  need("civilStatus", input.civilStatus, "Civil status is required.");
  need("mobileNumber", input.mobileNumber, "Mobile number is required.");
  need("address", input.address?.province && input.address?.city && input.address?.barangay ? "ok" : "", "Province, city or municipality, and barangay are required.");
  need("vipPlan", input.vipPlan, "Select a VIP plan.");
  need("paymentSchemeId", input.paymentSchemeId, "Select a payment scheme.");
  need("contractClassification", input.contractClassification, "Select a contract classification.");
  if (input.gender && !(CUSTOMER_GENDERS as readonly string[]).includes(input.gender)) errors.gender = "Select Male or Female.";
  if (input.civilStatus && !(CUSTOMER_CIVIL_STATUSES as readonly string[]).includes(input.civilStatus)) errors.civilStatus = "Select a valid civil status.";
  if (input.email && !EMAIL_PATTERN.test(input.email)) errors.email = "Enter a valid email address.";
  const number = input.customerNumber?.trim();
  if (number && existing.some((item) => item.id !== selfId && item.customerNumber?.toLowerCase() === number.toLowerCase())) {
    errors.customerNumber = "This Customer ID is already in use.";
  }
  if (!input.consentDataPrivacy) errors.consentDataPrivacy = "The RA 10173 data privacy consent must be certified.";
  if (!input.idReceivedCertified) errors.idReceivedCertified = "Certify that a valid government ID with specimen signatures was received.";
  return errors;
}

/** Downline view (04 section 11): name, plan and status only; no contact, ID, or address details. */
export function restrictCustomer(customer: Customer): Customer {
  return {
    id: customer.id,
    displayName: customer.displayName,
    branchId: customer.branchId,
    ownerMemberId: customer.ownerMemberId,
    status: customer.status,
    vipPlan: customer.vipPlan ?? null,
    restricted: true,
  };
}
