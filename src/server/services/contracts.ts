import "server-only";
import type { NonStandardTermsInput, PrepareContractInput, UpdateContractInput } from "@/data/contracts/contract-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import { buildNonStandardSchedule, buildSchedule, canPrepareVipContract, finalizationHolds, nonStandardPaymentCode, nonStandardStage, nonStandardTermErrors, snapshotBenefits } from "@/modules/contracts/rules";
import { CANCELLATION_GROUNDS, CANCELLATION_GROUND_LABELS, type Contract, type ContractCancellationGround, type GenealogyEntry } from "@/modules/contracts/types";
import { totalVerifiedCentavos } from "@/modules/finance/rules";
import { firstOpenDate } from "@/modules/finance/month-close";
import { activeRoles } from "@/modules/identity/active-roles";
import { hasOperationPermission } from "@/modules/identity/permissions";
import { BROAD_ROLES, activeIdentityRoles, canSeeContractRecord } from "@/modules/identity/record-scope";
import type { OrgMember } from "@/modules/organization/types";
import type { Sale } from "@/modules/sales/types";
import { parseManilaDateOnly } from "@/shared/lib/dates";
import { applicablePriceStatus } from "@/modules/vip/pricing";
import { isSellableProduct } from "@/modules/vip/tier-options";
import type { PaymentScheme, VipTierCode } from "@/modules/vip/types";
import type { Actor } from "@/server/auth/actor";
import { loadScopeMembers, requireOperation } from "@/server/auth/authorize";
import { listAll } from "@/server/db";
import { centavosToInt64 } from "@/server/money";
import { contractColumns, loadContract, loadContractsOfCustomer, loadCustomer, loadCommissionRateSettings, loadSaleForContract, loadPaymentsOfContract } from "@/server/repositories/records";
import { loadPaymentSchemes, loadProducts } from "@/server/repositories/catalog";
import { conflict, invalid, newId, notFound, nowIso, today, transact, type AuditSpec } from "@/server/services/common";
import { ApiError } from "@/server/api/errors";
import { applyCommissionTriggerFx, commissionEffects, issueVipNumberFx, loadSaleCommissionState, vipIssuance } from "@/server/services/commissions";

const isBroad = (actor: Actor) => activeIdentityRoles(actor.identity).some((role) => BROAD_ROLES.has(role));
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function paymentCodeOf(scheme: PaymentScheme, tier: VipTierCode): string | null {
  return scheme.paymentCode ?? (scheme as { paymentCodeByTier?: Partial<Record<VipTierCode, string | null>> }).paymentCodeByTier?.[tier] ?? null;
}

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

/** Contracts a person may open: office roles see all, sellers see contracts whose recorded team includes them. Others get 404. */
async function visibleContract(actor: Actor, id: string): Promise<{ contract: Contract; version: number }> {
  const found = await loadContract(id);
  if (!found || !canSeeContractRecord(actor.identity, found.contract)) throw notFound("Contract");
  return found;
}

function isPreparer(actor: Actor, contract: Contract): boolean {
  return isBroad(actor) || contract.sellerMemberId === actor.identity.memberId;
}

/** Builds the Non-Standard schedule and payment code (doc 05 §10.2, item 32); refuses invalid terms. */
function nonStandardBuild(terms: NonStandardTermsInput, reservationCentavos: number, reservationDate: string | null) {
  const invalidTerms = nonStandardTermErrors(terms, reservationCentavos);
  const firstError = invalidTerms.price ?? invalidTerms.months ?? invalidTerms.reason;
  if (firstError) throw invalid(firstError);
  const built = buildNonStandardSchedule(terms.priceCentavos, reservationCentavos, terms.months, reservationDate);
  if (built.errors.length > 0) throw invalid(built.errors[0]);
  return { ...built, paymentCode: nonStandardPaymentCode(terms.months) };
}

/** Clears both Non-Standard approvals so a returned or changed contract is approved again (doc 05 §10.2 step 3). */
function clearNonStandardApprovals(contract: Contract): void {
  if (!contract.nonStandard) return;
  contract.nonStandard = { ...contract.nonStandard, approvedBy: null, approvedAt: null, approvalReference: null, selfApproved: false, confirmedBy: null, confirmedAt: null };
}

