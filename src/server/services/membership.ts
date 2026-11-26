import "server-only";
import type { CustomerLookupResult, MembershipView } from "@/data/contracts/membership-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import type { Contract } from "@/modules/contracts/types";
import { approvedCollectionMilestone } from "@/modules/finance/rules";
import { canSeeContractRecord } from "@/modules/identity/record-scope";
import { checkActivationEligibility, computeValidityEnd } from "@/modules/membership/rules";
import type { CardServiceInput, Membership } from "@/modules/membership/types";
import { addYearsToDate } from "@/shared/lib/dates";
import type { Actor } from "@/server/auth/actor";
import { requireOperation } from "@/server/auth/authorize";
import type { CommissionEffects } from "@/server/services/commissions";
import { ledgerOf, transferClosure } from "@/server/services/stay-points-ledger";
import { loadContract, loadCustomers, loadMembership, loadMemberships, loadPaymentsOfContract } from "@/server/repositories/records";
import { loadProducts } from "@/server/repositories/catalog";
import { conflict, invalid, newId, notFound, nowIso, today, transact, type AuditSpec } from "@/server/services/common";

const historyEvent = (membership: Membership, actorId: string, event: string, note: string | null = null) => [
  ...(membership.history ?? []),
  { at: nowIso(), actorId, event, note },
];

const visibleContract = async (actor: Actor, contractId: string): Promise<Contract> => {
  const found = await loadContract(contractId);
  if (!found || !canSeeContractRecord(actor.identity, found.contract)) throw notFound("Membership");
  return found.contract;
};

/** Membership rows the person may see, with the activation readiness the screens show (doc 09 §5.1). */
export async function list(actor: Actor): Promise<MembershipView[]> {
  const [memberships, customers, products] = await Promise.all([loadMemberships(), loadCustomers(), loadProducts()]);
  const views: MembershipView[] = [];
  for (const membership of memberships) {
    const contract = await loadContract(membership.contractId);
    if (!contract || !canSeeContractRecord(actor.identity, contract.contract)) continue;
    const payments = membership.status === "pending" ? await loadPaymentsOfContract(membership.contractId, null) : [];
    const check = membership.status === "pending" ? checkActivationEligibility(contract.contract, payments) : { eligible: false, reasons: [] as string[] };
    views.push({
      ...membership,
      customerName: customers.find((item) => item.id === membership.customerId)?.displayName ?? "Unknown customer",
      productName: products.find((item) => item.code === membership.productCode)?.name ?? membership.productCode,
      schemeLabel: (contract.contract.schemeLabel as string | undefined) ?? "",
      eligible: check.eligible,
      blockers: check.reasons,
    });
  }
  return views;
}

/** Staff Customer Search over active, unexpired memberships (doc 11; never public). */
export async function lookupActiveVip(actor: Actor, term: string): Promise<CustomerLookupResult[]> {
  requireOperation(actor, "customers.lookup");
  const needle = term.trim().toLowerCase();
  if (needle.length < 2) return [];
  const [memberships, customers] = await Promise.all([loadMemberships(), loadCustomers()]);
  const asOf = today();
  const found: CustomerLookupResult[] = [];
  for (const membership of memberships) {
    if (membership.status !== "active") continue;
    if (membership.validityEndDate && membership.validityEndDate < asOf) continue;
    const customer = customers.find((item) => item.id === membership.customerId);
    if (!customer || customer.status === "inactive" || customer.status === "rejected") continue;
    const haystack = [customer.displayName, customer.customerNumber, membership.cardId, membership.raNumber, customer.email];
    if (!haystack.some((value) => value?.toLowerCase().includes(needle))) continue;
    const contract = await loadContract(membership.contractId);
    const ledger = contract ? await ledgerOf(actor, membership, contract.contract, asOf) : null;
    found.push({
      membershipId: membership.id,
      customerName: customer.displayName,
      customerNumber: customer.customerNumber ?? null,
      productCode: membership.productCode,
      vipNumber: membership.cardId,
      validUntil: membership.validityEndDate,
      weekdayPoints: ledger?.balances.spendableWeekday ?? 0,
      weekendPoints: ledger?.balances.spendableWeekend ?? 0,
      totalPoints: (ledger?.balances.spendableWeekday ?? 0) + (ledger?.balances.spendableWeekend ?? 0),
    });
  }
  const startsWith = (item: CustomerLookupResult) => (item.customerName.toLowerCase().startsWith(needle) ? 0 : 1);
  return found.sort((a, b) => startsWith(a) - startsWith(b) || a.customerName.localeCompare(b.customerName)).slice(0, 50);
}

