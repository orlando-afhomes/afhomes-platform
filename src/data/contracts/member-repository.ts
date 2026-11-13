import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { OrgMember } from "@/modules/organization/types";
import type { SeatFillMethod, SeatVacancy } from "@/modules/sales-network/vacancy";
import type {
  CreateAccreditedSellerInput,
  AccreditedSellerResult,
  CreateSalesNetworkMemberInput,
  ReferralSponsorVerificationResult,
  TransferSalesNetworkMemberTarget,
  UpdateSalesNetworkMemberInput,
} from "@/modules/sales-network/types";

export type FillSeatVacancyInput = {
  /** A vacant seat is filled only by promotion or team transfer (doc 02 section 5.1.1; owner answer A5). */
  method: SeatFillMethod;
  /** Date-only. The roll-up ends from this date. */
  filledOn: string;
  newHolderMemberId: string;
};

export type UplineSummary = {
  id: string;
  displayName: string;
  designation: string;
};

export interface MemberRepository {
  list(options?: MockAsyncOptions): Promise<OrgMember[]>;
  getById(id: string, options?: MockAsyncOptions): Promise<OrgMember | null>;
  /** Visibility-scoped lookup by official AA number (case-insensitive); an old number from the AA Number History resolves to the current holder. */
  getByAaNumber(aaNumber: string, options?: MockAsyncOptions): Promise<OrgMember | null>;
  /** Effective-dated vacant leader seats within the caller's visible scope. */
  listSeatVacancies(options?: MockAsyncOptions): Promise<SeatVacancy[]>;
  /**
   * Administrator or Super Administrator, audited. Records the departed holder's end date and a vacancy
   * starting the day after it. The team stays in place; nobody is moved.
   */
  recordSeatVacancy(seatMemberId: string, holderEndDate: string, options?: MockAsyncOptions): Promise<SeatVacancy>;
  /** Administrator or Super Administrator, audited. Ends the roll-up from the fill date. Promotion or transfer only. */
  fillSeatVacancy(vacancyId: string, input: FillSeatVacancyInput, options?: MockAsyncOptions): Promise<SeatVacancy>;
  listUplineSummaries(options?: MockAsyncOptions): Promise<UplineSummary[]>;
  create(input: CreateSalesNetworkMemberInput, options?: MockAsyncOptions): Promise<OrgMember>;
  update(id: string, input: UpdateSalesNetworkMemberInput, options?: MockAsyncOptions): Promise<OrgMember>;
  transfer(
    id: string,
    newParentId: string | null,
    options?: MockAsyncOptions & TransferSalesNetworkMemberTarget,
  ): Promise<OrgMember>;
  changeStatus(id: string, status: OrgMember["status"], options?: MockAsyncOptions): Promise<OrgMember>;
  listEligibleParents(childDesignation: OrgMember["designation"], options?: MockAsyncOptions): Promise<OrgMember[]>;
  getDirectDownline(id: string, options?: MockAsyncOptions): Promise<OrgMember[]>;
  getDescendants(id: string, options?: MockAsyncOptions): Promise<OrgMember[]>;
  getParentHistory(id: string, options?: MockAsyncOptions): Promise<NonNullable<OrgMember["parentHistory"]>>;
  lookupReferralCode(code: string, options?: MockAsyncOptions): Promise<OrgMember[]>;
  resolveReferralSponsor(code: string, options?: MockAsyncOptions): Promise<ReferralSponsorVerificationResult>;
  /**
   * Owner-authorized administrative creation: seller member + active
   * accreditation with an automatically issued shared-sequence AA number in
   * one atomic in-memory commit. Follows the conservative feature-local
   * boundary: only a Super Administrator may complete issuance.
   */
  createAccreditedSeller(input: CreateAccreditedSellerInput, options?: MockAsyncOptions): Promise<AccreditedSellerResult>;
}