export async function prepareContract(actor: Actor, input: PrepareContractInput): Promise<Contract> {
  requireOperation(actor, "contracts.prepare");
  const customer = await loadCustomer(input.customerId);
  if (!customer || (!isBroad(actor) && customer.ownerMemberId !== actor.identity.memberId)) throw notFound("Customer");
  if (!canPrepareVipContract(customer.status)) throw conflict("customer_not_ready", "Only a submitted or approved customer or an active member can have a contract prepared.");
  const requestId = input.newPurchaseRequestId?.trim();
  const customerContracts = await loadContractsOfCustomer(customer.id);
  if (requestId) {
    // Retrying the same purchase request reopens the contract it already created.
    const previous = customerContracts.find((item) => item.newPurchaseRequestId === requestId);
    if (previous) return previous;
  } else if (customerContracts.some((item) => item.status !== "cancelled")) {
    throw conflict("contract_exists", "Open the existing contract to continue this purchase. Start a new VIP purchase for a separate transaction.");
  }
  const productCode = input.productCode ?? customer.vipPlan;
  const classification = input.classification ?? customer.contractClassification ?? "S";
  if (classification !== "S" && classification !== "N") throw invalid("Choose Standard or Non-Standard terms.");
  if (classification !== "N" && input.nonStandardTerms) throw invalid("Only a Non-Standard contract can have its own price and monthly payments.");
  const members = await loadScopeMembers();
  const sellerMemberId = input.sellerMemberId ?? customer.ownerMemberId;
  if (input.sellerMemberId !== undefined && !members.some((item) => item.id === sellerMemberId)) throw invalid("Choose a valid closing seller.");
  if (input.referrerMemberId && !members.some((item) => item.id === input.referrerMemberId)) throw invalid("Choose a valid referrer.");
  const [products, schemes] = await Promise.all([loadProducts(), loadPaymentSchemes()]);
  const product = products.find((item) => item.code === productCode && isSellableProduct(item));
  if (!product) throw invalid("The customer has no approved, active VIP plan.");
  const scheme = schemes.find((item) => item.id === input.schemeId);
  if (!scheme || scheme.availability !== "available") throw invalid("The selected payment plan is not available.");
  const reservationDate = input.reservationDate ?? today();
  if (!DATE_ONLY.test(reservationDate) || !parseManilaDateOnly(reservationDate)) throw invalid("The reservation date must be a valid date.");
  const built = buildSchedule(product, scheme, reservationDate);
  if (built.errors.length > 0) throw invalid(built.errors[0]);
  // Doc 05 §10.2: a Non-Standard contract has its own price and monthly payments; the normal terms are kept as a snapshot.
  let terms = { schedule: built.schedule, priceCentavos: built.priceCentavos, requiredInitialCentavos: built.requiredInitialCentavos, paymentCode: paymentCodeOf(scheme, product.code) };
  let nonStandard: Contract["nonStandard"] = null;
  if (classification === "N") {
    if (!input.nonStandardTerms) throw invalid("Enter the Non-Standard total price, number of monthly payments and reason.");
    const custom = nonStandardBuild(input.nonStandardTerms, scheme.reservationCentavos ?? 0, reservationDate);
    terms = { schedule: custom.schedule, priceCentavos: input.nonStandardTerms.priceCentavos, requiredInitialCentavos: custom.requiredInitialCentavos, paymentCode: custom.paymentCode };
    nonStandard = {
      justification: input.nonStandardTerms.justification.trim(),
      standardPriceCentavos: built.priceCentavos,
      standardInstallments: built.schedule.filter((line) => line.purpose === "installment").length,
      approvedBy: null, approvedAt: null, approvalReference: null, selfApproved: false, confirmedBy: null, confirmedAt: null,
    };
  }

  const contract: Contract = {
    id: newId(), customerId: customer.id, ...(requestId ? { newPurchaseRequestId: requestId } : {}),
    productCode: product.code, productConfigVersion: product.configVersion, priceCentavos: terms.priceCentavos,
    priceStatus: nonStandard ? "contract_stated" : applicablePriceStatus(product, scheme), schemeId: scheme.id, schemeLabel: scheme.label, schemeStatus: scheme.commercialStatus,
    paymentCode: terms.paymentCode, classification, validityYears: product.validityYears, benefits: snapshotBenefits(product),
    schedule: terms.schedule, requiredInitialCentavos: terms.requiredInitialCentavos, raNumber: null, sellerMemberId,
    ...(input.referrerMemberId !== undefined ? { referrerMemberId: input.referrerMemberId } : {}),
    genealogy: genealogyOf(members, sellerMemberId), status: "draft", customerAccepted: input.customerAccepted, preparedBy: actor.userId,
    createdAt: today(), submittedAt: null, reviewedBy: null, finalizedAt: null, returnReason: null, cancelReason: null, arrangement: null,
    ...(nonStandard ? { nonStandard } : {}),
    history: [{ at: nowIso(), actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.CONTRACT_PREPARED, note: null }],
  };
  for (const [seq, date] of Object.entries(input.dueDates ?? {})) {
    if (date && !DATE_ONLY.test(date)) throw invalid("Due dates must be valid dates.");
    const line = contract.schedule.find((item) => item.seq === Number(seq));
    if (line) line.dueDate = date || null;
  }
  const { columns, details } = contractColumns(contract);
  await transact(actor, {
    variableDefinitions: "$d: Contract_Data!",
    fields: "contract: contract_insert(data: $d)",
    variables: { d: { id: contract.id, ...columns, createdAt: nowIso(), details } },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.CONTRACT_PREPARED, entityType: "contract", entityId: contract.id, details: { module: "contracts", newValue: "draft", relatedRecordIds: [customer.id] } }],
  });
  return contract;
}

