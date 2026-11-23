import { BUSINESS_AUDIT_ACTIONS, SYSTEM_ACTOR_ID } from "@/modules/audit/types";
import type { DevIdentity } from "@/modules/identity/types";
import { commissionStageAmounts } from "@/modules/commissions/rules";
import { nonStandardStage } from "@/modules/contracts/rules";
import type { Contract } from "@/modules/contracts/types";

import { reconcileContractState } from "@/modules/finance/application/reconcile-contract";
import { firstOpenDate } from "@/modules/finance/month-close";
import { buildScheduleState, isFullySettled } from "@/modules/finance/rules";
import type { Payment } from "@/modules/finance/types";
import { buildVipNumber } from "@/modules/membership/rules";
import type { Membership } from "@/modules/membership/types";
import { VIP_CLOSED_DEAL_THRESHOLD_BP } from "@/modules/sales/rules";
import { appendAuditEvent } from "./audit";
import { today, nowIso } from "./business-base";
import { nextId } from "./ids";
import { membershipPointsLedger } from "./redemption-points-source";
import { activeRoles } from "./dev-identities";
import type { MockStore } from "./seed";
import { applyCommissionTrigger, freezeCommissionRates, holdUnpaidCommissionForReview, releaseSaleCommissions } from "./commission-effects";

type Actor = DevIdentity | "system";

function auditEffect(
  store: MockStore,
  actor: Actor,
  module: "sales" | "finance" | "commissions" | "membership" | "contracts",
  action: string,
  entityType: "sale" | "membership" | "commission" | "contract",
  entityId: string,
  extra: { previousValue?: string; newValue?: string; reason?: string; relatedRecordIds?: string[]; displayReference?: string } = {},
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

export function visibleMembership(store: MockStore, membership: Membership, contract?: Contract): boolean {
  if (membership.status !== "pending") return true;
  const purchase = contract ?? store.contracts.find((item) => item.id === membership.contractId);
  return Boolean(purchase?.status === "finalized" && isFullySettled(purchase, paymentsOfContract(store, purchase.id)));
}

function issueVipNumberIfReady(store: MockStore, contract: Contract, payments: Payment[], actor: Actor, date: string): void {
  delete contract.vipNumberIssueBlocker;
  if (contract.vipNumber || !contract.signedAgreementRecordedDate || contract.cancellation?.status === "requested" || nonStandardStage(contract) === "admin") return;
  const sale = store.sales.find((item) => item.contractId === contract.id);
  if (!sale?.approval || sale.status === "cancelled" || sale.status === "rejected") return;
  const firstDue = contract.schedule.find((line) =>
    line.purpose !== "reservation" && line.amountCentavos > 0
  );
  if (!firstDue || !buildScheduleState(contract, payments, date).some((line) => line.seq === firstDue.seq && line.status === "paid")) return;
  const membership = store.memberships.find((item) => item.contractId === contract.id);
  if (membership?.cardId) return;

  const prefix = date.slice(2, 7).replace("-", "");
  const key = `vip-number:${date.slice(0, 7)}`;
  const issued = [...store.contracts.map((item) => item.vipNumber), ...store.memberships.map((item) => item.cardId)];
  const highest = issued.reduce((max, number) => number?.startsWith(prefix) ? Math.max(max, Number(number.slice(6, 11)) || 0) : max, 0);
  const sequence = Math.max(highest, store.counters[key] ?? 0) + 1;
  let value: string;
  let rates: ReturnType<typeof freezeCommissionRates>;
  try {
    rates = freezeCommissionRates(store, "VIP", sale.sellerMemberId, sale.referrerMemberId);
    for (const rate of rates) commissionStageAmounts(sale.valueCentavos, rate.rateBp, "VIP");
    value = buildVipNumber(date, sequence, contract.productCode, contract.paymentCode, contract.classification);
  } catch (error) {
    // A number can remain pending when its terms or commission setup need correction. Keep the approved receipt.
    contract.vipNumberIssueBlocker = error instanceof Error ? error.message : "Review the payment code and commission rates.";
    return;
  }
  store.counters[key] = sequence;
  contract.vipNumber = value;
  contract.vipNumberIssuedDate = date;
  contract.raNumber ??= value;
  sale.commissionRates = rates;
  sale.closedDealThresholdBp = VIP_CLOSED_DEAL_THRESHOLD_BP;
  if (membership) membership.raNumber = contract.raNumber;
  contract.history.push({ at: nowIso(), actorId: actor === "system" ? SYSTEM_ACTOR_ID : actor.id, event: BUSINESS_AUDIT_ACTIONS.VIP_NUMBER_ISSUED, note: null });
  auditEffect(store, actor, "contracts", BUSINESS_AUDIT_ACTIONS.VIP_NUMBER_ISSUED, "contract", contract.id, {
    newValue: value, displayReference: value, relatedRecordIds: [sale.id],
  });
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
  if (["submitted", "under_review", "finalized"].includes(contract.status)) {
    const payments = paymentsOfContract(store, contractId);
    const date = today();
    issueVipNumberIfReady(store, contract, payments, actor, date);
    if (contract.status === "finalized" && isFullySettled(contract, payments) && !store.memberships.some((item) => item.contractId === contractId)) {
      const membership = {
        id: nextId(store, "membership", "memb"),
        customerId: contract.customerId,
        contractId,
        productCode: contract.productCode,
        status: "pending" as const,
        activationDate: null,
        validityEndDate: null,
        cardId: null,
        raNumber: contract.raNumber,
        financialHold: false,
        createdAt: date,
        history: [],
      };
      store.memberships.push(membership);
      auditEffect(store, actor, "membership", BUSINESS_AUDIT_ACTIONS.MEMBERSHIP_CREATED, "membership", membership.id, {
        newValue: "pending", relatedRecordIds: [contractId],
      });
    }
  }
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
