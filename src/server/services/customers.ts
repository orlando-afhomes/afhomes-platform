import "server-only";
import { ApiError } from "@/server/api/errors";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import { applyCustomerInput } from "@/modules/customers/apply-input";
import { customerAttributionErrors } from "@/modules/customers/attribution";
import { currentManilaYear, nextCustomerId } from "@/modules/customers/customer-number";
import { buildImportRows, MAX_EXPORT_ROWS, MAX_IMPORT_ROWS, type CustomerImportJob, type CustomerImportRecord } from "@/modules/customers/import";
import { approvalErrors, canReviewRegistration, isEditableRegistration } from "@/modules/customers/review";
import { composeCustomerName, restrictCustomer, validateCustomerForSubmit } from "@/modules/customers/rules";
import type { Customer, CustomerDraftInput } from "@/modules/customers/types";
import { hasOperationPermission } from "@/modules/identity/permissions";
import { BROAD_ROLES, activeIdentityRoles, getVisibleCustomerIds, getVisibleMemberIds } from "@/modules/identity/record-scope";
import { isSellableProduct } from "@/modules/vip/tier-options";
import type { Actor } from "@/server/auth/actor";
import { loadScopeMembers, requireOperation } from "@/server/auth/authorize";
import { listAll, uniqueViolation } from "@/server/db";
import {
  customerColumns,
  highestCustomerNumberForYear,
  loadCustomer,
  loadCustomerDuplicateCandidates,
  loadCustomers,
  loadCustomersByNumbers,
} from "@/server/repositories/records";
import { loadPaymentSchemes, loadProducts } from "@/server/repositories/catalog";
import { attachCustomerIdentityImage, customerIdentityFileOf, deleteCustomerIdentityFile, downloadCustomerIdentityImage } from "@/server/storage";
import { conflict, invalid, newId, notFound, nowIso, today, transact } from "@/server/services/common";
import { normalizePhilippineMobile } from "@/shared/utils/input-sanitizers";
import type { OrgMember } from "@/modules/organization/types";

const isBroad = (actor: Actor) => activeIdentityRoles(actor.identity).some((role) => BROAD_ROLES.has(role));
const canManage = (actor: Actor) => hasOperationPermission(actor.identity, "customers.manage");

function failValidation(errors: Record<string, string | undefined>): never {
  throw invalid("Check the highlighted fields.", errors as Record<string, string>);
}

/** The client never receives the private storage path; it receives an authenticated file URL instead. */
export function clientCustomer(customer: Customer): Customer {
  const file = customerIdentityFileOf(customer as unknown as Record<string, unknown>);
  const { identityFile: _file, ...rest } = customer as Customer & { identityFile?: unknown };
  void _file;
  if (!file) return rest as Customer;
  return { ...rest, governmentIdImage: { fileName: file.fileName, dataUrl: `/api/v1/customers/${customer.id}/id-image/${file.fileId}` } } as Customer;
}

/** Full record for the owner and office roles, a restricted projection for downline views (doc 04 section 11). */
function visibleTo(actor: Actor, customers: Customer[], members: OrgMember[]): Customer[] {
  const memberIds = getVisibleMemberIds(actor.identity, { members });
  const ids = getVisibleCustomerIds(actor.identity, { customers }, memberIds);
  const broad = isBroad(actor);
  return customers.filter((customer) => ids.has(customer.id)).map((customer) => (broad || customer.ownerMemberId === actor.identity.memberId ? customer : restrictCustomer(customer)));
}

export async function listCustomers(actor: Actor, query: { limit: number; afterId?: string }) {
  const visible = visibleTo(actor, await loadCustomers(), await loadScopeMembers()).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const remaining = query.afterId === undefined ? visible : visible.filter((item) => item.id > query.afterId!);
  const items = remaining.slice(0, query.limit).map(clientCustomer);
  return { items, total: visible.length, nextCursor: remaining.length > items.length ? items.at(-1)!.id : null };
}

/** The owner or an office role; anything else is reported as not found so a record's existence is not leaked. */
async function ownRecord(actor: Actor, id: string): Promise<Customer> {
  const customer = await loadCustomer(id);
  if (!customer || (!isBroad(actor) && customer.ownerMemberId !== actor.identity.memberId)) throw notFound("Customer");
  return customer;
}

