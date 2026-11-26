import "server-only";
import type { Contract } from "@/modules/contracts/types";
import type { Commission, CommissionClawback, CommissionPayoutList, CommissionRateSetting, VipPositionRate } from "@/modules/commissions/types";
import type { AllowanceReview, AllowanceReviewInput } from "@/modules/commissions/allowances";
import type { Customer, CustomerStatus } from "@/modules/customers/types";
import type { Payment, PaymentAdjustment } from "@/modules/finance/types";
import type { OrgMember } from "@/modules/organization/types";
import type { Sale } from "@/modules/sales/types";
import { dbRead, listAll } from "@/server/db";
import { centavosToInt64, int64ToCentavos } from "@/server/money";
import { manilaDateOf } from "@/shared/lib/dates";
import { normalizePhilippineMobile } from "@/shared/utils/input-sanitizers";

type Json = Record<string, unknown>;
type Ref = { id: string } | null;

/** The database returns UUIDs without hyphens. Accept both spellings from callers and normalise. */
export function normalizeId(value: string): string | null {
  const bare = value.replaceAll("-", "").toLowerCase();
  return /^[0-9a-f]{32}$/.test(bare) ? bare : null;
}

// ---------------------------------------------------------------- customers
export type CustomerRow = {
  id: string; displayName: string; branchId: string; status: string; customerNumber: string | null; profile: Json | null; ownerMember: Ref;
  normalizedEmail: string | null; normalizedMobile: string | null; normalizedName: string | null; dateOfBirth: string | null;
};
export const CUSTOMER_FIELDS = "id displayName branchId status customerNumber profile normalizedEmail normalizedMobile normalizedName dateOfBirth ownerMember { id }";

export function toCustomer(row: CustomerRow): Customer {
  const profile = row.profile ?? {};
  return {
    ...profile,
    id: row.id,
    displayName: row.displayName,
    branchId: row.branchId,
    ownerMemberId: row.ownerMember?.id ?? null,
    status: row.status as CustomerStatus,
    // A draft keeps its requested manual ID in the profile so it never occupies the official unique column.
    customerNumber: row.customerNumber ?? (typeof profile.customerNumber === "string" ? profile.customerNumber : null),
  } as Customer;
}

/** Splits a customer into the indexed columns and the jsonb `profile` for everything else. */
export function customerColumns(customer: Customer) {
  const { id: _id, displayName, branchId, ownerMemberId, status, customerNumber, ...rest } = customer;
  void _id;
  const profile: Record<string, unknown> = { ...rest };
  // A draft's requested number stays in the profile; only submission consumes the official Customer ID column.
  if (status === "draft") profile.customerNumber = customerNumber ?? undefined;
  // The primary ID image is stored as server-side metadata (`identityFile`); the client URL never enters jsonb.
  profile.governmentIdImage = undefined;
  const email = typeof profile.email === "string" ? profile.email.trim().toLowerCase() : "";
  const mobile = typeof profile.mobileNumber === "string" ? profile.mobileNumber.trim() : "";
  const firstName = typeof profile.firstName === "string" ? profile.firstName.trim().toLowerCase() : "";
  const lastName = typeof profile.lastName === "string" ? profile.lastName.trim().toLowerCase() : "";
  return {
    columns: {
      displayName,
      branchId,
      ownerMemberId: ownerMemberId ?? undefined,
      status,
      customerNumber: status === "draft" ? undefined : customerNumber ?? undefined,
      normalizedEmail: email || undefined,
      normalizedMobile: mobile ? normalizePhilippineMobile(mobile) : undefined,
      normalizedName: firstName && lastName ? `${firstName}|${lastName}` : undefined,
      dateOfBirth: typeof profile.dateOfBirth === "string" && profile.dateOfBirth.trim() ? profile.dateOfBirth.trim() : undefined,
    },
    profile: Object.fromEntries(Object.entries(profile).filter(([, value]) => value !== undefined)),
  };
}

export async function loadCustomers(): Promise<Customer[]> {
  return (await listAll<CustomerRow>("customers", CUSTOMER_FIELDS)).map(toCustomer);
}

