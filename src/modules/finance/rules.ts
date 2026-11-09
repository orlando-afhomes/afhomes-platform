import type { Contract } from "@/modules/contracts/types";
import type { Payment, ScheduleLineState } from "./types";

/** Verified amount net of reversals and refunds. Only Verified payments count (07 section 9). */
export function netVerifiedCentavos(payment: Payment): number {
  if (payment.status !== "verified") return 0;
  const adjusted = payment.adjustments.reduce((total, adjustment) => total + adjustment.amountCentavos, 0);
  return Math.max(0, payment.amountCentavos - adjusted);
}

export function totalVerifiedCentavos(payments: readonly Payment[]): number {
  return payments.reduce((total, payment) => total + netVerifiedCentavos(payment), 0);
}

/** Balance = finalized contract snapshot price minus verified payments (07 section 11). Never the catalog price. */
export function outstandingBalanceCentavos(contract: Pick<Contract, "priceCentavos">, payments: readonly Payment[]): number {
  return Math.max(0, contract.priceCentavos - totalVerifiedCentavos(payments));
}

export function isFullySettled(contract: Pick<Contract, "priceCentavos">, payments: readonly Payment[]): boolean {
  return outstandingBalanceCentavos(contract, payments) === 0 && totalVerifiedCentavos(payments) > 0;
}

/** Whether verified payments reach the scheme's required initial payment (an interim rule, D25). */
export function meetsRequiredInitial(contract: Pick<Contract, "requiredInitialCentavos">, payments: readonly Payment[]): boolean {
  if (contract.requiredInitialCentavos == null) return false;
  return totalVerifiedCentavos(payments) >= contract.requiredInitialCentavos;
}

/**
 * Allocates verified money to the contract schedule in order and classifies each
 * line. A line past its due date and not fully allocated is Overdue; no
 * penalty or interest is ever computed (07 section 13).
 */
export function buildScheduleState(contract: Pick<Contract, "schedule">, payments: readonly Payment[], today: string): ScheduleLineState[] {
  let remaining = totalVerifiedCentavos(payments);
  return contract.schedule.map((line) => {
    const allocated = Math.min(line.amountCentavos, remaining);
    remaining -= allocated;
    let status: ScheduleLineState["status"];
    if (allocated >= line.amountCentavos) status = "paid";
    else if (line.dueDate && line.dueDate < today) status = "overdue";
    else if (line.dueDate && line.dueDate === today) status = "due";
    else status = allocated > 0 ? "partial" : "upcoming";
    return { seq: line.seq, label: line.label, amountCentavos: line.amountCentavos, dueDate: line.dueDate, allocatedCentavos: allocated, status };
  });
}

/** A duplicate submission never becomes a second verified payment (07 section 9.2). */
export function findDuplicatePayment(
  payments: readonly Payment[],
  candidate: Pick<Payment, "contractId" | "amountCentavos" | "method" | "referenceNo" | "paidDate">,
): Payment | undefined {
  return payments.find(
    (existing) =>
      existing.contractId === candidate.contractId &&
      existing.status !== "rejected" &&
      existing.amountCentavos === candidate.amountCentavos &&
      existing.method === candidate.method &&
      existing.paidDate === candidate.paidDate &&
      (existing.referenceNo ?? "").trim().toLowerCase() === (candidate.referenceNo ?? "").trim().toLowerCase(),
  );
}

/** Remaining amount of a verified payment that may still be reversed or refunded. */
export function adjustableCentavos(payment: Payment): number {
  return netVerifiedCentavos(payment);
}
