import "server-only";
import type { CorrectIgpSale, IgpAction, IgpRegister, RecordIgpSale, ReissueIgpSale } from "@/data/contracts/igp-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import { getCurrentAccreditationRecord, getSellerStanding } from "@/modules/accreditation/eligibility";
import type { AccreditationRecord } from "@/modules/accreditation/types";
import type { GenealogyEntry } from "@/modules/contracts/types";
import type { Payment } from "@/modules/finance/types";
import { totalVerifiedCentavos } from "@/modules/finance/rules";
import { hasOperationPermission } from "@/modules/identity/permissions";
import { BROAD_BUSINESS_ROLES, canSeeContractRecord } from "@/modules/identity/record-scope";
import { activeRoles } from "@/modules/identity/active-roles";
import type { OrgMember } from "@/modules/organization/types";
import { DEFAULT_IGP_GRANT_TIER_RULES, type IgpBuyerMembership, type IgpGrantTierRule, type IgpHistoryBatch, type IgpProject, type IgpSale, type IgpScheme, type IgpUnit, type JadAccreditation } from "@/modules/igp/types";
import { buildIgpHistoryImportRows, type IgpHistoryRecord } from "@/modules/igp/history-import";
import { formatIgpSeriesNumber, grantTierRulesProblem, igpChecklist, igpGrantTier, igpMilestones, igpPriceBand, isIgpDefaultReviewDue, jadAccreditationOn, jadNumberProblem } from "@/modules/igp/rules";
import { MAX_IMPORT_ROWS } from "@/modules/customers/import";
import { addYearsToDate, parseManilaDateOnly } from "@/shared/lib/dates";
import type { Actor } from "@/server/auth/actor";
import { loadScopeMembers, requireOperation } from "@/server/auth/authorize";
import { dbRead, dbWrite, listAll, uniqueViolation } from "@/server/db";
import { centavosToInt64, int64ToCentavos } from "@/server/money";
import { conflict, invalid, newId, notFound, nowIso, today, transact, type AuditSpec } from "@/server/services/common";
import { paperNumberTaken } from "@/server/services/payments";

/**
 * Property sales (IGP; doc 14). F4 connects entry, approval, documents, cancellation,
 * reissue, correction, the JA&D register, the collection threshold and the history
 * import. Commissions, receipt verification and month-close stay in F5/F6; receipts
 * are kept on the sale until then (recorded shortcut).
 */

type Receipt = {
  id: string; purpose: string; amountCentavos: number; method: string; paidDate: string;
  referenceNo: string | null; documentNo: string | null; status: "submitted" | "verified";
  submittedAt: string; verifiedAt: string | null; verifiedDate: string | null;
  history: Array<{ at: string; actorId: string; event: string; note: string | null }>;
};

type IgpSaleRecord = IgpSale & { receipts: Receipt[] };

type IgpRow = {
  id: string; priceCentavos: string; scheme: string; termMonths: number; clauses: string; date: string; seriesNumber: string; sequence: number;
  status: string; customer: { id: string; displayName: string } | null; project: { id: string } | null; unit: { id: string } | null;
  sellerMember: { id: string; displayName: string } | null; referrerMember: { id: string; displayName: string } | null;
  createdBy: { id: string } | null; approvedBy: { id: string } | null; details: Record<string, unknown> | null;
};
const IGP_SALE_FIELDS = "id priceCentavos scheme termMonths clauses date seriesNumber sequence status customer { id displayName } project { id } unit { id } sellerMember { id displayName } referrerMember { id displayName } createdBy { id } approvedBy { id } details";

type AccreditationRow = { id: string; member: { id: string } | null; number: string; approvedDate: string; validUntil: string; replaces: string | null };
type MembershipRow = { id: string; sale: { id: string } | null; seriesNumber: string; customer: { id: string } | null; tier: string | null; grantSignedDate: string; status: string; stayPoints: string };
type HistoryBatchRow = { id: string; fileName: string; createdBy: { id: string } | null; totalRows: number; rows: IgpHistoryBatch["rows"] | null; skipped: IgpHistoryBatch["skipped"] | null; createdAt: string };
type SettingsRow = { id: string; key: string; thresholdBp: number; grantTierRules: IgpGrantTierRule[] | null };

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const text = (value: string): string => value.trim();

/** The seller and their upline at recording time (doc 02, 13 section 4.3); later transfers never change it. */
function genealogyOf(members: OrgMember[], memberId: string | null): GenealogyEntry[] {
  const chain: GenealogyEntry[] = [];
  const seen = new Set<string>();
  let current = memberId ? members.find((member) => member.id === memberId) : undefined;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.push({ memberId: current.id, displayName: current.displayName, designation: current.designation });
    current = current.parentId ? members.find((member) => member.id === current!.parentId) : undefined;
  }
  return chain;
}

function businessDate(value: string, label: string): string {
  if (value !== value.trim() || !DATE_ONLY.test(value) || !parseManilaDateOnly(value) || value > today()) throw invalid(`Enter a valid ${label} on or before today.`);
  return value;
}

function asPayments(sale: IgpSaleRecord): Payment[] {
  return (sale.receipts ?? []).map((receipt) => ({
    id: receipt.id, contractId: sale.id, customerId: sale.customerId, saleId: sale.id, purpose: receipt.purpose,
    amountCentavos: receipt.amountCentavos, method: receipt.method, paidDate: receipt.paidDate, countedDate: receipt.paidDate,
    referenceNo: receipt.referenceNo, documentNo: receipt.documentNo, status: receipt.status, submittedBy: "", submittedAt: receipt.submittedAt,
    verifiedBy: null, verifiedAt: receipt.verifiedAt, verifiedDate: receipt.verifiedDate, decisionReason: null,
    evidenceFileName: null, history: [], adjustments: [],
  } as unknown as Payment));
}