export async function loadCustomer(id: string): Promise<Customer | null> {
  const result = await dbRead<{ customer: CustomerRow | null }>(`query($id: UUID!) { customer(id: $id) { ${CUSTOMER_FIELDS} } }`, { id });
  return result.customer ? toCustomer(result.customer) : null;
}

/** Customers holding one of these official Customer IDs (manual duplicate validation). */
export async function loadCustomersByNumbers(numbers: readonly string[]): Promise<Customer[]> {
  const wanted = numbers.map((number) => number.trim()).filter(Boolean);
  if (wanted.length === 0) return [];
  return (await listAll<CustomerRow>("customers", CUSTOMER_FIELDS, { where: "{ customerNumber: { in: $numbers } }", variableDefinitions: "$numbers: [String!]!", variables: { numbers: wanted } })).map(toCustomer);
}

/**
 * Customers that may be the same person as an import row, found through the indexed identity
 * columns (doc 04 section 14). Only candidates are returned; the import classifier makes the
 * final flag, so a shared name with a different birth date is harmless.
 */
export async function loadCustomerDuplicateCandidates(input: { emails: readonly string[]; mobiles: readonly string[]; names: readonly string[] }): Promise<Customer[]> {
  const conditions: string[] = [];
  const variables: Record<string, unknown> = {};
  if (input.emails.length > 0) { conditions.push("normalizedEmail: { in: $emails }"); variables.emails = [...input.emails]; }
  if (input.mobiles.length > 0) { conditions.push("normalizedMobile: { in: $mobiles }"); variables.mobiles = [...input.mobiles]; }
  if (input.names.length > 0) { conditions.push("normalizedName: { in: $names }"); variables.names = [...input.names]; }
  if (conditions.length === 0) return [];
  const definitions = [
    input.emails.length > 0 ? "$emails: [String!]!" : "",
    input.mobiles.length > 0 ? "$mobiles: [String!]!" : "",
    input.names.length > 0 ? "$names: [String!]!" : "",
  ].filter(Boolean).join(", ");
  return (await listAll<CustomerRow>("customers", CUSTOMER_FIELDS, {
    where: `{ _or: [${conditions.map((condition) => `{ ${condition} }`).join(", ")}] }`,
    variableDefinitions: definitions,
    variables,
  })).map(toCustomer);
}

/** Highest official Customer ID already issued for a year, as text (`YYYY-NNNN`). */
export async function highestCustomerNumberForYear(year: string): Promise<string | null> {
  const result = await dbRead<{ customers: Array<{ customerNumber: string | null }> }>(
    `query($prefix: String!) { customers(where: { customerNumber: { startsWith: $prefix } }, orderBy: [{ customerNumber: DESC }], limit: 1) { customerNumber } }`,
    { prefix: `${year}-` },
  );
  return result.customers[0]?.customerNumber ?? null;
}

// ---------------------------------------------------------------- contracts
export type ContractRow = {
  id: string; productCode: string; priceCentavos: string; classification: string; status: string; raNumber: string | null; vipNumber: string | null;
  signedAgreementRecordedDate: string | null; createdAt: string; collectionVersion: number; details: Json | null; customer: Ref; sellerMember: Ref;
};
export const CONTRACT_FIELDS = "id productCode priceCentavos classification status raNumber vipNumber signedAgreementRecordedDate createdAt collectionVersion details customer { id } sellerMember { id }";

export function toContract(row: ContractRow): Contract {
  const contract = {
    ...(row.details ?? {}),
    id: row.id, customerId: row.customer?.id, productCode: row.productCode, priceCentavos: int64ToCentavos(row.priceCentavos),
    classification: row.classification, status: row.status, raNumber: row.raNumber, sellerMemberId: row.sellerMember?.id ?? null,
    createdAt: manilaDateOf(row.createdAt),
    ...(row.vipNumber ? { vipNumber: row.vipNumber } : {}),
    ...(row.signedAgreementRecordedDate ? { signedAgreementRecordedDate: row.signedAgreementRecordedDate } : {}),
  };
  return contract as unknown as Contract;
}

