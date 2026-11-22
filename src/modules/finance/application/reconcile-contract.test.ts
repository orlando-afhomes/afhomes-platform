import { describe, expect, it, vi } from "vitest";
import { createMockStore } from "@/data/mock/seed";
import { getDevIdentity } from "@/data/mock/dev-identities";
import { reconcileContractState, type ReconcilePorts } from "./reconcile-contract";

function ports(events: string[] = []): ReconcilePorts {
  return {
    today: () => "2026-11-22",
    nowIso: () => "2026-11-22T08:00:00.000Z",
    nextAdjustmentId: () => "test-adjustment",
    audit: (_actor, _module, action) => { events.push(action); },
    holdUnpaidCommissions: () => { events.push("hold-unpaid"); },
    holdCommissionForReview: () => { events.push("review"); },
    releaseCommissions: () => { events.push("release"); },
    synchronizePoints: (membership) => { events.push(`points:hold=${membership.financialHold}`); },
  };
}

describe("contract collection reconciliation orchestration", () => {
  it("does nothing for a missing contract", () => {
    const store = createMockStore();
    const effects = ports();
    effects.today = vi.fn(effects.today);
    reconcileContractState(store, "missing", "system", effects);
    expect(effects.today).not.toHaveBeenCalled();
  });

  it("preserves reversal, commission-review and points-hold effect order", () => {
    const store = createMockStore();
    const sale = store.sales.find((item) => item.id === "sale-1")!;
    sale.status = "confirmed";
    sale.approval = { approvedAt: "2026-10-01", approvedBy: "dev-admin" };
    sale.commissionRates = [{ memberId: "mem-ost-a1", role: "DSC", rateBp: 500 }];
    store.payments = store.payments.filter((item) => item.contractId !== sale.contractId);
    const membership = store.memberships.find((item) => item.contractId === sale.contractId)!;
    membership.status = "active";
    membership.financialHold = false;
    const events: string[] = [];
    const effects = ports(events);
    reconcileContractState(store, sale.contractId, getDevIdentity("dev-finance"), effects);
    expect(events).toEqual(["SALE_REVERSED", "review", "hold-unpaid", "points:hold=false", "FINANCIAL_HOLD_APPLIED"]);
    expect(sale.status).toBe("pending");
    expect(sale.adjustments.at(-1)).toMatchObject({ id: "test-adjustment", kind: "reversal", amountCentavos: -sale.valueCentavos });
    expect(membership.financialHold).toBe(true);
    const count = sale.adjustments.length;
    events.length = 0;
    reconcileContractState(store, sale.contractId, getDevIdentity("dev-finance"), effects);
    expect(sale.adjustments).toHaveLength(count);
    expect(events).toEqual(["review", "hold-unpaid"]);
  });

  it("clears a financial hold before synchronizing points after full settlement", () => {
    const store = createMockStore();
    const sale = store.sales.find((item) => item.id === "sale-1")!;
    sale.approval = null;
    const contract = store.contracts.find((item) => item.id === sale.contractId)!;
    const payment = store.payments.find((item) => item.contractId === contract.id)!;
    store.payments = [{ ...payment, status: "verified", amountCentavos: contract.priceCentavos }];
    const membership = store.memberships.find((item) => item.contractId === contract.id)!;
    membership.status = "active";
    membership.financialHold = true;
    const events: string[] = [];
    reconcileContractState(store, contract.id, "system", ports(events));
    expect(events).toEqual(["points:hold=false", "FINANCIAL_HOLD_RELEASED"]);
    expect(membership.financialHold).toBe(false);
  });
});