function assertReferences(members: OrgMember[], input: CustomerDraftInput, products: readonly Awaited<ReturnType<typeof loadProducts>>[number][], schemes: readonly Awaited<ReturnType<typeof loadPaymentSchemes>>[number][]): void {
  if (input.recommenderMemberId && !members.some((item) => item.id === input.recommenderMemberId)) throw invalid("The referrer must be a Sales Network seller.");
  if (input.vipPlan && !products.some((item) => item.code === input.vipPlan && isSellableProduct(item))) throw invalid("The selected VIP plan is not approved and active.");
  if (input.paymentSchemeId && !schemes.some((item) => item.id === input.paymentSchemeId)) throw invalid("The selected payment plan does not exist.");
  if (input.supplementaryHolder && !supplementaryAllowed(input.vipPlan, products)) throw invalid("The selected VIP plan does not allow an extra cardholder.");
}

function supplementaryAllowed(plan: CustomerDraftInput["vipPlan"], products: readonly Awaited<ReturnType<typeof loadProducts>>[number][]): boolean {
  return (products.find((item) => item.code === plan)?.supplementaryHolders ?? 0) > 0;
}

// shortcut: accreditation records are now in the database (F2), but the customer attribution rules keep their own
// pending-seller check; wire the shared standing check when the sale workflow is connected in F4.
function assertAttribution(actor: Actor, members: OrgMember[], input: CustomerDraftInput): void {
  if (!input.recommenderMemberId && !input.referrerMemberId) return;
  const visibleIds = getVisibleMemberIds(actor.identity, { members });
  const unavailable: Record<string, string> = {};
  for (const field of ["recommenderMemberId", "referrerMemberId"] as const) {
    const id = input[field];
    if (id && (!visibleIds.has(id) || !members.some((member) => member.id === id))) unavailable[field] = "Choose a seller available to your account.";
  }
  if (Object.keys(unavailable).length > 0) failValidation(unavailable);
  const errors = customerAttributionErrors(input, null);
  if (Object.keys(errors).length > 0) failValidation(errors as Record<string, string>);
}

function step(customer: Customer, actor: Actor, status: Customer["status"], reason: string | null = null) {
  (customer.statusHistory ??= []).push({ status, at: nowIso(), actorId: actor.userId, ...(reason ? { reason } : {}) });
}

/** The closing seller is ownerMemberId; office roles may name or change it until approval (doc 04 section 7.8). */
function assignClosingSeller(members: OrgMember[], customer: Customer, input: CustomerDraftInput): void {
  if (!input.ownerMemberId || input.ownerMemberId === customer.ownerMemberId) return;
  if (!members.some((member) => member.id === input.ownerMemberId)) failValidation({ ownerMemberId: "Choose a seller from the Sales Network." });
  customer.ownerMemberId = input.ownerMemberId;
}

export async function createCustomerDraft(actor: Actor, input: CustomerDraftInput): Promise<Customer> {
  requireOperation(actor, "customers.draft");
  const members = await loadScopeMembers();
  const [products, schemes] = await Promise.all([loadProducts(), loadPaymentSchemes()]);
  assertAttribution(actor, members, input);
  assertReferences(members, input, products, schemes);
  const ownerFromInput = !actor.identity.memberId && input.ownerMemberId ? members.find((member) => member.id === input.ownerMemberId) : undefined;
  const ownerMemberId = actor.identity.memberId ?? ownerFromInput?.id ?? null;
  const owner = members.find((member) => member.id === ownerMemberId);
  const branchId = input.branchId ?? owner?.branchId ?? actor.identity.branchId;
  if (!branchId) failValidation({ ownerMemberId: "Choose the closing seller so the branch can be set." });
  const customer: Customer = { id: newId(), displayName: (composeCustomerName(input) || input.displayName).trim(), branchId, ownerMemberId, status: "draft", createdAt: today(), submittedAt: null };
  applyCustomerInput(customer, input);
  const { columns, profile } = customerColumns(customer);
  await transact(actor, {
    variableDefinitions: "$d: Customer_Data!",
    fields: "customer: customer_insert(data: $d)",
    variables: { d: { id: customer.id, ...columns, profile } },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.CUSTOMER_DRAFT_CREATED, entityType: "customer", entityId: customer.id, details: { module: "customers", newValue: "draft" } }],
  });
  return clientCustomer(customer);
}

