import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { MembershipPoints, StayPointsRepository } from "@/data/contracts/stay-points-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import type { DevIdentity } from "@/modules/identity/types";
import { computePointsLedger } from "@/modules/stay-points/engine";
import type { Membership } from "@/modules/membership/types";
import { BusinessRepository, canSeeContract, customerName } from "./business-base";
import type { MockStore } from "./seed";

export class MockStayPointsRepository extends BusinessRepository implements StayPointsRepository {
  constructor(store: MockStore, getIdentity: () => DevIdentity, asyncOptions: MockAsyncOptions = {}) {
    super(store, getIdentity, asyncOptions);
  }

  private build(membership: Membership): MembershipPoints | null {
    const contract = this.store.contracts.find((item) => item.id === membership.contractId);
    if (!contract || !membership.activationDate) return null;
    const spends = this.store.resortSpends.filter((item) => item.membershipId === membership.id);
    return JSON.parse(
      JSON.stringify({
        membershipId: membership.id,
        customerName: customerName(this.store, membership.customerId),
        productCode: membership.productCode,
        cardId: membership.cardId,
        status: membership.status,
        financialHold: membership.financialHold,
        spends,
        ledger: computePointsLedger(membership.activationDate, contract.benefits, spends),
      }),
    ) as MembershipPoints;
  }

  async list(options?: MockAsyncOptions): Promise<MembershipPoints[]> {
    return this.run(options, (identity) => {
      const result: MembershipPoints[] = [];
      for (const membership of this.store.memberships) {
        if (membership.status !== "active") continue;
        const contract = this.store.contracts.find((item) => item.id === membership.contractId);
        if (!contract || !canSeeContract(identity, contract)) continue;
        const built = this.build(membership);
        if (built) result.push(built);
      }
      return result;
    });
  }

  async reconcileHold(spendId: string, decision: "release" | "void", reason: string, options?: MockAsyncOptions): Promise<MembershipPoints> {
    return this.run(options, (identity) => {
      this.require(identity, "stay-points.reconcile", "Only Finance can reconcile held points.");
      if (!reason.trim()) throw new Error("A reason is required.");
      const spend = this.store.resortSpends.find((item) => item.id === spendId);
      if (!spend) throw new Error("Spend record not found.");
      if (spend.status !== "refund_hold") throw new Error("Only held points can be reconciled.");
      spend.status = decision === "release" ? "verified" : "voided";
      this.audit(identity, { module: "stay-points", action: BUSINESS_AUDIT_ACTIONS.POINTS_HOLD_RECONCILED, entityType: "resort-spend", entityId: spend.id, previousValue: "refund_hold", newValue: spend.status, reason: reason.trim() });
      const membership = this.store.memberships.find((item) => item.id === spend.membershipId);
      const built = membership ? this.build(membership) : null;
      if (!built) throw new Error("Membership not found.");
      return built;
    });
  }
}
