import type { Promo, PromoBalance, PromoPointsEntry, PromoUseCheck } from "./types";

// Pure promo rules. Integer math only; ISO date strings compare lexically.

const isPositiveInt = (n: number) => Number.isSafeInteger(n) && n > 0;

export function isPromoDateInRange(promo: Pick<Promo, "startDate" | "endDate">, date: string): boolean {
  return date >= promo.startDate && date <= promo.endDate;
}

/** Whole points for a bill: floor(net / rate). Zero outside dates/outlets or when the promo is not active. */
export function earnPointsForBill(
  promo: Promo,
  outletId: string,
  billDate: string,
  netAmountCentavos: number,
): number {
  if (promo.status !== "active") return 0;
  if (!promo.earnOutletIds.includes(outletId)) return 0;
  if (!isPromoDateInRange(promo, billDate)) return 0;
  if (!isPositiveInt(promo.earnPesosPerPointCentavos)) return 0;
  if (!Number.isSafeInteger(netAmountCentavos) || netAmountCentavos <= 0) return 0;
  return Math.floor(netAmountCentavos / promo.earnPesosPerPointCentavos);
}

/**
 * Points to reverse after a refund. The bill keeps the points its remaining
 * qualifying amount still earns; the rest is reversed. Never below zero and never
 * more than what is still un-reversed from the original earn.
 */
export function earnReversalPoints(
  promo: Pick<Promo, "earnPesosPerPointCentavos">,
  originalNetCentavos: number,
  totalRefundedCentavos: number,
  earnedPoints: number,
  alreadyReversedPoints: number,
): number {
  const outstanding = Math.max(0, earnedPoints - alreadyReversedPoints);
  if (outstanding === 0 || !isPositiveInt(promo.earnPesosPerPointCentavos)) return 0;
  const remainingNet = Math.max(0, originalNetCentavos - Math.max(0, totalRefundedCentavos));
  const stillEarned = Math.min(earnedPoints, Math.floor(remainingNet / promo.earnPesosPerPointCentavos));
  return Math.min(outstanding, Math.max(0, earnedPoints - stillEarned - alreadyReversedPoints));
}

/** True when this bill already has an earn entry for the promo (even if later reversed): never earn twice. */
export function hasBillEarned(entries: readonly PromoPointsEntry[], promoId: string, billId: string): boolean {
  return entries.some((e) => e.type === "earn" && e.promoId === promoId && e.sourceBillId === billId);
}

/** True when a use entry already has a void entry. */
export function isUseVoided(entries: readonly PromoPointsEntry[], useEntryId: string): boolean {
  return entries.some((e) => e.type === "use_void" && e.voidsEntryId === useEntryId);
}

function promoIsExpired(promo: Promo | undefined, today: string): boolean {
  return !!promo?.pointsExpiryDate && today > promo.pointsExpiryDate;
}

const emptyBalance = (): PromoBalance => ({ earned: 0, reversed: 0, used: 0, voided: 0, expired: 0, available: 0 });

/**
 * Balance per promo for the given entries (one membership). Points of a promo whose
 * expiry date has passed are counted as expired; explicit expiry entries are honored
 * and not double counted.
 */
export function promoBalanceByPromo(
  entries: readonly PromoPointsEntry[],
  today: string,
  promos: readonly Promo[],
): Map<string, PromoBalance> {
  const byPromo = new Map<string, PromoBalance>();
  for (const e of entries) {
    const b = byPromo.get(e.promoId) ?? emptyBalance();
    if (e.type === "earn") b.earned += e.points;
    else if (e.type === "earn_reversal") b.reversed += e.points;
    else if (e.type === "use") b.used += e.points;
    else if (e.type === "use_void") b.voided += e.points;
    else b.expired += e.points;
    byPromo.set(e.promoId, b);
  }
  for (const [promoId, b] of byPromo) {
    const net = Math.max(0, b.earned - b.reversed - b.used + b.voided - b.expired);
    if (promoIsExpired(promos.find((p) => p.id === promoId), today)) {
      b.expired += net;
      b.available = 0;
    } else {
      b.available = net;
    }
  }
  return byPromo;
}

/** Total balance across promos (or one promo when `promoId` is given). */
export function promoBalance(
  entries: readonly PromoPointsEntry[],
  today: string,
  promos: readonly Promo[],
  promoId?: string,
): PromoBalance {
  const total = emptyBalance();
  for (const [id, b] of promoBalanceByPromo(entries, today, promos)) {
    if (promoId && id !== promoId) continue;
    total.earned += b.earned;
    total.reversed += b.reversed;
    total.used += b.used;
    total.voided += b.voided;
    total.expired += b.expired;
    total.available += b.available;
  }
  return total;
}

/** Whether `points` can be used from the promo balance at an outlet on a date. */
export function canUsePoints(
  availablePoints: number,
  points: number,
  promo: Promo,
  outletId: string,
  date: string,
): PromoUseCheck {
  if (!isPositiveInt(points)) return { ok: false, error: "Points to use must be a whole number above zero." };
  if (promo.status === "draft") return { ok: false, error: "This promo is not active yet." };
  if (date < promo.startDate) return { ok: false, error: "This promo has not started yet." };
  if (!promo.redeemOutletIds.includes(outletId)) {
    return { ok: false, error: "Promo Points cannot be used at this outlet." };
  }
  if (promoIsExpired(promo, date)) return { ok: false, error: "These Promo Points have expired." };
  if (points > availablePoints) {
    return { ok: false, error: `Not enough Promo Points. Available: ${Math.max(0, availablePoints)}.` };
  }
  return { ok: true };
}