/** Saves a contract change only if no one else changed it since it was read; every contract change bumps the version. */
async function saveContract(actor: Actor, contract: Contract, version: number, audits: AuditSpec[], extra?: { definitions: string; fields: string; variables: Record<string, unknown> }): Promise<void> {
  const { columns, details } = contractColumns(contract);
  // Write every column, not only status: a Non-Standard price change edits `priceCentavos`, and the
  // reader prefers the column over `details` (records.ts toContract). The version filter guards the
  // write; `_update` operators are not allowed inside a variable, so the next version is a plain value.
  const data = { ...columns, details, collectionVersion: version + 1 };
  await transact(actor, {
    variableDefinitions: ["$id: UUID!", "$version: Int!", "$data: Contract_Data!", extra?.definitions].filter(Boolean).join(", "),
    fields: `upd: contract_updateMany(where: { id: { eq: $id }, collectionVersion: { eq: $version } }, data: $data)
${extra?.fields ?? ""}
query @redact { contract(id: $id) @check(expr: "response.upd == 1", message: "STALE_CONTRACT") { id } }`,
    variables: { id: contract.id, version, data, ...extra?.variables },
    audit: audits,
    markers: { STALE_CONTRACT: conflict("contract_changed", "This contract changed while you were working. Reload and try again.") },
  });
}

export async function submitContract(actor: Actor, id: string): Promise<{ contract: Contract; sale: Sale | null }> {
  requireOperation(actor, "contracts.prepare");
  const { contract, version } = await visibleContract(actor, id);
  if (!isPreparer(actor, contract)) throw new ApiError(403, "forbidden", "Submitting this contract is not allowed for this identity.");
  if (contract.status !== "draft" && contract.status !== "returned") throw conflict("not_submittable", "Only a Draft or Returned contract can be submitted.");
  const customer = await loadCustomer(contract.customerId);
  const existing = await loadSaleForContract(contract.id);
  const members = await loadScopeMembers();
  contract.status = "submitted";
  contract.submittedAt = today();
  contract.returnReason = null;
  contract.history.push({ at: nowIso(), actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.CONTRACT_SUBMITTED, note: null });
  const audits = [{ action: BUSINESS_AUDIT_ACTIONS.CONTRACT_SUBMITTED, entityType: "contract", entityId: contract.id, details: { module: "contracts", newValue: "submitted" } }];
  if (existing) {
    await saveContract(actor, contract, version, audits);
    return { contract, sale: existing.sale };
  }
  // First submission records the sale as Pending; it is approved separately (doc 13).
  // shortcut: seller and referrer accreditation standing is not checked because accreditation records are not in the pilot schema.
  const referrerMemberId = contract.referrerMemberId === undefined ? customer?.referrerMemberId ?? null : contract.referrerMemberId;
  const branchId = members.find((member) => member.id === contract.sellerMemberId)?.branchId ?? customer?.branchId;
  if (!branchId) throw invalid("The sale has no branch. Choose a closing seller first.");
  const saleId = newId();
  await saveContract(actor, contract, version, [...audits, { action: BUSINESS_AUDIT_ACTIONS.SALE_RECORDED, entityType: "sale", entityId: saleId, details: { module: "sales", newValue: "pending", relatedRecordIds: [contract.id] } }], {
    definitions: "$sale: Sale_Data!",
    fields: "sale: sale_insert(data: $sale)",
    variables: { sale: { id: saleId, contractId: contract.id, customerId: contract.customerId, productCode: contract.productCode, branchId, valueCentavos: centavosToInt64(contract.priceCentavos), recordedDate: today(), sellerMemberId: contract.sellerMemberId ?? undefined, referrerMemberId: referrerMemberId ?? undefined, status: "pending", details: { team: contract.genealogy } } },
  });
  return { contract, sale: (await loadSaleForContract(contract.id))?.sale ?? null };
}

export async function finalizeContract(actor: Actor, id: string): Promise<Contract> {
  requireOperation(actor, "contracts.approve");
  const { contract, version } = await visibleContract(actor, id);
  if (contract.status !== "submitted" && contract.status !== "under_review") throw conflict("not_finalizable", "Only a contract in review can be finalized.");
  const holds = finalizationHolds(contract);
  if (holds.length > 0) throw conflict("finalization_held", holds[0]);
  const previous = contract.status;
  contract.status = "finalized";
  contract.finalizedAt = today();
  contract.reviewedBy = actor.userId;
  contract.history.push({ at: nowIso(), actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.CONTRACT_FINALIZED, note: null });
  // The membership record that follows full settlement belongs to the membership module, not the pilot.
  await saveContract(actor, contract, version, [{ action: BUSINESS_AUDIT_ACTIONS.CONTRACT_FINALIZED, entityType: "contract", entityId: contract.id, details: { module: "contracts", previousValue: previous, newValue: "finalized" } }]);
  return contract;
}

