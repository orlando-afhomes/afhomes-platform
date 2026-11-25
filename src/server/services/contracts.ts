import "server-only";
import type { PrepareContractInput } from "@/data/contracts/contract-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import { buildSchedule, canPrepareVipContract, finalizationHolds, snapshotBenefits } from "@/modules/contracts/rules";
import type { Contract, GenealogyEntry } from "@/modules/contracts/types";
import { BROAD_ROLES, activeIdentityRoles, canSeeContractRecord } from "@/modules/identity/record-scope";
import type { OrgMember } from "@/modules/organization/types";
import type { Sale } from "@/modules/sales/types";
import { parseManilaDateOnly } from "@/shared/lib/dates";
import { applicablePriceStatus } from "@/modules/vip/pricing";
import { isSellableProduct } from "@/modules/vip/tier-options";
import type { PaymentScheme, VipTierCode } from "@/modules/vip/types";
import type { Actor } from "@/server/auth/actor";
import { loadScopeMembers, requireOperation } from "@/server/auth/authorize";
import { centavosToInt64 } from "@/server/money";
import { contractColumns, loadContract, loadContractsOfCustomer, loadCustomer, loadSaleForContract } from "@/server/repositories/records";
import { loadPaymentSchemes, loadProducts } from "@/server/repositories/catalog";
import { conflict, invalid, newId, notFound, nowIso, today, transact } from "@/server/services/common";
import { ApiError } from "@/server/api/errors";

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

const PILOT_STANDARD_ONLY = "Non-Standard contracts are not part of the pilot yet.";

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
  if (classification === "N" || input.nonStandardTerms) throw invalid(PILOT_STANDARD_ONLY);
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

  const contract: Contract = {
    id: newId(), customerId: customer.id, ...(requestId ? { newPurchaseRequestId: requestId } : {}),
    productCode: product.code, productConfigVersion: product.configVersion, priceCentavos: built.priceCentavos,
    priceStatus: applicablePriceStatus(product, scheme), schemeId: scheme.id, schemeLabel: scheme.label, schemeStatus: scheme.commercialStatus,
    paymentCode: paymentCodeOf(scheme, product.code), classification, validityYears: product.validityYears, benefits: snapshotBenefits(product),
    schedule: built.schedule, requiredInitialCentavos: built.requiredInitialCentavos, raNumber: null, sellerMemberId,
    ...(input.referrerMemberId !== undefined ? { referrerMemberId: input.referrerMemberId } : {}),
    genealogy: genealogyOf(members, sellerMemberId), status: "draft", customerAccepted: input.customerAccepted, preparedBy: actor.userId,
    createdAt: today(), submittedAt: null, reviewedBy: null, finalizedAt: null, returnReason: null, cancelReason: null, arrangement: null,
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
async function saveContract(actor: Actor, contract: Contract, version: number, audits: Array<{ action: string; entityType: string; entityId: string; details: Record<string, unknown> }>, extra?: { definitions: string; fields: string; variables: Record<string, unknown> }): Promise<void> {
  const { columns, details } = contractColumns(contract);
  await transact(actor, {
    variableDefinitions: ["$id: UUID!", "$version: Int!", "$status: String!", "$details: Any!", extra?.definitions].filter(Boolean).join(", "),
    fields: `upd: contract_updateMany(where: { id: { eq: $id }, collectionVersion: { eq: $version } }, data: { status: $status, details: $details, collectionVersion_update: { inc: 1 } })
${extra?.fields ?? ""}
query @redact { contract(id: $id) @check(expr: "response.upd == 1", message: "STALE_CONTRACT") { id } }`,
    variables: { id: contract.id, version, status: columns.status, details, ...extra?.variables },
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
