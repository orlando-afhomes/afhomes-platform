import type { PaymentScheme, VipProduct } from "@/modules/vip/types";
import type { BenefitsSnapshot, Contract, ScheduleItem } from "./types";

export function snapshotBenefits(product: VipProduct): BenefitsSnapshot {
  return {
    vipDiscountPercent: product.vipDiscountPercent,
    earningCycles: product.earningCycles,
    lifetimePoints: product.lifetimePoints,
    pointsPerCycle: product.pointsPerCycle,
    weekdayPointsPerCycle: product.weekdayPointsPerCycle,
    weekendPointsPerCycle: product.weekendPointsPerCycle,
    minSpendPerCycleCentavos: product.minSpendPerCycleCentavos,
    supplementaryHolders: product.supplementaryHolders,
  };
}

export type BuiltSchedule = {
  schedule: ScheduleItem[];
  requiredInitialCentavos: number | null;
  /** Reasons a schedule could not be produced; empty when terms are documented. */
  errors: string[];
};

/**
 * Builds the payment schedule from a configured scheme and the product price.
 * Spot Cash is one full payment. The 4-Month Installment follows the signed
 * Standard Pricing contracts: a reservation fee plus equal monthly installments
 * at 0% interest. Schemes without approved terms produce no schedule (D7).
 */
export function buildSchedule(product: VipProduct, scheme: PaymentScheme): BuiltSchedule {
  if (scheme.commercialStatus !== "configured") {
    return { schedule: [], requiredInitialCentavos: null, errors: [`${scheme.label} has no approved commercial terms yet.`] };
  }
  if (!scheme.applicableTiers.includes(product.code)) {
    return { schedule: [], requiredInitialCentavos: null, errors: [`${scheme.label} is not available for ${product.name}.`] };
  }
  if (scheme.category === "cash") {
    return {
      schedule: [{ seq: 1, label: "Full payment", purpose: "full", amountCentavos: product.priceCentavos, dueDate: null }],
      requiredInitialCentavos: product.priceCentavos,
      errors: [],
    };
  }
  const reservation = scheme.reservationCentavos ?? 0;
  const count = scheme.installmentCount ?? 0;
  const each = scheme.installmentCentavosByTier[product.code];
  if (!count || !each) return { schedule: [], requiredInitialCentavos: null, errors: [`${scheme.label} has no installment amount for ${product.name}.`] };
  const schedule: ScheduleItem[] = [];
  let seq = 1;
  if (reservation > 0) schedule.push({ seq: seq++, label: "Reservation fee", purpose: "reservation", amountCentavos: reservation, dueDate: null });
  for (let index = 1; index <= count; index += 1) {
    schedule.push({ seq: seq++, label: `MA${index}`, purpose: "installment", amountCentavos: each, dueDate: null });
  }
  const total = schedule.reduce((sum, item) => sum + item.amountCentavos, 0);
  const errors = total === product.priceCentavos ? [] : [`The schedule total does not equal the ${product.name} price.`];
  // Interim rule D25: required initial payment = reservation plus the first installment.
  const first = schedule.slice(0, reservation > 0 ? 2 : 1).reduce((sum, item) => sum + item.amountCentavos, 0);
  return { schedule, requiredInitialCentavos: first, errors };
}

/**
 * Reasons a contract cannot be finalized yet. Finalization is held, never
 * silently fixed, while source conflicts or undecided rules remain (05 sections 6, 10.1, 11).
 */
export function finalizationHolds(contract: Contract): string[] {
  const holds: string[] = [];
  if (contract.priceStatus === "conflict") holds.push("The contract price is in conflict between contract sections (D5). Management must correct it first.");
  if (contract.schemeStatus !== "configured") holds.push("The payment scheme has no approved commercial terms (D7).");
  if (contract.classification === "N") holds.push("Non-Standard contract authorization rules are not approved (D8).");
  if (contract.schedule.length === 0) holds.push("The payment schedule is empty.");
  if (!contract.customerAccepted) holds.push("Customer acceptance has not been recorded.");
  return holds;
}