// ---------------------------------------------------------------- F4: lifecycle completion
const updatable = (contract: Contract) => contract.status === "draft" || contract.status === "returned";

function applyDueDates(contract: Contract, dueDates?: Record<number, string>): void {
  if (!dueDates) return;
  for (const [seq, date] of Object.entries(dueDates)) {
    if (date && !DATE_ONLY.test(date)) throw invalid("Due dates must be valid dates.");
    const line = contract.schedule.find((item) => item.seq === Number(seq));
    if (line) line.dueDate = date || null;
  }
}

export async function updateContract(actor: Actor, id: string, input: UpdateContractInput): Promise<Contract> {
  requireOperation(actor, "contracts.prepare");
  const { contract, version } = await visibleContract(actor, id);
  if (!isPreparer(actor, contract)) throw new ApiError(403, "forbidden", "Editing this contract is not allowed for this identity.");
  if (!updatable(contract)) throw conflict("not_editable", "Only a Draft or Returned contract can be edited.");
  const audits: AuditSpec[] = [];
  let extra: { definitions: string; fields: string; variables: Record<string, unknown> } | undefined;
  if (input.nonStandardTerms) {
    if (contract.classification !== "N" || !contract.nonStandard) throw invalid("Only a Non-Standard contract can have its own price and monthly payments.");
    const sale = await loadSaleForContract(contract.id);
    if (sale && sale.sale.status !== "pending") throw conflict("sale_closed", "The sale is no longer pending, so the Non-Standard price and payments can no longer change.");
    if (contract.vipNumber && nonStandardPaymentCode(input.nonStandardTerms.months) !== contract.paymentCode) throw conflict("vip_number_issued", "The VIP Number is already issued, so the number of monthly payments can no longer change.");
    const reservationLine = contract.schedule.find((line) => line.purpose === "reservation");
    const built = nonStandardBuild(input.nonStandardTerms, reservationLine?.amountCentavos ?? 0, reservationLine?.dueDate ?? contract.createdAt);
    const previousPrice = contract.priceCentavos;
    if (!contract.vipNumber && (previousPrice !== input.nonStandardTerms.priceCentavos || contract.paymentCode !== built.paymentCode)) delete contract.signedAgreementRecordedDate;
    contract.priceCentavos = input.nonStandardTerms.priceCentavos;
    contract.schedule = built.schedule;
    contract.requiredInitialCentavos = built.requiredInitialCentavos;
    contract.paymentCode = built.paymentCode;
    contract.nonStandard = { ...contract.nonStandard, justification: input.nonStandardTerms.justification.trim() };
    clearNonStandardApprovals(contract);
    // Commission and sale measures use the Non-Standard price (doc 05 §10.2 rule 5).
    if (sale) extra = { definitions: "$sid: UUID!, $sv: Int64!", fields: "sale: sale_update(id: $sid, data: { valueCentavos: $sv })", variables: { sid: sale.sale.id, sv: centavosToInt64(contract.priceCentavos) } };
    contract.history.push({ at: nowIso(), actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.CONTRACT_NONSTANDARD_CHANGED, note: `${input.nonStandardTerms.months} monthly payments` });
    audits.push({ action: BUSINESS_AUDIT_ACTIONS.CONTRACT_NONSTANDARD_CHANGED, entityType: "contract", entityId: contract.id, details: { module: "contracts", previousValue: String(previousPrice), newValue: String(input.nonStandardTerms.priceCentavos), reason: input.nonStandardTerms.justification.trim() } });
    if (sale) audits.push({ action: BUSINESS_AUDIT_ACTIONS.SALE_VALUE_CHANGED, entityType: "sale", entityId: sale.sale.id, details: { module: "sales", previousValue: String(previousPrice), newValue: String(input.nonStandardTerms.priceCentavos), relatedRecordIds: [contract.id] } });
  }
  applyDueDates(contract, input.dueDates);
  if (input.customerAccepted !== undefined) contract.customerAccepted = input.customerAccepted;
  if (audits.length === 0) {
    contract.history.push({ at: nowIso(), actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.CONTRACT_EDITED, note: null });
  }
  await saveContract(actor, contract, version, audits.length > 0 ? audits : [{ action: BUSINESS_AUDIT_ACTIONS.CONTRACT_EDITED, entityType: "contract", entityId: contract.id, details: { module: "contracts" } }], extra);
  return contract;
}

