import { approvedCollectionMilestone, netVerifiedCentavos } from "@/modules/finance/rules";
import type { Payment } from "@/modules/finance/types";
import { diffCalendarDays, parseManilaDateOnly } from "@/shared/lib/dates";
import type { VipTierCode } from "@/modules/vip/types";
import type { IgpClauses, IgpDocument, IgpDocumentKey, IgpEntry, IgpGrantTierRule, IgpMilestones, IgpSale, IgpScheme, JadAccreditation } from "./types";

const MILLION_CENTAVOS = 100_000_000;

/** Whole millions rounded up, 1 to 9. Owner decision 2026-11-22: band 0 means "above ₱9,000,000"; the exact price stays on the sale. */
export function igpPriceBand(priceCentavos: number): number {
  if (!Number.isSafeInteger(priceCentavos) || priceCentavos < 1) throw new Error("Enter a valid property price.");
  const band = Math.ceil(priceCentavos / MILLION_CENTAVOS);
  return band > 9 ? 0 : band;
}

/** The highest card level whose minimum price the contract price reaches, or null below the lowest minimum. */
export function igpGrantTier(priceCentavos: number, rules: readonly IgpGrantTierRule[]): VipTierCode | null {
  return [...rules].sort((a, b) => b.minPriceCentavos - a.minPriceCentavos).find((rule) => priceCentavos >= rule.minPriceCentavos)?.tier ?? null;
}

/** Minimums must be positive whole centavos and rise with the card level, in the order given (Bronze, Silver, Gold). */
export function grantTierRulesProblem(rules: readonly IgpGrantTierRule[]): string | null {
  if (rules.length === 0) return "Enter at least one card level.";
  if (new Set(rules.map(({ tier }) => tier)).size !== rules.length) return "Each card level can appear only once.";
  if (rules.some(({ minPriceCentavos }) => !Number.isSafeInteger(minPriceCentavos) || minPriceCentavos < 1)) return "Enter a minimum price above zero for every card level.";
  for (let index = 1; index < rules.length; index += 1) {
    if (rules[index].minPriceCentavos <= rules[index - 1].minPriceCentavos) return "A higher card level needs a higher minimum price.";
  }
  return null;
}

export function formatIgpSeriesNumber(input: {
  date: string; sequence: number; priceCentavos: number; scheme: IgpScheme; termMonths: number; clauses: IgpClauses;
}): string {
  const { date, sequence, priceCentavos, scheme, termMonths, clauses } = input;
  if (date !== date.trim() || !parseManilaDateOnly(date)) throw new Error("Enter a valid issue date.");
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 9999) throw new Error("The monthly property sale (IGP) sequence is exhausted.");
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

/** Plain exclusion shown on every IGP buyer membership (owner ruling 2026-11-23; doc 09 belongs to VIP memberships). */
export const IGP_BUYER_NO_POINTS_COPY =
  "No Stay Points are credited to this membership. The Formal VIP Grant benefits are not defined in any company paper; Stay Points (doc 09) belong to VIP memberships only.";

export type IgpSeriesSegments = {
  datePart: string;
  sequence: number;
  band: number;
  scheme: IgpScheme;
  termMonths: number;
  clauses: IgpClauses;
};

/**
 * Parses a 16-character IGP Series Number into its segments (doc 14 section 5.1; band 0 above ₱9,000,000).
 * Throws a plain message naming the faulty segment. Accepts surrounding spaces; the number itself has none.
 */
