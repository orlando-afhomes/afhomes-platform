import type { Sale } from "./types";

/** Net confirmed sales value reported inside [from, to] (inclusive), by adjustment date (13 sections 4.3 and 5). */
export function confirmedValueInPeriod(sales: readonly Sale[], from: string, to: string): number {
  let total = 0;
  for (const sale of sales) {
    for (const adjustment of sale.adjustments) {
      if (adjustment.date >= from && adjustment.date <= to) total += adjustment.amountCentavos;
    }
  }
  return total;
}

export type SalesTotals = { confirmed: number; pending: number; overall: number; confirmedCount: number; pendingCount: number };

/** Confirmed, Pending, and Overall Recorded = Confirmed + Pending. Cancelled and Rejected are excluded (13 section 3). */
export function totalsFor(sales: readonly Sale[]): SalesTotals {
  const confirmedSales = sales.filter((sale) => sale.status === "confirmed");
  const pendingSales = sales.filter((sale) => sale.status === "pending");
  const confirmed = confirmedSales.reduce((sum, sale) => sum + sale.valueCentavos, 0);
  const pending = pendingSales.reduce((sum, sale) => sum + sale.valueCentavos, 0);
  return { confirmed, pending, overall: confirmed + pending, confirmedCount: confirmedSales.length, pendingCount: pendingSales.length };
}

/** My Sales: recorded personally by the member. */
export function mySales<T extends Sale>(sales: readonly T[], memberId: string | null): T[] {
  return memberId ? sales.filter((sale) => sale.sellerMemberId === memberId) : [];
}

/** Team Sales: own plus downline, using the recording-time team so transfers never move a sale. Each sale counts once. */
export function teamSales<T extends Sale>(sales: readonly T[], memberId: string | null): T[] {
  return memberId ? sales.filter((sale) => sale.team.some((entry) => entry.memberId === memberId)) : [];
}