export async function returnContractForCorrection(actor: Actor, id: string, reason: string): Promise<Contract> {
  const text = reason.trim();
  if (!text) throw invalid("A reason is required to return a contract.", { reason: "A reason is required." });
  const { contract, version } = await visibleContract(actor, id);
  const admin = hasOperationPermission(actor.identity, "contracts.approve");
  if (!admin && !(hasOperationPermission(actor.identity, "finance.verify") && nonStandardStage(contract) === "finance")) {
    throw new ApiError(403, "forbidden", "Returning contracts is not allowed for this identity.");
  }
  if (contract.status !== "submitted" && contract.status !== "under_review") throw conflict("not_returnable", "Only a contract in review can be returned.");
  const previous = contract.status;
  contract.status = "returned";
  contract.returnReason = text;
  clearNonStandardApprovals(contract);
  contract.history.push({ at: nowIso(), actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.CONTRACT_RETURNED, note: text });
  await saveContract(actor, contract, version, [{ action: BUSINESS_AUDIT_ACTIONS.CONTRACT_RETURNED, entityType: "contract", entityId: contract.id, details: { module: "contracts", previousValue: previous, newValue: "returned", reason: text } }]);
  return contract;
}

/** True when the contract has a confirmed sale or any verified payment (doc 05 §12; OD-2). */
async function hasVerifiedMoney(contract: Contract): Promise<boolean> {
  const sale = await loadSaleForContract(contract.id);
  if (sale?.sale.status === "confirmed") return true;
  const payments = await loadPaymentsOfContract(contract.id, sale?.sale.id ?? null);
  return totalVerifiedCentavos(payments) > 0;
}

function assertCancellable(contract: Contract): void {
  if (contract.status === "cancelled") throw conflict("already_cancelled", "The contract is already cancelled.");
  // shortcut: memberships are built in F7, so the Active-membership guard arrives with that schema.
}

/** The sale follows the contract's cancellation; a confirmed sale gets a dated reversal in the open month (doc 13 §4.5).
 *  Cancellation is a clawback trigger: released unpaid commission is held and paid commission becomes owed (doc 08 §14.1). */
async function cancelSaleExtra(actor: Actor, contract: Contract): Promise<{ definitions: string; fields: string; variables: Record<string, unknown>; audits: AuditSpec[] } | null> {
  const sale = await loadSaleForContract(contract.id);
  if (!sale || sale.sale.status === "cancelled") return null;
  const reversed = sale.sale.status === "confirmed";
  const closed = reversed ? await listAll<{ month: string }>("closedMonths", "month") : [];
  const date = firstOpenDate(closed, today());
  const commissionState = await loadSaleCommissionState(sale.sale.id);
  const fx = commissionEffects();
  applyCommissionTriggerFx(fx, actor, commissionState, { saleId: sale.sale.id, trigger: "cancellation", date });
  return {
    definitions: [
      reversed ? "$sid: UUID!, $adjDate: Date!, $adjAmount: Int64!, $adjReason: String!, $actor: UUID!" : "$sid: UUID!",
      ...fx.definitions,
    ].filter(Boolean).join(", "),
    fields: [
      "sale: sale_update(id: $sid, data: { status: \"cancelled\" })",
      ...(reversed ? ["adjustment: saleAdjustment_insert(data: { saleId: $sid, date: $adjDate, amountCentavos: $adjAmount, kind: \"reversal\", reason: $adjReason, actorId: $actor })"] : []),
      ...fx.fields,
    ].join("\n"),
    variables: { sid: sale.sale.id, ...(reversed ? { adjDate: date, adjAmount: centavosToInt64(-sale.sale.valueCentavos), adjReason: "Contract cancelled", actor: actor.userId } : {}), ...fx.variables },
    audits: [
      { action: BUSINESS_AUDIT_ACTIONS.SALE_CANCELLED, entityType: "sale", entityId: sale.sale.id, details: { module: "sales", previousValue: sale.sale.status, newValue: "cancelled", relatedRecordIds: [contract.id] } },
      ...fx.audits,
    ],
  };
}

export async function cancelContract(actor: Actor, id: string, reason: string): Promise<Contract> {
  const text = reason.trim();
  if (!text) throw invalid("A reason is required to cancel a contract.", { reason: "A reason is required." });
  const { contract, version } = await visibleContract(actor, id);
  const admin = hasOperationPermission(actor.identity, "contracts.approve");
  if (!admin) requireOperation(actor, "contracts.prepare");
  if (!admin && !(isPreparer(actor, contract) && contract.status === "draft")) throw new ApiError(403, "forbidden", "Cancelling this contract is not allowed for this identity.");
  assertCancellable(contract);
  if (await hasVerifiedMoney(contract)) throw conflict("verified_payments", "This contract has verified payments. Request a cancellation where payments are kept; Finance confirms it.");
  const previous = contract.status;
  contract.status = "cancelled";
  contract.cancelReason = text;
  contract.history.push({ at: nowIso(), actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.CONTRACT_CANCELLED, note: text });
  const sale = await cancelSaleExtra(actor, contract);
  await saveContract(actor, contract, version,
    [{ action: BUSINESS_AUDIT_ACTIONS.CONTRACT_CANCELLED, entityType: "contract", entityId: contract.id, details: { module: "contracts", previousValue: previous, newValue: "cancelled", reason: text } }, ...(sale?.audits ?? [])],
    sale ? { definitions: sale.definitions, fields: sale.fields, variables: sale.variables } : undefined);
  return contract;
}

