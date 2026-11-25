import "server-only";
import type { ContractView } from "@/data/contracts/contract-repository";
import type { PaymentView } from "@/data/contracts/payment-repository";
import type { SaleView } from "@/data/contracts/sale-repository";
import { finalizationHolds } from "@/modules/contracts/rules";
import type { PaymentAdjustment } from "@/modules/finance/types";
import { BROAD_BUSINESS_ROLES, BROAD_ROLES, activeIdentityRoles, canSeeContractRecord, getVisibleMemberIds } from "@/modules/identity/record-scope";
import type { Customer } from "@/modules/customers/types";
import { restrictCustomer } from "@/modules/customers/rules";
import type { OrgMember } from "@/modules/organization/types";
import { tierDisplayName } from "@/modules/vip/tier-options";
import type { Actor } from "@/server/auth/actor";
import { listAll, dbRead } from "@/server/db";
import { CONTRACT_FIELDS, PAYMENT_FIELDS, SALE_FIELDS, loadCustomer, loadMembersFull, loadPaymentAdjustments, paymentEvidenceOf, toContract, toPayment, toSale, type ContractRow, type PaymentRow, type SaleRow } from "@/server/repositories/records";
import { loadPaymentSchemes, loadProducts, loadTierLevels } from "@/server/repositories/catalog";
import type { VipProduct } from "@/modules/vip/types";
import { notFound } from "@/server/services/common";
import { clientCustomer } from "@/server/services/customers";
import { activeRoles } from "@/modules/identity/active-roles";

