import type { AllowanceTotals } from "@/modules/commissions/allowances";
import type { Commission } from "@/modules/commissions/types";
import { periodRange } from "@/modules/reconciliation/rules";
import { confirmedValueInPeriod } from "@/modules/sales/rules";
import type { Sale } from "@/modules/sales/types";
import { startOfNextMonthDate } from "@/shared/lib/dates";
import { periodCollections } from "./rules";
import type { Payment } from "./types";

export type ClosedMonth = {
  month: string;
  closedAt: string;
  closedBy: string;
  recognizedSalesCentavos: number;
  grossCollectionsCentavos: number;
  adjustedCollectionsCentavos: number;
  releasedCommissionCentavos: number;
  paidCommissionCentavos: number;
  allowanceReviewCentavos: { baCentavos: number; paCentavos: number; pbCentavos: number } | null;
  allowanceReviewCount: number;
  calculationPolicy: "approved-receipt-date-v1";
};

/** Month totals frozen when a month closes (doc 08 §11.5, doc 13). The same figures the live reports use. */
export function closedMonthSnapshot(data: {
  sales: readonly Pick<Sale, "adjustments">[];
  payments: readonly Payment[];
  commissions: readonly Commission[];
  allowanceReviews: readonly { month: string; memberId: string; result: AllowanceTotals }[];
}, month: string, closedAt: string, closedBy: string): ClosedMonth {
  const range = periodRange(month);
  if (!range) throw new Error("Select a month that has ended.");
  const collections = periodCollections(data.payments, range.from, range.to);
  const released = data.commissions.filter((item) => item.releaseDate?.startsWith(month));
  const paid = data.commissions.filter((item) => item.payout?.confirmedAt && (item.payout.countedDate ?? item.payout.payoutDate).startsWith(month));
  const reviews = new Map(data.allowanceReviews.filter((item) => item.month === month).map((item) => [item.memberId, item.result]));
  const allowanceReviewCentavos = reviews.size === 0 ? null : [...reviews.values()].reduce((totals, item) => ({
    baCentavos: totals.baCentavos + item.baCentavos,
    paCentavos: totals.paCentavos + item.paCentavos,
    pbCentavos: totals.pbCentavos + item.pbCentavos,
  }), { baCentavos: 0, paCentavos: 0, pbCentavos: 0 });
  return {
    month, closedAt, closedBy,
    recognizedSalesCentavos: confirmedValueInPeriod(data.sales, range.from, range.to),
    grossCollectionsCentavos: collections.gross, adjustedCollectionsCentavos: collections.adjusted,
    releasedCommissionCentavos: released.reduce((total, item) => total + item.amountCentavos, 0),
    paidCommissionCentavos: paid.reduce((total, item) => total + item.amountCentavos, 0),
    allowanceReviewCentavos, allowanceReviewCount: reviews.size,
    calculationPolicy: "approved-receipt-date-v1",
  };
}

export function firstOpenDate(closedMonths: readonly Pick<ClosedMonth, "month">[], date: string): string {
  const closed = new Set(closedMonths.map((entry) => entry.month));
  while (closed.has(date.slice(0, 7))) {
    const next = startOfNextMonthDate(date);
    if (!next) break;
    date = next;
  }
  return date;
}
