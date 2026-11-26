import type { PaymentScheme, VipProduct } from "@/modules/vip/types";

/**
 * VIP catalog. Prices and scheme terms are owner-decided values from the signed
 * contracts (docs 05 and 06); they are configuration, not sample data, and do
 * not move with the seed clock. Money is integer centavos.
 */
export const peso = (amount: number) => amount * 100;

export function buildProducts(): VipProduct[] {
  return [
    { code: "B1", name: "Bronze VIP", tierLevelId: "tier-level-bronze", tier: "Bronze", tierColorKey: "bronze", priceCentavos: peso(72000), priceStatus: "contract_stated",
      priceNote: "Stated in the Bronze VIP Grant Contract, Standard Pricing (Section II and Annex A).",
      validityYears: 7, earningCycles: 5, vipDiscountPercent: 15, lifetimePoints: 50000, pointsPerCycle: 10000,
      weekdayPointsPerCycle: 7000, weekendPointsPerCycle: 3000, minSpendPerCycleCentavos: peso(1000), supplementaryHolders: 0,
      status: "active", approvalStatus: "approved", publiclyListed: true, configVersion: 1, effectiveDate: null, changes: [] },
    { code: "S1", name: "Silver VIP", tierLevelId: "tier-level-silver", tier: "Silver", tierColorKey: "silver", priceCentavos: peso(240000), priceStatus: "contract_stated",
      priceNote: "Stated in Section II and Annex A. Section IV of the Silver contract still carries an unfinished amount placeholder (05 6.2).",
      validityYears: 12, earningCycles: 10, vipDiscountPercent: 20, lifetimePoints: 200000, pointsPerCycle: 20000,
      weekdayPointsPerCycle: 14000, weekendPointsPerCycle: 6000, minSpendPerCycleCentavos: peso(2000), supplementaryHolders: 0,
      status: "active", approvalStatus: "approved", publiclyListed: true, configVersion: 1, effectiveDate: null, changes: [] },
    { code: "G1", name: "Gold VIP", tierLevelId: "tier-level-gold", tier: "Gold", tierColorKey: "gold", priceCentavos: peso(390000), priceStatus: "contract_stated",
      priceNote: "Gold VIP ₱390,000 confirmed by owner ruling effective 2026-11-10 (doc 05 amendment item 11). Section IV ₱780,000 rejected.",
      validityYears: 22, earningCycles: 20, vipDiscountPercent: 25, lifetimePoints: 500000, pointsPerCycle: 25000,
      weekdayPointsPerCycle: 17500, weekendPointsPerCycle: 7500, minSpendPerCycleCentavos: peso(3000), supplementaryHolders: 1,
      status: "active", approvalStatus: "approved", publiclyListed: true, configVersion: 1, effectiveDate: null, changes: [] },
  ];
}

export function buildPaymentSchemes(): PaymentScheme[] {
  return [
    { id: "scheme-spot-cash", label: "Spot Cash", historicalLabel: "Spot cash", category: "cash", paymentCode: "C01",
      applicableTiers: ["B1", "S1", "G1"], reservationCentavos: peso(10000), installmentCount: null, installmentCentavosByTier: {},
      priceCentavosByTier: { B1: peso(54000), S1: peso(192000), G1: peso(312000) },
      commercialStatus: "configured",
      source: "Full Payment contracts: Php 54,000 / 192,000 / 312,000, Php 10,000 reservation fee, balance within 7 days (OD-11 released by the owner on 2026-11-09). Card ID payment code in 06 section 6.3.",
      availability: "available", ownerHold: null, configVersion: 2, effectiveDate: "2026-11-09",
      changes: [{ version: 2, date: "2026-11-09", actorId: "owner", reason: "OD-11 released by the owner", summary: "priceCentavosByTier, reservationCentavos, availability" }] },
    { id: "scheme-installment-4m", label: "4-Month Installment", historicalLabel: "Installment 4_month", category: "installment", paymentCode: "T04",
      applicableTiers: ["B1", "S1", "G1"], reservationCentavos: peso(10000), installmentCount: 4,
      installmentCentavosByTier: { B1: peso(15500), S1: peso(57500), G1: peso(95000) }, priceCentavosByTier: {},
      commercialStatus: "configured",
      source: "Standard Pricing contracts: Php 10,000 non-refundable reservation fee plus four monthly installments at 0% interest (Annex A).",
      availability: "available", configVersion: 1, effectiveDate: null, changes: [] },
    // Move schemes are standard schemes with owner-ruled Card ID payment codes (06 section 6.3):
    // Move A uses T04 for all tiers; Move B uses per-tier T04/T08/T12. The special arrangement
    // is no longer created.
    { id: "scheme-move-a", label: "Move A", historicalLabel: "Move a", category: "move", paymentCode: "T04",
      applicableTiers: ["B1", "S1", "G1"], reservationCentavos: peso(10000), installmentCount: 4,
      installmentCentavosByTier: { B1: peso(11000), S1: peso(45500), G1: peso(75500) },
      priceCentavosByTier: { B1: peso(54000), S1: peso(192000), G1: peso(312000) },
      commercialStatus: "configured",
      source: "Group VIP IST Presentation slides 13 to 16: Spot Cash price paid as the reservation fee plus 4 monthly payments (Bronze per slide 15). Approved by the owner on 2026-11-09. Card ID payment code not authorized yet.",
      availability: "available", configVersion: 2, effectiveDate: "2026-11-09",
      changes: [{ version: 2, date: "2026-11-09", actorId: "owner", reason: "Move A approved by the owner", summary: "terms, availability" }] },
    { id: "scheme-move-b", label: "Move B", historicalLabel: null, category: "move", paymentCode: null, paymentCodeByTier: { B1: "T04", S1: "T08", G1: "T12" },
      applicableTiers: ["B1", "S1", "G1"], reservationCentavos: peso(10000), installmentCount: null, downPaymentBasisPoints: 4_000,
      installmentCountByTier: { B1: 4, S1: 8, G1: 12 },
      installmentCentavosByTier: { B1: peso(10800), S1: peso(18000), G1: peso(19500) }, priceCentavosByTier: {},
      commercialStatus: "configured",
      source: "Group VIP IST Presentation slide 14: installment price, 40% down payment including the reservation fee, then 4, 8 or 12 monthly payments. Approved by the owner on 2026-11-09; replaces the unsourced Move B1 and Move B2 entries. Card ID payment code not authorized yet.",
      availability: "available", configVersion: 1, effectiveDate: "2026-11-09",
      changes: [{ version: 1, date: "2026-11-09", actorId: "owner", reason: "Move B approved by the owner", summary: "created" }] },
  ];
}
