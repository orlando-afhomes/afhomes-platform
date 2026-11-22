import { BUSINESS_AUDIT_ACTIONS, SYSTEM_ACTOR_ID } from "@/modules/audit/types";
import type { Contract } from "@/modules/contracts/types";
import type { FrozenCommissionRate, CommissionStage } from "@/modules/commissions/types";
import type { DevIdentity } from "@/modules/identity/types";
import type { Membership } from "@/modules/membership/types";
import type { Sale } from "@/modules/sales/types";
import type { Payment } from "../types";
import { firstOpenDate, type ClosedMonth } from "../month-close";
import { collectionState } from "./collection-state";

export type ReconciliationActor = DevIdentity | "system";

/** Domain state being reconciled. Persistence and transactions belong to the caller. */
export type ReconciliationState = {
  contracts: readonly Contract[];
  payments: readonly Payment[];
  sales: readonly Sale[];
  memberships: readonly Membership[];
  closedMonths: readonly Pick<ClosedMonth, "month">[];
};

/** Effects stay explicit so the same workflow can be exercised without browser adapters. */
export type ReconcilePorts = {
  today(): string;
  nowIso(): string;
  nextAdjustmentId(): string;
  audit(actor: ReconciliationActor, module: "sales" | "finance" | "commissions" | "membership", action: string,
    entityType: "sale" | "membership" | "commission", entityId: string,
    extra?: { previousValue?: string; newValue?: string; reason?: string; relatedRecordIds?: string[] }): void;
  holdUnpaidCommissions(saleId: string, reason: string): void;
  holdCommissionForReview(actor: DevIdentity, saleId: string, reason: string, stages: CommissionStage[], restoreWhenQualified: boolean): void;
  releaseCommissions(actor: DevIdentity, sale: { saleId: string; contractId: string; product: "VIP"; valueCentavos: number;
    rates: readonly FrozenCommissionRate[]; stage1Date: string | null; fullPaymentDate: string | null }): void;
  synchronizePoints(membership: Membership): void;
};

/** Preserve receipt-driven sale/commission/hold transitions and their effect order (docs 07–09, 13). */
export function reconcileContractState(store: ReconciliationState, contractId: string, actor: ReconciliationActor, ports: ReconcilePorts): void {
  const contract = store.contracts.find((item) => item.id === contractId);
  if (!contract) return;
  const payments = store.payments.filter((payment) => payment.contractId === contractId);
  const sale = store.sales.find((item) => item.contractId === contractId);
  const businessDate = ports.today();
  const collection = collectionState(contract, payments, sale);

  if (sale?.approval) {
    const milestone = collection.confirmation;
    if (sale.status === "pending" && milestone) {
      const reconfirmation = sale.adjustments.some((adjustment) => adjustment.kind === "reversal");
      sale.status = "confirmed";
      sale.confirmedDate = milestone.date;
      sale.adjustments.push({
        id: ports.nextAdjustmentId(),
        date: reconfirmation ? firstOpenDate(store.closedMonths, businessDate) : milestone.countedDate,
        amountCentavos: sale.valueCentavos,
        kind: reconfirmation ? "reconfirmation" : "confirmation",
        reason: "Approved collection reached 25%",
        actorId: actor === "system" ? SYSTEM_ACTOR_ID : actor.id,
      });
      ports.audit(actor, "sales", reconfirmation ? BUSINESS_AUDIT_ACTIONS.SALE_RECONFIRMED : BUSINESS_AUDIT_ACTIONS.SALE_CONFIRMED, "sale", sale.id, {
        previousValue: "pending",
        newValue: "confirmed",
        relatedRecordIds: [contract.id],
      });
    } else if (sale.status === "confirmed" && !milestone) {
      sale.status = "pending";
      sale.adjustments.push({
        id: ports.nextAdjustmentId(),
        date: firstOpenDate(store.closedMonths, businessDate),
        amountCentavos: -sale.valueCentavos,
        kind: "reversal",
        reason: "Required payment reversed or refunded",
        actorId: actor === "system" ? SYSTEM_ACTOR_ID : actor.id,
      });
      ports.audit(actor, "sales", BUSINESS_AUDIT_ACTIONS.SALE_REVERSED, "sale", sale.id, {
        previousValue: "confirmed",
        newValue: "pending",
        relatedRecordIds: [contract.id],
      });
    }
    if (sale.status === "pending" && actor !== "system" && sale.commissionRates) {
      ports.holdCommissionForReview(actor, sale.id, "The sale is no longer Confirmed.", ["stage1"], true);
    }
    if (sale.status !== "confirmed") ports.holdUnpaidCommissions(sale.id, "The sale is no longer Confirmed.");
    if (actor !== "system" && sale.status === "confirmed" && sale.commissionRates) {
      const stageOne = collection.release;
      const full = collection.fullPayment;
      if (!stageOne) ports.holdCommissionForReview(actor, sale.id, "Approved collections fell below 40%.", ["stage1"], true);
      ports.releaseCommissions(actor, { saleId: sale.id, contractId, product: "VIP",
        valueCentavos: sale.valueCentavos, rates: sale.commissionRates,
        stage1Date: stageOne?.countedDate ?? null, fullPaymentDate: full?.countedDate ?? null });
    }
  }

  const membership = store.memberships.find((item) => item.contractId === contractId);
  if (membership && membership.status === "active") {
    const settled = collection.settled;
    if (!settled && !membership.financialHold) {
      ports.synchronizePoints(membership);
      membership.financialHold = true;
      membership.history.push({ at: ports.nowIso(), actorId: SYSTEM_ACTOR_ID, event: BUSINESS_AUDIT_ACTIONS.FINANCIAL_HOLD_APPLIED, note: null });
      ports.audit("system", "finance", BUSINESS_AUDIT_ACTIONS.FINANCIAL_HOLD_APPLIED, "membership", membership.id, {
        previousValue: "no_hold",
        newValue: "financial_hold",
        relatedRecordIds: [contract.id],
      });
    } else if (settled && membership.financialHold) {
      membership.financialHold = false;
      membership.history.push({ at: ports.nowIso(), actorId: SYSTEM_ACTOR_ID, event: BUSINESS_AUDIT_ACTIONS.FINANCIAL_HOLD_RELEASED, note: null });
      ports.synchronizePoints(membership);
      ports.audit("system", "finance", BUSINESS_AUDIT_ACTIONS.FINANCIAL_HOLD_RELEASED, "membership", membership.id, {
        previousValue: "financial_hold",
        newValue: "no_hold",
        relatedRecordIds: [contract.id],
      });
    }
  }
}