function toIgpSale(row: IgpRow): IgpSaleRecord {
  const details = (row.details ?? {}) as Record<string, unknown>;
  const sale: IgpSaleRecord = {
    ...(details as object),
    id: row.id, customerId: row.customer?.id ?? "", projectId: row.project?.id ?? "", unitId: row.unit?.id ?? "",
    buyerName: row.customer?.displayName ?? "",
    project: (details.project as string | undefined) ?? "", unit: (details.unit as string | undefined) ?? "",
    propertyOwner: (details.propertyOwner as string | undefined) ?? "", priceCentavos: int64ToCentavos(row.priceCentavos),
    scheme: row.scheme as IgpScheme, termMonths: row.termMonths, clauses: row.clauses as IgpSale["clauses"], date: row.date,
    sellerMemberId: row.sellerMember?.id ?? "", referrerMemberId: row.referrerMember?.id ?? null,
    referrerName: row.referrerMember?.displayName ?? null,
    seriesNumber: row.seriesNumber, sequence: row.sequence, status: row.status as IgpSale["status"],
    createdBy: row.createdBy?.id ?? "", approvedBy: row.approvedBy?.id ?? null,
    adjustments: (details.adjustments as IgpSale["adjustments"] | undefined) ?? [], thresholdBp: (details.thresholdBp as number | undefined) ?? 1_000,
    sellerJadNumber: (details.sellerJadNumber as string | undefined) ?? "", expiryReminders: (details.expiryReminders as IgpSale["expiryReminders"] | undefined) ?? [],
    genealogy: (details.genealogy as IgpSale["genealogy"] | undefined) ?? [], commissionRates: (details.commissionRates as IgpSale["commissionRates"] | undefined) ?? [],
    commissionReviewReason: (details.commissionReviewReason as string | null | undefined) ?? null, documents: (details.documents as IgpSale["documents"] | undefined) ?? [],
    grantTier: details.grantTier as IgpSale["grantTier"], replacesId: (details.replacesId as string | null | undefined) ?? null,
    replacedById: (details.replacedById as string | null | undefined) ?? null, refund: (details.refund as IgpSale["refund"] | undefined) ?? null,
    closedDealDate: null, stage1Date: null, fullPaymentDate: null,
    receipts: (details.receipts as Receipt[] | undefined) ?? [],
  } as unknown as IgpSaleRecord;
  if (sale.status === "approved" || sale.status === "defaulted") {
    const milestones = igpMilestones(sale.priceCentavos, sale.thresholdBp, asPayments(sale));
    sale.closedDealDate = milestones.closedDealDate; sale.stage1Date = milestones.stage1Date; sale.fullPaymentDate = milestones.fullPaymentDate;
  }
  return sale;
}

function canSeeSale(actor: Actor, sale: Pick<IgpSale, "sellerMemberId" | "referrerMemberId" | "genealogy">): boolean {
  const identity = actor.identity;
  if (identity.status !== "active") return false;
  if (activeRoles(identity).some((role) => BROAD_BUSINESS_ROLES.has(role))) return true;
  const own = identity.memberId !== null && (identity.memberId === sale.sellerMemberId || identity.memberId === sale.referrerMemberId);
  return (hasOperationPermission(identity, "sales.viewOwn") && own) ||
    (hasOperationPermission(identity, "sales.viewTeam") && (own || canSeeContractRecord(identity, { genealogy: sale.genealogy })));
}

async function loadIgpSales(): Promise<IgpSaleRecord[]> {
  const rows = await listAll<IgpRow>("igpSales", IGP_SALE_FIELDS);
  return rows.map(toIgpSale);
}

async function loadIgpSale(id: string): Promise<IgpSaleRecord | null> {
  const result = await dbRead<{ igpSale: IgpRow | null }>(`query($id: UUID!) { igpSale(id: $id) { ${IGP_SALE_FIELDS} } }`, { id });
  return result.igpSale ? toIgpSale(result.igpSale) : null;
}

async function loadAccreditations(): Promise<JadAccreditation[]> {
  const rows = await listAll<AccreditationRow>("igpAccreditations", "id member { id } number approvedDate validUntil replaces");
  return rows.map((row) => ({ memberId: row.member?.id ?? "", number: row.number, approvedDate: row.approvedDate, validUntil: row.validUntil, replaces: row.replaces }));
}

/** AFhomes seller accreditations, used only for the suspended/ended standing check (doc 14 §6.5). */
async function loadAfhomesAccreditations(): Promise<AccreditationRecord[]> {
  const rows = await listAll<{
    member: { id: string } | null; classification: string; adminStatus: string; effectiveDate: string | null;
    expiryDate: string | null; suspensionEffectiveDate: string | null; endDate: string | null; aaNumber: string | null;
  }>("accreditations", "member { id } classification adminStatus effectiveDate expiryDate suspensionEffectiveDate endDate aaNumber");
  return rows.map((row) => ({
    memberId: row.member?.id ?? "", classification: row.classification, adminStatus: row.adminStatus,
    effectiveDate: row.effectiveDate, expiryDate: row.expiryDate, suspensionEffectiveDate: row.suspensionEffectiveDate,
    endDate: row.endDate, aaNumber: row.aaNumber,
  }) as AccreditationRecord);
}

