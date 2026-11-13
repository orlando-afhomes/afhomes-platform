import type { CommissionClawbackTrigger, CommissionProduct, CommissionRole, CommissionStage, FrozenCommissionRate } from "@/modules/commissions/types";
import { clawbackBalance, commissionStageAmounts } from "@/modules/commissions/rules";
import { firstOpenDate } from "@/modules/finance/month-close";
import type { DevIdentity } from "@/modules/identity/types";
import { appendAuditEvent } from "./audit";
import { nowIso } from "./business-base";
import { activeRoles } from "./dev-identities";
import { nextId } from "./ids";
import type { MockStore } from "./seed";

export function freezeCommissionRates(
  store: Pick<MockStore, "commissionRateSettings">,
  product: CommissionProduct,
  sellerMemberId: string | null,
  referrerMemberId: string | null,
): FrozenCommissionRate[] {
  if (!sellerMemberId) throw new Error("Choose a closing seller before issuing the number.");
  const rateFor = (memberId: string, role: CommissionRole): FrozenCommissionRate => {
    const setting = store.commissionRateSettings.find((item) => item.memberId === memberId && item.product === product && item.role === role);
    if (!setting) throw new Error(`Record the approved ${role} rate for the ${role === "DSC" ? "closing seller" : "referrer"} before issuing the number.`);
    return { memberId, role, rateBp: setting.rateBp };
  };
  return [rateFor(sellerMemberId, "DSC"), ...(referrerMemberId ? [rateFor(referrerMemberId, "DRI")] : [])];
}

type SaleRelease = {
  saleId: string;
  contractId: string;
  product: CommissionProduct;
  valueCentavos: number;
  rates: readonly FrozenCommissionRate[];
  stage1Date: string | null;
  fullPaymentDate: string | null;
  reviewReason?: string;
};

export function releaseSaleCommissions(store: MockStore, actor: DevIdentity, sale: SaleRelease): void {
  const releases = sale.rates.flatMap((rate) =>
    commissionStageAmounts(sale.valueCentavos, rate.rateBp, sale.product).map((amount) => ({ ...rate, ...amount })),
  );
  for (const release of releases) {
    const date = release.stage === "stage1" ? sale.stage1Date : sale.fullPaymentDate;
    if (!date || release.amountCentavos === 0) continue;
    const existing = store.commissions.findLast((item) => item.saleId === sale.saleId &&
      item.recipientMemberId === release.memberId && (item.role ?? "DSC") === release.role &&
      (item.stage ?? "stage1") === release.stage);
    if (existing && !existing.rereleaseAfter) {
      if (existing.status === "on_hold" && !sale.reviewReason && !existing.payout &&
        (existing.releaseRestorable || existing.holdTrigger === "returned_cheque" || existing.holdTrigger === "default")) {
        existing.status = existing.approvedAt ? "approved" : "released";
        if (existing.status === "released" && existing.releaseDate && store.closedMonths.some(({ month }) => month === existing.releaseDate?.slice(0, 7))) {
          existing.releaseDate = firstOpenDate(store.closedMonths, date);
        }
        existing.holdReason = null;
        delete existing.holdTrigger;
        delete existing.releaseRestorable;
        existing.history.push({ at: nowIso(), actorId: actor.id, event: "COMMISSION_RESTORED", note: null });
        appendAuditEvent(store, { actorId: actor.id, actorRoles: activeRoles(actor), module: "commissions", action: "COMMISSION_RESTORED", entityType: "commission", entityId: existing.id, previousValue: "on_hold", newValue: existing.status, relatedRecordIds: [sale.saleId], outcome: "success" });
      }
      continue;
    }
    const member = store.members.find((item) => item.id === release.memberId);
    const id = nextId(store, "commission", "comm");
    const status = sale.reviewReason ? "on_hold" : "released";
    store.commissions.push({
      id, saleId: sale.saleId, contractId: sale.contractId, recipientMemberId: release.memberId,
      recipientName: member?.displayName ?? release.memberId, recipientDesignation: member?.designation ?? "",
      basisCentavos: sale.valueCentavos, percentBp: release.rateBp, amountCentavos: release.amountCentavos,
      product: sale.product, role: release.role, stage: release.stage, releaseDate: existing?.rereleaseAfter ? firstOpenDate(store.closedMonths, existing.rereleaseAfter > date ? existing.rereleaseAfter : date) : date, status,
      approvedBy: "", approvedAt: "", holdReason: sale.reviewReason ?? null, payout: null,
      history: [{ at: nowIso(), actorId: actor.id, event: "COMMISSION_RELEASED", note: sale.reviewReason ?? null }],
    });
    appendAuditEvent(store, {
      actorId: actor.id, actorRoles: activeRoles(actor), module: "commissions", action: "COMMISSION_RELEASED",
      entityType: "commission", entityId: id, newValue: String(release.amountCentavos), reason: sale.reviewReason,
      relatedRecordIds: [sale.saleId], outcome: "success",
    });
  }
}

