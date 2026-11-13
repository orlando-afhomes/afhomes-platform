import { approvedCollectionMilestone, netVerifiedCentavos } from "@/modules/finance/rules";
import type { Payment } from "@/modules/finance/types";
import { diffCalendarDays, parseManilaDateOnly } from "@/shared/lib/dates";
import type { IgpClauses, IgpDocument, IgpDocumentKey, IgpEntry, IgpMilestones, IgpSale, IgpScheme, JadAccreditation } from "./types";

const MILLION_CENTAVOS = 100_000_000;

export function igpPriceBand(priceCentavos: number): number {
  if (!Number.isSafeInteger(priceCentavos) || priceCentavos < 1) throw new Error("Enter a valid property price.");
  const band = Math.ceil(priceCentavos / MILLION_CENTAVOS);
  if (band > 9) throw new Error("Property prices above ₱9,000,000 need an approved JA&D band code.");
  return band;
}

export function formatIgpSeriesNumber(input: {
  date: string; sequence: number; priceCentavos: number; scheme: IgpScheme; termMonths: number; clauses: IgpClauses;
}): string {
  const { date, sequence, priceCentavos, scheme, termMonths, clauses } = input;
  if (date !== date.trim() || !parseManilaDateOnly(date)) throw new Error("Enter a valid issue date.");
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 9999) throw new Error("The monthly IGP sequence is exhausted.");
  if (scheme !== "C" && scheme !== "T") throw new Error("Choose Cash or Terms.");
  if (clauses !== "S" && clauses !== "N") throw new Error("Choose Standard or Non-Standard clauses.");
  if (!Number.isInteger(termMonths) || termMonths < 1 || termMonths > 36 || (scheme === "C" && termMonths !== 1)) {
    throw new Error("Cash uses one month. Terms must be from 1 to 36 months.");
  }
  return `A${date.slice(2).replaceAll("-", "")}${String(sequence).padStart(4, "0")}${igpPriceBand(priceCentavos)}${scheme}${String(termMonths).padStart(2, "0")}${clauses}`;
}

export const IGP_DOCUMENT_LABELS: Record<IgpDocumentKey, { name: string; signedBy: string }> = {
  reservation: { name: "Reservation & Acknowledgement", signedBy: "JA&D / Buyer" },
  cts: { name: "Contract to Sell", signedBy: "Property Owner" },
  goodwill_grant: { name: "Goodwill of VIP grant", signedBy: "AFhomes" },
  deed: { name: "Deed of Absolute Sale", signedBy: "Property Owner" },
  formal_grant: { name: "Formal VIP Grant", signedBy: "AFhomes" },
  lease: { name: "Long-Term Lease Agreement", signedBy: "AFhomes" },
  spa: { name: "Special Power of Attorney", signedBy: "AFhomes" },
};

export function igpChecklist(scheme: IgpScheme, entry: IgpEntry): IgpDocument[] {
  return (Object.keys(IGP_DOCUMENT_LABELS) as IgpDocumentKey[])
    .filter((key) => (key !== "reservation" || entry === "reservation") && (!(key === "cts" || key === "goodwill_grant") || scheme === "T"))
    .map((key) => ({ key, status: "pending", signedDate: null, signers: null }));
}

export function jadAccreditationOn(records: readonly JadAccreditation[], memberId: string, date: string): JadAccreditation | undefined {
  return records.filter((record) => record.memberId === memberId && record.approvedDate <= date)
    .sort((a, b) => b.approvedDate.localeCompare(a.approvedDate))[0];
}

export function igpMilestones(
  priceCentavos: number,
  thresholdBp: number,
  payments: readonly Payment[],
): IgpMilestones {
  const reachedAt = (basisPoints: number) => approvedCollectionMilestone(priceCentavos, payments, basisPoints)?.countedDate ?? null;
  return { closedDealDate: reachedAt(thresholdBp), stage1Date: reachedAt(4_000), fullPaymentDate: reachedAt(10_000) };
}

export function isIgpDefaultReviewDue(sale: IgpSale, payments: readonly Payment[], date: string): boolean {
  if (sale.status !== "approved" || sale.fullPaymentDate) return false;
  const last = payments.filter((payment) => netVerifiedCentavos(payment) > 0)
    .reduce((latest, payment) => payment.paidDate > latest ? payment.paidDate : latest, sale.date);
  const from = parseManilaDateOnly(last);
  const to = parseManilaDateOnly(date);
  return from !== null && to !== null && diffCalendarDays(from, to) >= 90;
}
export function igpSalesReportRows(sales: readonly IgpSale[]) {
  return sales.map((sale) => ({
    id: sale.id,
    status: sale.status === "approved" ? (sale.closedDealDate ? "confirmed" : "pending") : sale.status === "pending_review" || sale.status === "replaced" ? "cancelled" : sale.status,
    confirmedDate: sale.closedDealDate,
    sellerMemberId: sale.sellerMemberId,
    team: sale.genealogy,
    adjustments: sale.adjustments,
  } as const));
}
