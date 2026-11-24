import "server-only";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import { applyCustomerInput } from "@/modules/customers/apply-input";
import { customerAttributionErrors } from "@/modules/customers/attribution";
import { currentManilaYear, nextCustomerId } from "@/modules/customers/customer-number";
import { approvalErrors, canReviewRegistration, isEditableRegistration } from "@/modules/customers/review";
import { composeCustomerName, restrictCustomer, validateCustomerForSubmit } from "@/modules/customers/rules";
import type { Customer, CustomerDraftInput } from "@/modules/customers/types";
import { BROAD_ROLES, activeIdentityRoles, getVisibleCustomerIds, getVisibleMemberIds } from "@/modules/identity/record-scope";
import { isSellableProduct } from "@/modules/vip/tier-options";
import type { Actor } from "@/server/auth/actor";
import { loadScopeMembers, requireOperation } from "@/server/auth/authorize";
import { uniqueViolation } from "@/server/db";
import { customerColumns, loadCustomer, loadCustomers } from "@/server/repositories/records";
import { CATALOG, conflict, invalid, newId, notFound, nowIso, today, transact } from "@/server/services/common";
import type { OrgMember } from "@/modules/organization/types";

const isBroad = (actor: Actor) => activeIdentityRoles(actor.identity).some((role) => BROAD_ROLES.has(role));

function failValidation(errors: Record<string, string>): never {
  throw invalid("Check the highlighted fields.", errors);
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
  const items = remaining.slice(0, query.limit);
  return { items, total: visible.length, nextCursor: remaining.length > items.length ? items.at(-1)!.id : null };
}

/** The owner or an office role; anything else is reported as not found so a record's existence is not leaked. */
async function ownRecord(actor: Actor, id: string): Promise<Customer> {
  const customer = await loadCustomer(id);
  if (!customer || (!isBroad(actor) && customer.ownerMemberId !== actor.identity.memberId)) throw notFound("Customer");
  return customer;
}

function assertReferences(members: OrgMember[], input: CustomerDraftInput): void {
  if (input.recommenderMemberId && !members.some((item) => item.id === input.recommenderMemberId)) throw invalid("The referrer must be a Sales Network seller.");
  if (input.vipPlan && !CATALOG.products.some((item) => item.code === input.vipPlan && isSellableProduct(item))) throw invalid("The selected VIP plan is not approved and active.");
  if (input.paymentSchemeId && !CATALOG.paymentSchemes.some((item) => item.id === input.paymentSchemeId)) throw invalid("The selected payment plan does not exist.");
  if (input.supplementaryHolder && !supplementaryAllowed(input.vipPlan)) throw invalid("The selected VIP plan does not allow an extra cardholder.");
}

function supplementaryAllowed(plan: CustomerDraftInput["vipPlan"]): boolean {
  return (CATALOG.products.find((item) => item.code === plan)?.supplementaryHolders ?? 0) > 0;
}

// shortcut: accreditation records are not in the pilot schema, so no seller is held back as "pending" or judged by standing.
// Add the accreditation check with the sales-network module.
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

export async function createCustomerDraft(actor: Actor, input: CustomerDraftInput): Promise<Customer> {
  requireOperation(actor, "customers.draft");
  const members = await loadScopeMembers();
  assertAttribution(actor, members, input);
  assertReferences(members, input);
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
  return customer;
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

export async function submitCustomer(actor: Actor, id: string, input: CustomerDraftInput): Promise<Customer> {
  requireOperation(actor, "customers.manage");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const customer = await ownRecord(actor, id);
    if (!isEditableRegistration(customer.status)) throw conflict("not_submittable", "Only draft or sent-back customers can be submitted.");
    const previousStatus = customer.status;
    const members = await loadScopeMembers();
    const merged: CustomerDraftInput = {
      ...customer, ...input,
      displayName: input.displayName || customer.displayName,
      customerIdMode: input.customerIdMode ?? customer.customerIdMode,
      recommenderMemberId: input.recommenderMemberId === undefined ? customer.recommenderMemberId : input.recommenderMemberId,
      referrerMemberId: input.referrerMemberId === undefined ? customer.referrerMemberId : input.referrerMemberId,
    };
    // Doc 04 section 7.7: only Submit consumes the official Customer ID sequence; drafts never do.
    // shortcut: all customers are loaded to find the next number and check duplicates. Use an indexed query when the customers module lands.
    const all = await loadCustomers();
    const requestedNumber = typeof merged.customerNumber === "string" ? merged.customerNumber.trim() : "";
    const assignsNumber = !customer.customerNumber && (merged.customerIdMode === "auto" || (merged.customerIdMode === undefined && requestedNumber === ""));
    if (assignsNumber) merged.customerNumber = nextCustomerId(all, currentManilaYear());
    const errors = validateCustomerForSubmit(merged, all, customer.id, supplementaryAllowed(merged.vipPlan));
    if (Object.keys(errors).length > 0) failValidation(errors as Record<string, string>);
    assertAttribution(actor, members, merged);
    assertReferences(members, merged);
    assignClosingSeller(members, customer, input);
    applyCustomerInput(customer, input);
    if (assignsNumber) customer.customerNumber = merged.customerNumber;
    customer.status = "submitted";
    customer.submittedAt = today();
    customer.reviewReason = null;
    step(customer, actor, "submitted");
    try {
      await saveCustomer(actor, customer, ["draft", "sent_back"], { action: BUSINESS_AUDIT_ACTIONS.CUSTOMER_SUBMITTED, details: { previousValue: previousStatus, newValue: assignsNumber ? `submitted; customerNumber:${customer.customerNumber}` : "submitted" } });
      return customer;
    } catch (error) {
      // Another submission took the same automatic number first: read the numbers again and retry.
      if (assignsNumber && uniqueViolation(error) === "customer_customerNumber_uidx") continue;
      if (uniqueViolation(error) === "customer_customerNumber_uidx") failValidation({ customerNumber: "This Customer ID is already used by another customer." });
      throw error;
    }
  }
  throw conflict("number_busy", "Could not assign a Customer ID. Try again.");
}

/** Office roles may name or change the closing seller until the registration is approved (doc 04 section 7.8). */
function assignClosingSeller(members: OrgMember[], customer: Customer, input: CustomerDraftInput) {
  if (!input.ownerMemberId || input.ownerMemberId === customer.ownerMemberId) return;
  if (!members.some((member) => member.id === input.ownerMemberId)) failValidation({ ownerMemberId: "Choose a seller from the Sales Network." });
  customer.ownerMemberId = input.ownerMemberId;
}

export async function approveCustomer(actor: Actor, id: string): Promise<Customer> {
  requireOperation(actor, "customers.approve");
  const customer = await ownRecord(actor, id);
  if (!canReviewRegistration(customer.status)) throw conflict("not_reviewable", "Only a submitted registration can be reviewed.");
  // shortcut: accreditation records are not in the pilot schema, so only the seller and referral-reference rules apply.
  const errors = approvalErrors(customer, [], today());
  if (Object.keys(errors).length > 0) failValidation(errors as Record<string, string>);
  customer.status = "approved";
  customer.approvedAt = today();
  customer.reviewReason = null;
  step(customer, actor, "approved");
  await saveCustomer(actor, customer, ["submitted"], { action: BUSINESS_AUDIT_ACTIONS.CUSTOMER_APPROVED, details: { previousValue: "submitted", newValue: "approved" } });
  return customer;
}
