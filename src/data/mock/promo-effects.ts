import type { DevIdentity } from "@/modules/identity/types";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import { earnPointsForBill, earnReversalPoints, hasBillEarned } from "@/modules/promos/rules";
import type { ResortSpend } from "@/modules/stay-points/types";
import { appendAuditEvent } from "./audit";
import { today } from "./business-base";
import { activeRoles } from "./dev-identities";
import { nextId } from "./ids";
import type { MockStore } from "./seed";

function audit(store: MockStore, actor: DevIdentity, action: string, entryId: string, points: number, billId: string, promoId: string) {
  appendAuditEvent(store, {
    actorId: actor.id, actorRoles: activeRoles(actor), module: "stay-points", action, entityType: "promo",
    entityId: promoId, newValue: String(points), relatedRecordIds: [billId, entryId], outcome: "success",
  });
}

/**
 * Called when a resort bill is approved. Earns Promo Points for every active promo whose
 * outlet and dates match. Idempotent per bill and promo. Never touches Grant Stay Points.
 */
export function earnPromoPointsForBill(store: MockStore, actor: DevIdentity, spend: ResortSpend): void {
  if (!spend.venueId) return;
  for (const promo of store.promos) {
    if (hasBillEarned(store.promoPoints, promo.id, spend.id)) continue;
    const points = earnPointsForBill(promo, spend.venueId, spend.date, spend.amountCentavos);
    if (points <= 0) continue;
    const id = nextId(store, "promoPoints", "pp");
    store.promoPoints.push({ id, promoId: promo.id, membershipId: spend.membershipId, type: "earn", points, sourceBillId: spend.id, outletId: spend.venueId, date: today(), actorId: actor.id });
    audit(store, actor, BUSINESS_AUDIT_ACTIONS.PROMO_POINTS_EARNED, id, points, spend.id, promo.id);
  }
}

/** Called after a refund row was recorded. `totalRefundedCentavos` is the cumulative refund on the bill. */
export function reversePromoPointsForRefund(store: MockStore, actor: DevIdentity, spend: ResortSpend, totalRefundedCentavos: number): void {
  for (const promo of store.promos) {
    const forBill = store.promoPoints.filter((entry) => entry.promoId === promo.id && entry.sourceBillId === spend.id);
    const earned = forBill.filter((entry) => entry.type === "earn").reduce((sum, entry) => sum + entry.points, 0);
    if (earned === 0) continue;
    const reversed = forBill.filter((entry) => entry.type === "earn_reversal").reduce((sum, entry) => sum + entry.points, 0);
    const points = earnReversalPoints(promo, spend.amountCentavos, totalRefundedCentavos, earned, reversed);
    if (points <= 0) continue;
    const id = nextId(store, "promoPoints", "pp");
    store.promoPoints.push({ id, promoId: promo.id, membershipId: spend.membershipId, type: "earn_reversal", points, sourceBillId: spend.id, outletId: spend.venueId, date: today(), actorId: actor.id, note: "Bill refunded." });
    audit(store, actor, BUSINESS_AUDIT_ACTIONS.PROMO_POINTS_EARN_REVERSED, id, points, spend.id, promo.id);
  }
}
