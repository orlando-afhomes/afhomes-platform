import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { OrgMember } from "@/modules/organization/types";
import type {
  CreateAccreditedSellerInput,
  AccreditedSellerResult,
  CreateSalesNetworkMemberInput,
  ReferralSponsorVerificationResult,
  TransferSalesNetworkMemberTarget,
  UpdateSalesNetworkMemberInput,
} from "@/modules/sales-network/types";

export type UplineSummary = {
  id: string;
  displayName: string;
  designation: string;
};

export interface MemberRepository {
  list(options?: MockAsyncOptions): Promise<OrgMember[]>;
  getById(id: string, options?: MockAsyncOptions): Promise<OrgMember | null>;
  /** Visibility-scoped lookup by official AA number (case-insensitive). */
  getByAaNumber(aaNumber: string, options?: MockAsyncOptions): Promise<OrgMember | null>;
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
