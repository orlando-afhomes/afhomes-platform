import type { Commission } from "@/modules/commissions/types";
import { commissionStageAmounts } from "@/modules/commissions/rules";
import type { Payment, PaymentMethod, PaymentPurpose } from "@/modules/finance/types";
import { nextOfficialReceiptNo, nextPaymentReference } from "@/modules/finance/payment-reference";
import { formatIgpSeriesNumber, igpChecklist, igpMilestones } from "@/modules/igp/rules";
import type { IgpBuyerMembership, IgpDocumentKey, IgpHistoryBatch, IgpSale, IgpScheme, JadAccreditation } from "@/modules/igp/types";
import { DEFAULT_IGP_GRANT_TIER_RULES, seedIgpCatalog } from "@/modules/igp/types";
import type { OrgMember } from "@/modules/organization/types";
import type { SeedClock } from "./anchor";
import { genealogyOf, releasedCommission, SAMPLE_IGP_RATES } from "./business";

/**
 * IGP property sales (doc 14). Project, unit and property-owner names are
 * invented and generic; they do not refer to any real development. Series
 * Numbers, milestones and staged commissions come from the IGP rule functions.
 */

type Receipt = { daysAgo: number; amountCentavos: number; purpose: PaymentPurpose; status?: Payment["status"] };

type IgpSpec = {
  key: string;
  customerId: string;
  unitId: string;
  priceCentavos: number;
  scheme: IgpScheme;
  termMonths: number;
  clauses: "S" | "N";
  seller: string;
  referrer?: string;
  dateDaysAgo: number;
  status: IgpSale["status"];
  method: PaymentMethod;
  receipts: Receipt[];
  signed?: IgpDocumentKey[];
  replaces?: string;
  reissueReason?: string;
};

const million = (value: number) => Math.round(value * 1_000_000 * 100);

const SPECS: readonly IgpSpec[] = [
  { key: "A", customerId: "cust-b9", unitId: "igp-unit-1", priceCentavos: million(4.8), scheme: "T", termMonths: 24, clauses: "S", seller: "mem-svd-b", referrer: "mem-ssm-b",
    dateDaysAgo: 105, status: "approved", method: "Bank Transfer",
    receipts: [
      { daysAgo: 105, amountCentavos: million(0.05), purpose: "reservation" },
      { daysAgo: 92, amountCentavos: million(0.43), purpose: "down_payment" },
      { daysAgo: 62, amountCentavos: million(0.96), purpose: "down_payment" },
      { daysAgo: 32, amountCentavos: million(0.48), purpose: "installment" },
      { daysAgo: 2, amountCentavos: million(0.2), purpose: "installment", status: "submitted" },
    ],
    signed: ["reservation", "cts", "goodwill_grant"] },
  { key: "B", customerId: "cust-a20", unitId: "igp-unit-3", priceCentavos: million(9.65), scheme: "C", termMonths: 1, clauses: "S", seller: "mem-svd-a",
    dateDaysAgo: 78, status: "approved", method: "Bank Transfer",
    receipts: [
      { daysAgo: 78, amountCentavos: million(0.1), purpose: "reservation" },
      { daysAgo: 71, amountCentavos: million(9.55), purpose: "full" },
    ],
    signed: ["reservation", "deed", "formal_grant"] },
  { key: "C", customerId: "cust-c7", unitId: "igp-unit-5", priceCentavos: million(2.95), scheme: "T", termMonths: 12, clauses: "S", seller: "mem-svd-c",
    dateDaysAgo: 40, status: "replaced", method: "GCash", receipts: [] },
  { key: "D", customerId: "cust-c7", unitId: "igp-unit-6", priceCentavos: million(2.95), scheme: "T", termMonths: 12, clauses: "S", seller: "mem-svd-c",
    dateDaysAgo: 30, status: "approved", method: "GCash", replaces: "C", reissueReason: "The buyer moved to the corner unit in the same phase before signing the Contract to Sell.",
    receipts: [
      { daysAgo: 40, amountCentavos: million(0.05), purpose: "reservation" },
      { daysAgo: 20, amountCentavos: million(0.245), purpose: "down_payment" },
    ],
    signed: ["reservation"] },
  { key: "E", customerId: "cust-b9", unitId: "igp-unit-2", priceCentavos: million(1.75), scheme: "T", termMonths: 36, clauses: "N", seller: "mem-ssm-b",
    dateDaysAgo: 4, status: "pending", method: "Cash",
    receipts: [{ daysAgo: 4, amountCentavos: million(0.025), purpose: "reservation", status: "submitted" }] },
];