/** Official activation: finalized contract, verified full settlement and a valid RA; the Card ID is never regenerated. */
export async function activate(actor: Actor, id: string): Promise<MembershipView> {
  requireOperation(actor, "membership.activate");
  const membership = await loadMembership(id);
  if (!membership) throw notFound("Membership");
  const contract = await visibleContract(actor, membership.contractId);
  if (membership.cardId || membership.status === "active") throw conflict("already_active", "This membership was already activated. A Card ID is never regenerated.");
  if (membership.status !== "pending") throw conflict("not_pending", "Only a pending membership can be activated.");
  const payments = await loadPaymentsOfContract(contract.id, null);
  const check = checkActivationEligibility(contract, payments);
  if (!check.eligible) throw conflict("not_eligible", check.reasons[0]);
  const settlement = approvedCollectionMilestone(contract.priceCentavos, payments, 10_000);
  if (!contract.vipNumber || !settlement) throw conflict("settlement_missing", "A VIP Number and dated full settlement are required.");
  const activationDate = today();
  const history = historyEvent(membership, actor.userId, BUSINESS_AUDIT_ACTIONS.MEMBERSHIP_ACTIVATED);
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $d: Date!, $settlement: Date!, $card: String!, $ra: String!, $at: Date!, $h: Any!, $customer: UUID!",
    fields: 'row: membership_updateMany(where: { id: { eq: $id }, status: { eq: "pending" }, cardId: { isNull: true } }, data: { status: "active", activationDate: $d, fullSettlementDate: $settlement, cardId: $card, raNumber: $ra, history: $h, restoredFromHoldOn: null })\ncustomer: customer_updateMany(where: { id: { eq: $customer } }, data: { status: "active_member" })\nquery @redact { m: membership(id: $id) @check(expr: "response.row == 1", message: "NOT_PENDING") { id } }',
    variables: { id, d: activationDate, settlement: settlement.countedDate ?? settlement.date, card: contract.vipNumber, ra: contract.raNumber ?? contract.vipNumber, at: activationDate, h: history, customer: contract.customerId },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.MEMBERSHIP_ACTIVATED, entityType: "membership", entityId: id, details: { module: "membership", previousValue: "pending", newValue: "active", relatedRecordIds: [contract.id] } }],
    markers: { NOT_PENDING: conflict("not_pending", "This membership was activated by someone else.") },
  });
  return viewOf((await loadMembership(id))!, await customerName(membership.customerId));
}

async function customerName(customerId: string): Promise<string> {
  return (await loadCustomers()).find((item) => item.id === customerId)?.displayName ?? "Unknown customer";
}

async function viewOf(membership: Membership, name: string): Promise<MembershipView> {
  const products = await loadProducts();
  return {
    ...membership, customerName: name,
    productName: products.find((item) => item.code === membership.productCode)?.name ?? membership.productCode,
    schemeLabel: "", eligible: false, blockers: [],
  };
}