/** Writes the record back only while it is still in one of the expected states (a concurrent change makes this fail with 409). */
async function saveCustomer(actor: Actor, customer: Customer, fromStatuses: string[], audit: { action: string; details: Record<string, unknown> }): Promise<void> {
  const { columns, profile } = customerColumns(customer);
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $from: [String!]!, $displayName: String!, $owner: UUID, $status: String!, $number: String, $profile: Any!",
    fields: `upd: customer_updateMany(where: { id: { eq: $id }, status: { in: $from } }, data: { displayName: $displayName, ownerMemberId: $owner, status: $status, customerNumber: $number, profile: $profile })
query @redact { customer(id: $id) @check(expr: "response.upd == 1", message: "STALE_CUSTOMER") { id } }`,
    variables: { id: customer.id, from: fromStatuses, displayName: columns.displayName, owner: columns.ownerMemberId ?? null, status: columns.status, number: columns.customerNumber ?? null, profile },
    audit: [{ action: audit.action, entityType: "customer", entityId: customer.id, details: { module: "customers", ...audit.details } }],
    markers: { STALE_CUSTOMER: conflict("customer_changed", "This customer changed while you were working. Reload and try again.") },
  });
}

export async function updateCustomerDraft(actor: Actor, id: string, input: CustomerDraftInput): Promise<Customer> {
  if (!hasOperationPermission(actor.identity, "customers.draft") && !canManage(actor)) throw new ApiError(403, "forbidden", "Customer draft update is not allowed for this account.");
  const customer = await ownRecord(actor, id);
  const editable = customer.status === "draft" || (customer.status === "sent_back" && canManage(actor));
  if (!editable) throw conflict("not_editable", "Only draft customers can be updated.");
  const members = await loadScopeMembers();
  const [products, schemes] = await Promise.all([loadProducts(), loadPaymentSchemes()]);
  assertAttribution(actor, members, input);
  assertReferences(members, input, products, schemes);
  assignClosingSeller(members, customer, input);
  applyCustomerInput(customer, input);
  await saveCustomer(actor, customer, [customer.status], { action: BUSINESS_AUDIT_ACTIONS.CUSTOMER_DRAFT_UPDATED, details: { newValue: "draft" } });
  return clientCustomer(customer);
}

export async function discardCustomerDraft(actor: Actor, id: string): Promise<void> {
  requireOperation(actor, "customers.draft");
  const customer = await ownRecord(actor, id);
  if (customer.status !== "draft") throw conflict("not_draft", "Only draft customers can be discarded.");
  await transact(actor, {
    variableDefinitions: "$id: UUID!",
    fields: "customer: customer_delete(id: $id)",
    variables: { id },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.CUSTOMER_DRAFT_DISCARDED, entityType: "customer", entityId: id, details: { module: "customers", previousValue: "draft" } }],
  });
  await deleteCustomerIdentityFile(customer as unknown as Record<string, unknown>);
}

