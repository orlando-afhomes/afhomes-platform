import type { Contract } from "@/modules/contracts/types";
import { diffCalendarDays, manilaDateOf, parseManilaDateOnly } from "@/shared/lib/dates";
import type { Payment, PaymentPurpose, ScheduleLineState } from "./types";

const PURPOSE_RANK: Record<PaymentPurpose, number> = { reservation: 0, down_payment: 1, installment: 2, full: 3 };

/** Verified amount net of reversals and refunds. Only Verified payments count (07 section 9). */
export function netVerifiedCentavos(payment: Payment): number {
  if (payment.status !== "verified") return 0;
  return Math.max(0, payment.amountCentavos - adjustmentTotalCentavos(payment.adjustments));
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
  // Verified money is applied reservation first, then down payment, installments, and a full payment (07 section 9).
  const ordered = [...contract.schedule].sort((a, b) => PURPOSE_RANK[a.purpose] - PURPOSE_RANK[b.purpose] || a.seq - b.seq);
  return ordered.map((line) => {
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

export type CollectionState = {
  verified: number;
  balance: number;
  /** Unpaid amount on lines past their due date. */
  overdue: number;
  nextDue: string | null;
  /** Whole calendar days since the oldest overdue line was due; 0 when nothing is overdue. */
  daysPastDue: number;
  /** Verified share of the contract price in whole percent, rounded down. */
  percent: number;
  state: "overdue" | "outstanding" | "settled";
};

/** Verified share of the contract price in whole percent, rounded down, for display only. */
export function collectionPercent(contract: Pick<Contract, "priceCentavos">, payments: readonly Payment[]): number {
  if (contract.priceCentavos <= 0) return 0;
  return Math.floor((totalVerifiedCentavos(payments) * 100) / contract.priceCentavos);
}

/** Whole calendar days from a due date to today (Asia/Manila); never negative. */
export function daysPastDue(dueDate: string, today: string): number {
  const due = parseManilaDateOnly(dueDate);
  const now = parseManilaDateOnly(today);
  return due && now ? Math.max(0, diffCalendarDays(due, now)) : 0;
}

/** Verified total, balance, overdue amount, next due date and state of one contract. Single source for Finance views. */
export function collectionStateFor(contract: Pick<Contract, "priceCentavos" | "schedule">, payments: readonly Payment[], today: string): CollectionState {
  const schedule = buildScheduleState(contract, payments, today);
  const overdue = schedule.filter((line) => line.status === "overdue").reduce((sum, line) => sum + (line.amountCentavos - line.allocatedCentavos), 0);
  const next = schedule.find((line) => line.status !== "paid" && line.dueDate);
  const balance = outstandingBalanceCentavos(contract, payments);
  const oldestOverdue = schedule.filter((line) => line.status === "overdue" && line.dueDate).map((line) => line.dueDate as string).sort()[0];
  return { verified: totalVerifiedCentavos(payments), balance, overdue, nextDue: next?.dueDate ?? null, daysPastDue: oldestOverdue ? daysPastDue(oldestOverdue, today) : 0, percent: collectionPercent(contract, payments), state: overdue > 0 ? "overdue" : balance === 0 ? "settled" : "outstanding" };
}

export function adjustmentTotalCentavos(adjustments: readonly { amountCentavos: number }[]): number {
  return adjustments.reduce((total, adjustment) => total + adjustment.amountCentavos, 0);
}

/** Gross verified, adjusted, and net amounts for a date range; Verified Collections are dated by verification date. */
export function periodCollections(payments: readonly Payment[], from: string, to: string): { gross: number; adjusted: number; net: number } {
  const inRange = (date: string | null | undefined) => Boolean(date) && manilaDateOf(date as string) >= from && manilaDateOf(date as string) <= to;
  const gross = payments.filter((payment) => inRange(payment.verifiedDate)).reduce((sum, payment) => sum + payment.amountCentavos, 0);
  const adjusted = adjustmentTotalCentavos(payments.flatMap((payment) => payment.adjustments).filter((adjustment) => inRange(adjustment.date)));
  return { gross, adjusted, net: gross - adjusted };
}

/** Whether adding this amount to the contract's verified payments would exceed its price (overpayment is blocked, D17). */
export function exceedsContractPrice(contract: Pick<Contract, "priceCentavos">, verifiedPayments: readonly Payment[], amountCentavos: number): boolean {
  return totalVerifiedCentavos(verifiedPayments) + amountCentavos > contract.priceCentavos;
}

export type LedgerEntry = {
  date: string;
  kind: "payment" | "reversal" | "refund";
  paymentId: string;
  label: string;
  /** Signed: payments add, reversals and refunds subtract. */
  amountCentavos: number;
  /** Net verified money after this entry. */
  netCentavos: number;
  /** Contract balance after this entry. */
  balanceCentavos: number;
};

/** Chronological ledger of verified money and its adjustments with running net and balance. Originals are never rewritten. */
export function buildCollectionLedger(contract: Pick<Contract, "priceCentavos">, payments: readonly Payment[]): LedgerEntry[] {
  const KIND_ORDER = { payment: 0, reversal: 1, refund: 1 } as const;
  const events: Omit<LedgerEntry, "netCentavos" | "balanceCentavos">[] = [];
  for (const payment of payments) {
    if (payment.status !== "verified") continue;
    const label = payment.purpose.replace(/_/g, " ");
    events.push({ date: payment.verifiedDate ?? payment.paidDate, kind: "payment", paymentId: payment.id, label, amountCentavos: payment.amountCentavos });
    for (const adjustment of payment.adjustments) events.push({ date: adjustment.date, kind: adjustment.kind, paymentId: payment.id, label, amountCentavos: -adjustment.amountCentavos });
  }
  events.sort((a, b) => a.date.localeCompare(b.date) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.paymentId.localeCompare(b.paymentId));
  let net = 0;
  return events.map((event) => {
    net += event.amountCentavos;
    return { ...event, netCentavos: net, balanceCentavos: Math.max(0, contract.priceCentavos - net) };
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