/** Records the Card Claim Date (actual, or deemed at the first settlement anniversary) and starts validity (doc 06 §4.3). */
export async function recordCardClaim(actor: Actor, id: string): Promise<MembershipView> {
  requireOperation(actor, "membership.activate");
  const membership = await loadMembership(id);
  if (!membership) throw notFound("Membership");
  const contract = await visibleContract(actor, membership.contractId);
  if (membership.cardClaimDate) return viewOf(membership, await customerName(membership.customerId));
  if (membership.status !== "active" || !membership.cardId || !membership.fullSettlementDate) throw conflict("not_active", "An active membership with a dated full settlement is required.");
  const deadline = addYearsToDate(membership.fullSettlementDate, 1);
  if (!deadline) throw conflict("invalid_dates", "The full settlement date is invalid.");
  const current = today();
  const deemed = current >= deadline;
  const claimDate = deemed ? deadline : current;
  const validityYears = (contract as Contract & { validityYears?: number }).validityYears;
  if (!validityYears) throw conflict("terms_missing", "The contract's validity years are missing.");
  const validityEndDate = computeValidityEnd(claimDate, validityYears);
  const action = deemed ? BUSINESS_AUDIT_ACTIONS.CARD_CLAIM_DEEMED : BUSINESS_AUDIT_ACTIONS.CARD_CLAIM_RECORDED;
  const history = historyEvent(membership, actor.userId, action, claimDate);
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $claim: Date!, $kind: String!, $end: Date!, $h: Any!",
    fields: 'row: membership_updateMany(where: { id: { eq: $id }, cardClaimDate: { isNull: true } }, data: { cardClaimDate: $claim, cardClaimKind: $kind, validityEndDate: $end, history: $h })\nquery @redact { m: membership(id: $id) @check(expr: "response.row == 1", message: "ALREADY_CLAIMED") { id } }',
    variables: { id, claim: claimDate, kind: deemed ? "deemed" : "actual", end: validityEndDate ?? claimDate, h: history },
    audit: [{ action, entityType: "membership", entityId: id, details: { module: "membership", newValue: claimDate, relatedRecordIds: [contract.id] } }],
    markers: { ALREADY_CLAIMED: conflict("already_claimed", "The card claim was recorded by someone else.") },
  });
  return viewOf((await loadMembership(id))!, await customerName(membership.customerId));
}

