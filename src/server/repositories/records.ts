import "server-only";
import type { Contract } from "@/modules/contracts/types";
import type { Customer, CustomerStatus } from "@/modules/customers/types";
import type { Payment } from "@/modules/finance/types";
import type { OrgMember } from "@/modules/organization/types";
import type { Sale } from "@/modules/sales/types";
import { dbRead, listAll } from "@/server/db";
import { centavosToInt64, int64ToCentavos } from "@/server/money";
import { manilaDateOf } from "@/shared/lib/dates";

type Json = Record<string, unknown>;
type Ref = { id: string } | null;

/** The database returns UUIDs without hyphens. Accept both spellings from callers and normalise. */
export function normalizeId(value: string): string | null {
  const bare = value.replaceAll("-", "").toLowerCase();
  return /^[0-9a-f]{32}$/.test(bare) ? bare : null;
}

// ---------------------------------------------------------------- customers
export type CustomerRow = { id: string; displayName: string; branchId: string; status: string; customerNumber: string | null; profile: Json | null; ownerMember: Ref };
export const CUSTOMER_FIELDS = "id displayName branchId status customerNumber profile ownerMember { id }";

export function toCustomer(row: CustomerRow): Customer {
  return { ...(row.profile ?? {}), id: row.id, displayName: row.displayName, branchId: row.branchId, ownerMemberId: row.ownerMember?.id ?? null, status: row.status as CustomerStatus, customerNumber: row.customerNumber } as Customer;
}

/** Splits a customer into the indexed columns and the jsonb `profile` for everything else. */
export function customerColumns(customer: Customer) {
  const { id: _id, displayName, branchId, ownerMemberId, status, customerNumber, ...profile } = customer;
  void _id;
  return { columns: { displayName, branchId, ownerMemberId: ownerMemberId ?? undefined, status, customerNumber: customerNumber ?? undefined }, profile };
}

export async function loadCustomers(): Promise<Customer[]> {
  return (await listAll<CustomerRow>("customers", CUSTOMER_FIELDS)).map(toCustomer);
}

export async function loadCustomer(id: string): Promise<Customer | null> {
  const result = await dbRead<{ customer: CustomerRow | null }>(`query($id: UUID!) { customer(id: $id) { ${CUSTOMER_FIELDS} } }`, { id });
  return result.customer ? toCustomer(result.customer) : null;
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
    columns: { customerId, productCode, priceCentavos: centavosToInt64(priceCentavos), classification, status, raNumber: raNumber ?? undefined, vipNumber: vipNumber ?? undefined, signedAgreementRecordedDate: signedAgreementRecordedDate ?? undefined, sellerMemberId: sellerMemberId ?? undefined },
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

export function toPayment(row: PaymentRow, saleId: string | null): Payment {
  // The internal evidence pointer stays on the server; the view builds its private URL separately.
  const { evidence: _evidence, ...details } = (row.details ?? {}) as Record<string, unknown>;
  void _evidence;
  return {
    adjustments: [], history: [], evidenceFileName: null,
    ...details,
    id: row.id, contractId: row.contract?.id, customerId: row.customer?.id, saleId, purpose: row.purpose, amountCentavos: int64ToCentavos(row.amountCentavos),
    method: row.method, paidDate: row.paidDate, ...(row.countedDate ? { countedDate: row.countedDate } : {}), referenceNo: row.referenceNo, documentNo: row.documentNo,
    status: row.status, submittedBy: row.submittedBy?.id ?? "", submittedAt: row.submittedAt, verifiedBy: row.verifiedBy?.id ?? null, verifiedAt: row.verifiedAt,
    verifiedDate: row.verifiedDate, decisionReason: row.decisionReason,
  } as unknown as Payment;
}

export async function loadPayment(id: string): Promise<Payment | null> {
  const result = await dbRead<{ payment: PaymentRow | null }>(`query($id: UUID!) { payment(id: $id) { ${PAYMENT_FIELDS} } }`, { id });
  if (!result.payment) return null;
  const sale = await loadSaleForContract(result.payment.contract!.id);
  return toPayment(result.payment, sale?.sale.id ?? null);
}

export async function loadPaymentsOfContract(contractId: string, saleId: string | null): Promise<Payment[]> {
  const rows = await listAll<PaymentRow>("payments", PAYMENT_FIELDS, { where: "{ contract: { id: { eq: $c } } }", orderBy: "[{ submittedAt: ASC }, { id: ASC }]", variableDefinitions: "$c: UUID!", variables: { c: contractId } });
  return rows.map((row) => toPayment(row, saleId));
}

// ---------------------------------------------------------------- sales
export type SaleRow = {
  id: string; productCode: string; branchId: string; valueCentavos: string; recordedDate: string; status: string; approvedAt: string | null; confirmedDate: string | null;
  details: Json | null; contract: Ref; customer: Ref; sellerMember: Ref; referrerMember: Ref; approvedBy: Ref;
};
export const SALE_FIELDS = "id productCode branchId valueCentavos recordedDate status approvedAt confirmedDate details contract { id } customer { id } sellerMember { id } referrerMember { id } approvedBy { id }";
type AdjustmentRow = { id: string; date: string; amountCentavos: string; kind: string; reason: string; actor: Ref };

export function toSale(row: SaleRow, adjustments: AdjustmentRow[]): Sale {
  return {
    team: [],
    ...(row.details ?? {}),
    id: row.id, contractId: row.contract?.id, customerId: row.customer?.id, productCode: row.productCode, branchId: row.branchId, valueCentavos: int64ToCentavos(row.valueCentavos),
    recordedDate: row.recordedDate, approval: row.approvedAt && row.approvedBy ? { approvedAt: row.approvedAt, approvedBy: row.approvedBy.id } : null,
    sellerMemberId: row.sellerMember?.id ?? null, referrerMemberId: row.referrerMember?.id ?? null, status: row.status, confirmedDate: row.confirmedDate,
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
  return rows.map((row) => toPayment(row, null));
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
type FullMemberRow = { id: string; displayName: string; designation: string; branchId: string; status: string; teamName: string | null; referralCode: string | null; aaNumber: string | null; details: Json | null; parent: Ref };

/** Complete member records as the screens expect them. Record scope uses the lighter `loadScopeMembers`. */
export async function loadMembersFull(): Promise<OrgMember[]> {
  const rows = await listAll<FullMemberRow>("members", "id displayName designation branchId status teamName referralCode aaNumber details parent { id }");
  return rows.map((row) => ({
    ...(row.details ?? {}), id: row.id, displayName: row.displayName, designation: row.designation, branchId: row.branchId, status: row.status, parentId: row.parent?.id ?? null,
    teamName: row.teamName, referralCode: row.referralCode, aaNumber: row.aaNumber,
  })) as unknown as OrgMember[];
}