export async function requestCancellation(actor: Actor, id: string, ground: ContractCancellationGround, reason: string): Promise<Contract> {
  requireOperation(actor, "contracts.approve");
  if (!(CANCELLATION_GROUNDS as readonly string[]).includes(ground)) throw invalid("Select a cancellation ground from the Reservation Agreement.");
  const text = reason.trim();
  if (!text) throw invalid("A reason is required to request a cancellation.", { reason: "A reason is required." });
  const { contract, version } = await visibleContract(actor, id);
  assertCancellable(contract);
  if (contract.cancellation?.status === "requested") throw conflict("cancellation_pending", "A cancellation is already awaiting Finance confirmation.");
  if (!(await hasVerifiedMoney(contract))) throw conflict("no_verified_payments", "This contract has no verified payments. Cancel it directly instead.");
  contract.cancellation = { ground, reason: text, requestedBy: actor.userId, requestedAt: nowIso(), status: "requested", decidedBy: null, decidedAt: null, forfeitedCentavos: null };
  contract.history.push({ at: nowIso(), actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.CONTRACT_CANCELLATION_REQUESTED, note: `${ground}: ${text}` });
  await saveContract(actor, contract, version, [{ action: BUSINESS_AUDIT_ACTIONS.CONTRACT_CANCELLATION_REQUESTED, entityType: "contract", entityId: contract.id, details: { module: "contracts", previousValue: contract.status, newValue: ground, reason: text } }]);
  return contract;
}

export async function decideCancellation(actor: Actor, id: string, decision: "confirm" | "decline", reason: string): Promise<Contract> {
  requireOperation(actor, "finance.refund");
  const text = reason.trim();
  if (!text) throw invalid("A reason is required.", { reason: "A reason is required." });
  const { contract, version } = await visibleContract(actor, id);
  const request = contract.cancellation;
  if (!request || request.status !== "requested") throw conflict("no_cancellation_request", "No cancellation is awaiting confirmation for this contract.");
  const selfDecided = request.requestedBy === actor.userId;
  const selfNote = selfDecided ? "Self-approved: the decider also requested this cancellation." : null;

  if (decision === "decline") {
    contract.cancellation = null;
    contract.history.push({ at: nowIso(), actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.CONTRACT_CANCELLATION_DECLINED, note: [text, selfNote].filter(Boolean).join(" · ") });
    await saveContract(actor, contract, version, [{ action: BUSINESS_AUDIT_ACTIONS.CONTRACT_CANCELLATION_DECLINED, entityType: "contract", entityId: contract.id, details: { module: "contracts", previousValue: request.ground, newValue: "declined", reason: [text, selfNote].filter(Boolean).join(" · ") } }]);
    return contract;
  }

  assertCancellable(contract);
  const sale = await loadSaleForContract(contract.id);
  const payments = await loadPaymentsOfContract(contract.id, sale?.sale.id ?? null);
  const forfeited = totalVerifiedCentavos(payments);
  const previous = contract.status;
  contract.status = "cancelled";
  contract.cancelReason = `${CANCELLATION_GROUND_LABELS[request.ground]}: ${request.reason}`;
  contract.cancellation = { ...request, status: "confirmed", decidedBy: actor.userId, decidedAt: nowIso(), forfeitedCentavos: forfeited };
  contract.history.push({ at: nowIso(), actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.CONTRACT_CANCELLED, note: [text, selfNote].filter(Boolean).join(" · ") });
  const saleClose = await cancelSaleExtra(actor, contract);
  await saveContract(actor, contract, version, [
    { action: BUSINESS_AUDIT_ACTIONS.CONTRACT_CANCELLED, entityType: "contract", entityId: contract.id, details: { module: "contracts", previousValue: previous, newValue: "cancelled", reason: [text, selfNote].filter(Boolean).join(" · ") } },
    { action: BUSINESS_AUDIT_ACTIONS.PAYMENTS_FORFEITED, entityType: "contract", entityId: contract.id, details: { module: "finance", newValue: String(forfeited), relatedRecordIds: payments.map((item) => item.id) } },
    ...(saleClose?.audits ?? []),
  ], saleClose ? { definitions: saleClose.definitions, fields: saleClose.fields, variables: saleClose.variables } : undefined);
  return contract;
}