/** One page of a list, ordered by id, with the id of the last row as the cursor for the next page. */
export function pageOf<T extends { id: string }>(rows: T[], query: { limit: number; afterId?: string }) {
  const sorted = [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const remaining = query.afterId === undefined ? sorted : sorted.filter((item) => item.id > query.afterId!);
  const items = remaining.slice(0, query.limit);
  return { items, total: sorted.length, nextCursor: remaining.length > items.length ? items.at(-1)!.id : null };
}

const isBroadBusiness = (actor: Actor) => activeRoles(actor.identity).some((role) => BROAD_BUSINESS_ROLES.has(role));

// ---------------------------------------------------------------- contracts
/** SQL Connect cannot select a field twice, so a view widens the sub-selection the base fields already have. */
const widen = (fields: string, wider: Record<string, string>) => Object.entries(wider).reduce((text, [name, inner]) => { if (!text.includes(`${name} { id }`)) throw new Error(`Missing ${name} in the field list.`); return text.replace(`${name} { id }`, `${name} { ${inner} }`); }, fields);

const CONTRACT_VIEW_FIELDS = widen(CONTRACT_FIELDS, { customer: "id displayName", sellerMember: "id displayName" });
type ContractViewJoin = ContractRow & { customer: { id: string; displayName: string } | null; sellerMember: { id: string; displayName: string } | null };

async function salesByContract(): Promise<Map<string, { id: string; status: string; confirmedDate: string | null; approved: boolean }>> {
  const rows = await listAll<{ id: string; status: string; confirmedDate: string | null; approvedAt: string | null; contract: { id: string } | null }>("sales", "id status confirmedDate approvedAt contract { id }");
  return new Map(rows.filter((row) => row.contract).map((row) => [row.contract!.id, { id: row.id, status: row.status, confirmedDate: row.confirmedDate, approved: Boolean(row.approvedAt) }]));
}

function contractViewOf(row: ContractViewJoin, sales: Awaited<ReturnType<typeof salesByContract>>): ContractView {
  const contract = toContract(row);
  const sale = sales.get(row.id);
  return {
    ...contract,
    customerName: row.customer?.displayName ?? "Unknown customer",
    sellerName: row.sellerMember?.displayName ?? null,
    sale: sale ? { id: sale.id, status: sale.status as never, confirmedDate: sale.confirmedDate } : null,
    holds: finalizationHolds(contract),
    // shortcut: commission rates are not in the pilot schema, so no rate is ever reported missing.
    missingCommissionRates: [],
  } as ContractView;
}

export async function listContractViews(actor: Actor, query: { limit: number; afterId?: string }) {
  const [rows, sales] = await Promise.all([listAll<ContractViewJoin>("contracts", CONTRACT_VIEW_FIELDS), salesByContract()]);
  const views = rows.map((row) => contractViewOf(row, sales)).filter((view) => canSeeContractRecord(actor.identity, view));
  return pageOf(views, query);
}

export async function getContractView(actor: Actor, id: string): Promise<ContractView> {
  const result = await dbRead<{ contract: ContractViewJoin | null }>(`query($id: UUID!) { contract(id: $id) { ${CONTRACT_VIEW_FIELDS} } }`, { id });
  const view = result.contract ? contractViewOf(result.contract, await salesByContract()) : null;
  if (!view || !canSeeContractRecord(actor.identity, view)) throw notFound("Contract");
  return view;
}

// ---------------------------------------------------------------- payments
const PAYMENT_VIEW_FIELDS = widen(PAYMENT_FIELDS, { customer: "id displayName", submittedBy: "id displayName", contract: "id productCode status details" });
type PaymentViewJoin = PaymentRow & { customer: { id: string; displayName: string } | null; submittedBy: { id: string; displayName: string } | null; contract: { id: string; productCode: string; status: string; details: Record<string, unknown> | null } | null };

/** Where a receipt's evidence is served. The file stays private: this address answers only to a signed-in person who may see the receipt. */
export const evidenceUrl = (paymentId: string, fileId: string) => `/api/v1/payments/${paymentId}/evidence/${fileId}`;

function paymentViewOf(row: PaymentViewJoin, sales: Awaited<ReturnType<typeof salesByContract>>, products: readonly VipProduct[], adjustments: Map<string, PaymentAdjustment[]>): PaymentView & { genealogy: ReadonlyArray<{ memberId: string }> } {
  const sale = row.contract ? sales.get(row.contract.id) : undefined;
  const payment = toPayment(row, sale?.id ?? null, adjustments.get(row.id) ?? []);
  const evidence = paymentEvidenceOf(row.details);
  const details = row.contract?.details ?? {};
  const label = `${tierDisplayName(row.contract?.productCode as never, products) ?? "VIP"} · ${(details.schemeLabel as string | undefined) ?? ""}`;
  return {
    ...payment,
    customerName: row.customer?.displayName ?? "Unknown customer",
    contractLabel: row.contract ? label : "Unknown contract",
    submitterName: row.submittedBy?.displayName ?? payment.submittedBy,
    approvalBlocked: !row.contract || row.contract.status === "cancelled" || !sale?.approved,
    referenceConflict: false, // the database refuses a duplicate reference, so one can never exist here
    // The uploaded file's own name is the display name when the receipt did not capture one at entry.
    ...(evidence ? { evidenceFileDataUrl: evidenceUrl(row.id, evidence.fileId), evidenceContentType: evidence.contentType, evidenceFileName: payment.evidenceFileName ?? evidence.fileName } : {}),
    genealogy: ((details.genealogy as Array<{ memberId: string }> | undefined) ?? []),
  };
}

const withoutScope = ({ genealogy: _genealogy, ...view }: ReturnType<typeof paymentViewOf>): PaymentView => {
  void _genealogy;
  return view;
};

export async function listPaymentViews(actor: Actor, query: { limit: number; afterId?: string }) {
  const [rows, sales, products, adjustments] = await Promise.all([listAll<PaymentViewJoin>("payments", PAYMENT_VIEW_FIELDS), salesByContract(), loadProducts(), loadPaymentAdjustments()]);
  const visible = rows.map((row) => paymentViewOf(row, sales, products, adjustments)).filter((view) => canSeeContractRecord(actor.identity, view));
  const page = pageOf(visible, query);
  return { ...page, items: page.items.map(withoutScope) };
}

export async function getPaymentView(actor: Actor, id: string): Promise<PaymentView> {
  const result = await dbRead<{ payment: PaymentViewJoin | null }>(`query($id: UUID!) { payment(id: $id) { ${PAYMENT_VIEW_FIELDS} } }`, { id });
  const [sales, products, adjustments] = await Promise.all([salesByContract(), loadProducts(), loadPaymentAdjustments([id])]);
  const view = result.payment ? paymentViewOf(result.payment, sales, products, adjustments) : null;
  if (!view || !canSeeContractRecord(actor.identity, view)) throw notFound("Payment");
  return withoutScope(view);
}

// ---------------------------------------------------------------- sales
const SALE_VIEW_FIELDS = widen(SALE_FIELDS, { customer: "id displayName", sellerMember: "id displayName", contract: "id details" });
type SaleViewJoin = SaleRow & { customer: { id: string; displayName: string } | null; sellerMember: { id: string; displayName: string } | null; contract: { id: string; details: Record<string, unknown> | null } | null };

type AdjustmentRow = { id: string; date: string; amountCentavos: string; kind: string; reason: string; actor: { id: string } | null; sale: { id: string } | null };
const ADJUSTMENT_FIELDS = "id date amountCentavos kind reason actor { id } sale { id }";

/** All adjustments in one query, grouped by sale, so a list of sales does not query once per sale. */
async function adjustmentsBySale(saleId?: string): Promise<Map<string, AdjustmentRow[]>> {
  const rows = saleId
    ? await listAll<AdjustmentRow>("saleAdjustments", ADJUSTMENT_FIELDS, { where: "{ sale: { id: { eq: $s } } }", orderBy: "[{ createdAt: ASC }, { id: ASC }]", variableDefinitions: "$s: UUID!", variables: { s: saleId } })
    : await listAll<AdjustmentRow>("saleAdjustments", ADJUSTMENT_FIELDS, { orderBy: "[{ createdAt: ASC }, { id: ASC }]" });
  const grouped = new Map<string, AdjustmentRow[]>();
  for (const row of rows) if (row.sale) grouped.set(row.sale.id, [...(grouped.get(row.sale.id) ?? []), row]);
  return grouped;
}

function saleViewOf(row: SaleViewJoin, adjustments: Map<string, AdjustmentRow[]>): SaleView {
  return {
    ...toSale(row, adjustments.get(row.id) ?? []),
    customerName: row.customer?.displayName ?? "Unknown customer",
    sellerName: row.sellerMember?.displayName ?? null,
    schemeLabel: ((row.contract?.details?.schemeLabel as string | undefined) ?? ""),
  } as SaleView;
}

/** Sales follow the team recorded at the time of sale (doc 13 section 4.3); a referrer also sees the sale. Office roles see every sale of a contract they may see. */
function canSeeSale(actor: Actor, sale: SaleView, genealogy: ReadonlyArray<{ memberId: string }>): boolean {
  if (actor.identity.status !== "active") return false;
  if (isBroadBusiness(actor)) return canSeeContractRecord(actor.identity, { genealogy });
  const member = actor.identity.memberId;
  return Boolean(member) && (sale.team.some((entry) => entry.memberId === member) || sale.referrerMemberId === member);
}

export async function listSaleViews(actor: Actor, query: { limit: number; afterId?: string }) {
  const [rows, adjustments] = await Promise.all([listAll<SaleViewJoin>("sales", SALE_VIEW_FIELDS), adjustmentsBySale()]);
  const views: SaleView[] = [];
  for (const row of rows) {
    const view = saleViewOf(row, adjustments);
    if (canSeeSale(actor, view, ((row.contract?.details?.genealogy as Array<{ memberId: string }> | undefined) ?? []))) views.push(view);
  }
  return pageOf(views, query);
}

export async function getSaleView(actor: Actor, id: string): Promise<SaleView> {
  const result = await dbRead<{ sale: SaleViewJoin | null }>(`query($id: UUID!) { sale(id: $id) { ${SALE_VIEW_FIELDS} } }`, { id });
  if (!result.sale) throw notFound("Sale");
  const view = saleViewOf(result.sale, await adjustmentsBySale(result.sale.id));
  if (!canSeeSale(actor, view, ((result.sale.contract?.details?.genealogy as Array<{ memberId: string }> | undefined) ?? []))) throw notFound("Sale");
  return view;
}

// ---------------------------------------------------------------- customers and members
export async function getCustomerView(actor: Actor, id: string): Promise<Customer> {
  const customer = await loadCustomer(id);
  const broad = activeIdentityRoles(actor.identity).some((role) => BROAD_ROLES.has(role));
  if (!customer) throw notFound("Customer");
  if (broad || customer.ownerMemberId === actor.identity.memberId) return clientCustomer(customer);
  // Downline view: name, plan and status only (doc 04 section 11), and only for a seller in the person's scope.
  const members = await loadMembersFull();
  const visible = getVisibleMemberIds(actor.identity, { members });
  if (!customer.ownerMemberId || !visible.has(customer.ownerMemberId)) throw notFound("Customer");
  return restrictCustomer(customer);
}

/** Members the person may see: everyone for office roles, the downline for IST, themselves for OST. */
export async function listMemberViews(actor: Actor): Promise<OrgMember[]> {
  const members = await loadMembersFull();
  const visible = getVisibleMemberIds(actor.identity, { members });
  return members.filter((member) => visible.has(member.id));
}

export const listProducts = () => loadProducts();
export const listPaymentSchemes = () => loadPaymentSchemes();
export const listTierLevels = () => loadTierLevels();
