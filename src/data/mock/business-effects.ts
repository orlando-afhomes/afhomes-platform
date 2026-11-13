import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import type { DevIdentity } from "@/modules/identity/types";
import { approvedCollectionMilestone, isFullySettled } from "@/modules/finance/rules";
import { firstOpenDate } from "@/modules/finance/month-close";
import type { Payment } from "@/modules/finance/types";
import { appendAuditEvent } from "./audit";
import { today, nowIso } from "./business-base";
import { nextId } from "./ids";
import { membershipPointsLedger } from "./redemption-points-source";
import { SYSTEM_ACTOR_ID } from "@/modules/audit/types";
import { activeRoles } from "./dev-identities";
import type { MockStore } from "./seed";
import { applyCommissionTrigger, holdUnpaidCommissionForReview, releaseSaleCommissions } from "./commission-effects";

type Actor = DevIdentity | "system";

function auditEffect(
  store: MockStore,
  actor: Actor,
  module: "sales" | "finance" | "commissions" | "membership",
  action: string,
  entityType: "sale" | "membership" | "commission",
  entityId: string,
  extra: { previousValue?: string; newValue?: string; reason?: string; relatedRecordIds?: string[] } = {},
) {
  appendAuditEvent(store, {
    actorId: actor === "system" ? SYSTEM_ACTOR_ID : actor.id,
    actorRoles: actor === "system" ? ["system"] : activeRoles(actor),
    module,
    action,
    entityType,
    entityId,
    outcome: "success",
    ...extra,
  });
}

/**
 * Approved and unpaid commissions of a sale that lost Confirmed status are held
 * by the system (08 section 13). An initiated payout is kept unchanged and
 * flagged; no void or recovery rule is approved.
 */
export function holdUnpaidCommissions(store: MockStore, saleId: string, reason: string): void {
  for (const commission of store.commissions.filter((item) => item.saleId === saleId && item.status === "approved")) {
    commission.status = "on_hold";
    commission.holdReason = commission.payout && !commission.payout.confirmedAt
      ? `${reason} A payout was recorded but not confirmed and needs a Finance decision.`
      : reason;
    commission.history.push({ at: nowIso(), actorId: SYSTEM_ACTOR_ID, event: BUSINESS_AUDIT_ACTIONS.COMMISSION_HELD, note: commission.holdReason });
    auditEffect(store, "system", "commissions", BUSINESS_AUDIT_ACTIONS.COMMISSION_HELD, "commission", commission.id, {
      previousValue: "approved",
      newValue: "on_hold",
      relatedRecordIds: [saleId],
    });
  }
}

export function paymentsOfContract(store: MockStore, contractId: string): Payment[] {
  return store.payments.filter((payment) => payment.contractId === contractId);
}

export function cancelRelatedContractRecords(
  store: MockStore,
  contractId: string,
  actor: DevIdentity,
  forfeitureDate?: string,
): void {
  const sale = store.sales.find((item) => item.contractId === contractId);
  if (sale && sale.status !== "cancelled") {
    const previousValue = sale.status;
    if (previousValue === "confirmed") {
      // A previously reported sale is reversed in the cancellation month (13 §5.1).
      sale.adjustments.push({
        id: nextId(store, "adjustment", "adj"),
        date: firstOpenDate(store.closedMonths, forfeitureDate ?? today()),
        amountCentavos: -sale.valueCentavos,
        kind: "reversal",
        reason: "Contract cancelled with forfeiture",
        actorId: actor.id,
      });
    }
    sale.status = "cancelled";
    auditEffect(store, actor, "sales", BUSINESS_AUDIT_ACTIONS.SALE_CANCELLED, "sale", sale.id, {
      previousValue,
      newValue: "cancelled",
      relatedRecordIds: [contractId],
    });
    applyCommissionTrigger(store, actor, sale.id, "cancellation", firstOpenDate(store.closedMonths, forfeitureDate ?? today()));
  }

  const membership = store.memberships.find((item) => item.contractId === contractId);
  if (membership && membership.status !== "cancelled") {
    const previousValue = membership.status;
    membership.status = "cancelled";
    membership.history.push({ at: nowIso(), actorId: actor.id, event: BUSINESS_AUDIT_ACTIONS.MEMBERSHIP_CANCELLED, note: null });
    auditEffect(store, actor, "membership", BUSINESS_AUDIT_ACTIONS.MEMBERSHIP_CANCELLED, "membership", membership.id, {
      previousValue,
      newValue: "cancelled",
      relatedRecordIds: [contractId],
    });
  }
}

/**
 * Re-derives everything that depends on verified money for one contract, after
 * a payment verification, reversal, or refund (docs 07, 13, 08, 09):
 *  - an approved Pending sale is confirmed when net approved receipts reach 25%;
 *  - a Confirmed sale whose required payment is reversed returns to Pending with
 *    a negative adjustment, and its unpaid commissions are held automatically;
 *  - an Active membership with a balance owed after a reversal gets a Financial
 *    Hold, released once Finance verifies settlement (07 section 19).
 * Idempotent: running it twice changes nothing the second time.
 */
