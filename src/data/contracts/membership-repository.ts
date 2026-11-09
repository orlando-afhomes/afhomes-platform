import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { Membership } from "@/modules/membership/types";

export type MembershipView = Membership & {
  customerName: string;
  productName: string;
  schemeLabel: string;
  eligible: boolean;
  blockers: string[];
};

export interface MembershipRepository {
  list(options?: MockAsyncOptions): Promise<MembershipView[]>;
  /** Official activation: needs a finalized contract, Finance-verified full settlement and a valid RA. Never regenerates a Card ID. */
  activate(id: string, options?: MockAsyncOptions): Promise<MembershipView>;
}