/** Columns for a contract write; the remaining domain fields travel in `details`. */
export function contractColumns(contract: Contract) {
  const { id: _id, customerId, productCode, priceCentavos, classification, status, raNumber, vipNumber, signedAgreementRecordedDate, sellerMemberId, createdAt: _created, ...details } = contract;
  void _id; void _created;
  return {
    columns: { customerId, productCode, priceCentavos: centavosToInt64(priceCentavos), classification, status, raNumber: raNumber ?? null, vipNumber: vipNumber ?? null, signedAgreementRecordedDate: signedAgreementRecordedDate ?? null, sellerMemberId: sellerMemberId ?? null },
    details,
  };
}

export async function loadContract(id: string): Promise<{ contract: Contract; version: number } | null> {
  const result = await dbRead<{ contract: ContractRow | null }>(`query($id: UUID!) { contract(id: $id) { ${CONTRACT_FIELDS} } }`, { id });
  return result.contract ? { contract: toContract(result.contract), version: result.contract.collectionVersion } : null;
}

// ---------------------------------------------------------------- payments
export type PaymentRow = {
  id: string; purpose: string; amountCentavos: string; method: string; paidDate: string; countedDate: string | null; referenceNo: string | null; documentNo: string | null;
  status: string; submittedAt: string; verifiedAt: string | null; verifiedDate: string | null; decisionReason: string | null; details: Json | null;
  contract: Ref; customer: Ref; submittedBy: Ref; verifiedBy: Ref;
};
export const PAYMENT_FIELDS = "id purpose amountCentavos method paidDate countedDate referenceNo documentNo status submittedAt verifiedAt verifiedDate decisionReason details contract { id } customer { id } submittedBy { id } verifiedBy { id }";

/** Where a receipt file lives. Server-only: the storage path never leaves the API. */
export type PaymentEvidenceMeta = { fileId: string; storagePath: string; fileName: string; size: number; contentType: string; uploadedBy: string; uploadedAt: string };

export function paymentEvidenceOf(details: Json | null): PaymentEvidenceMeta | null {
  const evidence = (details as { evidence?: Partial<PaymentEvidenceMeta> } | null)?.evidence;
  if (!evidence?.fileId || !evidence.storagePath || !evidence.contentType) return null;
  return evidence as PaymentEvidenceMeta;
}

export function toPayment(row: PaymentRow, saleId: string | null, adjustments: PaymentAdjustment[] = []): Payment {
  // The internal evidence pointer stays on the server; the view builds its private URL separately.
  // `adjustments` are read from their insert-only table, not from older `details` copies.
  const { evidence: _evidence, adjustments: _detailsAdjustments, ...details } = (row.details ?? {}) as Record<string, unknown>;
  void _evidence; void _detailsAdjustments;
  return {
    adjustments, history: [], evidenceFileName: null,
    ...details,
    id: row.id, contractId: row.contract?.id, customerId: row.customer?.id, saleId, purpose: row.purpose, amountCentavos: int64ToCentavos(row.amountCentavos),
    method: row.method, paidDate: row.paidDate, ...(row.countedDate ? { countedDate: row.countedDate } : {}), referenceNo: row.referenceNo, documentNo: row.documentNo,
    status: row.status, submittedBy: row.submittedBy?.id ?? "", submittedAt: row.submittedAt, verifiedBy: row.verifiedBy?.id ?? null, verifiedAt: row.verifiedAt,
    verifiedDate: row.verifiedDate, decisionReason: row.decisionReason,
  } as unknown as Payment;
}

type PaymentAdjustmentRow = { id: string; payment: Ref; kind: string; amountCentavos: string; date: string; reason: string; actor: Ref };
const PAYMENT_ADJUSTMENT_FIELDS = "id payment { id } kind amountCentavos date reason actor { id }";
const toPaymentAdjustment = (row: PaymentAdjustmentRow): PaymentAdjustment => ({
  id: row.id, kind: row.kind === "refund" ? "refund" : "reversal", amountCentavos: int64ToCentavos(row.amountCentavos), date: row.date, reason: row.reason, actorId: row.actor?.id ?? "",
});

