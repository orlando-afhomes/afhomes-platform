import type { Designation } from "@/modules/organization/types";
import {
  addOneYear,
  formatManilaDateParts,
  parseManilaDateOnly,
} from "@/modules/accreditation/dates";
import { validatePersonName, validateMiddleName, validateSuffix } from "@/shared/forms/validation/person-name";
import {
  validateConfirmPassword,
  validateEmailAddress,
  validateFacebook,
  validateLandline,
  validateMobileNumber,
  validatePassword,
} from "@/shared/forms/validation/contact";
import {
  validateBarangay,
  validateBusinessAddress,
  validateBusinessName,
  validateCity,
  validateJobPosition,
  validatePostalCode,
  validateProvince,
  validateStreet,
  validateTeamName,
} from "@/shared/forms/validation/address";
import { validateGovIdNumber, validateTinNumber } from "@/shared/forms/validation/identification";
import { validateDateString, validatePastDate } from "@/shared/forms/validation/dates";

export type AccreditedSellerMode = "IST" | "OST";

export type SellerIdentityKind = "new" | "existing";

export type AaIssuanceMethod = "automatic" | "manual";

/** Requested Accreditation Status labels; creation completes Pending or Accredited. Cancelled applies to existing Pending records via the Members table. */
export type AccreditationFormStatus = "pending" | "accredited" | "cancel" | "expired";

export const ACCREDITATION_STATUS_OPTIONS: ReadonlyArray<{ value: AccreditationFormStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "accredited", label: "Accredited" },
  { value: "cancel", label: "Cancelled" },
  { value: "expired", label: "Expired" },
];

/** Exact requested Program Category labels with stable internal keys. */
export const PROGRAM_CATEGORY_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "vip_privilege_card_holder", label: "VIP Previllage Card Holder" },
  { value: "non_vip_client", label: "Non-VIP Client" },
  { value: "future_vip_privilege_card_holder", label: "Future VIP Prilevellage Card Holder" },
];

/** Shared person-detail option sets used by the Add and Edit seller modals. */
export const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
];

export const CIVIL_STATUS_OPTIONS = ["Single", "Married", "Widowed", "Separated", "Divorced"].map((value) => ({
  value,
  label: value,
}));

export const GOV_ID_OPTIONS = [
  "Philippine National ID",
  "Digital National ID",
  "Passport",
  "Driver's License",
  "SSS ID",
  "GSIS ID",
  "UMID",
  "PRC ID",
  "Voter's ID",
  "Postal ID",
  "Other",
].map((value) => ({ value, label: value }));

export const VIP_LEVEL_OPTIONS: Array<{ value: "B1" | "S1" | "G1"; label: string }> = [
  { value: "B1", label: "Bronze (B1)" },
  { value: "S1", label: "Silver (S1)" },
  { value: "G1", label: "Gold (G1)" },
];

