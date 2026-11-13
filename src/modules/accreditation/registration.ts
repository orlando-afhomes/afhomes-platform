import type {
  RegistrationApplicant,
  RegistrationApplication,
  RegistrationCompletion,
  RegistrationStatus,
} from "@/modules/accreditation/types";
import type { DevIdentity } from "@/modules/identity/types";
import { getEffectiveRoles, isModuleGranted } from "@/modules/identity/permissions";
import { GENDER_OPTIONS, CIVIL_STATUS_OPTIONS, GOV_ID_OPTIONS, PROGRAM_CATEGORY_OPTIONS } from "@/modules/sales-network/accredited-seller";
import { isValidTierCode } from "@/modules/vip/types";
import { validateDateString, validatePastDate } from "@/shared/forms/validation/dates";
import { validateEmailAddress, validateMobileNumber } from "@/shared/forms/validation/contact";
import { validateBarangay, validateCity, validatePostalCode, validateProvince, validateStreet } from "@/shared/forms/validation/address";
import { validateGovIdNumber } from "@/shared/forms/validation/identification";
import { validateMiddleName, validatePersonName, validateSuffix } from "@/shared/forms/validation/person-name";
import { normalizePhilippineMobile } from "@/shared/utils/input-sanitizers";

/** Actor id written on history and audit entries for the public applicant. */
export const APPLICANT_ACTOR_ID = "applicant";

export const REGISTRATION_AUDIT_ACTIONS = {
  REGISTRATION_SUBMITTED: "REGISTRATION_SUBMITTED",
  REGISTRATION_RESUBMITTED: "REGISTRATION_RESUBMITTED",
  REGISTRATION_CHECKED: "REGISTRATION_CHECKED",
  REGISTRATION_RETURNED: "REGISTRATION_RETURNED",
  REGISTRATION_REJECTED: "REGISTRATION_REJECTED",
  REGISTRATION_APPROVED: "REGISTRATION_APPROVED",
} as const;

/** Same text for every refused public submission, so nothing about existing records is revealed. */
export const REGISTRATION_NEUTRAL_REFUSAL = "We could not accept this application online. Please contact the office.";
export const REGISTRATION_SPONSOR_REFUSAL = "Referral code is invalid or currently unavailable.";
export const MAX_REGISTRATION_REASON_LENGTH = 500;

export const REGISTRATION_STATUS_LABEL: Record<RegistrationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  pending_review: "Checked, awaiting decision",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  needs_info: "Returned to applicant",
};

/** Statuses that still reserve the applicant's email, mobile number and identity against a second application. */
const BLOCKING_STATUSES: readonly RegistrationStatus[] = ["submitted", "pending_review", "needs_info", "approved"];

/** The office may check and complete an application only while it is waiting for office action. */
export function isAwaitingOffice(status: RegistrationStatus): boolean {
  return status === "submitted" || status === "pending_review";
}

/**
 * Clerk, Administrator and Super Administrator review the queue (doc 03 section 9.2).
 * shortcut: derived from the "accreditation-registrations" module grant and the Administrator
 * roles until the identity module defines operation names; swap both bodies then.
 */
export function canReviewRegistrations(identity: DevIdentity): boolean {
  return identity.status === "active" && isModuleGranted(identity, "accreditation-registrations");
}

/** Only the Administrator or the Super Administrator approves, returns or rejects (doc 03 section 9.2). */
export function canDecideRegistrations(identity: DevIdentity): boolean {
  return identity.status === "active" && getEffectiveRoles(identity).some((role) => role === "super_admin" || role === "admin");
}

export type ApplicantField = keyof RegistrationApplicant;
export type ApplicantErrors = Partial<Record<ApplicantField, string>>;

export const PERSONAL_FIELDS: readonly ApplicantField[] = ["firstName", "middleName", "lastName", "suffix", "mobileNumber", "email", "dateOfBirth"];
export const ADDRESS_FIELDS: readonly ApplicantField[] = ["street", "province", "city", "barangay", "postalCode"];

export const EMPTY_APPLICANT: RegistrationApplicant = {
  firstName: "",
  middleName: "",
  noMiddleName: false,
  lastName: "",
  suffix: "",
  mobileNumber: "",
  email: "",
  dateOfBirth: "",
  street: "",
  province: "",
  city: "",
  barangay: "",
  postalCode: "",
};

/** Field-by-field validation with the shared form validators; empty result means valid. */
export function validateApplicant(applicant: RegistrationApplicant): ApplicantErrors {
  const checks: Array<[ApplicantField, string | null]> = [
    ["firstName", validatePersonName(applicant.firstName, "First name")],
    ["middleName", validateMiddleName(applicant.middleName, applicant.noMiddleName)],
    ["lastName", validatePersonName(applicant.lastName, "Last name")],
    ["suffix", validateSuffix(applicant.suffix)],
    ["mobileNumber", validateMobileNumber(applicant.mobileNumber)],
    ["email", validateEmailAddress(applicant.email)],
    ["dateOfBirth", validatePastDate(applicant.dateOfBirth, "Birth date", "Birth date cannot be in the future.")],
    ["street", validateStreet(applicant.street)],
    ["province", validateProvince(applicant.province)],
    ["city", validateCity(applicant.city)],
    ["barangay", validateBarangay(applicant.barangay)],
    ["postalCode", validatePostalCode(applicant.postalCode)],
  ];
  const errors: ApplicantErrors = {};
  for (const [field, message] of checks) if (message) errors[field] = message;
  return errors;
}