/** Reversals and refunds grouped by payment; one query for a list, one for a single payment. */
export async function loadPaymentAdjustments(paymentIds?: readonly string[]): Promise<Map<string, PaymentAdjustment[]>> {
  const rows = await listAll<PaymentAdjustmentRow>("paymentAdjustments", PAYMENT_ADJUSTMENT_FIELDS, { orderBy: "[{ createdAt: ASC }, { id: ASC }]" });
  const grouped = new Map<string, PaymentAdjustment[]>();
  for (const row of rows) {
    const paymentId = row.payment?.id;
    if (!paymentId || (paymentIds && !paymentIds.includes(paymentId))) continue;
    grouped.set(paymentId, [...(grouped.get(paymentId) ?? []), toPaymentAdjustment(row)]);
  }
  return grouped;
}

export async function loadPayment(id: string): Promise<Payment | null> {
  const result = await dbRead<{ payment: PaymentRow | null }>(`query($id: UUID!) { payment(id: $id) { ${PAYMENT_FIELDS} } }`, { id });
  if (!result.payment) return null;
  const sale = await loadSaleForContract(result.payment.contract!.id);
  const adjustments = (await loadPaymentAdjustments([id])).get(id) ?? [];
  return toPayment(result.payment, sale?.sale.id ?? null, adjustments);
}

export async function loadPaymentsOfContract(contractId: string, saleId: string | null): Promise<Payment[]> {
  const rows = await listAll<PaymentRow>("payments", PAYMENT_FIELDS, { where: "{ contract: { id: { eq: $c } } }", orderBy: "[{ submittedAt: ASC }, { id: ASC }]", variableDefinitions: "$c: UUID!", variables: { c: contractId } });
  const adjustments = await loadPaymentAdjustments(rows.map((row) => row.id));
  return rows.map((row) => toPayment(row, saleId, adjustments.get(row.id) ?? []));
}

// ---------------------------------------------------------------- sales
export type SaleRow = {
  id: string; productCode: string; branchId: string; valueCentavos: string; recordedDate: string; status: string; approvedAt: string | null; confirmedDate: string | null; financialHold: boolean;
  details: Json | null; contract: Ref; customer: Ref; sellerMember: Ref; referrerMember: Ref; approvedBy: Ref;
};
export const SALE_FIELDS = "id productCode branchId valueCentavos recordedDate status approvedAt confirmedDate financialHold details contract { id } customer { id } sellerMember { id } referrerMember { id } approvedBy { id }";
type AdjustmentRow = { id: string; date: string; amountCentavos: string; kind: string; reason: string; actor: Ref };

export function toSale(row: SaleRow, adjustments: AdjustmentRow[]): Sale {
  return {
    team: [],
    ...(row.details ?? {}),
    id: row.id, contractId: row.contract?.id, customerId: row.customer?.id, productCode: row.productCode, branchId: row.branchId, valueCentavos: int64ToCentavos(row.valueCentavos),
    recordedDate: row.recordedDate, approval: row.approvedAt && row.approvedBy ? { approvedAt: row.approvedAt, approvedBy: row.approvedBy.id } : null,
    sellerMemberId: row.sellerMember?.id ?? null, referrerMemberId: row.referrerMember?.id ?? null, status: row.status, confirmedDate: row.confirmedDate,
    financialHold: row.financialHold,
    adjustments: adjustments.map((item) => ({ id: item.id, date: item.date, amountCentavos: int64ToCentavos(item.amountCentavos), kind: item.kind, reason: item.reason, actorId: item.actor?.id ?? "" })),
  } as unknown as Sale;
}

async function adjustmentsOf(saleId: string): Promise<AdjustmentRow[]> {
  return listAll<AdjustmentRow>("saleAdjustments", "id date amountCentavos kind reason actor { id }", { where: "{ sale: { id: { eq: $s } } }", orderBy: "[{ createdAt: ASC }, { id: ASC }]", variableDefinitions: "$s: UUID!", variables: { s: saleId } });
}