export async function approveArrangement(actor: Actor, id: string, approvalReference: string): Promise<Contract> {
  // Only Super Admin approves; Super Admin may also be the preparer (owner decision 2026-11-09).
  if (!activeRoles(actor.identity).includes("super_admin")) throw new ApiError(403, "forbidden", "Only a Super Administrator can approve a special arrangement.");
  const reference = approvalReference.trim();
  if (!reference) throw invalid("Enter the reference of the written approval.", { approvalReference: "Enter the reference of the written approval." });
  const { contract, version } = await visibleContract(actor, id);
  if (!contract.arrangement) throw conflict("no_arrangement", "This contract has no special arrangement.");
  if (contract.arrangement.status === "approved") throw conflict("already_approved", "This arrangement is already approved.");
  if (contract.status === "cancelled" || contract.status === "finalized") throw conflict("closed_contract", "Only an open contract's arrangement can be approved.");
  contract.arrangement = { ...contract.arrangement, status: "approved", approvedBy: actor.userId, approvedAt: nowIso(), approvalReference: reference };
  contract.history.push({ at: nowIso(), actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.CONTRACT_ARRANGEMENT_APPROVED, note: reference });
  await saveContract(actor, contract, version, [{ action: BUSINESS_AUDIT_ACTIONS.CONTRACT_ARRANGEMENT_APPROVED, entityType: "contract", entityId: contract.id, details: { module: "contracts", previousValue: "pending", newValue: "approved", reason: reference } }]);
  return contract;
}

export async function approveNonStandard(actor: Actor, id: string, approvalReference: string): Promise<Contract> {
  requireOperation(actor, "contracts.approve");
  const reference = approvalReference.trim();
  if (!reference) throw invalid("Enter the signed approval reference.", { approvalReference: "Enter the signed approval reference." });
  const { contract, version } = await visibleContract(actor, id);
  const terms = contract.nonStandard;
  if (contract.classification !== "N" || !terms) throw conflict("no_nonstandard_terms", "This contract has no Non-Standard terms.");
  if (contract.status !== "submitted" && contract.status !== "under_review") throw conflict("not_in_review", "Only a submitted contract's Non-Standard terms can be approved.");
  if (terms.approvedBy) throw conflict("already_approved", "The Non-Standard terms are already approved.");
  // Owner authority rule (doc 05 item 17): the preparer may approve; the history shows it.
  const selfApproved = contract.preparedBy === actor.userId;
  contract.nonStandard = { ...terms, approvedBy: actor.userId, approvedAt: nowIso(), approvalReference: reference, selfApproved };
  const note = [reference, selfApproved ? "Same person prepared and approved." : null].filter(Boolean).join(" · ");
  contract.history.push({ at: nowIso(), actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.CONTRACT_NONSTANDARD_APPROVED, note });
  await saveContract(actor, contract, version, [{ action: BUSINESS_AUDIT_ACTIONS.CONTRACT_NONSTANDARD_APPROVED, entityType: "contract", entityId: contract.id, details: { module: "contracts", previousValue: "waiting for Administrator", newValue: "waiting for Finance", reason: note } }]);
  return contract;
}

export async function confirmNonStandard(actor: Actor, id: string): Promise<Contract> {
  requireOperation(actor, "finance.verify");
  const { contract, version } = await visibleContract(actor, id);
  const terms = contract.nonStandard;
  if (contract.classification !== "N" || !terms) throw conflict("no_nonstandard_terms", "This contract has no Non-Standard terms.");
  if (contract.status !== "submitted" && contract.status !== "under_review") throw conflict("not_in_review", "Only a submitted contract's Non-Standard terms can be confirmed.");
  if (!terms.approvedBy) throw conflict("admin_approval_missing", "The Administrator must approve the Non-Standard terms first.");
  if (terms.confirmedBy) throw conflict("already_confirmed", "The Non-Standard terms are already confirmed.");
  const sameApprover = terms.approvedBy === actor.userId;
  if (sameApprover && !activeRoles(actor.identity).includes("super_admin")) throw conflict("second_approver_required", "Someone else must confirm terms you approved. Only the Super Administrator may do both steps.");
  contract.nonStandard = { ...terms, confirmedBy: actor.userId, confirmedAt: nowIso() };
  const note = sameApprover ? "Same person approved and confirmed (Super Administrator)." : null;
  contract.history.push({ at: nowIso(), actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.CONTRACT_NONSTANDARD_CONFIRMED, note });
  await saveContract(actor, contract, version, [{ action: BUSINESS_AUDIT_ACTIONS.CONTRACT_NONSTANDARD_CONFIRMED, entityType: "contract", entityId: contract.id, details: { module: "contracts", previousValue: "waiting for Finance", newValue: "approved", ...(note ? { reason: note } : {}) } }]);
  return contract;
}

export async function resolvePaymentCode(actor: Actor, id: string, approvalReference: string): Promise<Contract> {
  requireOperation(actor, "contracts.approve");
  const reference = approvalReference.trim();
  if (!reference) throw invalid("Enter the reference of the written approval.", { approvalReference: "Enter the reference of the written approval." });
  const { contract, version } = await visibleContract(actor, id);
  if (contract.status === "cancelled") throw conflict("contract_cancelled", "The contract is cancelled; the payment code can no longer change.");
  // shortcut: card IDs arrive with memberships in F7; until then no issued Card ID can block a recode.
  if (contract.paymentCode != null) throw conflict("already_resolved", "The payment code is already resolved.");
  const schemes = await loadPaymentSchemes();
  const scheme = schemes.find((item) => item.id === contract.schemeId);
  const code = scheme ? paymentCodeOf(scheme, contract.productCode) : null;
  if (!code) throw conflict("no_payment_code", "There is no documented payment code for this payment plan and card level.");
  contract.paymentCode = code;
  contract.history.push({ at: nowIso(), actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.CONTRACT_PAYMENT_CODE_RESOLVED, note: reference });
  await saveContract(actor, contract, version, [{ action: BUSINESS_AUDIT_ACTIONS.CONTRACT_PAYMENT_CODE_RESOLVED, entityType: "contract", entityId: contract.id, details: { module: "contracts", previousValue: "not recorded", newValue: code, reason: reference } }]);
  return contract;
}