/** A suspended seller, or one who had left on the sale date, cannot be on a new or corrected IGP sale. */
function assertPartyStanding(member: OrgMember, date: string, label: string, records: readonly AccreditationRecord[]): void {
  const current = getCurrentAccreditationRecord(records.filter((record) => record.memberId === member.id));
  if (!current) {
    if (member.status !== "active") throw invalid(`${label} is unavailable.`);
    return;
  }
  const standing = getSellerStanding(current, date);
  if (standing.state === "blocked" && (standing.reason === "SUSPENDED" || standing.reason === "ENDED")) throw invalid(`${label} is suspended or had already left on the sale date.`);
  if (standing.state === "blocked" && standing.reason === "NOT_ACTIVE") throw invalid(`${label} is unavailable.`);
  if (member.status === "suspended" && !current.suspensionEffectiveDate) throw invalid(`${label} is unavailable.`);
}

async function loadMemberships(): Promise<IgpBuyerMembership[]> {
  const rows = await listAll<MembershipRow>("igpBuyerMemberships", "id sale { id } seriesNumber customer { id } tier grantSignedDate status stayPoints");
  return rows.map((row) => ({ id: row.id, saleId: row.sale?.id ?? "", seriesNumber: row.seriesNumber, customerId: row.customer?.id ?? "", tier: row.tier, grantSignedDate: row.grantSignedDate, status: "recorded", stayPoints: "none" }));
}

async function loadHistoryBatches(): Promise<IgpHistoryBatch[]> {
  const rows = await listAll<HistoryBatchRow>("igpHistoryBatches", "id fileName createdBy { id } totalRows rows skipped createdAt");
  return rows.map((row) => ({ id: row.id, fileName: row.fileName, createdAt: row.createdAt, createdBy: row.createdBy?.id ?? "", status: "imported", totalRows: row.totalRows, rows: row.rows ?? [], skipped: row.skipped ?? [] }));
}

/** The singleton settings row; created with the confirmed defaults on first use. */
async function loadSettings(): Promise<{ thresholdBp: number; grantTierRules: IgpGrantTierRule[] }> {
  const result = await dbRead<{ igpSettingss: SettingsRow[] }>(`query { igpSettingss(where: { key: { eq: "igp" } }, limit: 1) { id key thresholdBp grantTierRules } }`);
  const row = result.igpSettingss[0];
  if (row) return { thresholdBp: row.thresholdBp, grantTierRules: row.grantTierRules ?? DEFAULT_IGP_GRANT_TIER_RULES.map((rule) => ({ ...rule })) };
  const defaults = { thresholdBp: 1_000, grantTierRules: DEFAULT_IGP_GRANT_TIER_RULES.map((rule) => ({ ...rule })) };
  await dbWrite("mutation($d: IgpSettings_Data!) { igpSettings: igpSettings_insert(data: $d) }", { d: { id: newId(), key: "igp", ...defaults } });
  return defaults;
}

async function loadCatalog(): Promise<{ projects: IgpProject[]; units: IgpUnit[] }> {
  const projects = await listAll<{ id: string; name: string; location: string | null; status: string }>("igpProjects", "id name location status");
  const units = await listAll<{ id: string; project: { id: string } | null; unitOrLot: string; propertyOwner: string; status: string }>("igpUnits", "id project { id } unitOrLot propertyOwner status");
  return {
    projects: projects.map((row) => ({ id: row.id, name: row.name, location: row.location, status: row.status === "active" ? "active" : "inactive" })),
    units: units.map((row) => ({ id: row.id, projectId: row.project?.id ?? "", unitOrLot: row.unitOrLot, propertyOwner: row.propertyOwner, status: row.status === "active" ? "active" : "inactive" })),
  };
}

async function loadApprovedBuyers(): Promise<Array<{ value: string; label: string }>> {
  const rows = await listAll<{ id: string; displayName: string; status: string }>("customers", "id displayName status");
  return rows.filter((row) => row.status === "approved" || row.status === "active_member").map((row) => ({ value: row.id, label: row.displayName }));
}

async function loadSellerOptions(): Promise<IgpRegister["sellers"]> {
  const rows = await listAll<{ id: string; displayName: string; designation: string; branchId: string }>("members", "id displayName designation branchId");
  return rows.map((row) => ({ value: row.id, label: row.displayName, designation: row.designation as IgpRegister["sellers"][number]["designation"], branchId: row.branchId }));
}

export async function igpRegister(actor: Actor): Promise<IgpRegister> {
  const canEnter = hasOperationPermission(actor.identity, "igp.enter");
  const [sales, accreditations, memberships, historyBatches, settings] = await Promise.all([
    loadIgpSales(), loadAccreditations(), loadMemberships(), loadHistoryBatches(), loadSettings(),
  ]);
  const visible = sales.filter((sale) => canSeeSale(actor, sale));
  const [buyers, sellers] = canEnter ? await Promise.all([loadApprovedBuyers(), loadSellerOptions()]) : [[], []];
  return {
    sales: visible.reverse().map((sale) => {
      const payments = asPayments(sale);
      const view = sale as IgpSaleRecord & { buyerName?: string; referrerName?: string | null };
      return { ...sale, buyerName: view.buyerName ?? "", referrerName: view.referrerName ?? null, collectedCentavos: totalVerifiedCentavos(payments), defaultReviewDue: isIgpDefaultReviewDue(sale, payments, today()) } as IgpRegister["sales"][number];
    }),
    buyers,
    sellers,
    accreditations: canEnter ? accreditations : [],
    thresholdBp: canEnter ? settings.thresholdBp : 0,
    grantTierRules: canEnter ? settings.grantTierRules : [],
    buyerMemberships: memberships.filter((membership) => visible.some((sale) => sale.id === membership.saleId)),
    historyBatches: canEnter ? [...historyBatches].reverse() : [],
  };
}

