import type { Commission } from "@/modules/commissions/types";
import { periodCollections } from "@/modules/finance/rules";
import type { Payment } from "@/modules/finance/types";
import { countedImportedReceipts, type ReceiptImportBatch } from "@/modules/imports/receipt-import";
import { confirmedValueInPeriod } from "@/modules/sales/rules";
import type { Sale } from "@/modules/sales/types";
import { manilaDateOf } from "@/shared/lib/dates";

/**
 * Source-total reconciliation (docs 11 section 26 and 12; F11.3). The platform's live totals are compared with
 * the workbook total an Administrator or Finance enters for a month. This module only reads the figures the
 * existing rules already produce (periodCollections, confirmedValueInPeriod); it never recomputes them.
 */
export const RECONCILIATION_MEASURES = ["verified_receipts", "imported_receipts", "sales_value", "commissions_payable", "commissions_paid"] as const;
export type ReconciliationMeasure = (typeof RECONCILIATION_MEASURES)[number];

export const MEASURE_LABELS: Record<ReconciliationMeasure, string> = {
  verified_receipts: "Verified receipts (net)",
  imported_receipts: "Imported receipts (signed-off batches)",
  sales_value: "Confirmed sales value (net)",
  commissions_payable: "Commissions payable (approved, unpaid)",
  commissions_paid: "Commissions paid",
};

/** One underlying record of a source total, for drill-down. Signed centavos. */
export type SourceRecord = { id: string; label: string; date: string; amountCentavos: number; note: string | null };
export type SourceTotal = { measure: ReconciliationMeasure; totalCentavos: number; records: SourceRecord[] };

export type ReconciliationDecision = "signed_off" | "explained_variance";

/** Append-only: a new entry for the same month and measure supersedes the earlier one, which stays on record. */
export type ReconciliationEntry = {
  id: string;
  /** Month as YYYY-MM. */
  period: string;
  measure: ReconciliationMeasure;
  workbookCentavos: number;
  /** Live source total at the moment of the decision, computed by the repository, never taken from the client. */
  liveCentavos: number;
  differenceCentavos: number;
  decision: ReconciliationDecision;
  reason: string | null;
  actorId: string;
  recordedAt: string;
};