export async function submitCustomer(actor: Actor, id: string, input: CustomerDraftInput): Promise<Customer> {
  requireOperation(actor, "customers.manage");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const customer = await ownRecord(actor, id);
    if (!isEditableRegistration(customer.status)) throw conflict("not_submittable", "Only draft or sent-back customers can be submitted.");
    const previousStatus = customer.status;
    const members = await loadScopeMembers();
    const [products, schemes] = await Promise.all([loadProducts(), loadPaymentSchemes()]);
    const merged: CustomerDraftInput = {
      ...customer, ...input,
      displayName: input.displayName || customer.displayName,
      customerIdMode: input.customerIdMode ?? customer.customerIdMode,
      recommenderMemberId: input.recommenderMemberId === undefined ? customer.recommenderMemberId : input.recommenderMemberId,
      referrerMemberId: input.referrerMemberId === undefined ? customer.referrerMemberId : input.referrerMemberId,
    };
    // Doc 04 section 7.7: only Submit consumes the official Customer ID sequence; drafts never do.
    const year = currentManilaYear();
    const requestedNumber = typeof merged.customerNumber === "string" ? merged.customerNumber.trim() : "";
    const assignsNumber = !customer.customerNumber && (merged.customerIdMode === "auto" || (merged.customerIdMode === undefined && requestedNumber === ""));
    if (assignsNumber) merged.customerNumber = nextCustomerId([{ customerNumber: await highestCustomerNumberForYear(year) }], year);
    const numberCandidates = !assignsNumber && requestedNumber ? await loadCustomersByNumbers([requestedNumber]) : [];
    const errors = validateCustomerForSubmit(merged, numberCandidates, customer.id, supplementaryAllowed(merged.vipPlan, products));
    if (Object.keys(errors).length > 0) failValidation(errors as Record<string, string>);
    assertAttribution(actor, members, merged);
    assertReferences(members, merged, products, schemes);
    assignClosingSeller(members, customer, input);
    applyCustomerInput(customer, input);
    if (assignsNumber) customer.customerNumber = merged.customerNumber;
    customer.status = "submitted";
    customer.submittedAt = today();
    customer.reviewReason = null;
    step(customer, actor, "submitted");
    try {
      await saveCustomer(actor, customer, ["draft", "sent_back"], { action: BUSINESS_AUDIT_ACTIONS.CUSTOMER_SUBMITTED, details: { previousValue: previousStatus, newValue: assignsNumber ? `submitted; customerNumber:${customer.customerNumber}` : "submitted" } });
      return clientCustomer(customer);
    } catch (error) {
      if (assignsNumber && uniqueViolation(error) === "customer_customerNumber_uidx") continue;
      if (uniqueViolation(error) === "customer_customerNumber_uidx") failValidation({ customerNumber: "This Customer ID is already used by another customer." });
      throw error;
    }
  }
  throw conflict("number_busy", "Could not assign a Customer ID. Try again.");
}

export async function approveCustomer(actor: Actor, id: string): Promise<Customer> {
  requireOperation(actor, "customers.approve");
  const customer = await ownRecord(actor, id);
  if (!canReviewRegistration(customer.status)) throw conflict("not_reviewable", "Only a submitted registration can be reviewed.");
  const errors = approvalErrors(customer, [], today());
  if (Object.keys(errors).length > 0) failValidation(errors as Record<string, string>);
  customer.status = "approved";
  customer.approvedAt = today();
  customer.reviewReason = null;
  step(customer, actor, "approved");
  await saveCustomer(actor, customer, ["submitted"], { action: BUSINESS_AUDIT_ACTIONS.CUSTOMER_APPROVED, details: { previousValue: "submitted", newValue: "approved" } });
  return clientCustomer(customer);
}

async function reviewCustomer(actor: Actor, id: string, reason: string, status: "sent_back" | "rejected", action: string): Promise<Customer> {
  requireOperation(actor, "customers.approve");
  const text = reason.trim();
  if (!text) throw invalid("A reason is required.");
  const customer = await ownRecord(actor, id);
  if (!canReviewRegistration(customer.status)) throw conflict("not_reviewable", "Only a submitted registration can be reviewed.");
  customer.status = status;
  customer.reviewReason = text;
  step(customer, actor, status, text);
  await saveCustomer(actor, customer, ["submitted"], { action, details: { previousValue: "submitted", newValue: status, reason: text } });
  return clientCustomer(customer);
}

export const sendBackCustomer = (actor: Actor, id: string, reason: string) => reviewCustomer(actor, id, reason, "sent_back", BUSINESS_AUDIT_ACTIONS.CUSTOMER_SENT_BACK);
export const rejectCustomer = (actor: Actor, id: string, reason: string) => reviewCustomer(actor, id, reason, "rejected", BUSINESS_AUDIT_ACTIONS.CUSTOMER_REJECTED);