export async function listIgpCatalogFor(actor: Actor) {
  const manager = hasOperationPermission(actor.identity, "igp.manage");
  const canEnter = hasOperationPermission(actor.identity, "igp.enter");
  if (!manager && !canEnter) return { projects: [], units: [] };
  const { projects, units } = await loadCatalog();
  const sales = await loadIgpSales();
  const visibleProjects = projects.filter((project) => manager || project.status === "active");
  const ids = new Set(visibleProjects.map((project) => project.id));
  return {
    projects: visibleProjects.map((project) => ({
      ...project,
      inUse: sales.some((sale) => sale.projectId === project.id),
      unitCount: units.filter((unit) => unit.projectId === project.id).length,
    })),
    units: units.filter((unit) => ids.has(unit.projectId) && (manager || unit.status === "active")).map((unit) => ({ ...unit, inUse: sales.some((sale) => sale.unitId === unit.id) })),
  };
}

function requireManage(actor: Actor): void {
  requireOperation(actor, "igp.manage");
}

async function monthlySequence(date: string): Promise<number> {
  const month = date.slice(0, 7);
  const [sales, batches] = await Promise.all([loadIgpSales(), loadHistoryBatches()]);
  const historySequences = batches.flatMap((batch) => batch.rows).filter((row) => row.date.slice(0, 7) === month)
    .map((row) => Number(row.seriesNumber.slice(7, 11))).filter((value) => Number.isInteger(value) && value > 0);
  return Math.max(1, ...sales.filter((sale) => sale.date.startsWith(month)).map((sale) => sale.sequence + 1), ...historySequences.map((value) => value + 1));
}

type PrepareInput = {
  customerId: string; projectId: string; unitId: string; priceCentavos: number; scheme: IgpScheme; termMonths: number;
  clauses: "S" | "N"; sellerMemberId: string; referrerMemberId: string | null; referralReference?: string;
  entry: "reservation" | "cts"; date: string;
};

async function prepareSale(actor: Actor, input: PrepareInput, replaced?: IgpSaleRecord): Promise<IgpSaleRecord> {
  const issueDate = businessDate(input.date, "issue date");
  const catalog = await loadCatalog();
  const project = catalog.projects.find((item) => item.id === input.projectId);
  if (!project || project.status !== "active") throw invalid("Choose an active project.");
  const unit = catalog.units.find((item) => item.id === input.unitId && item.projectId === input.projectId);
  if (!unit || unit.status !== "active") throw invalid("Choose an active unit or lot of this project.");
  const copy = replaced && replaced.projectId === input.projectId && replaced.unitId === input.unitId
    ? { project: replaced.project, unit: replaced.unit, propertyOwner: replaced.propertyOwner }
    : { project: project.name, unit: unit.unitOrLot, propertyOwner: unit.propertyOwner };
  igpPriceBand(input.priceCentavos);
  if (input.entry !== "reservation" && input.entry !== "cts") throw invalid("Choose the reason for issuing the Series Number.");
  if (input.entry === "cts" && input.scheme !== "T") throw invalid("The Contract to Sell entry applies to Terms sales.");
  if (input.scheme !== "C" && input.scheme !== "T") throw invalid("Choose Cash or Terms.");
  if (input.clauses !== "S" && input.clauses !== "N") throw invalid("Choose Standard or Non-Standard clauses.");
  if (!Number.isInteger(input.termMonths) || input.termMonths < 1 || input.termMonths > 36) throw invalid("Enter whole months from 1 to 36.", { termMonths: "Enter whole months from 1 to 36." });
  if (input.scheme === "C" && input.termMonths !== 1) throw invalid("Cash uses one month.", { termMonths: "Cash uses one month." });
  const sequence = await monthlySequence(issueDate);
  const seriesNumber = formatIgpSeriesNumber({ date: issueDate, sequence, priceCentavos: input.priceCentavos, scheme: input.scheme, termMonths: input.termMonths, clauses: input.clauses });
  if ((await loadIgpSales()).some((sale) => sale.seriesNumber === seriesNumber) || (await loadHistoryBatches()).some((batch) => batch.rows.some((row) => row.seriesNumber === seriesNumber))) {
    throw conflict("series_taken", "This Series Number was already used.");
  }
  const buyers = replaced ? null : await loadApprovedBuyers();
  if (!replaced && !buyers!.some((buyer) => buyer.value === input.customerId)) throw invalid("Choose an approved buyer.");
  const accreditations = await loadAccreditations();
  const scope = await loadScopeMembers();
  const standingRecords = await loadAfhomesAccreditations();
  const seller = scope.find((member) => member.id === input.sellerMemberId);
  if (!seller) throw invalid("Choose a valid closing seller.");
  assertPartyStanding(seller, issueDate, "Closing seller", standingRecords);
  const jad = jadAccreditationOn(accreditations, seller.id, issueDate);
  if (!jad) throw invalid("Closing seller needs a JA&D accreditation number effective on the sale date.");
  let referrerJad: JadAccreditation | null = null;
  if (input.referrerMemberId) {
    const referrer = scope.find((member) => member.id === input.referrerMemberId);
    if (!referrer) throw invalid("Choose a valid referrer.");
    assertPartyStanding(referrer, issueDate, "Referrer", standingRecords);
    referrerJad = jadAccreditationOn(accreditations, referrer.id, issueDate) ?? null;
    if (!referrerJad) throw invalid("Referrer needs a JA&D accreditation number effective on the sale date.");
  }
  if (input.referrerMemberId === input.sellerMemberId) {
    requireManage(actor);
    if (!text(input.referralReference ?? "")) throw invalid("Enter the verified referral reference for the closing seller.");
  }
  const settings = await loadSettings();
  const id = newId();
  return {
    ...copy, id, customerId: input.customerId, projectId: input.projectId, unitId: input.unitId, priceCentavos: input.priceCentavos,
    scheme: input.scheme, termMonths: input.termMonths, clauses: input.clauses, sellerMemberId: seller.id,
    referrerMemberId: input.referrerMemberId, ...(input.referralReference?.trim() ? { referralReference: input.referralReference.trim() } : {}),
    entry: input.entry, date: issueDate, sequence, seriesNumber, status: "pending", createdBy: actor.userId, approvedBy: null,
    thresholdBp: settings.thresholdBp, adjustments: [], sellerJadNumber: jad.number,
    expiryReminders: [...(jad.validUntil < issueDate ? [{ party: "Closing seller" as const, validUntil: jad.validUntil }] : []), ...(referrerJad && referrerJad.validUntil < issueDate ? [{ party: "Referrer" as const, validUntil: referrerJad.validUntil }] : [])],
    genealogy: genealogyOf(scope, seller.id),
    commissionRates: [], commissionReviewReason: null, documents: igpChecklist(input.scheme, input.entry),
    replacesId: replaced?.id ?? null, replacedById: null, refund: null, closedDealDate: null, stage1Date: null, fullPaymentDate: null,
    receipts: [],
  } as IgpSaleRecord;
}

