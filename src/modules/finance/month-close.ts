import { startOfNextMonthDate } from "@/shared/lib/dates";

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

export function firstOpenDate(closedMonths: readonly Pick<ClosedMonth, "month">[], date: string): string {
  const closed = new Set(closedMonths.map((entry) => entry.month));
  while (closed.has(date.slice(0, 7))) {
    const next = startOfNextMonthDate(date);
    if (!next) break;
    date = next;
  }
  return date;
}