/** Card replacement, transfer or inheritance with written request and management approval (doc 09 §18). */
export async function serviceCard(actor: Actor, id: string, input: CardServiceInput): Promise<MembershipView> {
  requireOperation(actor, "contracts.approve");
  const membership = await loadMembership(id);
  if (!membership) throw notFound("Membership");
  const contract = await visibleContract(actor, membership.contractId);
  if (membership.status !== "active" || !membership.cardId) throw conflict("not_active", "An active VIP card is required.");
  const requestReference = input.requestReference.trim();
  const approvalReference = input.approvalReference.trim();
  if (!requestReference || !approvalReference) throw invalid("Record the written request and management approval references.");
  if (membership.cardServices?.some((item) => item.approvalReference === approvalReference)) throw conflict("duplicate_approval", "This approval has already been recorded.");
  const previousCustomerId = membership.customerId;
  const date = today();
  if (input.kind !== "replacement") {
    const next = (await loadCustomers()).find((item) => item.id === input.nextCustomerId);
    if (!next || next.id === previousCustomerId || !["approved", "active_member"].includes(next.status)) throw invalid("Choose a different approved customer as the new holder.");
    if (input.kind === "transfer" && !input.holderNotified) throw invalid("Notify the former holder about their future bookings before finalizing the transfer.");
    if (input.kind === "inheritance" && (!input.inheritanceReference.trim() || !input.acknowledgementReference.trim())) throw invalid("Record the inheritance documents and the signed successor acknowledgement.");
  } else if (!["voided", "recalled"].includes(input.custody)) {
    throw invalid("Record whether the former card was voided or recalled.");
  }
  const cardServices = [...(membership.cardServices ?? []), { ...input, requestReference, approvalReference, previousCustomerId, date, actorId: actor.userId, entitlementVersion: contract.productConfigVersion ?? 0 }];
  const action = input.kind === "replacement" ? BUSINESS_AUDIT_ACTIONS.CARD_REPLACED : BUSINESS_AUDIT_ACTIONS.CARD_TRANSFERRED;
  const history = historyEvent(membership, actor.userId, action, approvalReference);
  if (input.kind === "replacement") {
    await transact(actor, {
      variableDefinitions: "$id: UUID!, $services: Any!, $h: Any!",
      fields: "row: membership_updateMany(where: { id: { eq: $id } }, data: { cardServices: $services, history: $h })",
      variables: { id, services: cardServices, h: history },
      audit: [{ action, entityType: "membership", entityId: id, details: { module: "membership", previousValue: previousCustomerId, newValue: previousCustomerId, reason: approvalReference, relatedRecordIds: [contract.id] } }],
    });
    return viewOf((await loadMembership(id))!, await customerName(previousCustomerId));
  }
  // A transfer or inheritance closes unused released points as not transferred; later tranches continue (doc 09 §18).
  const nextCustomerId = input.nextCustomerId;
  const ledger = await ledgerOf(actor, membership, contract);
  const closures = ledger ? transferClosure(ledger, membership, date, approvalReference, actor.userId) : [];
  const definitions = ["$id: UUID!", "$services: Any!", "$h: Any!", "$next: UUID!", "$transferDate: Date!"];
  const variables: Record<string, unknown> = { id, services: cardServices, h: history, next: nextCustomerId, transferDate: date };
  const fields = ["row: membership_updateMany(where: { id: { eq: $id } }, data: { customerId: $next, cardServices: $services, history: $h, transferDate: $transferDate })"];
  const audits: AuditSpec[] = [{ action, entityType: "membership", entityId: id, details: { module: "membership", previousValue: previousCustomerId, newValue: nextCustomerId, reason: approvalReference, relatedRecordIds: [contract.id] } }];
  closures.forEach((entry, index) => {
    const alias = `tc${index}`;
    definitions.push(`$${alias}: StayPointsLedgerEntry_Data!`);
    variables[alias] = { membershipId: membership.id, tranche: entry.tranche, bucket: entry.bucket, type: "transfer", points: entry.points, date, reference: approvalReference, actorId: actor.userId };
    fields.push(`${alias}: stayPointsLedgerEntry_insert(data: $${alias})`);
    audits.push({ action: BUSINESS_AUDIT_ACTIONS.STAY_POINTS_TRANSFERRED, entityType: "membership", entityId: membership.id, details: { module: "stay-points", displayReference: membership.cardId, newValue: JSON.stringify({ tranche: entry.tranche, bucket: entry.bucket, points: entry.points }), reason: approvalReference } });
  });
  await transact(actor, { variableDefinitions: definitions.join(", "), fields: fields.join("\n"), variables, audit: audits });
  return viewOf((await loadMembership(id))!, await customerName(nextCustomerId));
}

/** Insert the pending membership once a finalized contract is fully settled; joins the caller's receipt transaction. */
export function ensureMembershipFx(effects: CommissionEffects, actor: Actor, contract: Contract & { customerId: string }): void {
  const id = newId();
  effects.definitions.push("$mem: Membership_Data!");
  effects.variables["mem"] = {
    id, customerId: contract.customerId, contractId: contract.id, productCode: contract.productCode,
    status: "pending", raNumber: contract.raNumber ?? null, financialHold: false,
    history: [{ at: nowIso(), actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.MEMBERSHIP_CREATED, note: null }],
  };
  effects.fields.push("membership: membership_insert(data: $mem)");
  effects.audits.push({ action: BUSINESS_AUDIT_ACTIONS.MEMBERSHIP_CREATED, entityType: "membership", entityId: id, details: { module: "membership", newValue: "pending", relatedRecordIds: [contract.id] } });
}