/** The insert payload; the domain fields beyond the columns travel in `details`. */
function saleData(sale: IgpSaleRecord): Record<string, unknown> {
  const { id, customerId, projectId, unitId, priceCentavos, scheme, termMonths, clauses, date, sellerMemberId, referrerMemberId, seriesNumber, sequence, status, createdBy, approvedBy, receipts, ...details } = sale;
  void approvedBy;
  return { id, customerId, projectId: projectId || null, unitId: unitId || null, priceCentavos: centavosToInt64(priceCentavos), scheme, termMonths, clauses, date, sellerMemberId, referrerMemberId: referrerMemberId || null, seriesNumber, sequence, status, createdById: createdBy, details: { ...details, receipts } };
}

async function insertSale(actor: Actor, sale: IgpSaleRecord, audits: AuditSpec[]): Promise<void> {
  await transact(actor, {
    variableDefinitions: "$d: IgpSale_Data!",
    fields: "sale: igpSale_insert(data: $d)",
    variables: { d: saleData(sale) },
    audit: audits,
  });
}

async function saveDetails(actor: Actor, sale: IgpSaleRecord, status: string, audits: AuditSpec[], extra?: { definitions: string; fields: string; variables: Record<string, unknown> }): Promise<void> {
  // Write every column as well as the details: a correction changes `priceCentavos` and
  // `referrerMemberId`, and the reader prefers the columns over `details`.
  const { id: _id, ...columns } = saleData(sale);
  void _id;
  await transact(actor, {
    variableDefinitions: ["$id: UUID!", "$data: IgpSale_Data!", extra?.definitions].filter(Boolean).join(", "),
    fields: `sale: igpSale_update(id: $id, data: $data)\n${extra?.fields ?? ""}`,
    variables: { id: sale.id, data: { ...columns, status }, ...extra?.variables },
    audit: audits,
  });
}

const auditOf = (sale: IgpSaleRecord, action: string, details: Record<string, unknown> = {}) => ({
  action, entityType: "sale", entityId: sale.id, details: { module: "sales", displayReference: sale.seriesNumber, ...details },
});

function saleDetails(sale: IgpSaleRecord): Record<string, unknown> {
  const { id: _id, customerId: _c, projectId: _p, unitId: _u, seriesNumber: _s, sequence: _q, status: _st, createdAt: _cr, ...rest } = sale as IgpSaleRecord & { createdAt?: unknown };
  void _id; void _c; void _p; void _u; void _s; void _q; void _st; void _cr;
  return rest as unknown as Record<string, unknown>;
}

function findSale(actor: Actor, sales: IgpSaleRecord[], id: string): IgpSaleRecord {
  const sale = sales.find((item) => item.id === id);
  if (!sale || !canSeeSale(actor, sale)) throw notFound("Property sale (IGP)");
  return sale;
}

function receiptFor(actor: Actor, input: RecordIgpSale): Receipt {
  return {
    id: newId(), purpose: input.entry === "reservation" ? "reservation" : "down_payment", amountCentavos: input.payment.amountCentavos,
    method: input.payment.method, paidDate: input.payment.paidDate, referenceNo: null, documentNo: input.payment.documentNo?.trim() || null,
    status: "submitted", submittedAt: nowIso(), verifiedAt: null, verifiedDate: null,
    history: [{ at: nowIso(), actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.PAYMENT_SUBMITTED, note: null }],
  };
}

async function recordSale(actor: Actor, input: RecordIgpSale): Promise<IgpSaleRecord> {
  requireOperation(actor, "igp.enter");
  requireOperation(actor, "payments.submit");
  if (input.entry === "reservation" && input.payment.paidDate !== input.date) throw invalid("Use the reservation receipt date as the issue date.");
  if (input.entry === "cts" && input.payment.paidDate > input.date) throw invalid("The down payment must be recorded on or before the Contract to Sell date.");
  if (input.payment.documentNo?.trim() && (await paperNumberTaken(input.payment.documentNo))) throw conflict("duplicate_number", "This OR or reference number is already used by another payment. A duplicate is not accepted.");
  // The unique Series Number index is the final guard; a simultaneous entry retries with the next monthly sequence.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const sale = await prepareSale(actor, input);
    const receipt = receiptFor(actor, input);
    sale.receipts = [receipt];
    try {
      await insertSale(actor, sale, [
        auditOf(sale, BUSINESS_AUDIT_ACTIONS.IGP_SERIES_ISSUED, { newValue: sale.seriesNumber, relatedRecordIds: [receipt.id] }),
        { action: BUSINESS_AUDIT_ACTIONS.PAYMENT_SUBMITTED, entityType: "igp-receipt", entityId: receipt.id, details: { module: "finance", newValue: "submitted", relatedRecordIds: [sale.id] } },
      ]);
      return sale;
    } catch (error) {
      const index = uniqueViolation(error);
      if (index && /seriesNumber/i.test(index)) continue;
      throw error;
    }
  }
  throw conflict("series_busy", "Could not assign the Series Number. Try again.");
}