export async function loadSale(id: string): Promise<Sale | null> {
  const result = await dbRead<{ sale: SaleRow | null }>(`query($id: UUID!) { sale(id: $id) { ${SALE_FIELDS} } }`, { id });
  return result.sale ? toSale(result.sale, await adjustmentsOf(result.sale.id)) : null;
}

export async function loadSaleForContract(contractId: string): Promise<{ sale: Sale } | null> {
  const result = await dbRead<{ sales: SaleRow[] }>(`query($c: UUID!) { sales(where: { contract: { id: { eq: $c } } }, limit: 1) { ${SALE_FIELDS} } }`, { c: contractId });
  const row = result.sales[0];
  return row ? { sale: toSale(row, await adjustmentsOf(row.id)) } : null;
}

export async function loadContractsOfCustomer(customerId: string): Promise<Contract[]> {
  const rows = await listAll<ContractRow>("contracts", CONTRACT_FIELDS, { where: "{ customer: { id: { eq: $c } } }", variableDefinitions: "$c: UUID!", variables: { c: customerId } });
  return rows.map(toContract);
}

export async function loadVerifiedPayments(): Promise<Payment[]> {
  const rows = await listAll<PaymentRow>("payments", PAYMENT_FIELDS, { where: `{ status: { eq: "verified" } }` });
  const adjustments = await loadPaymentAdjustments(rows.map((row) => row.id));
  return rows.map((row) => toPayment(row, null, adjustments.get(row.id) ?? []));
}

/** Payments whose reference or document number starts with a prefix (used to find the next free number). */
export async function loadNumbersWithPrefix(prefix: string): Promise<Array<{ referenceNo: string | null; documentNo: string | null }>> {
  return listAll("payments", "referenceNo documentNo", { where: "{ _or: [{ referenceNo: { startsWith: $p } }, { documentNo: { startsWith: $p } }] }", variableDefinitions: "$p: String!", variables: { p: prefix } });
}

/** Payments that already hold this exact number as a reference or a document number. */
export async function loadNumberHolders(number: string): Promise<Array<{ id: string; referenceNo: string | null; documentNo: string | null }>> {
  const result = await dbRead<{ payments: Array<{ id: string; referenceNo: string | null; documentNo: string | null }> }>(
    `query($n: String!) { payments(where: { _or: [{ referenceNo: { eq: $n } }, { documentNo: { eq: $n } }] }) { id referenceNo documentNo } }`, { n: number });
  return result.payments;
}

// ---------------------------------------------------------------- members (full record)
type FullMemberRow = { id: string; displayName: string; designation: string; branchId: string; status: string; teamName: string | null; referralCode: string | null; aaNumber: string | null; clawbackAddendumSignedDate: string | null; details: Json | null; parent: Ref };

/** Complete member records as the screens expect them. Record scope uses the lighter `loadScopeMembers`. */
export async function loadMembersFull(): Promise<OrgMember[]> {
  const rows = await listAll<FullMemberRow>("members", "id displayName designation branchId status teamName referralCode aaNumber clawbackAddendumSignedDate details parent { id }");
  return rows.map((row) => ({
    ...(row.details ?? {}), id: row.id, displayName: row.displayName, designation: row.designation, branchId: row.branchId, status: row.status, parentId: row.parent?.id ?? null,
    teamName: row.teamName, referralCode: row.referralCode, aaNumber: row.aaNumber, clawbackAddendumSignedDate: row.clawbackAddendumSignedDate ?? null,
  })) as unknown as OrgMember[];
}