export async function correctCustomer(actor: Actor, id: string, input: CustomerDraftInput, reason: string): Promise<Customer> {
  requireOperation(actor, "customers.manage");
  if (!reason.trim()) throw invalid("A reason is required for a data correction.");
  const customer = await ownRecord(actor, id);
  if (isEditableRegistration(customer.status)) throw conflict("edit_directly", "Draft customers are edited directly.");
  if (customer.status === "rejected") throw conflict("rejected", "A rejected registration cannot be corrected.");
  const members = await loadScopeMembers();
  const [products, schemes] = await Promise.all([loadProducts(), loadPaymentSchemes()]);
  const merged = { ...customer, ...input, displayName: input.displayName || customer.displayName } as CustomerDraftInput;
  const requestedNumber = typeof merged.customerNumber === "string" ? merged.customerNumber.trim() : "";
  const numberCandidates = requestedNumber ? await loadCustomersByNumbers([requestedNumber]) : [];
  const errors = validateCustomerForSubmit(merged, numberCandidates, customer.id, supplementaryAllowed(merged.vipPlan, products));
  if (Object.keys(errors).length > 0) failValidation(errors as Record<string, string>);
  assertReferences(members, merged, products, schemes);
  const previousNumber = customer.customerNumber ?? null;
  assignClosingSeller(members, customer, input);
  applyCustomerInput(customer, input);
  const nextNumber = customer.customerNumber ?? null;
  const numberChange = nextNumber !== previousNumber
    ? { previousValue: `customerNumber:${previousNumber ?? "none"}`, newValue: `customerNumber:${nextNumber ?? "none"}` }
    : { newValue: customer.status };
  await saveCustomer(actor, customer, [customer.status], { action: BUSINESS_AUDIT_ACTIONS.CUSTOMER_CORRECTED, details: { ...numberChange, reason: reason.trim() } });
  return clientCustomer(customer);
}

// ---------------------------------------------------------------- import and export
function importCandidates(records: readonly CustomerImportRecord[]) {
  const emails = new Set<string>();
  const mobiles = new Set<string>();
  const names = new Set<string>();
  const numbers = new Set<string>();
  for (const record of records) {
    const email = record["Email"]?.trim().toLowerCase();
    if (email) emails.add(email);
    const mobile = record["Mobile number"]?.trim();
    if (mobile) mobiles.add(normalizePhilippineMobile(mobile));
    const first = record["First name"]?.trim().toLowerCase();
    const last = record["Last name"]?.trim().toLowerCase();
    if (first && last) names.add(`${first}|${last}`);
    const number = record["Customer ID"]?.trim();
    if (number) numbers.add(number);
  }
  return { emails: [...emails], mobiles: [...mobiles], names: [...names], numbers: [...numbers] };
}

function importedDraft(actor: Actor, input: CustomerDraftInput): Customer {
  const ownerMemberId = input.ownerMemberId ?? null;
  const customer: Customer = {
    id: newId(),
    displayName: (composeCustomerName(input) || input.displayName).trim(),
    branchId: input.branchId ?? actor.identity.branchId ?? "branch-a",
    ownerMemberId,
    status: "draft",
    createdAt: today(),
    submittedAt: null,
  };
  applyCustomerInput(customer, input);
  return customer;
}

export async function importCustomers(actor: Actor, input: { fileName: string; records: CustomerImportRecord[]; declaration: boolean }): Promise<CustomerImportJob> {
  requireOperation(actor, "customers.import");
  if (!input.declaration) throw invalid("Confirm that the rows come from official company records.");
  if (input.records.length === 0) throw invalid("The file has no rows to import.");
  if (input.records.length > MAX_IMPORT_ROWS) throw invalid(`A file may contain at most ${MAX_IMPORT_ROWS} rows.`);
  const [products, schemes] = await Promise.all([loadProducts(), loadPaymentSchemes()]);
  const candidates = importCandidates(input.records);
  const [byIdentity, byNumber] = await Promise.all([
    loadCustomerDuplicateCandidates(candidates),
    loadCustomersByNumbers(candidates.numbers),
  ]);
  const existing = [...new Map([...byIdentity, ...byNumber].map((customer) => [customer.id, customer])).values()];
  const rows = buildImportRows(input.records, { existing, products, schemes });
  const jobId = newId();
  const ready = rows.filter((row) => row.status === "ready");
  const drafts = ready.map((row) => importedDraft(actor, row.input));
  const createdCustomerIds = drafts.map((customer) => customer.id);
  const job = {
    id: jobId,
    fileName: input.fileName.trim().slice(0, 200) || "upload",
    createdAt: nowIso(),
    actorId: actor.userId,
    totalRows: rows.length,
    createdCount: drafts.length,
    needsReviewCount: rows.filter((row) => row.status === "needs_review").length,
    invalidCount: rows.filter((row) => row.status === "invalid").length,
    createdCustomerIds,
  } satisfies CustomerImportJob;
  const definitions = ["$job: CustomerImportJob_Data!", "$rows: [CustomerImportRow_Data!]!", ...(drafts.length > 0 ? ["$customers: [Customer_Data!]!"] : [])];
  const fields = ["job: customerImportJob_insert(data: $job)", "rows: customerImportRow_insertMany(data: $rows)", ...(drafts.length > 0 ? ["customers: customer_insertMany(data: $customers)"] : [])];
  await transact(actor, {
    variableDefinitions: definitions.join(", "),
    fields: fields.join("\n"),
    variables: {
      job: { id: jobId, actorId: actor.userId, fileName: job.fileName, totalRows: job.totalRows, createdCount: job.createdCount, needsReviewCount: job.needsReviewCount, invalidCount: job.invalidCount, createdCustomerIds },
      rows: rows.map((row) => ({ jobId, rowNumber: row.rowNumber, status: row.status, errors: row.errors, warnings: row.warnings })),
      ...(drafts.length > 0
        ? { customers: drafts.map((customer) => { const { columns, profile } = customerColumns(customer); return { id: customer.id, ...columns, profile }; }) }
        : {}),
    },
    audit: [
      ...drafts.map((customer) => ({ action: BUSINESS_AUDIT_ACTIONS.CUSTOMER_DRAFT_CREATED, entityType: "customer" as const, entityId: customer.id, details: { module: "customers", newValue: "draft", reason: `Imported in ${jobId}` } })),
      { action: BUSINESS_AUDIT_ACTIONS.CUSTOMER_IMPORT_COMPLETED, entityType: "customer-import", entityId: jobId, details: { module: "customers", newValue: `created:${job.createdCount}/review:${job.needsReviewCount}/invalid:${job.invalidCount}` } },
    ],
  });
  return job;
}