async function reissueSale(actor: Actor, sale: IgpSaleRecord, input: ReissueIgpSale): Promise<IgpSaleRecord> {
  requireManage(actor);
  const reason = text(input.reason);
  if (!reason) throw invalid("Enter the reissue reason.");
  if (input.date < sale.date) throw invalid("The new issue date cannot be before the old issue date.");
  if (input.unitId === sale.unitId && input.projectId === sale.projectId && igpPriceBand(input.priceCentavos) === igpPriceBand(sale.priceCentavos) && input.scheme === sale.scheme && input.termMonths === sale.termMonths && input.clauses === sale.clauses) {
    throw invalid("Use a correction for a price change within the same band.");
  }
  const entry = sale.entry === "cts" && input.scheme === "C" ? "reservation" : sale.entry;
  const next = await prepareSale(actor, { ...sale, ...input, entry }, sale);
  next.receipts = sale.receipts.map((receipt) => ({ ...receipt, history: [...receipt.history, { at: nowIso(), actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.IGP_PAYMENT_MOVED, note: `${sale.seriesNumber} → ${next.seriesNumber}` }] }));
  sale.status = "replaced";
  sale.replacedById = next.id;
  sale.receipts = [];
  // The replacement, the old number's closing and both audit entries commit together.
  await transact(actor, {
    variableDefinitions: "$new: IgpSale_Data!, $oldId: UUID!, $oldStatus: String!, $oldDetails: Any!",
    fields: "created: igpSale_insert(data: $new)\nreplaced: igpSale_update(id: $oldId, data: { status: $oldStatus, details: $oldDetails })",
    variables: { new: saleData(next), oldId: sale.id, oldStatus: sale.status, oldDetails: saleDetails(sale) },
    audit: [
      auditOf(next, BUSINESS_AUDIT_ACTIONS.IGP_SERIES_ISSUED, { previousValue: sale.seriesNumber, newValue: next.seriesNumber, reason, relatedRecordIds: [sale.id] }),
      auditOf(sale, BUSINESS_AUDIT_ACTIONS.IGP_SERIES_REPLACED, { previousValue: sale.seriesNumber, newValue: next.seriesNumber, reason, relatedRecordIds: [next.id] }),
    ],
  });
  return next;
}

async function correctSale(actor: Actor, sale: IgpSaleRecord, input: CorrectIgpSale): Promise<IgpSaleRecord> {
  const reason = text(input.reason);
  if (!reason) throw invalid("Enter the correction reason.");
  const payments = asPayments(sale);
  if (payments.some((item) => item.status === "verified")) requireManage(actor);
  if (sale.stage1Date) throw invalid("A sale cannot be corrected after its commission is ready to pay.");
  if (igpPriceBand(input.priceCentavos) !== igpPriceBand(sale.priceCentavos)) throw invalid("A different price band requires reissue.");
  if (input.priceCentavos < totalVerifiedCentavos(payments)) throw invalid("The corrected price is below approved collections.");
  const nextReferrerId = input.referrerMemberId;
  if (nextReferrerId === sale.sellerMemberId) {
    requireManage(actor);
    if (!text(input.referralReference ?? "")) throw invalid("Enter the verified referral reference for the closing seller.");
  }
  if (nextReferrerId) {
    const referrer = (await loadScopeMembers()).find((member) => member.id === nextReferrerId);
    if (!referrer) throw invalid("Choose a valid referrer.");
    assertPartyStanding(referrer, sale.date, "Referrer", await loadAfhomesAccreditations());
    const jad = jadAccreditationOn(await loadAccreditations(), referrer.id, sale.date);
    if (!jad) throw invalid("Referrer needs a JA&D accreditation number effective on the sale date.");
    if (referrer.id !== sale.referrerMemberId) {
      sale.expiryReminders = sale.expiryReminders.filter(({ party }) => party !== "Referrer");
      if (jad.validUntil < sale.date) sale.expiryReminders.push({ party: "Referrer", validUntil: jad.validUntil });
    }
  }
  const referrerChanged = nextReferrerId !== sale.referrerMemberId;
  const previous = `${sale.priceCentavos} / ${sale.referrerMemberId ?? "None"}`;
  sale.priceCentavos = input.priceCentavos;
  sale.referrerMemberId = nextReferrerId;
  if (referrerChanged || input.referralReference !== undefined) {
    const reference = input.referralReference?.trim();
    if (reference) sale.referralReference = reference;
    else delete sale.referralReference;
  }
  if (!nextReferrerId) sale.expiryReminders = sale.expiryReminders.filter(({ party }) => party !== "Referrer");
  await saveDetails(actor, sale, sale.status, [auditOf(sale, BUSINESS_AUDIT_ACTIONS.IGP_SALE_CORRECTED, { previousValue: previous, newValue: `${sale.priceCentavos} / ${sale.referrerMemberId ?? "None"}`, reason })]);
  return sale;
}