export function restoreDefaultedCommission(store: MockStore, actor: DevIdentity, saleId: string, businessDate: string): void {
  for (const clawback of store.commissionClawbacks) {
    if (clawback.saleId !== saleId || clawback.trigger !== "default" || clawback.refundDueCentavos !== undefined) continue;
    if (clawbackBalance(clawback) > 0) {
      clawback.writeOff = { date: businessDate, actorId: actor.id, reason: "Defaulted sale reinstated." };
    }
    const refunded = clawback.recoveries.reduce((total, entry) => total + entry.amountCentavos, 0);
    clawback.refundDueCentavos = refunded;
    const paid = store.commissions.find((item) => item.id === clawback.commissionId);
    if (paid) paid.rereleaseAfter = businessDate;
    appendAuditEvent(store, { actorId: actor.id, actorRoles: activeRoles(actor), module: "commissions", action: "COMMISSION_DEFAULT_REINSTATED", entityType: "commission", entityId: clawback.commissionId, newValue: String(refunded), reason: "Defaulted sale reinstated. Amount shown is due for refund.", relatedRecordIds: [saleId, clawback.id], outcome: "success" });
  }
}

export function applyCommissionTrigger(
  store: MockStore,
  actor: DevIdentity,
  saleId: string,
  trigger: CommissionClawbackTrigger,
  businessDate: string,
  affectedStages?: CommissionStage[],
): void {
  for (const commission of store.commissions) {
    if (commission.saleId !== saleId || (affectedStages && !affectedStages.includes(commission.stage ?? "stage1"))) continue;
    if (commission.status === "paid") {
      if (trigger === "returned_cheque" && !store.closedMonths.some(({ month }) => month === commission.payout?.payoutDate.slice(0, 7))) continue;
      if (store.commissionClawbacks.some((item) => item.commissionId === commission.id)) continue;
      const id = nextId(store, "commissionClawback", "clawback");
      store.commissionClawbacks.push({
        id, commissionId: commission.id, saleId, recipientMemberId: commission.recipientMemberId,
        trigger, raisedDate: businessDate, amountCentavos: commission.amountCentavos, recoveries: [], writeOff: null,
      });
      appendAuditEvent(store, { actorId: actor.id, actorRoles: activeRoles(actor), module: "commissions", action: "COMMISSION_CLAWBACK_RAISED", entityType: "commission", entityId: commission.id, newValue: String(commission.amountCentavos), reason: trigger, relatedRecordIds: [saleId, id], outcome: "success" });
    } else if (commission.status === "released" || commission.status === "approved" || commission.status === "on_hold") {
      if (commission.status === "on_hold" && commission.holdTrigger === trigger) continue;
      const previous = commission.status;
      commission.status = "on_hold";
      commission.holdReason = trigger.replaceAll("_", " ");
      commission.holdTrigger = trigger;
      commission.history.push({ at: nowIso(), actorId: actor.id, event: "COMMISSION_HELD", note: commission.holdReason });
      appendAuditEvent(store, { actorId: actor.id, actorRoles: activeRoles(actor), module: "commissions", action: "COMMISSION_HELD", entityType: "commission", entityId: commission.id, previousValue: previous, newValue: "on_hold", reason: trigger, relatedRecordIds: [saleId], outcome: "success" });
    }
  }
}

export function holdUnpaidCommissionForReview(store: MockStore, actor: DevIdentity, saleId: string, reason: string, affectedStages?: CommissionStage[], restoreWhenQualified = false): void {
  for (const commission of store.commissions) {
    if (commission.saleId !== saleId || (affectedStages && !affectedStages.includes(commission.stage ?? "stage1")) ||
      (commission.status !== "released" && commission.status !== "approved")) continue;
    const previous = commission.status;
    commission.status = "on_hold";
    commission.holdReason = reason;
    commission.releaseRestorable = restoreWhenQualified;
    commission.history.push({ at: nowIso(), actorId: actor.id, event: "COMMISSION_HELD", note: reason });
    appendAuditEvent(store, { actorId: actor.id, actorRoles: activeRoles(actor), module: "commissions", action: "COMMISSION_HELD", entityType: "commission", entityId: commission.id, previousValue: previous, newValue: "on_hold", reason, relatedRecordIds: [saleId], outcome: "success" });
  }
}
