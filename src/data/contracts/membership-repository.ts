import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { CardServiceInput, Membership } from "@/modules/membership/types";

export type MembershipView = Membership & {
  customerName: string;
  productName: string;
  schemeLabel: string;
  eligible: boolean;
  blockers: string[];
};

/** Staff Customer Search card (copied from v2, UI21). Never public (owner ruling R11). */
export type CustomerLookupResult = {
  membershipId: string;
  customerName: string;
  customerNumber: string | null;
  productCode: Membership["productCode"];
  vipNumber: string | null;
  /** Provisional end date (D12). */
  validUntil: string | null;
  weekdayPoints: number;
  weekendPoints: number;
  totalPoints: number;
};

export const CUSTOMER_LOOKUP_MIN_LENGTH = 2;
export const CUSTOMER_LOOKUP_MAX_RESULTS = 50;

export interface MembershipRepository {
  list(options?: MockAsyncOptions): Promise<MembershipView[]>;
  /**
   * Staff search for active VIP customers: partial, case-insensitive match on name, Customer ID,
   * VIP Number or email; at least 2 characters; active, unexpired memberships only; up to 50,
   * names that start with the term first. Needs `customers.lookup`.
   */
  lookupActiveVip(term: string, options?: MockAsyncOptions): Promise<CustomerLookupResult[]>;
  /** Official activation: needs a finalized contract, Finance-verified full settlement and a valid RA. Never regenerates a Card ID. */
  activate(id: string, options?: MockAsyncOptions): Promise<MembershipView>;
  recordCardClaim(id: string, options?: MockAsyncOptions): Promise<MembershipView>;
  serviceCard(id: string, input: CardServiceInput, options?: MockAsyncOptions): Promise<MembershipView>;
}
