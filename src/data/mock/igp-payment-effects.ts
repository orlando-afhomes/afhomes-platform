import type { Payment } from "@/modules/finance/types";
import type { DevIdentity } from "@/modules/identity/types";
import { hasOperationPermission } from "@/modules/identity/permissions";
import { firstOpenDate } from "@/modules/finance/month-close";
import { igpMilestones } from "@/modules/igp/rules";
import type { IgpSale } from "@/modules/igp/types";
import { appendAuditEvent } from "./audit";
import { BROAD_BUSINESS_ROLES, canSeeContract, today } from "./business-base";
import { applyCommissionTrigger, holdUnpaidCommissionForReview, releaseSaleCommissions, restoreDefaultedCommission } from "./commission-effects";
import { activeRoles } from "./dev-identities";
import { nextId } from "./ids";
import { isActiveIdentity } from "./scope";
import type { MockStore } from "./seed";

export function findIgpPaymentTarget(store: MockStore, id: string): IgpSale | undefined {
  return store.igp.sales.find((sale) => sale.id === id);
}

export function canSeeIgpSale(identity: DevIdentity, sale: IgpSale): boolean {
  if (!isActiveIdentity(identity)) return false;
  if (activeRoles(identity).some((role) => BROAD_BUSINESS_ROLES.has(role))) return true;
  const own = identity.memberId !== null && (identity.memberId === sale.sellerMemberId || identity.memberId === sale.referrerMemberId);
  return (hasOperationPermission(identity, "sales.viewOwn") && own) ||
    (hasOperationPermission(identity, "sales.viewTeam") && (own || canSeeContract(identity, sale)));
}

export function igpPayments(store: MockStore, saleId: string): Payment[] {
  return store.payments.filter((payment) => payment.contractId === saleId);
}

export function adjustIgpSalesValue(store: MockStore, sale: IgpSale, actor: DevIdentity, reason: string): void {
  const recognized = sale.adjustments.reduce((total, entry) => total + entry.amountCentavos, 0);
  const current = sale.status === "approved" && sale.closedDealDate ? sale.priceCentavos : 0;
  if (recognized === current) return;
  const firstConfirmation = sale.adjustments.length === 0 && sale.replacesId === null;
  sale.adjustments.push({
    id: nextId(store, "adjustment", "adj"),
    date: firstConfirmation && sale.closedDealDate ? sale.closedDealDate : firstOpenDate(store.closedMonths, today()),
    amountCentavos: current - recognized,
    kind: current === 0 ? "reversal" : recognized > 0 ? "amendment" : firstConfirmation ? "confirmation" : "reconfirmation",
    reason, actorId: actor.id,
  });
}

export function reconcileIgpCollections(
  store: MockStore,
  sale: IgpSale,
  actor: DevIdentity,
  changedPayment?: Payment,
  kind?: "verify" | "reversal" | "refund",
): void {
  if (sale.status !== "approved" && sale.status !== "defaulted") return;
  const audit = (action: string, previousValue: string | null, newValue: string | null) => appendAuditEvent(store, {
    actorId: actor.id, actorRoles: activeRoles(actor), module: "sales", entityType: "sale", entityId: sale.id,
    action, previousValue, newValue, displayReference: sale.seriesNumber, outcome: "success",
    relatedRecordIds: changedPayment ? [changedPayment.id] : undefined,
  });
  if (sale.status === "defaulted" && kind === "verify") {
    sale.status = "approved";
    audit("IGP_SALE_REINSTATED", "defaulted", "approved");
    restoreDefaultedCommission(store, actor, sale.id, firstOpenDate(store.closedMonths, today()));
  }
  const next = igpMilestones(sale.priceCentavos, sale.thresholdBp, igpPayments(store, sale.id));
  const lostStages = [
    ...(sale.stage1Date && !next.stage1Date ? ["stage1" as const] : []),
    ...(sale.fullPaymentDate && !next.fullPaymentDate ? ["full" as const] : []),
  ];
  if (lostStages.length > 0) {
    if (changedPayment?.method === "Cheque" && kind === "reversal") {
      applyCommissionTrigger(store, actor, sale.id, "returned_cheque", firstOpenDate(store.closedMonths, today()), lostStages);
    } else {
      holdUnpaidCommissionForReview(store, actor, sale.id, "Approved collections fell below the release threshold.", lostStages, true);
    }
  }
  for (const key of ["closedDealDate", "stage1Date", "fullPaymentDate"] as const) {
    if (sale[key] === next[key]) continue;
    audit(`IGP_${key === "closedDealDate" ? "CLOSED_DEAL" : key === "stage1Date" ? "STAGE_1" : "FULL_PAYMENT"}_CHANGED`, sale[key], next[key]);
    sale[key] = next[key];
  }
  adjustIgpSalesValue(store, sale, actor, "Approved IGP collections or contract price changed.");
  if (sale.status === "approved") {
    const replacementPostingDate = sale.replacesId ? firstOpenDate(store.closedMonths, sale.date) : null;
    const releaseDate = (milestone: string | null) => milestone && replacementPostingDate && milestone < replacementPostingDate ? replacementPostingDate : milestone;
    releaseSaleCommissions(store, actor, {
      saleId: sale.id, contractId: sale.id, product: "IGP", valueCentavos: sale.priceCentavos,
      rates: sale.commissionRates, stage1Date: releaseDate(sale.stage1Date), fullPaymentDate: releaseDate(sale.fullPaymentDate),
      reviewReason: sale.commissionReviewReason ?? undefined,
    });
  }
}
