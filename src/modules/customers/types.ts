import type { AddressValue } from "@/shared/forms/types";
import type { VipTierCode } from "@/modules/vip/types";

export type CustomerStatus = "draft" | "submitted" | "active_member" | "inactive";

export const ACQUISITION_CHANNELS = ["CMP", "DRP", "GDP", "Corporate", "Walk-In", "Public Servant", "Referral", "FB Ads"] as const;
export type AcquisitionChannel = (typeof ACQUISITION_CHANNELS)[number];

export const CUSTOMER_GENDERS = ["Male", "Female"] as const;
export const CUSTOMER_CIVIL_STATUSES = ["Single", "Married", "Widowed", "Separated"] as const;

export type ContractClassification = "S" | "N";

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
  /** Official Customer ID / RA reference entered manually. Format pending owner decision D2. */
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
  vipPlan?: VipTierCode | null;
  paymentSchemeId?: string | null;
  contractClassification?: ContractClassification | null;
  /** Referrer = VIP Recommender: one OST member (04 section 7.8). */
  recommenderMemberId?: string | null;
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
};