export async function listCustomerImportJobs(actor: Actor): Promise<CustomerImportJob[]> {
  if (!hasOperationPermission(actor.identity, "customers.import")) return [];
  const rows = await listAll<{ id: string; fileName: string; actor: { id: string } | null; totalRows: number; createdCount: number; needsReviewCount: number; invalidCount: number; createdCustomerIds: string[] | null; createdAt: string }>(
    "customerImportJobs",
    "id fileName actor { id } totalRows createdCount needsReviewCount invalidCount createdCustomerIds createdAt",
    { orderBy: "[{ createdAt: DESC }]" },
  );
  return rows.map((row) => ({
    id: row.id,
    fileName: row.fileName,
    createdAt: row.createdAt,
    actorId: row.actor?.id ?? "",
    totalRows: row.totalRows,
    createdCount: row.createdCount,
    needsReviewCount: row.needsReviewCount,
    invalidCount: row.invalidCount,
    createdCustomerIds: row.createdCustomerIds ?? [],
  }));
}

export async function exportCustomers(actor: Actor, input: { format: "xlsx" | "csv" | "pdf"; count: number }): Promise<Customer[]> {
  requireOperation(actor, "customers.import");
  const visible = visibleTo(actor, await loadCustomers(), await loadScopeMembers()).filter((customer) => !customer.restricted).slice(0, MAX_EXPORT_ROWS);
  await transact(actor, {
    variableDefinitions: "",
    fields: "",
    variables: {},
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.CUSTOMERS_EXPORTED, entityType: "customer-export", entityId: input.format, details: { module: "customers", newValue: `rows:${Math.min(input.count, visible.length)}` } }],
  });
  return visible.map(clientCustomer);
}

// ---------------------------------------------------------------- private ID image
async function assertCanSeeCustomer(actor: Actor, id: string): Promise<Customer> {
  return ownRecord(actor, id);
}

export async function uploadCustomerIdImage(actor: Actor, id: string, bytes: Buffer, originalName: string | null) {
  const customer = await assertCanSeeCustomer(actor, id);
  if (!hasOperationPermission(actor.identity, "customers.draft") && !canManage(actor)) throw new ApiError(403, "forbidden", "This account cannot change the customer image.");
  return attachCustomerIdentityImage(actor, id, customer as unknown as Record<string, unknown>, bytes, originalName);
}

export async function downloadCustomerIdImage(actor: Actor, id: string, fileId: string) {
  const customer = await assertCanSeeCustomer(actor, id);
  return downloadCustomerIdentityImage(id, customer as unknown as Record<string, unknown>, fileId);
}
