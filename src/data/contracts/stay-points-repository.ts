import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { PointsLedger, ResortSpend } from "@/modules/stay-points/types";

export type MembershipPoints = {
  membershipId: string;
  customerName: string;
  productCode: string;
  cardId: string | null;
  status: string;
  financialHold: boolean;
  spends: ResortSpend[];
  ledger: PointsLedger;
};

/** Read-only ledger plus Finance reconciliation of held points. Redemption stays disabled. */
export interface StayPointsRepository {
  list(options?: MockAsyncOptions): Promise<MembershipPoints[]>;
  reconcileHold(spendId: string, decision: "release" | "void", reason: string, options?: MockAsyncOptions): Promise<MembershipPoints>;
}
