import { downPaymentCentavos, paymentSchemeTierTerms } from "@/modules/vip/rules";
import type { PaymentScheme, VipProduct } from "@/modules/vip/types";
import { addDaysToDate, addMonthsToDate } from "@/shared/lib/dates";
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
  /** Package price for this tier under this scheme; the contract snapshots it. */
  priceCentavos: number;
  requiredInitialCentavos: number | null;
  /** Reasons a schedule could not be produced; empty when terms are documented. */
  errors: string[];
};

/** Spot Cash balance is due within 7 days of the reservation (Full Payment contracts; OD-11, 2026-11-09). */
export const SPOT_CASH_BALANCE_DAYS = 7;

/**
 * Builds the payment schedule from a configured scheme and its package price.
 * Due dates derive from the reservation date (owner decision 2026-11-09): the
 * reservation is due that day, monthly installment N is due N months later
 * (clamped to month end), and a Spot Cash balance is due 7 days later. Without a
 * reservation date the lines stay undated. Installments follow the signed
 * Standard Pricing contracts at 0% interest. Schemes without approved terms
 * produce no schedule (D7).
 */
export function buildSchedule(product: VipProduct, scheme: PaymentScheme, reservationDate: string | null = null): BuiltSchedule {
  const { priceCentavos: price, reservationCentavos: reservation, installmentCount: count, installmentCentavos: each } = paymentSchemeTierTerms(product, scheme);
  if (scheme.commercialStatus !== "configured") {
    return { schedule: [], priceCentavos: price, requiredInitialCentavos: null, errors: [`${scheme.label} has no approved commercial terms yet.`] };
  }
  if (!scheme.applicableTiers.includes(product.code)) {
    return { schedule: [], priceCentavos: price, requiredInitialCentavos: null, errors: [`${scheme.label} is not available for ${product.name}.`] };
  }
  const schedule: ScheduleItem[] = [];
  let seq = 1;
  if (reservation > 0) schedule.push({ seq: seq++, label: "Reservation fee", purpose: "reservation", amountCentavos: reservation, dueDate: reservationDate });
  if (scheme.category === "cash") {
    const due = reservationDate ? addDaysToDate(reservationDate, reservation > 0 ? SPOT_CASH_BALANCE_DAYS : 0) : null;
    schedule.push({ seq: seq++, label: reservation > 0 ? "Balance" : "Full payment", purpose: "full", amountCentavos: price - reservation, dueDate: due });
    // A cash sale is confirmed once fully paid.
    return { schedule, priceCentavos: price, requiredInitialCentavos: price, errors: reservation < price ? [] : [`The reservation fee must be less than the ${product.name} price.`] };
  }
  if (!count || !each) return { schedule: [], priceCentavos: price, requiredInitialCentavos: null, errors: [`${scheme.label} has no installment amount for ${product.name}.`] };
  const down = downPaymentCentavos(price, scheme);
  if (down != null && down > reservation) {
    // The down payment includes the reservation fee. No source dates it, so it stays undated until staff enter it.
    schedule.push({ seq: seq++, label: "Down payment", purpose: "down_payment", amountCentavos: down - reservation, dueDate: null });
  }
  for (let index = 1; index <= count; index += 1) {
    schedule.push({ seq: seq++, label: `MA${index}`, purpose: "installment", amountCentavos: each, dueDate: reservationDate ? addMonthsToDate(reservationDate, index) : null });
  }
  const total = schedule.reduce((sum, item) => sum + item.amountCentavos, 0);
  const errors = total === price ? [] : [`The schedule total does not equal the ${product.name} price.`];
  // Interim rule D25: required initial payment = reservation plus the next line (first installment, or the Move B down payment).
  const first = schedule.slice(0, reservation > 0 ? 2 : 1).reduce((sum, item) => sum + item.amountCentavos, 0);
  return { schedule, priceCentavos: price, requiredInitialCentavos: first, errors };
}

/**
 * Reasons a contract cannot be finalized yet. Finalization is held, never
 * silently fixed, while source conflicts or undecided rules remain (05 sections 6, 10.1, 11).
 */
export function finalizationHolds(contract: Contract): string[] {
  const holds: string[] = [];
  if (contract.priceStatus === "conflict") holds.push("The contract price is in conflict between contract sections (D5). Management must correct it first.");
  if (contract.schemeStatus !== "configured") holds.push("The payment scheme has no approved commercial terms (D7).");
  if (contract.arrangement && contract.arrangement.status !== "approved") holds.push(`The ${contract.arrangement.schemeLabel} arrangement needs Super Admin written approval.`);
  if (contract.classification === "N") holds.push("Non-Standard contract authorization rules are not approved (D8).");
  if (contract.schedule.length === 0) holds.push("The payment schedule is empty.");
  if (!contract.customerAccepted) holds.push("Customer acceptance has not been recorded.");
  return holds;
}