export function validateApplicantFields(applicant: RegistrationApplicant, fields: readonly ApplicantField[]): ApplicantErrors {
  const all = validateApplicant(applicant);
  const errors: ApplicantErrors = {};
  for (const field of fields) if (all[field]) errors[field] = all[field];
  return errors;
}

/** Trims text, keeps one canonical mobile and email form, and drops a middle name that is explicitly absent. */
export function normalizeApplicant(applicant: RegistrationApplicant): RegistrationApplicant {
  const clean = (value: string) => value.trim().replace(/\s+/g, " ");
  return {
    firstName: clean(applicant.firstName),
    middleName: applicant.noMiddleName ? "" : clean(applicant.middleName),
    noMiddleName: applicant.noMiddleName,
    lastName: clean(applicant.lastName),
    suffix: applicant.suffix.trim(),
    mobileNumber: normalizePhilippineMobile(applicant.mobileNumber),
    email: applicant.email.trim().toLowerCase(),
    dateOfBirth: applicant.dateOfBirth.trim(),
    street: clean(applicant.street),
    province: clean(applicant.province),
    city: clean(applicant.city),
    barangay: clean(applicant.barangay),
    postalCode: applicant.postalCode.trim(),
  };
}

export function applicantDisplayName(applicant: RegistrationApplicant): string {
  return [applicant.firstName, applicant.noMiddleName ? "" : applicant.middleName, applicant.lastName, applicant.suffix].filter(Boolean).join(" ");
}

export function applicantAddress(applicant: RegistrationApplicant): string {
  return [applicant.street, applicant.barangay, applicant.city, applicant.province, applicant.postalCode].filter(Boolean).join(", ");
}

const nameKey = (applicant: RegistrationApplicant) =>
  `${applicant.firstName}|${applicant.lastName}|${applicant.dateOfBirth}`.toLowerCase();

/** True when the applicant matches an application that still counts, by email, mobile number, or name with birth date. */
export function isDuplicateApplication(applicant: RegistrationApplicant, applications: readonly RegistrationApplication[], ignoreId?: string): boolean {
  return applications.some(
    (other) =>
      other.id !== ignoreId &&
      BLOCKING_STATUSES.includes(other.status) &&
      (other.applicant.email === applicant.email || other.applicant.mobileNumber === applicant.mobileNumber || nameKey(other.applicant) === nameKey(applicant)),
  );
}

const hasOption = (options: ReadonlyArray<{ value: string }>, value: string) => options.some((option) => option.value === value);

/** Validation of the details the office completes before a decision. Returns the first error or null. */
export type CompletionAllowedValues = { govIdTypes: readonly string[]; programCategories: readonly string[] };

/**
 * `allowed`: values of the admin-managed lists the completion may use (active
 * values plus any value already saved on the record). Defaults to the seed lists.
 */
export function validateCompletion(
  completion: RegistrationCompletion,
  allowed: CompletionAllowedValues = { govIdTypes: GOV_ID_OPTIONS.map((option) => option.value), programCategories: PROGRAM_CATEGORY_OPTIONS.map((option) => option.value) },
): string | null {
  if (!hasOption(GENDER_OPTIONS, completion.gender)) return "Select a gender.";
  if (!hasOption(CIVIL_STATUS_OPTIONS, completion.civilStatus)) return "Select a civil status.";
  if (!allowed.govIdTypes.includes(completion.governmentIdType)) return "Select a government ID type.";
  return (
    validateGovIdNumber(completion.governmentIdNumber, completion.governmentIdType) ??
    validateDateString(completion.cardApplicationDate, "Application date") ??
    (allowed.programCategories.includes(completion.programCategory) ? null : "Select a program category.") ??
    (isValidTierCode(completion.vipCardLevel) ? null : "Select a card level.") ??
    (completion.profilePhotoName.trim() ? null : "Profile photo is required.")
  );
}

/** Reason text for a return or rejection: required and bounded. */
export function validateDecisionReason(reason: string): string | null {
  const trimmed = reason.trim();
  if (!trimmed) return "A reason is required.";
  if (trimmed.length > MAX_REGISTRATION_REASON_LENGTH) return `The reason must be ${MAX_REGISTRATION_REASON_LENGTH} characters or fewer.`;
  return null;
}

/** In-app path of the private correction link (email or text delivery waits for the backend). */
export function correctionPath(token: string): string {
  return `/register/ost/correct/${token}`;
}