export async function actIgp(actor: Actor, action: IgpAction): Promise<IgpSale | null> {
  requireOperation(actor, "igp.enter");
  if (action.type === "threshold") {
    requireManage(actor);
    const reason = text(action.reason);
    if (!reason) throw invalid("Enter the reason.");
    if (!Number.isInteger(action.basisPoints) || action.basisPoints <= 0 || action.basisPoints > 10_000) throw invalid("Enter a percentage greater than zero and at most 100.");
    const settings = await loadSettings();
    const row = await dbRead<{ igpSettingss: Array<{ id: string }> }>(`query { igpSettingss(where: { key: { eq: "igp" } }, limit: 1) { id } }`);
    const id = row.igpSettingss[0]?.id;
    if (!id) throw notFound("IGP settings");
    await transact(actor, {
      variableDefinitions: "$id: UUID!, $d: IgpSettings_Data!",
      fields: "settings: igpSettings_update(id: $id, data: $d)",
      variables: { id, d: { thresholdBp: action.basisPoints } },
      audit: [{ action: BUSINESS_AUDIT_ACTIONS.IGP_THRESHOLD_CHANGED, entityType: "igp-settings", entityId: "igp-threshold", details: { module: "sales", previousValue: String(settings.thresholdBp), newValue: String(action.basisPoints), reason } }],
    });
    return null;
  }
  if (action.type === "grantTierRules") {
    requireManage(actor);
    const reason = text(action.reason);
    if (!reason) throw invalid("Enter the reason.");
    const problem = grantTierRulesProblem(action.rules);
    if (problem) throw invalid(problem);
    const settings = await loadSettings();
    const row = await dbRead<{ igpSettingss: Array<{ id: string }> }>(`query { igpSettingss(where: { key: { eq: "igp" } }, limit: 1) { id } }`);
    const id = row.igpSettingss[0]?.id;
    if (!id) throw notFound("IGP settings");
    const describe = (rules: readonly IgpGrantTierRule[]) => rules.map(({ tier, minPriceCentavos }) => `${tier}:${minPriceCentavos}`).join(", ");
    await transact(actor, {
      variableDefinitions: "$id: UUID!, $d: IgpSettings_Data!",
      fields: "settings: igpSettings_update(id: $id, data: $d)",
      variables: { id, d: { grantTierRules: action.rules.map(({ tier, minPriceCentavos }) => ({ tier, minPriceCentavos })) } },
      audit: [{ action: BUSINESS_AUDIT_ACTIONS.IGP_GRANT_TIER_RULES_CHANGED, entityType: "igp-settings", entityId: "igp-grant-tier-rules", details: { module: "sales", previousValue: describe(settings.grantTierRules), newValue: describe(action.rules), reason } }],
    });
    return null;
  }
  if (action.type === "accredit") {
    requireManage(actor);
    const members = await loadSellerOptions();
    if (!members.some((member) => member.value === action.memberId)) throw invalid("Choose a seller.");
    const approvedDate = businessDate(action.approvedDate, "JA&D approval date");
    const number = text(action.number).toUpperCase();
    const problem = jadNumberProblem(number, approvedDate);
    if (problem) throw invalid(problem);
    const records = await loadAccreditations();
    if (records.some((record) => record.number === number)) throw conflict("jad_number_used", "This JA&D number is already on another accreditation. Check the number on the JA&D paper.");
    const previous = jadAccreditationOn(records, action.memberId, today());
    if (previous && previous.approvedDate >= approvedDate) throw invalid("The renewal date must be after the previous approval date.");
    await transact(actor, {
      variableDefinitions: "$d: IgpAccreditation_Data!",
      fields: "record: igpAccreditation_insert(data: $d)",
      variables: { d: { id: newId(), memberId: action.memberId, number, approvedDate, validUntil: addYearsToDate(approvedDate, 1), replaces: previous?.number ?? undefined } },
      audit: [{ action: BUSINESS_AUDIT_ACTIONS.JAD_ACCREDITATION_RECORDED, entityType: "member", entityId: action.memberId, details: { module: "accreditation", previousValue: previous?.number ?? null, newValue: number, displayReference: number } }],
    });
    return null;
  }
  if (action.type === "record") return recordSale(actor, action.input);

  const sales = await loadIgpSales();
  const sale = findSale(actor, sales, action.id);
  if (sale.status === "cancelled" || sale.status === "replaced" || sale.status === "pending_review") throw conflict("sale_closed", "This Series Number is closed.");

  if (action.type === "reissue") return reissueSale(actor, sale, action.input);
  if (action.type === "correct") return correctSale(actor, sale, action.input);

  if (action.type === "approve") {
    requireManage(actor);
    if (sale.status !== "pending") throw conflict("not_pending", "Only a pending property sale (IGP) can be approved.");
    sale.status = "approved";
    const note = sale.createdBy === actor.userId ? "Self-approved." : null;
    await transact(actor, {
      variableDefinitions: "$id: UUID!, $by: UUID!, $status: String!, $d: Any!",
      fields: "sale: igpSale_update(id: $id, data: { status: $status, approvedById: $by, details: $d })",
      variables: { id: sale.id, by: actor.userId, status: sale.status, d: saleDetails(sale) },
      audit: [auditOf(sale, BUSINESS_AUDIT_ACTIONS.IGP_SALE_APPROVED, { previousValue: "pending", newValue: "approved", ...(note ? { reason: note } : {}) })],
    });
    return (await loadIgpSale(sale.id))!;
  }
  if (action.type === "default") {
    requireManage(actor);
    const reason = text(action.reason);
    if (!reason) throw invalid("Enter the reason.");
    if (!isIgpDefaultReviewDue(sale, asPayments(sale), today())) throw invalid("This sale is not due for a stopped-paying review.");
    sale.status = "defaulted";
    await saveDetails(actor, sale, sale.status, [auditOf(sale, BUSINESS_AUDIT_ACTIONS.IGP_SALE_DEFAULTED, { previousValue: "approved", newValue: "defaulted", reason })]);
    return (await loadIgpSale(sale.id))!;
  }
  if (action.type === "cancel") {
    requireManage(actor);
    const reason = text(action.reason);
    if (!reason) throw invalid("Enter the reason.");
    if (!Number.isSafeInteger(action.refundCentavos) || action.refundCentavos < 0) throw invalid("Enter a valid refund amount.");
    const refundDate = action.refundDate ? businessDate(action.refundDate, "refund date") : null;
    if (action.refundCentavos > 0 && !refundDate) throw invalid("Enter the refund date.");
    const previous = sale.status;
    sale.status = "cancelled";
    sale.refund = { amountCentavos: action.refundCentavos, date: refundDate, reason };
    await saveDetails(actor, sale, sale.status, [auditOf(sale, BUSINESS_AUDIT_ACTIONS.IGP_SALE_CANCELLED, { previousValue: previous, newValue: "cancelled", reason })]);
    return (await loadIgpSale(sale.id))!;
  }

  // The remaining action is a document signing.
  const document = sale.documents.find((item) => item.key === action.key);
  if (!document) throw invalid("This document does not apply to the sale.");
  const signedDate = businessDate(action.signedDate, "signature date");
  const signers = text(action.signers);
  if (!signers) throw invalid("Enter the signers.");
  const payments = asPayments(sale);
  if (document.key === "deed" || document.key === "formal_grant" || document.key === "lease" || document.key === "spa") {
    if (!sale.fullPaymentDate) throw invalid("Record full approved payment before completing this document.");
  }
  if (document.key === "cts" || document.key === "goodwill_grant") {
    if (sale.entry !== "cts" && !payments.some((payment) => payment.status === "verified" && payment.purpose !== "reservation")) throw invalid("Record an approved installment before completing this document.");
  }
  const previous = document.signedDate;
  Object.assign(document, { status: "signed", signedDate, signers });
  let membershipExtra: { definitions: string; fields: string; variables: Record<string, unknown> } | undefined;
  const audits = [auditOf(sale, BUSINESS_AUDIT_ACTIONS.IGP_DOCUMENT_RECORDED, { previousValue: previous, newValue: signedDate, reason: action.key })];
  if (document.key === "formal_grant" && sale.grantTier === undefined) {
    const settings = await loadSettings();
    sale.grantTier = igpGrantTier(sale.priceCentavos, settings.grantTierRules);
    const membershipId = newId();
    membershipExtra = {
      definitions: "$m: IgpBuyerMembership_Data!",
      fields: "membership: igpBuyerMembership_insert(data: $m)",
      variables: { m: { id: membershipId, saleId: sale.id, seriesNumber: sale.seriesNumber, customerId: sale.customerId, tier: sale.grantTier ?? undefined, grantSignedDate: signedDate, status: "recorded", stayPoints: "none" } },
    };
    audits.push(auditOf(sale, BUSINESS_AUDIT_ACTIONS.IGP_GRANT_TIER_FROZEN, { newValue: sale.grantTier ?? "none", relatedRecordIds: [membershipId] }));
  }
  await saveDetails(actor, sale, sale.status, audits, membershipExtra);
  return (await loadIgpSale(sale.id))!;
}