/**
 * Records the signed Reservation Agreement (doc 06 §1–3) and issues the VIP Number when every blocker is
 * already gone: approved sale, signed agreement, verified first scheduled payment and approved rates (F6).
 */
export async function recordSignedAgreement(actor: Actor, id: string): Promise<Contract> {
  requireOperation(actor, "contracts.approve");
  const { contract, version } = await visibleContract(actor, id);
  if (contract.vipNumber) return contract;
  if (!["submitted", "under_review", "finalized"].includes(contract.status)) throw conflict("not_submitted", "Submit the contract before recording the signed agreement.");
  const sale = await loadSaleForContract(contract.id);
  if (!sale?.sale.approval) throw conflict("sale_not_approved", "Approve the sale before recording the signed agreement.");
  if (sale.sale.sellerMemberId && sale.sale.sellerMemberId === sale.sale.referrerMemberId) {
    const customer = await loadCustomer(sale.sale.customerId);
    if (!customer?.approvedAt || customer.referrerMemberId !== sale.sale.referrerMemberId || !customer.referralReference?.trim()) {
      throw conflict("referral_unverified", "The Administrator must verify the dated referral reference before VIP Number issuance.");
    }
  }
  const payments = await loadPaymentsOfContract(contract.id, sale.sale.id);
  const firstScheduledPaid = contract.requiredInitialCentavos != null && totalVerifiedCentavos(payments) >= contract.requiredInitialCentavos;
  const previousBlocker = contract.vipNumberIssueBlocker;
  const audits: AuditSpec[] = [];
  if (!contract.signedAgreementRecordedDate) {
    contract.signedAgreementRecordedDate = today();
    contract.history.push({ at: nowIso(), actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.CONTRACT_RA_RECORDED, note: null });
    audits.push({ action: BUSINESS_AUDIT_ACTIONS.CONTRACT_RA_RECORDED, entityType: "contract", entityId: contract.id, details: { module: "contracts", newValue: contract.signedAgreementRecordedDate } });
  }
  let extra: { definitions: string; fields: string; variables: Record<string, unknown> } | undefined;
  if (!contract.vipNumber) {
    const [rateSettings, issued] = await Promise.all([
      loadCommissionRateSettings(),
      listAll<{ vipNumber: string | null }>("contracts", "vipNumber"),
    ]);
    const issuance = vipIssuance(contract, sale.sale, payments, rateSettings, issued.map((row) => row.vipNumber ?? "").filter(Boolean));
    if (issuance && "vipNumber" in issuance) {
      contract.vipNumber = issuance.vipNumber;
      contract.raNumber ??= issuance.vipNumber;
      contract.vipNumberIssueBlocker = undefined;
      contract.history.push({ at: nowIso(), actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.VIP_NUMBER_ISSUED, note: null });
      const fx = commissionEffects();
      issueVipNumberFx(fx, actor, contract.id, sale.sale, issuance, contract.raNumber ?? null);
      audits.push(...fx.audits);
      extra = { definitions: fx.definitions.join(", "), fields: fx.fields.join("\n"), variables: fx.variables };
    } else if (issuance && "blocker" in issuance) {
      contract.vipNumberIssueBlocker = issuance.blocker;
    } else {
      // Not due yet: name only the missing pieces (doc 06 §8 step 5), so the text never claims a recorded rate is missing.
      const rateMissing = !rateSettings.some((rate) => rate.memberId === sale.sale.sellerMemberId && rate.product === "VIP" && rate.role === "DSC") ||
        Boolean(sale.sale.referrerMemberId && !rateSettings.some((rate) => rate.memberId === sale.sale.referrerMemberId && rate.product === "VIP" && rate.role === "DRI"));
      const parts = [...(firstScheduledPaid ? [] : ["the first scheduled payment"]), ...(rateMissing ? ["the commission rates"] : [])];
      const phrase = parts.length ? parts.join(" and ") : "the sale terms";
      contract.vipNumberIssueBlocker = `${phrase.charAt(0).toUpperCase()}${phrase.slice(1)} must be recorded before the VIP Number can be issued.`;
    }
  }
  if (audits.length === 0 && contract.vipNumberIssueBlocker === previousBlocker && !extra) return contract;
  await saveContract(actor, contract, version, audits, extra);
  return contract;
}