export function reconcileContract(store: MockStore, contractId: string, actor: Actor): void {
  const contract = store.contracts.find((item) => item.id === contractId);
  if (!contract) return;
  const payments = paymentsOfContract(store, contractId);
  const sale = store.sales.find((item) => item.contractId === contractId);
  const businessDate = today();

  if (sale?.approval) {
    const milestone = approvedCollectionMilestone(sale.valueCentavos, payments, 2_500);
    if (sale.status === "pending" && milestone) {
      const reconfirmation = sale.adjustments.some((adjustment) => adjustment.kind === "reversal");
      sale.status = "confirmed";
      sale.confirmedDate = milestone.date;
      sale.adjustments.push({
        id: nextId(store, "adjustment", "adj"),
        date: reconfirmation ? firstOpenDate(store.closedMonths, businessDate) : milestone.countedDate,
        amountCentavos: sale.valueCentavos,
        kind: reconfirmation ? "reconfirmation" : "confirmation",
        reason: "Approved collection reached 25%",
        actorId: actor === "system" ? SYSTEM_ACTOR_ID : actor.id,
      });
      auditEffect(store, actor, "sales", reconfirmation ? BUSINESS_AUDIT_ACTIONS.SALE_RECONFIRMED : BUSINESS_AUDIT_ACTIONS.SALE_CONFIRMED, "sale", sale.id, {
        previousValue: "pending",
        newValue: "confirmed",
        relatedRecordIds: [contract.id],
      });
    } else if (sale.status === "confirmed" && !milestone) {
      sale.status = "pending";
      sale.adjustments.push({
        id: nextId(store, "adjustment", "adj"),
        date: firstOpenDate(store.closedMonths, businessDate),
        amountCentavos: -sale.valueCentavos,
        kind: "reversal",
        reason: "Required payment reversed or refunded",
        actorId: actor === "system" ? SYSTEM_ACTOR_ID : actor.id,
      });
      auditEffect(store, actor, "sales", BUSINESS_AUDIT_ACTIONS.SALE_REVERSED, "sale", sale.id, {
        previousValue: "confirmed",
        newValue: "pending",
        relatedRecordIds: [contract.id],
      });
    }
    if (sale.status === "pending" && actor !== "system" && sale.commissionRates) {
      holdUnpaidCommissionForReview(store, actor, sale.id, "The sale is no longer Confirmed.", ["stage1"], true);
    }
    if (sale.status !== "confirmed") holdUnpaidCommissions(store, sale.id, "The sale is no longer Confirmed.");
    if (actor !== "system" && sale.status === "confirmed" && sale.commissionRates) {
      const stageOne = approvedCollectionMilestone(sale.valueCentavos, payments, 4_000);
      const full = approvedCollectionMilestone(sale.valueCentavos, payments, 10_000);
      if (!stageOne) holdUnpaidCommissionForReview(store, actor, sale.id, "Approved collections fell below 40%.", ["stage1"], true);
      releaseSaleCommissions(store, actor, { saleId: sale.id, contractId, product: "VIP",
        valueCentavos: sale.valueCentavos, rates: sale.commissionRates,
        stage1Date: stageOne?.countedDate ?? null, fullPaymentDate: full?.countedDate ?? null });
    }
  }

  const membership = store.memberships.find((item) => item.contractId === contractId);
  if (membership && membership.status === "active") {
    const settled = isFullySettled(contract, payments);
    if (!settled && !membership.financialHold) {
      membershipPointsLedger(membership, store);
      membership.financialHold = true;
      membership.history.push({ at: nowIso(), actorId: SYSTEM_ACTOR_ID, event: BUSINESS_AUDIT_ACTIONS.FINANCIAL_HOLD_APPLIED, note: null });
      auditEffect(store, "system", "finance", BUSINESS_AUDIT_ACTIONS.FINANCIAL_HOLD_APPLIED, "membership", membership.id, {
        previousValue: "no_hold",
        newValue: "financial_hold",
        relatedRecordIds: [contract.id],
      });
    } else if (settled && membership.financialHold) {
      membership.financialHold = false;
      membership.history.push({ at: nowIso(), actorId: SYSTEM_ACTOR_ID, event: BUSINESS_AUDIT_ACTIONS.FINANCIAL_HOLD_RELEASED, note: null });
      membershipPointsLedger(membership, store);
      auditEffect(store, "system", "finance", BUSINESS_AUDIT_ACTIONS.FINANCIAL_HOLD_RELEASED, "membership", membership.id, {
        previousValue: "financial_hold",
        newValue: "no_hold",
        relatedRecordIds: [contract.id],
      });
    }
  }
}
