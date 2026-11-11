import type { Designation, OrgMember } from "@/modules/organization/types";

export type SalesNetworkDesignation = Designation;

export type SalesNetworkMember = OrgMember;

export type SalesNetworkParentHistoryEntry = NonNullable<OrgMember["parentHistory"]>[number];

export type CreateSalesNetworkMemberInput = {
  displayName: string;
  designation: Designation;
  parentId: string | null;
  branchId?: string;
  status?: OrgMember["status"];
  accountId?: string | null;
  aaNumber?: string | null;
  mockAccreditationEligible?: boolean;
  /** Team Name stored when creating an SVD root. */
  teamName?: string | null;
};

export type TransferSalesNetworkMemberTarget = {
  /** New designation; defaults to the member's current designation. */
  designation?: Designation;
  /** Required team name when the target designation is SVD. */
  teamName?: string | null;
};

export type UpdateSalesNetworkMemberInput = {
  displayName?: string;
  /** Profile fields captured by the Add IST/OST modal; applied to sellerProfile. */
  firstName?: string;
  middleName?: string | null;
  noMiddleName?: boolean;
  lastName?: string;
  /** Optional name suffix (Jr., Sr., II–V); null clears it. */
  suffix?: string | null;
  mobileNumber?: string;
  /** Date-only YYYY-MM-DD. */
  dateOfBirth?: string;
  email?: string;
  street?: string;
  province?: string;
  city?: string;
  barangay?: string;
  postalCode?: string;
  telephone?: string | null;
  facebook?: string | null;
  tin?: string | null;
  businessEmployer?: string | null;
  businessAddress?: string | null;
  jobPosition?: string | null;
  gender?: string;
  civilStatus?: string;
  governmentIdType?: string;
  governmentIdNumber?: string;
  /** Date-only YYYY-MM-DD. */
  cardApplicationDate?: string;
  programCategory?: string;
  vipCardLevel?: "B1" | "S1" | "G1";
};

export type ReferralVerificationFailureReason =
  | "EMPTY_INPUT"
  | "NOT_FOUND"
  | "AMBIGUOUS_CODE"
  | "INELIGIBLE_DESIGNATION"
  | "INACTIVE_SPONSOR"
  | "INELIGIBLE_ACCREDITATION"
  | "INVALID_SPONSOR";

export type ReferralSponsorSummary = {
  memberId: string;
  displayName: string;
  designation: Designation;
  status: OrgMember["status"];
};

export type ReferralSponsorVerificationResult =
  | { ok: true; sponsor: ReferralSponsorSummary }
  | { ok: false; reason: ReferralVerificationFailureReason; publicMessage: string };

export type {
  AccreditedSellerMode,
  AccreditationFormStatus,
  AaIssuanceMethod,
  CreateAccreditedSellerInput,
  AccreditedSellerResult,
  SellerIdentityKind,
} from "@/modules/sales-network/accredited-seller";