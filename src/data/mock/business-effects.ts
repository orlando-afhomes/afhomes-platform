import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import type { DevIdentity } from "@/modules/identity/types";

import { reconcileContractState } from "@/modules/finance/application/reconcile-contract";
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
  reconcileContractState(store, contractId, actor, {
    today,
    nowIso,
    nextAdjustmentId: () => nextId(store, "adjustment", "adj"),
    audit: (effectActor, module, action, entityType, entityId, extra) => auditEffect(store, effectActor, module, action, entityType, entityId, extra),
    holdUnpaidCommissions: (saleId, reason) => holdUnpaidCommissions(store, saleId, reason),
    holdCommissionForReview: (effectActor, saleId, reason, stages, restoreWhenQualified) => holdUnpaidCommissionForReview(store, effectActor, saleId, reason, stages, restoreWhenQualified),
    releaseCommissions: (effectActor, sale) => releaseSaleCommissions(store, effectActor, sale),
    synchronizePoints: (membership) => { membershipPointsLedger(membership, store); },
  });
}