export function programCategoryLabel(value: string): string {
  return PROGRAM_CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function isProgramCategoryValue(value: string): boolean {
  return PROGRAM_CATEGORY_OPTIONS.some((option) => option.value === value);
}

export type CreateAccreditedSellerInput = {
  mode: AccreditedSellerMode;
  sellerIdentity: SellerIdentityKind;
  /** Required when sellerIdentity is "existing": canonical account id. */
  existingAccountId?: string | null;
  firstName: string;
  middleName: string;
  noMiddleName: boolean;
  lastName: string;
  /** Optional name suffix (Jr., Sr., II–V); null when absent. */
  suffix?: string | null;
  mobileNumber: string;
  /** Date-only YYYY-MM-DD. */
  dateOfBirth: string;
  email: string;
  /** New-individual path only; never persisted. */
  tempPassword?: string;
  /** New-individual path only; never persisted. */
  confirmPassword?: string;
  /** Ephemeral preview file name only; no binary stored. */
  profilePhotoName?: string | null;
  /** Optional placeholder image URL; object-URL previews must never be persisted. */
  profilePhotoUrl?: string | null;
  street: string;
  province: string;
  city: string;
  barangay: string;
  postalCode: string;
  designation: Designation;
  /** Required Team Name when creating an SVD root; inherited otherwise. */
  teamName?: string | null;
  /** Null only for an SVD root. */
  parentId: string | null;
  /** Date-only YYYY-MM-DD. */
  cardApplicationDate: string;
  programCategory: string;
  vipCardLevel: "B1" | "S1" | "G1";
  gender: string;
  civilStatus: string;
  governmentIdType: string;
  governmentIdNumber: string;
  telephone?: string | null;
  facebook?: string | null;
  tin?: string | null;
  businessEmployer?: string | null;
  businessAddress?: string | null;
  jobPosition?: string | null;
  /** Date-only YYYY-MM-DD approved start. */
  approvedStart: string;
  accreditationStatus: AccreditationFormStatus;
  aaMethod: AaIssuanceMethod;
  /** Required when aaMethod is "manual": YYMM + sequence after the fixed prefix. */
  manualAaSuffix?: string;
};

export type AccreditedSellerResult = {
  memberId: string;
  accountId: string;
  accreditationId: string;
  aaNumber: string;
  expiryDate: string;
};

/** True for 02-29 starts, whose annual convention is owner-unresolved. */
export function isLeapDayStart(approvedStart: string): boolean {
  const parts = parseManilaDateOnly(approvedStart);
  return parts !== null && parts.month === 2 && parts.day === 29;
}

/** Canonical annual expiry for an approved start; null when unparseable. */
export function calculateApprovedExpiry(approvedStart: string): string | null {
  const parts = parseManilaDateOnly(approvedStart);
  if (!parts) return null;
  return formatManilaDateParts(addOneYear(parts));
}

/**
 * Shared field validation used by the form preview and rechecked inside the
 * repository before anything is committed. Returns the first error or null.
 */
export function validateAccreditedSellerFields(input: CreateAccreditedSellerInput): string | null {
  if (input.mode === "IST" && !["SVD", "SSM", "SM"].includes(input.designation)) {
    return "IST needs SVD, SSM, SM.";
  }
  if (input.mode === "OST" && input.designation !== "OST") {
    return "OST position is locked.";
  }
  if (input.sellerIdentity === "existing" && !input.existingAccountId) {
    return "Select an employee account.";
  }
  return (
    validatePersonName(input.firstName, "First name") ??
    validateMiddleName(input.middleName, input.noMiddleName) ??
    validatePersonName(input.lastName, "Last name") ??
    validateSuffix(input.suffix ?? "") ??
    validateMobileNumber(input.mobileNumber) ??
    validatePastDate(input.dateOfBirth, "Birth date", "Birth date cannot be future.") ??
    validateEmailAddress(input.email) ??
    validateNewAccountCredentials(input) ??
    validateStreet(input.street) ??
    validateProvince(input.province) ??
    validateCity(input.city) ??
    validateBarangay(input.barangay) ??
    validatePostalCode(input.postalCode) ??
    validateSponsor(input) ??
    validateDateString(input.cardApplicationDate, "Application date") ??
    validateProgramCategoryValue(input.programCategory) ??
    validateVipTier(input.vipCardLevel) ??
    validateRequiredText(input.gender, "Gender") ??
    validateRequiredText(input.civilStatus, "Civil Status") ??
    validateGovIdType(input.governmentIdType) ??
    validateGovIdNumber(input.governmentIdNumber) ??
    validateTeamNameForDesignation(input) ??
    validateStartDate(input.approvedStart) ??
    validatePhoto(input) ??
    validateAccreditationSelection(input) ??
    validateManualAa(input) ??
    validateOptionalFields(input)
  );
}

function validateNewAccountCredentials(input: CreateAccreditedSellerInput): string | null {
  if (input.sellerIdentity !== "new") return null;
  return validatePassword(input.tempPassword ?? "") ?? validateConfirmPassword(input.tempPassword ?? "", input.confirmPassword ?? "");
}

function validateSponsor(input: CreateAccreditedSellerInput): string | null {
  if (input.designation === "SVD") return null;
  return input.parentId ? null : "Sponsor is required.";
}

function validateTeamNameForDesignation(input: CreateAccreditedSellerInput): string | null {
  if (input.designation !== "SVD") return null;
  return validateTeamName(input.teamName ?? "", true);
}

function validateProgramCategoryValue(value: string): string | null {
  return isProgramCategoryValue(value) ? null : "Select a program category.";
}

function validateVipTier(value: string): string | null {
  return ["B1", "S1", "G1"].includes(value) ? null : "Card level must be valid.";
}

function validateRequiredText(value: string, label: string): string | null {
  return value.trim() ? null : `${label} is required.`;
}

function validateGovIdType(value: string): string | null {
  return value.trim() ? null : "Government ID type is required.";
}

function validateStartDate(value: string): string | null {
  return validateDateString(value, "Start date") ?? (isLeapDayStart(value) ? "Leap-day starts need policy confirmation." : null);
}

function validatePhoto(input: CreateAccreditedSellerInput): string | null {
  return input.profilePhotoName ? null : "Profile photo is required.";
}

function validateAccreditationSelection(input: CreateAccreditedSellerInput): string | null {
  if (!["pending", "accredited", "cancel", "expired"].includes(input.accreditationStatus)) {
    return "Accreditation Status is required.";
  }
  if (input.accreditationStatus === "cancel") {
    return "Cancelled has no approved mapping.";
  }
  if (input.accreditationStatus === "expired") {
    return "Expired cannot override calculated expiry.";
  }
  return null;
}

function validateManualAa(input: CreateAccreditedSellerInput): string | null {
  if (input.aaMethod !== "manual") return null;
  if (!(input.manualAaSuffix ?? "").trim()) return "AA number required in Manual.";
  return null;
}

function validateOptionalFields(input: CreateAccreditedSellerInput): string | null {
  return (
    validateFacebook(input.facebook ?? "") ??
    validateLandline(input.telephone ?? "") ??
    validateTinNumber(input.tin ?? "") ??
    validateBusinessName(input.businessEmployer ?? "") ??
    validateBusinessAddress(input.businessAddress ?? "") ??
    validateJobPosition(input.jobPosition ?? "")
  );
}
