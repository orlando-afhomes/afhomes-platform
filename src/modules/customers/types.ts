import type { AddressValue, OfficeAddressValue } from "@/shared/forms/types";
import type { VipTierCode } from "@/modules/vip/types";

/**
 * Registration lifecycle (doc 04 sections 5 and 10): draft, then submitted by the Clerk, then the
 * Administrator approves it, sends it back to the Clerk with a reason, or rejects it with a reason.
 * "approved" is customer registration only; VIP membership activation is a separate later step (doc 04 section 8).
 */
export type CustomerStatus = "draft" | "submitted" | "approved" | "sent_back" | "rejected" | "active_member" | "inactive";

/** One audited registration step kept on the record (doc 04 section 16). */
export type CustomerStatusEntry = {
  status: CustomerStatus;
  at: string;
  actorId: string;
  /** Required for send back and reject. */
  reason?: string | null;
};

export const ACQUISITION_CHANNELS = ["CMP", "DRP", "GDP", "Corporate", "Walk-In", "Public Servant", "Referral", "FB Ads"] as const;
export type AcquisitionChannel = (typeof ACQUISITION_CHANNELS)[number];

export const CUSTOMER_GENDERS = ["Male", "Female"] as const;
export const CUSTOMER_CIVIL_STATUSES = ["Single", "Married", "Widowed", "Separated"] as const;

export type ContractClassification = "S" | "N";

/** Supplementary cardholder, allowed only when the selected VIP product permits one (Gold: product.supplementaryHolders > 0). */
export type SupplementaryHolder = {
  firstName: string;
  middleName: string | null;
  noMiddleName?: boolean;
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
  /** Draft selection for how the Customer ID will be assigned at submission. */
  customerIdMode?: "auto" | "manual";
  firstName?: string;
  middleName?: string | null;
  noMiddleName?: boolean;
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
  /**
   * "Referrer" and "VIP Recommender" are two labels for the same optional person, IST or OST (04 section 7.8,
   * owner ruling R5). The closing seller is `ownerMemberId`, a different field; the two may be different people.
   */
  recommenderMemberId?: string | null;
  /** Same person as `recommenderMemberId`; the sale copies this one. Keep both consistent. */
  referrerMemberId?: string | null;
  /** Short reference to an existing dated referral, recorded by the Clerk when the closing seller is also the referrer (04 section 7.8). */
  referralReference?: string | null;
  acquisitionChannel?: AcquisitionChannel | null;
  /** RA 10173 consent certification; never pre-checked (04 section 7.10). */
  consentDataPrivacy?: boolean;
  /** Valid government ID with specimen signatures received (04 section 7.10). */
  idReceivedCertified?: boolean;
  createdAt?: string;
  submittedAt?: string | null;
  /** Registration review trail: submit, approve, send back, reject (reasons included). */
  statusHistory?: CustomerStatusEntry[];
  /** Latest send back or reject reason, kept visible so the Clerk knows what to fix. */
  reviewReason?: string | null;
  approvedAt?: string | null;
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