// ---------------------------------------------------------------- commissions (F6)
type CommissionRow = {
  id: string; product: string; role: string; stage: string; recipientName: string; recipientDesignation: string;
  basisCentavos: string; percentBp: number; amountCentavos: string; releaseDate: string | null; status: string;
  approvedAt: string | null; holdTrigger: string | null; holdReason: string | null; releaseRestorable: boolean | null; rereleaseAfter: string | null;
  payoutReference: string | null; payoutMethod: string | null; payoutDate: string | null; payoutCountedDate: string | null;
  payoutInitiatedAt: string | null; payoutConfirmedAt: string | null; payoutEvidenceFileName: string | null;
  payoutEvidence: Json | null; voidedPayouts: Json | null; history: Json | null;
  sale: Ref; igpSale: Ref; contract: Ref; recipientMember: Ref; approvedBy: Ref; payoutProcessedBy: Ref;
};
export const COMMISSION_FIELDS = [
  "id product role stage recipientName recipientDesignation basisCentavos percentBp amountCentavos releaseDate status approvedAt",
  "holdTrigger holdReason releaseRestorable rereleaseAfter payoutReference payoutMethod payoutDate payoutCountedDate",
  "payoutInitiatedAt payoutConfirmedAt payoutEvidenceFileName payoutEvidence voidedPayouts history",
  "sale { id } igpSale { id } contract { id } recipientMember { id } approvedBy { id } payoutProcessedBy { id }",
].join(" ");

export function toCommission(row: CommissionRow): Commission {
  return {
    id: row.id, saleId: row.sale?.id ?? row.igpSale?.id ?? "", contractId: row.contract?.id ?? "",
    recipientMemberId: row.recipientMember?.id ?? "", recipientName: row.recipientName, recipientDesignation: row.recipientDesignation,
    basisCentavos: int64ToCentavos(row.basisCentavos), percentBp: row.percentBp, amountCentavos: int64ToCentavos(row.amountCentavos),
    product: row.product as Commission["product"], role: row.role as Commission["role"], stage: row.stage as Commission["stage"],
    ...(row.releaseDate ? { releaseDate: row.releaseDate } : {}),
    status: row.status as Commission["status"], approvedBy: row.approvedBy?.id ?? "", approvedAt: row.approvedAt ?? "",
    holdTrigger: (row.holdTrigger as Commission["holdTrigger"]) ?? undefined, holdReason: row.holdReason,
    ...(row.releaseRestorable ? { releaseRestorable: true } : {}), ...(row.rereleaseAfter ? { rereleaseAfter: row.rereleaseAfter } : {}),
    payout: row.payoutReference && row.payoutDate ? {
      reference: row.payoutReference, method: row.payoutMethod, payoutDate: row.payoutDate,
      ...(row.payoutCountedDate ? { countedDate: row.payoutCountedDate } : {}),
      processedBy: row.payoutProcessedBy?.id ?? "", initiatedAt: row.payoutInitiatedAt ?? "", confirmedAt: row.payoutConfirmedAt,
      evidenceFileName: row.payoutEvidenceFileName, evidenceFileDataUrl: (row.payoutEvidence as { dataUrl?: string | null } | null)?.dataUrl ?? null,
    } : null,
    previousPayouts: (row.voidedPayouts as unknown as Commission["previousPayouts"]) ?? [],
    history: (row.history as unknown as Commission["history"]) ?? [],
  };
}

/** Database columns for one commission row; domain extras travel in the mapped columns above. */
export function commissionColumns(commission: Commission) {
  return {
    saleId: commission.product === "IGP" ? undefined : commission.saleId,
    igpSaleId: commission.product === "IGP" ? commission.saleId : undefined,
    contractId: commission.product === "IGP" ? undefined : commission.contractId,
    recipientMemberId: commission.recipientMemberId,
    recipientName: commission.recipientName,
    recipientDesignation: commission.recipientDesignation,
    product: commission.product, role: commission.role, stage: commission.stage,
    basisCentavos: centavosToInt64(commission.basisCentavos), percentBp: commission.percentBp, amountCentavos: centavosToInt64(commission.amountCentavos),
    releaseDate: commission.releaseDate ?? null,
    status: commission.status,
    approvedById: commission.approvedBy || undefined,
    approvedAt: commission.approvedAt || null,
    holdTrigger: commission.holdTrigger ?? null,
    holdReason: commission.holdReason ?? null,
    releaseRestorable: Boolean(commission.releaseRestorable),
    rereleaseAfter: commission.rereleaseAfter ?? null,
    payoutReference: commission.payout?.reference ?? null,
    payoutMethod: commission.payout?.method ?? null,
    payoutDate: commission.payout?.payoutDate ?? null,
    payoutCountedDate: commission.payout?.countedDate ?? null,
    payoutProcessedById: commission.payout?.processedBy || undefined,
    payoutInitiatedAt: commission.payout?.initiatedAt ?? null,
    payoutConfirmedAt: commission.payout?.confirmedAt ?? null,
    payoutEvidenceFileName: commission.payout?.evidenceFileName ?? null,
    payoutEvidence: commission.payout?.evidenceFileDataUrl ? { dataUrl: commission.payout.evidenceFileDataUrl } : null,
    voidedPayouts: commission.previousPayouts ?? [],
    history: commission.history ?? [],
  };
}