export async function importIgpHistory(actor: Actor, input: { fileName: string; records: IgpHistoryRecord[]; declaration: boolean }): Promise<IgpHistoryBatch> {
  requireOperation(actor, "igp.enter");
  requireManage(actor);
  if (!input.declaration) throw invalid("Confirm that the rows come from official company records.");
  if (input.records.length === 0) throw invalid("The file has no rows to import.");
  if (input.records.length > MAX_IMPORT_ROWS) throw invalid(`A file may contain at most ${MAX_IMPORT_ROWS.toLocaleString("en-PH")} rows.`);
  const [sales, batches] = await Promise.all([loadIgpSales(), loadHistoryBatches()]);
  const taken = [...sales.map((sale) => sale.seriesNumber), ...batches.flatMap((batch) => batch.rows.map((row) => row.seriesNumber))];
  const rows = buildIgpHistoryImportRows(input.records, { taken, today: today() });
  const ready = rows.filter((row) => row.status === "ready");
  if (ready.length === 0) throw invalid("No row can be imported. Fix the file and try again.");
  const id = newId();
  const batch: IgpHistoryBatch = {
    id, fileName: text(input.fileName).slice(0, 200) || "upload", createdAt: nowIso(), createdBy: actor.userId, status: "imported",
    totalRows: rows.length, rows: ready.map((row) => row.row!), skipped: rows.filter((row) => row.status === "invalid").map((row) => ({ rowNumber: row.rowNumber, reason: row.errors.join(" ") })),
  };
  await transact(actor, {
    variableDefinitions: "$d: IgpHistoryBatch_Data!",
    fields: "batch: igpHistoryBatch_insert(data: $d)",
    variables: { d: { id, fileName: batch.fileName, createdById: actor.userId, totalRows: batch.totalRows, rows: batch.rows, skipped: batch.skipped } },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.IGP_HISTORY_IMPORTED, entityType: "igp-history-batch", entityId: id, details: { module: "sales", newValue: `imported;rows:${batch.rows.length};skipped:${batch.skipped.length}`, displayReference: batch.fileName, relatedRecordIds: batch.rows.map((row) => row.seriesNumber) } }],
  });
  return batch;
}