export const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** First and last day of a YYYY-MM month as date-only strings, or null when the month is invalid. */
export function periodRange(period: string): { from: string; to: string } | null {
  if (!PERIOD_PATTERN.test(period)) return null;
  const [year, month] = period.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${period}-01`, to: `${period}-${String(last).padStart(2, "0")}` };
}

export type SourceData = {
  payments: readonly Payment[];
  sales: readonly Sale[];
  commissions: readonly Commission[];
  importBatches: readonly ReceiptImportBatch[];
};

const inRange = (date: string, from: string, to: string) => date >= from && date <= to;

/** Live source totals and their underlying records for one month. Money is integer centavos. */
export function computeSourceTotals(data: SourceData, period: string): SourceTotal[] {
  const range = periodRange(period);
  if (!range) throw new Error("Choose a valid month.");
  const { from, to } = range;

  const verifiedRecords: SourceRecord[] = [];
  for (const payment of data.payments) {
    if (payment.status !== "verified") continue;
    if (payment.verifiedDate && inRange(manilaDateOf(payment.verifiedDate), from, to)) {
      verifiedRecords.push({ id: payment.id, label: `Receipt ${payment.referenceNo ?? payment.id}`, date: manilaDateOf(payment.verifiedDate), amountCentavos: payment.amountCentavos, note: "Verified" });
    }
    for (const adjustment of payment.adjustments) {
      if (inRange(manilaDateOf(adjustment.date), from, to)) {
        verifiedRecords.push({ id: `${payment.id}/${adjustment.id}`, label: `Receipt ${payment.referenceNo ?? payment.id}`, date: manilaDateOf(adjustment.date), amountCentavos: -adjustment.amountCentavos, note: adjustment.kind === "reversal" ? "Reversal" : "Refund" });
      }
    }
  }

  const importedRecords = countedImportedReceipts(data.importBatches)
    .filter((receipt) => inRange(receipt.paidDate, from, to))
    .map((receipt): SourceRecord => ({ id: receipt.id, label: `Receipt ${receipt.referenceNo}`, date: receipt.paidDate, amountCentavos: receipt.amountCentavos, note: `Approved (imported), batch ${receipt.batchId}` }));

  const salesRecords: SourceRecord[] = [];
  for (const sale of data.sales) {
    for (const adjustment of sale.adjustments) {
      if (inRange(manilaDateOf(adjustment.date), from, to)) {
        salesRecords.push({ id: `${sale.id}/${adjustment.id}`, label: `Sale ${sale.id}`, date: manilaDateOf(adjustment.date), amountCentavos: adjustment.amountCentavos, note: adjustment.kind });
      }
    }
  }

  const payableRecords = data.commissions
    .filter((item) => item.status === "approved" && !item.payout?.confirmedAt && inRange(manilaDateOf(item.approvedAt), from, to))
    .map((item): SourceRecord => ({ id: item.id, label: `${item.recipientName} (${item.recipientDesignation})`, date: manilaDateOf(item.approvedAt), amountCentavos: item.amountCentavos, note: `Sale ${item.saleId}` }));

  const paidRecords = data.commissions
    .filter((item) => item.status === "paid" && item.payout && inRange(manilaDateOf(item.payout.payoutDate), from, to))
    .map((item): SourceRecord => ({ id: item.id, label: `${item.recipientName} (${item.recipientDesignation})`, date: item.payout!.payoutDate, amountCentavos: item.amountCentavos, note: `Sale ${item.saleId}` }));

  return [
    // Totals come from the existing rules so a reconciliation always agrees with the reports.
    { measure: "verified_receipts", totalCentavos: periodCollections(data.payments, from, to).net, records: verifiedRecords },
    { measure: "imported_receipts", totalCentavos: sum(importedRecords), records: importedRecords },
    { measure: "sales_value", totalCentavos: confirmedValueInPeriod(data.sales, from, to), records: salesRecords },
    { measure: "commissions_payable", totalCentavos: sum(payableRecords), records: payableRecords },
    { measure: "commissions_paid", totalCentavos: sum(paidRecords), records: paidRecords },
  ];
}

function sum(records: readonly SourceRecord[]): number {
  return records.reduce((total, record) => total + record.amountCentavos, 0);
}

export type ReconciliationDecisionInput = {
  period: string;
  measure: ReconciliationMeasure;
  workbookCentavos: number;
  decision: ReconciliationDecision;
  reason?: string | null;
};

/**
 * A difference of zero may be signed off. Any other difference may only be recorded as an explained variance
 * with a reason; a sign-off never hides a difference. Returns the problem, or null when the decision is valid.
 */
export function validateReconciliationDecision(input: ReconciliationDecisionInput, liveCentavos: number): string | null {
  if (!periodRange(input.period)) return "Choose a valid month.";
  if (!(RECONCILIATION_MEASURES as readonly string[]).includes(input.measure)) return "Choose a valid measure.";
  if (!Number.isInteger(input.workbookCentavos) || input.workbookCentavos < 0) return "Enter the workbook total as an amount of zero or more.";
  const difference = input.workbookCentavos - liveCentavos;
  const reason = input.reason?.trim() ?? "";
  if (input.decision === "signed_off") return difference === 0 ? null : "Only matching totals can be signed off. Record an explained variance instead.";
  if (input.decision !== "explained_variance") return "Choose sign-off or explained variance.";
  if (difference === 0) return "The totals match. Sign them off instead.";
  if (reason.length < 5) return "Explain the difference. A reason is required.";
  if (reason.length > 500) return "The reason must be 500 characters or fewer.";
  return null;
}

/** Latest entry per month and measure; earlier entries stay in the history. */
export function latestEntry(entries: readonly ReconciliationEntry[], period: string, measure: ReconciliationMeasure): ReconciliationEntry | undefined {
  return [...entries].reverse().find((entry) => entry.period === period && entry.measure === measure);
}
