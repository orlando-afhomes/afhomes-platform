import { validateCustomerId } from "./customer-number";
import { dialingPrefixFor } from "@/shared/data/philippine-locations";
import type { Customer, CustomerDraftInput } from "./types";
import { CUSTOMER_CIVIL_STATUSES, CUSTOMER_GENDERS } from "./types";
import { validateLandline } from "@/shared/forms/validation/contact";
import { validateGovIdNumber, validateCitizenship, validateTinNumber } from "@/shared/forms/validation/identification";

/** Citizenship validation lives with the other identification rules; re-exported for customer-rule callers. */
export { validateCitizenship };

export type CustomerErrors = Partial<Record<string, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Compose the directory name from structured name parts. */
export function composeCustomerName(input: Pick<CustomerDraftInput, "firstName" | "middleName" | "lastName" | "suffix">): string {
  return [input.firstName, input.middleName, input.lastName, input.suffix].map((part) => (part ?? "").trim()).filter(Boolean).join(" ");
}

export function customerRecordName(customer: Pick<Customer, "displayName" | "status">): string {
  return customer.displayName || (customer.status === "draft" ? "Untitled draft" : "—");
}

/**
 * Submit validation (04 section 10), in the documented order. The exhaustive
 * mandatory matrix is an open owner decision (D3); the interim set below is the
 * minimum needed to start a VIP application. A failed Submit keeps the draft.
 */
export function validateCustomerForSubmit(input: CustomerDraftInput, existing: readonly Customer[], selfId?: string, supplementaryAllowed = false): CustomerErrors {
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
  if (input.landline) {
    // The field shows the area code as a fixed prefix, so the stored value is the
    // local subscriber number and its required length depends on that code.
    const areaCode = input.address ? dialingPrefixFor(input.address.province, input.address.city).areaCode : null;
    const landlineError = validateLandline(input.landline, areaCode);
    if (landlineError) errors.landline = landlineError;
  }
  if (input.tinNumber) {
    const tinError = validateTinNumber(input.tinNumber);
    if (tinError) errors.tinNumber = tinError;
  }
  if (input.citizenship?.trim()) {
    const citizenshipError = validateCitizenship(input.citizenship);
    if (citizenshipError) errors.citizenship = citizenshipError;
  }
  if (input.governmentIdNumber?.trim()) {
    const governmentIdError = validateGovIdNumber(input.governmentIdNumber, input.governmentIdType ?? undefined);
    if (governmentIdError) errors.governmentIdNumber = governmentIdError;
  }
  const number = input.customerNumber?.trim();
  // Customer ID mode (04 section 7.7): Manual requires a value; Automatic (or the
  // legacy blank request) generates one at Submit, so a blank value does not block.
  const customerIdMode = input.customerIdMode;
  if (!number && customerIdMode === "manual") {
    errors.customerNumber = "Enter a Customer ID or choose Automatic.";
  } else if (number) {
    const customerNumberError = validateCustomerId(number, existing, selfId);
    if (customerNumberError) errors.customerNumber = customerNumberError;
  }
  Object.assign(errors, validateSupplementaryHolder(input.supplementaryHolder, supplementaryAllowed));
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

/** A supplementary holder needs a plan that allows one and a first and last name; a birth date, when given, must be in the past. */
export function validateSupplementaryHolder(holder: CustomerDraftInput["supplementaryHolder"], allowed: boolean): CustomerErrors {
  const errors: CustomerErrors = {};
  if (!holder) return errors;
  if (!allowed) errors.supplementaryHolder = "The selected VIP plan does not allow a supplementary holder.";
  else if (!holder.firstName?.trim() || !holder.lastName?.trim()) errors.supplementaryHolder = "Enter the supplementary holder's first and last name.";
  else if (holder.dateOfBirth && !(holder.dateOfBirth < new Date().toISOString().slice(0, 10))) errors.supplementaryHolder = "The supplementary holder's birth date must be in the past.";
  if (!errors.supplementaryHolder) {
    // Email, government ID type/number are not typed holder fields; read them
    // tolerantly so a future caller passing them still gets the format check.
    const holderRecord = holder as unknown as {
      email?: unknown;
      governmentIdType?: unknown;
      governmentIdNumber?: unknown;
    };
    const holderEmail = holderRecord.email;
    if (typeof holderEmail === "string" && holderEmail.trim() !== "" && !EMAIL_PATTERN.test(holderEmail.trim())) {
      errors.supplementaryHolder = "Enter a valid email address.";
    }
    if (!errors.supplementaryHolder) {
      // Mirror the primary rule: the area code shown as the prefix decides the
      // local-number length, using the holder's own residential address.
      const holderAreaCode = holder.address
        ? dialingPrefixFor(holder.address.province, holder.address.city).areaCode
        : null;
      const holderLandlineError = validateLandline(holder.landline ?? "", holderAreaCode);
      if (holderLandlineError) errors.supplementaryHolder = holderLandlineError;
    }
    if (!errors.supplementaryHolder) {
      const holderTinError = validateTinNumber(holder.tinNumber ?? "");
      if (holderTinError) errors.supplementaryHolder = holderTinError;
    }
    if (!errors.supplementaryHolder) {
      const holderCitizenshipError = validateCitizenship(holder.citizenship ?? "");
      if (holderCitizenshipError) errors.supplementaryHolder = holderCitizenshipError;
    }
    if (!errors.supplementaryHolder) {
      const holderGovId = typeof holderRecord.governmentIdNumber === "string" ? holderRecord.governmentIdNumber : "";
      if (holderGovId.trim()) {
        const holderGovIdType = typeof holderRecord.governmentIdType === "string" ? holderRecord.governmentIdType : undefined;
        const holderGovIdError = validateGovIdNumber(holderGovId, holderGovIdType);
        if (holderGovIdError) errors.supplementaryHolder = holderGovIdError;
      }
    }
  }
  return errors;
}
