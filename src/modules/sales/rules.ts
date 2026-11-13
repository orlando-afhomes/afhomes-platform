import type { Sale } from "./types";

/** Net confirmed sales value reported inside [from, to] (inclusive), by adjustment date (13 sections 4.3 and 5). */
export function confirmedValueInPeriod(sales: readonly Pick<Sale, "adjustments">[], from: string, to: string): number {
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

/**
 * Confirmed Sales Count for a period (13 section 3.1): distinct sales currently
 * Confirmed whose Finance confirmation date falls in [from, to]. A reconfirmed
 * sale is still one record, so it is never counted twice.
 */
export function confirmedCountInPeriod(sales: readonly Pick<Sale, "id" | "status" | "confirmedDate">[], from: string, to: string): number {
  const ids = new Set<string>();
  for (const sale of sales) {
    if (sale.status === "confirmed" && sale.confirmedDate && sale.confirmedDate >= from && sale.confirmedDate <= to) ids.add(sale.id);
  }
  return ids.size;
}

/**
 * Current-snapshot counts (13 section 3.1): Pending and Overall Recorded
 * (Confirmed + Pending) ignore the reporting period. Cancelled and Rejected are excluded.
 */
export function snapshotCounts(sales: readonly Pick<Sale, "id" | "status">[]): { confirmed: number; pending: number; overall: number } {
  const confirmed = new Set<string>();
  const pending = new Set<string>();
  for (const sale of sales) {
    if (sale.status === "confirmed") confirmed.add(sale.id);
    else if (sale.status === "pending") pending.add(sale.id);
  }
  return { confirmed: confirmed.size, pending: pending.size, overall: confirmed.size + pending.size };
}

/** My Sales: recorded personally by the member. */
export function mySales<T extends Sale>(sales: readonly T[], memberId: string | null): T[] {
  return memberId ? sales.filter((sale) => sale.sellerMemberId === memberId) : [];
}

/** Referred by me: sales where the member is the referrer but not the closing seller. Never added to My Sales totals. */
export function referredSales<T extends Sale>(sales: readonly T[], memberId: string | null): T[] {
  return memberId ? sales.filter((sale) => sale.referrerMemberId === memberId && sale.sellerMemberId !== memberId) : [];
}

/** Team Sales: own plus downline, using the recording-time team so transfers never move a sale. Each sale counts once. */
export function teamSales<T extends Sale>(sales: readonly T[], memberId: string | null): T[] {
  return memberId ? sales.filter((sale) => sale.team.some((entry) => entry.memberId === memberId)) : [];
}
