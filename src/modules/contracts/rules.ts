import { downPaymentCentavos, paymentSchemeTierTerms } from "@/modules/vip/rules";
import type { CustomerStatus } from "@/modules/customers/types";
import type { PaymentScheme, VipProduct } from "@/modules/vip/types";
import { addDaysToDate, addMonthsToDate } from "@/shared/lib/dates";
import type { BenefitsSnapshot, Contract, ScheduleItem } from "./types";

export function canPrepareVipContract(status: CustomerStatus): boolean {
  return status === "submitted" || status === "approved" || status === "active_member";
}

export function isEditableContractStatus(status: Contract["status"]): boolean {
  return status === "draft" || status === "returned";
}

/** Resume editable purchases first, otherwise show the latest non-cancelled purchase. */
export function preferOpenContract<T extends Pick<Contract, "status" | "createdAt">>(current: T | undefined, candidate: T): T | undefined {
  if (candidate.status === "cancelled") return current;
  if (!current) return candidate;
  const editable = isEditableContractStatus(candidate.status);
  if (editable !== isEditableContractStatus(current.status)) return editable ? candidate : current;
  return candidate.createdAt >= current.createdAt ? candidate : current;
}

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

/** Most monthly payments a Non-Standard contract may have (doc 05 §10.2: 1 to 12 months, owner amendment 2026-11-24). */
export const NON_STANDARD_MAX_MONTHS = 12;

export type NonStandardTermsDraft = { priceCentavos: number | null; months: number | null; justification: string };

/** Field problems in Non-Standard terms (doc 05 §10.2). No minimum price is enforced (item 15, rule 4). */
export function nonStandardTermErrors(terms: NonStandardTermsDraft, reservationCentavos: number): { price?: string; months?: string; reason?: string } {
  const errors: { price?: string; months?: string; reason?: string } = {};
  const { priceCentavos: price, months } = terms;
  if (price == null || !Number.isSafeInteger(price) || price <= reservationCentavos) errors.price = "Enter a total price above the reservation fee.";
  if (months == null || !Number.isInteger(months) || months < 1 || months > NON_STANDARD_MAX_MONTHS) errors.months = `Enter a whole number of monthly payments from 1 to ${NON_STANDARD_MAX_MONTHS}.`;
  if (!terms.justification.trim()) errors.reason = "Enter the reason for the Non-Standard terms.";
  return errors;
}

/** Card ID payment segment for a Non-Standard schedule: T plus the months in two digits (T01 to T12). */
export function nonStandardPaymentCode(months: number): string {
  return `T${String(months).padStart(2, "0")}`;
}

/**
 * Non-Standard schedule (doc 05 §10.2, item 32): the plan's reservation fee, then
 * the rest of the price in equal monthly payments; the last payment takes the
 * leftover centavos so the total is exact. Due dates follow the reservation date.
 */
export function buildNonStandardSchedule(priceCentavos: number, reservationCentavos: number, months: number, reservationDate: string | null = null): Omit<BuiltSchedule, "priceCentavos"> {
  const invalid = nonStandardTermErrors({ priceCentavos, months, justification: "-" }, reservationCentavos);
  const firstError = invalid.price ?? invalid.months;
  if (firstError || !Number.isSafeInteger(reservationCentavos) || reservationCentavos < 0) {
    return { schedule: [], requiredInitialCentavos: null, errors: [firstError ?? "The reservation fee is not valid."] };
  }
  const schedule: ScheduleItem[] = [];
  let seq = 1;
  if (reservationCentavos > 0) schedule.push({ seq: seq++, label: "Reservation fee", purpose: "reservation", amountCentavos: reservationCentavos, dueDate: reservationDate });
  const rest = priceCentavos - reservationCentavos;
  const each = Math.floor(rest / months);
  for (let index = 1; index <= months; index += 1) {
    const amount = index === months ? rest - each * (months - 1) : each;
    schedule.push({ seq: seq++, label: `MA${index}`, purpose: "installment", amountCentavos: amount, dueDate: reservationDate ? addMonthsToDate(reservationDate, index) : null });
  }
  // Interim rule D25, as for Standard schedules: the reservation plus the first monthly payment.
  const first = schedule.slice(0, reservationCentavos > 0 ? 2 : 1).reduce((sum, item) => sum + item.amountCentavos, 0);
  return { schedule, requiredInitialCentavos: first, errors: [] };
}

/** Where a Non-Standard contract stands in its two approvals; null for Standard contracts. */
export function nonStandardStage(contract: Pick<Contract, "classification" | "nonStandard">): "admin" | "finance" | "approved" | null {
  if (contract.classification !== "N") return null;
  if (!contract.nonStandard?.approvedBy) return "admin";
  return contract.nonStandard.confirmedBy ? "approved" : "finance";
}

/**
 * Reasons a contract cannot be finalized yet. Finalization is held, never
 * silently fixed, while source conflicts or undecided rules remain (05 sections 6, 10.2, 11).
 */
export function finalizationHolds(contract: Contract): string[] {
  const holds: string[] = [];
  if (contract.priceStatus === "conflict") holds.push("The contract price is in conflict between contract sections (D5). Management must correct it first.");
  if (contract.schemeStatus !== "configured") holds.push("The payment plan has no approved commercial terms.");
  if (contract.arrangement && contract.arrangement.status !== "approved") holds.push(`The ${contract.arrangement.schemeLabel} arrangement needs Super Admin written approval.`);
  const stage = nonStandardStage(contract);
  if (stage === "admin") holds.push("Non-Standard terms need Administrator approval.");
  if (stage === "finance") holds.push("Non-Standard terms need Finance confirmation.");
  if (contract.schedule.length === 0) holds.push("The payment schedule is empty.");
  if (!contract.customerAccepted) holds.push("Customer acceptance has not been recorded.");
  return holds;
}
