import type { AddressValue, OfficeAddressValue } from "@/shared/forms/types";
import type { VipTierCode } from "@/modules/vip/types";

export type CustomerStatus = "draft" | "submitted" | "active_member" | "inactive";

export const ACQUISITION_CHANNELS = ["CMP", "DRP", "GDP", "Corporate", "Walk-In", "Public Servant", "Referral", "FB Ads"] as const;
export type AcquisitionChannel = (typeof ACQUISITION_CHANNELS)[number];

export const CUSTOMER_GENDERS = ["Male", "Female"] as const;
export const CUSTOMER_CIVIL_STATUSES = ["Single", "Married", "Widowed", "Separated"] as const;

export type ContractClassification = "S" | "N";

/** Supplementary cardholder, allowed only when the selected VIP product permits one (Gold: product.supplementaryHolders > 0). */
export type SupplementaryHolder = {
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  /** optional */
  citizenship?: string | null;
  /** optional */
  landline?: string | null;
  /** sensitive, same gating as governmentIdNumber */
  tinNumber?: string | null;
  /** optional */
  occupation?: string | null;
  /** optional */
  businessIndustry?: string | null;
  /** optional */
  employedPosition?: string | null;
  /** optional */
  officeAddress?: OfficeAddressValue | null;
  /** Residential address; supplies the landline area code on submit. */
  address?: AddressValue | null;
};

/**
 * Customer master record (doc 04). Fields beyond the first five are optional so
 * drafts can be blank (04 section 9) and the original seeded records stay valid.
 */
export type Customer = {
  id: string;
  displayName: string;
  branchId: string;
  ownerMemberId: string | null;
  status: CustomerStatus;
  /** Official Customer ID / RA reference in the owner-approved `YYYY-NNNN` format (for example `2026-0001`); automatic or manual. */
  customerNumber?: string | null;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  suffix?: string | null;
  gender?: string | null;
  civilStatus?: string | null;
  dateOfBirth?: string | null;
  mobileNumber?: string | null;
  email?: string | null;
  address?: AddressValue | null;
  governmentIdType?: string | null;
  /** Restricted: shown only to the owning seller and Admin views, never in downline projections. */
  governmentIdNumber?: string | null;
  /** optional */
  citizenship?: string | null;
  /** optional */
  landline?: string | null;
  /** sensitive, same gating as governmentIdNumber */
  tinNumber?: string | null;
  /** optional */
  occupation?: string | null;
  /** optional */
  businessIndustry?: string | null;
  /** optional */
  employedPosition?: string | null;
  /** optional */
  officeAddress?: OfficeAddressValue | null;
  vipPlan?: VipTierCode | null;
  supplementaryHolder?: SupplementaryHolder | null;
  paymentSchemeId?: string | null;
  contractClassification?: ContractClassification | null;
  /** Referrer = VIP Recommender: one OST member (04 section 7.8). */
  recommenderMemberId?: string | null;
  /**
   * VIP Referrer: modeled as its own field, separate from `recommenderMemberId`.
   * Doc 04 section 7.8 currently requires the Referrer and VIP Recommender to be the
   * same OST member, so callers must keep both references consistent.
   */
  referrerMemberId?: string | null;
  acquisitionChannel?: AcquisitionChannel | null;
  /** RA 10173 consent certification; never pre-checked (04 section 7.10). */
  consentDataPrivacy?: boolean;
  /** Valid government ID with specimen signatures received (04 section 7.10). */
  idReceivedCertified?: boolean;
  createdAt?: string;
  submittedAt?: string | null;
  /** True on projections that withhold contact, ID and address details (04 section 11 downline view). */
  restricted?: boolean;
};

export type CustomerDraftInput = Partial<
  Omit<Customer, "id" | "status" | "ownerMemberId" | "restricted" | "createdAt" | "submittedAt" | "displayName">
> & {
  displayName: string;
  /** Admin-created customers may name the owning seller; ignored for sellers, who own their own customers. */
  ownerMemberId?: string | null;
  branchId?: string;
  /** `auto` assigns the next Customer ID at submit; `manual` uses the staff-entered value. */
  customerIdMode?: "auto" | "manual";
};