/** JA&D accreditation (doc 14 §6): JAI or JAO, YYMM of approval, four-digit sequence. */
const JAD_HOLDERS: ReadonlyArray<{ memberId: string; daysAgo: number }> = [
  { memberId: "mem-svd-a", daysAgo: 240 },
  { memberId: "mem-svd-b", daysAgo: 230 },
  { memberId: "mem-ssm-b", daysAgo: 200 },
  { memberId: "mem-svd-c", daysAgo: 180 },
];

export type IgpSeed = {
  accreditations: JadAccreditation[];
  sales: IgpSale[];
  buyerMemberships: IgpBuyerMembership[];
  historyBatches: IgpHistoryBatch[];
  payments: Payment[];
  commissions: Commission[];
};

export function buildIgp(clock: SeedClock, members: readonly OrgMember[], existingPayments: readonly Payment[], firstPaymentId: number, firstCommissionId: number): IgpSeed {
  const catalog = seedIgpCatalog();
  const perMonth = new Map<string, number>();
  const accreditations: JadAccreditation[] = JAD_HOLDERS.map(({ memberId, daysAgo }) => {
    const approvedDate = clock.ago(daysAgo);
    const yymm = `${approvedDate.slice(2, 4)}${approvedDate.slice(5, 7)}`;
    const sequence = (perMonth.get(yymm) ?? 0) + 1;
    perMonth.set(yymm, sequence);
    return { memberId, number: `JAI${yymm}${String(sequence).padStart(4, "0")}`, approvedDate, validUntil: clock.addYears(approvedDate, 1), replaces: null };
  });

  const payments: Payment[] = [];
  const allPayments = [...existingPayments];
  const sales: IgpSale[] = [];
  const commissions: Commission[] = [];
  const sequenceByMonth = new Map<string, number>();
  let paymentId = firstPaymentId;
  let commissionId = firstCommissionId;
  const byKey = new Map<string, IgpSale>();

  for (const spec of SPECS) {
    const date = clock.ago(spec.dateDaysAgo);
    const month = date.slice(0, 7);
    const sequence = (sequenceByMonth.get(month) ?? 0) + 1;
    sequenceByMonth.set(month, sequence);
    const seriesNumber = formatIgpSeriesNumber({ date, sequence, priceCentavos: spec.priceCentavos, scheme: spec.scheme, termMonths: spec.termMonths, clauses: spec.clauses });
    const unit = catalog.units.find((item) => item.id === spec.unitId)!;
    const project = catalog.projects.find((item) => item.id === unit.projectId)!;
    const rates = [
      { memberId: spec.seller, role: "DSC" as const, rateBp: SAMPLE_IGP_RATES.DSC },
      ...(spec.referrer ? [{ memberId: spec.referrer, role: "DRI" as const, rateBp: SAMPLE_IGP_RATES.DRI }] : []),
    ];
    const jad = accreditations.find((item) => item.memberId === spec.seller)!;
    const replaced = spec.replaces ? byKey.get(spec.replaces)! : null;
    const sale: IgpSale = {
      customerId: spec.customerId, projectId: project.id, unitId: unit.id, project: project.name, unit: unit.unitOrLot, propertyOwner: unit.propertyOwner,
      priceCentavos: spec.priceCentavos, scheme: spec.scheme, termMonths: spec.termMonths, clauses: spec.clauses, sellerMemberId: spec.seller,
      referrerMemberId: spec.referrer ?? null, entry: "reservation", date, id: `igp-${seriesNumber}`, sequence, seriesNumber,
      status: spec.status, createdBy: "dev-clerk", approvedBy: spec.status === "pending" ? null : "dev-admin", thresholdBp: 1_000, adjustments: [],
      sellerJadNumber: jad.number, expiryReminders: [], genealogy: genealogyOf(members, spec.seller), commissionRates: rates, commissionReviewReason: null,
      documents: igpChecklist(spec.scheme, "reservation").map((doc) => spec.signed?.includes(doc.key)
        ? { ...doc, status: "signed" as const, signedDate: doc.key === "reservation" ? date : clock.addDays(date, doc.key === "formal_grant" ? 18 : 10), signers: doc.key === "formal_grant" ? "Buyer, AFhomes President" : "Buyer, Property Owner" }
        : doc),
      replacesId: replaced?.id ?? null, replacedById: null, refund: null, closedDealDate: null, stage1Date: null, fullPaymentDate: null,
    };
    if (replaced) replaced.replacedById = sale.id;
    byKey.set(spec.key, sale);

    const own: Payment[] = [];
    for (const item of spec.receipts) {
      const paidDate = clock.ago(item.daysAgo);
      const status = item.status ?? "verified";
      const verifiedDate = status === "verified" ? clock.addDays(paidDate, item.daysAgo > 1 ? 1 : 0) : null;
      const payment: Payment = {
        id: `pay-${paymentId++}`, contractId: sale.id, customerId: spec.customerId, saleId: sale.id, purpose: item.purpose, amountCentavos: item.amountCentavos,
        method: spec.method, paidDate, referenceNo: nextPaymentReference(allPayments, paidDate),
        documentNo: spec.method === "Cash"
          ? nextOfficialReceiptNo(allPayments, paidDate)
          : `AR-${String(77_000 + paymentId * 11).padStart(7, "0")}`,
        evidenceFileName: `igp-receipt-${paidDate.replaceAll("-", "")}.jpg`, submittedBy: "dev-clerk", submittedAt: paidDate, status,
        verifiedBy: verifiedDate ? "dev-finance" : null, verifiedAt: verifiedDate ? clock.at(verifiedDate, "14:20") : null, verifiedDate,
        decisionReason: null, adjustments: [],
        history: [
          { at: clock.at(paidDate, "10:30"), actorId: "dev-clerk", event: "PAYMENT_SUBMITTED", note: null },
          ...(verifiedDate ? [{ at: clock.at(verifiedDate, "14:20"), actorId: "dev-finance", event: "PAYMENT_VERIFIED", note: null }] : []),
          ...(replaced && item.daysAgo > spec.dateDaysAgo ? [{ at: clock.at(date, "11:00"), actorId: "dev-admin", event: "PAYMENT_MOVED", note: `Moved from ${replaced.seriesNumber} on reissue.` }] : []),
        ],
      };
      own.push(payment);
      payments.push(payment);
      allPayments.push(payment);
    }

    if (sale.status === "approved") {
      Object.assign(sale, igpMilestones(sale.priceCentavos, sale.thresholdBp, own));
      if (sale.closedDealDate) {
        sale.adjustments.push({ id: `adj-igp-${spec.key.toLowerCase()}`, date: sale.closedDealDate, amountCentavos: sale.priceCentavos,
          kind: replaced ? "reconfirmation" : "confirmation", reason: "Approved IGP collection reached the Closed Deal threshold", actorId: "system" });
      }
      for (const rate of rates) {
        const stages = commissionStageAmounts(sale.priceCentavos, rate.rateBp, "IGP");
        for (const { stage, amountCentavos } of stages) {
          const releaseDate = stage === "stage1" ? sale.stage1Date : sale.fullPaymentDate;
          if (!releaseDate || amountCentavos === 0) continue;
          commissions.push(releasedCommission(clock, {
            id: `comm-${commissionId++}`, saleId: sale.id, contractId: sale.id, member: members.find((item) => item.id === rate.memberId)!,
            basisCentavos: sale.priceCentavos, rate, amountCentavos, product: "IGP", stage, releaseDate,
          }));
        }
      }
    }
    sales.push(sale);
  }

  // Formal VIP Grant signed on the cash sale: the buyer membership record (doc 14; no Stay Points).
  const grantSale = byKey.get("B")!;
  const grantDoc = grantSale.documents.find((doc) => doc.key === "formal_grant" && doc.status === "signed");
  const tier = [...DEFAULT_IGP_GRANT_TIER_RULES].sort((a, b) => b.minPriceCentavos - a.minPriceCentavos)
    .find((rule) => grantSale.priceCentavos >= rule.minPriceCentavos)?.tier ?? null;
  grantSale.grantTier = tier;
  const buyerMemberships: IgpBuyerMembership[] = grantDoc ? [{
    id: "igp-mem-1", saleId: grantSale.id, seriesNumber: grantSale.seriesNumber, customerId: grantSale.customerId, tier,
    grantSignedDate: grantDoc.signedDate!, status: "recorded", stayPoints: "none",
  }] : [];

  // Historical IGP register imported from the company workbook (older than the platform records).
  const historyRows: IgpHistoryBatch["rows"] = [];
  const historySpecs: ReadonlyArray<{ months: number; day: number; price: number; scheme: IgpScheme; term: number; clauses: "S" | "N"; buyer: string; status: "active" | "cancelled" | "replaced"; replacementIndex?: number }> = [
    { months: 10, day: 4, price: 3.25, scheme: "T", term: 24, clauses: "S", buyer: "Hernani Bacani", status: "active" },
    { months: 10, day: 17, price: 6.1, scheme: "C", term: 1, clauses: "S", buyer: "Leticia Manzano", status: "active" },
    { months: 9, day: 8, price: 2.4, scheme: "T", term: 18, clauses: "S", buyer: "Rogelio Sumulong", status: "replaced", replacementIndex: 3 },
    { months: 9, day: 22, price: 2.4, scheme: "T", term: 12, clauses: "S", buyer: "Rogelio Sumulong", status: "active" },
    { months: 8, day: 11, price: 1.95, scheme: "T", term: 36, clauses: "N", buyer: "Amparo Liwanag", status: "cancelled" },
  ];
  const historyMonthSequence = new Map<string, number>();
  historySpecs.forEach((row, index) => {
    const date = clock.inMonth(row.months, row.day);
    const month = date.slice(0, 7);
    const sequence = (historyMonthSequence.get(month) ?? 0) + 1;
    historyMonthSequence.set(month, sequence);
    const seriesNumber = formatIgpSeriesNumber({ date, sequence, priceCentavos: million(row.price), scheme: row.scheme, termMonths: row.term, clauses: row.clauses });
    historyRows.push({
      rowNumber: index + 2, seriesNumber, date, priceCentavos: million(row.price), scheme: row.scheme, termMonths: row.term, clauses: row.clauses,
      buyerLabel: row.buyer, status: row.status, replaces: null,
    });
  });
  historySpecs.forEach(({ replacementIndex }, index) => {
    if (replacementIndex !== undefined) historyRows[index].replaces = historyRows[replacementIndex].seriesNumber;
  });
  const importedOn = clock.ago(150);
  const historyBatches: IgpHistoryBatch[] = [{
    id: "igp-hist-1", fileName: "igp-register-2026.xlsx", createdAt: clock.at(importedOn, "15:40"), createdBy: "dev-admin", status: "imported",
    totalRows: historyRows.length + 1, rows: historyRows, skipped: [{ rowNumber: historyRows.length + 2, reason: "The Series Number date does not match the sale date." }],
  }];

  return { accreditations, sales, buyerMemberships, historyBatches, payments, commissions };
}