export async function loadCommission(id: string): Promise<Commission | null> {
  const result = await dbRead<{ commission: CommissionRow | null }>(`query($id: UUID!) { commission(id: $id) { ${COMMISSION_FIELDS} } }`, { id });
  return result.commission ? toCommission(result.commission) : null;
}

export async function loadCommissionsOfSale(saleId: string): Promise<Commission[]> {
  const [vip, igp] = await Promise.all([
    listAll<CommissionRow>("commissions", COMMISSION_FIELDS, { where: "{ sale: { id: { eq: $s } } }", variableDefinitions: "$s: UUID!", variables: { s: saleId } }),
    listAll<CommissionRow>("commissions", COMMISSION_FIELDS, { where: "{ igpSale: { id: { eq: $s } } }", variableDefinitions: "$s: UUID!", variables: { s: saleId } }),
  ]);
  return [...vip, ...igp].map(toCommission);
}

export async function loadCommissions(): Promise<Commission[]> {
  return (await listAll<CommissionRow>("commissions", COMMISSION_FIELDS)).map(toCommission);
}

type RateSettingRow = { id: string; product: string; role: string; rateBp: number; standardRateBp: number | null; member: Ref };
export async function loadCommissionRateSettings(): Promise<CommissionRateSetting[]> {
  // The composite-key table has no id column, so the read orders by its updatedAt column instead.
  const rows = await listAll<RateSettingRow>("commissionRateSettings", "member { id } product role rateBp standardRateBp", { orderBy: "[{ updatedAt: ASC }]" });
  return rows.map((row) => ({ memberId: row.member?.id ?? "", product: row.product as "VIP" | "IGP", role: row.role as "DSC" | "DRI", rateBp: row.rateBp, standardRateBp: row.standardRateBp }));
}

type PositionRateRow = { id: string; designation: string; role: string; rateBp: number; approvalReference: string };
export async function loadVipPositionRates(): Promise<VipPositionRate[]> {
  const rows = await listAll<PositionRateRow>("vipPositionRates", "designation role rateBp approvalReference", { orderBy: "[{ updatedAt: ASC }]" });
  return rows.map((row) => ({ designation: row.designation as VipPositionRate["designation"], role: row.role as "DSC" | "DRI", rateBp: row.rateBp, approvalReference: row.approvalReference }));
}

type ClawbackRow = {
  id: string; trigger: string; raisedDate: string; amountCentavos: string; refundDueCentavos: string | null;
  recoveries: CommissionClawback["recoveries"] | null; writeOff: CommissionClawback["writeOff"] | null;
  commission: Ref; sale: Ref; igpSale: Ref; recipientMember: Ref;
};
export const CLAWBACK_FIELDS = "id trigger raisedDate amountCentavos refundDueCentavos recoveries writeOff commission { id } sale { id } igpSale { id } recipientMember { id }";