export function parseIgpSeriesNumber(raw: string): IgpSeriesSegments {
  const value = raw.trim().toUpperCase();
  if (value.length !== 16) throw new Error(`Enter a 16-character Series Number (got ${value.length} characters).`);
  if (!value.startsWith("A")) throw new Error("A platform Series Number starts with A (JA&D's own-channel sales stay in JA&D's books).");
  const datePart = `20${value.slice(1, 3)}-${value.slice(3, 5)}-${value.slice(5, 7)}`;
  if (!parseManilaDateOnly(datePart)) throw new Error(`The date part ${value.slice(1, 7)} is not a real YYMMDD date.`);
  if (!/^\d{4}$/.test(value.slice(7, 11)) || value.slice(7, 11) === "0000") throw new Error("The monthly sequence must be digits from 0001 to 9999.");
  if (!/^[0-9]$/.test(value[11])) throw new Error("The price band must be one digit (0 stands for a price above ₱9,000,000).");
  if (value[12] !== "C" && value[12] !== "T") throw new Error("The payment scheme must be C (Cash) or T (Terms).");
  const termMonths = Number(value.slice(13, 15));
  if (!Number.isInteger(termMonths) || termMonths < 1 || termMonths > 36 || (value[12] === "C" && termMonths !== 1)) {
    throw new Error("Cash uses one month (01). Terms must be from 01 to 36.");
  }
  if (value[15] !== "S" && value[15] !== "N") throw new Error("The clause flag must be S (Standard) or N (Non-Standard).");
  return { datePart, sequence: Number(value.slice(7, 11)), band: Number(value[11]), scheme: value[12], termMonths, clauses: value[15] };
}

/** Plain-language reason a Series Number is not acceptable, or null when it is. */
export function igpSeriesNumberProblem(raw: string): string | null {
  try {
    parseIgpSeriesNumber(raw);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Enter a valid Series Number.";
  }
}

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

export type JadPrefix = "JAI" | "JAO";
export const JAD_PREFIXES: ReadonlyArray<{ value: JadPrefix; label: string }> = [
  { value: "JAI", label: "Internal Seller (IST) accreditation (JAI)" },
  { value: "JAO", label: "Outsourced Seller (OST) accreditation (JAO)" },
];

/** Starting choice only: IST sellers (SVD, SSM, SM) get JAI and OST sellers get JAO. Staff can change it. */
export function defaultJadPrefix(designation: string | undefined): JadPrefix | "" {
  return !designation ? "" : designation === "OST" ? "JAO" : "JAI";
}

/** The YYMM part of a JA&D number comes from the approval date (date-only, no timezone shift). */
export function jadYearMonth(approvedDate: string): string | null {
  return approvedDate === approvedDate.trim() && parseManilaDateOnly(approvedDate) ? `${approvedDate.slice(2, 4)}${approvedDate.slice(5, 7)}` : null;
}

/** JA&D issues the last four digits; the system never invents them (doc 14 §3, §6.1). */
export function buildJadNumber(input: { prefix: JadPrefix | ""; approvedDate: string; sequence: string }): string {
  const { prefix, approvedDate, sequence } = input;
  if (prefix !== "JAI" && prefix !== "JAO") throw new Error("Choose the accreditation type.");
  const yearMonth = jadYearMonth(approvedDate);
  if (!yearMonth) throw new Error("Enter a valid JA&D approval date.");
  if (!/^\d{4}$/.test(sequence)) throw new Error("Type the last 4 digits from the JA&D paper (digits only).");
  return `${prefix}${yearMonth}${sequence}`;
}

/** Plain-language reason a JA&D number is not acceptable for this approval date, or null when it is. */
export function jadNumberProblem(number: string, approvedDate: string): string | null {
  const yearMonth = jadYearMonth(approvedDate);
  if (!/^JA[IO]\d{8}$/.test(number) || !/^(0[1-9]|1[0-2])$/.test(number.slice(5, 7)) || number.slice(7) === "0000") {
    return "Enter a JA&D number in JAI or JAO format followed by YYMM and four sequence digits.";
  }
  if (yearMonth && number.slice(3, 7) !== yearMonth) return `The year and month in the number (${number.slice(3, 7)}) must match the approval date (${yearMonth}).`;
  return null;
}

export function isValidJadNumber(number: string, approvedDate: string): boolean {
  return jadYearMonth(approvedDate) !== null && jadNumberProblem(number, approvedDate) === null;
}

export const IGP_PROJECT_NAME_MAX = 80;
export const IGP_LOCATION_MAX = 80;
export const IGP_UNIT_MAX = 40;
export const IGP_OWNER_MAX = 80;

/** Trims and collapses spaces; throws a plain message when empty or too long. */
export function cleanCatalogText(raw: string, label: string, max: number): string {
  const value = raw.trim().replace(/\s+/g, " ");
  if (!value) throw new Error(`Enter the ${label}.`);
  if (value.length > max) throw new Error(`The ${label} must be ${max} characters or fewer.`);
  return value;
}