export function toClawback(row: ClawbackRow): CommissionClawback {
  return {
    id: row.id, commissionId: row.commission?.id ?? "", saleId: row.sale?.id ?? row.igpSale?.id ?? "",
    recipientMemberId: row.recipientMember?.id ?? "", trigger: row.trigger as CommissionClawback["trigger"],
    raisedDate: row.raisedDate, amountCentavos: int64ToCentavos(row.amountCentavos),
    recoveries: row.recoveries ?? [], writeOff: row.writeOff ?? null,
    ...(row.refundDueCentavos != null ? { refundDueCentavos: int64ToCentavos(row.refundDueCentavos) } : {}),
  };
}

export async function loadClawback(id: string): Promise<CommissionClawback | null> {
  const result = await dbRead<{ commissionClawback: ClawbackRow | null }>(`query($id: UUID!) { commissionClawback(id: $id) { ${CLAWBACK_FIELDS} } }`, { id });
  return result.commissionClawback ? toClawback(result.commissionClawback) : null;
}

export async function loadCommissionClawbacks(): Promise<CommissionClawback[]> {
  return (await listAll<ClawbackRow>("commissionClawbacks", CLAWBACK_FIELDS)).map(toClawback);
}

export async function loadClawbacksOfMember(memberId: string): Promise<CommissionClawback[]> {
  const rows = await listAll<ClawbackRow>("commissionClawbacks", CLAWBACK_FIELDS, { where: "{ recipientMember: { id: { eq: $m } } }", variableDefinitions: "$m: UUID!", variables: { m: memberId } });
  return rows.map(toClawback);
}

type PayoutListRow = {
  id: string; month: string; entries: CommissionPayoutList["entries"]; approvedCommissionIds: Json | null; offsets: Json | null;
  preparedBy: Ref; preparedAt: string; approvedBy: Ref; approvedAt: string | null;
};
function toPayoutList(row: PayoutListRow): CommissionPayoutList {
  return {
    id: row.id, month: row.month, entries: row.entries ?? [],
    preparedBy: row.preparedBy?.id ?? "", preparedAt: row.preparedAt,
    approvedBy: row.approvedBy?.id ?? null, approvedAt: row.approvedAt,
    ...(row.approvedCommissionIds ? { approvedCommissionIds: row.approvedCommissionIds as unknown as string[] } : {}),
    ...(row.offsets ? { offsets: row.offsets as unknown as NonNullable<CommissionPayoutList["offsets"]> } : {}),
  };
}

export async function loadCommissionPayoutLists(): Promise<CommissionPayoutList[]> {
  const rows = await listAll<PayoutListRow>("commissionPayoutLists", "id month entries approvedCommissionIds offsets preparedBy { id } preparedAt approvedBy { id } approvedAt");
  return rows.map(toPayoutList);
}

export async function loadCommissionPayoutList(id: string): Promise<CommissionPayoutList | null> {
  const result = await dbRead<{ commissionPayoutList: PayoutListRow | null }>(`query($id: UUID!) { commissionPayoutList(id: $id) { id month entries approvedCommissionIds offsets preparedBy { id } preparedAt approvedBy { id } approvedAt } }`, { id });
  return result.commissionPayoutList ? toPayoutList(result.commissionPayoutList) : null;
}

type AllowanceReviewRow = { id: string; month: string; result: AllowanceReview["result"]; inputs: AllowanceReviewInput | null; clawbackOffsetCentavos: string | null; reviewedBy: Ref; reviewedAt: string; member: Ref };
export async function loadAllowanceReviews(): Promise<AllowanceReview[]> {
  const rows = await listAll<AllowanceReviewRow>("allowanceReviews", "id month result inputs clawbackOffsetCentavos reviewedBy { id } reviewedAt member { id }");
  return rows.map((row) => {
    const inputs = (row.inputs ?? {}) as AllowanceReviewInput;
    return {
      ...inputs, id: row.id, month: row.month, memberId: row.member?.id ?? "",
      result: row.result, withholdBa: Boolean(inputs.withholdingReason),
      ...(row.clawbackOffsetCentavos != null ? { clawbackOffsetCentavos: int64ToCentavos(row.clawbackOffsetCentavos) } : {}),
      reviewedAt: row.reviewedAt, reviewedBy: row.reviewedBy?.id ?? "",
    } as AllowanceReview;
  });
}
