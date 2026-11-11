import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { ContractRepository, ContractView, PrepareContractInput, UpdateContractInput } from "@/data/contracts/contract-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import { buildSchedule, finalizationHolds, snapshotBenefits } from "@/modules/contracts/rules";
import { CANCELLATION_GROUNDS, CANCELLATION_GROUND_LABELS, type Contract, type ContractCancellationGround } from "@/modules/contracts/types";
import { totalVerifiedCentavos } from "@/modules/finance/rules";
import type { DevIdentity } from "@/modules/identity/types";
import { extractRaSequence } from "@/modules/membership/rules";
import type { PaymentScheme, VipTierCode } from "@/modules/vip/types";
import { BusinessRepository, DATE_ONLY, canSeeContract, customerName, genealogyFor, nowIso, today } from "./business-base";
import { holdUnpaidCommissions, paymentsOfContract, reconcileContract } from "./business-effects";
import { nextId } from "./ids";
import type { MockStore } from "./seed";
import { BROAD_ROLES, activeIdentityRoles } from "./scope";


// TODO: replace with the central paymentCodeFor(scheme, tier) from @/modules/vip/rules
// once the sibling workstream lands it; this fallback is identical.
function snapshotPaymentCode(scheme: PaymentScheme, tier: VipTierCode): string | null {
  return scheme.paymentCode ?? (scheme as { paymentCodeByTier?: Partial<Record<VipTierCode, string | null>> }).paymentCodeByTier?.[tier] ?? null;
}

export function viewContract(store: MockStore, contract: Contract): ContractView {
  const sale = store.sales.find((item) => item.contractId === contract.id);
  const seller = contract.sellerMemberId ? store.members.find((member) => member.id === contract.sellerMemberId) : null;
  return JSON.parse(
    JSON.stringify({
      ...contract,
      customerName: customerName(store, contract.customerId),
      sellerName: seller?.displayName ?? null,
      sale: sale ? { id: sale.id, status: sale.status, confirmedDate: sale.confirmedDate } : null,
      holds: finalizationHolds(contract),
    }),
  ) as ContractView;
}

export class MockContractRepository extends BusinessRepository implements ContractRepository {
  constructor(store: MockStore, getIdentity: () => DevIdentity, asyncOptions: MockAsyncOptions = {}) {
    super(store, getIdentity, asyncOptions);
  }

  private find(identity: DevIdentity, id: string): Contract {
    const contract = this.store.contracts.find((item) => item.id === id);
    if (!contract || !canSeeContract(identity, contract)) throw new Error("Contract not found.");
    return contract;
  }

  private isPreparer(identity: DevIdentity, contract: Contract): boolean {
    const broad = activeIdentityRoles(identity).some((role) => BROAD_ROLES.has(role));
    return this.can(identity, "contracts.prepare") && (broad || contract.sellerMemberId === identity.memberId);
  }

  private event(contract: Contract, identity: DevIdentity, event: string, note: string | null = null) {
    contract.history.push({ at: nowIso(), actorId: identity.id, event, note });
  }

  private applyDueDates(contract: Contract, dueDates?: Record<number, string>) {
    if (!dueDates) return;
    for (const [seq, date] of Object.entries(dueDates)) {
      if (date && !DATE_ONLY.test(date)) throw new Error("Due dates must be valid dates.");
      const line = contract.schedule.find((item) => item.seq === Number(seq));
      if (line) line.dueDate = date || null;
    }
  }

  async list(options?: MockAsyncOptions): Promise<ContractView[]> {
    return this.run(options, (identity) =>
      this.store.contracts.filter((contract) => canSeeContract(identity, contract)).map((contract) => viewContract(this.store, contract)),
    );
  }

  async getById(id: string, options?: MockAsyncOptions): Promise<ContractView | null> {
    return this.run(options, (identity) => {
      const contract = this.store.contracts.find((item) => item.id === id);
      return contract && canSeeContract(identity, contract) ? viewContract(this.store, contract) : null;
    });
  }

  async prepare(input: PrepareContractInput, options?: MockAsyncOptions): Promise<ContractView> {
    return this.run(options, (identity) => {
      this.require(identity, "contracts.prepare", "Preparing contracts is not allowed for this identity.");
      const customer = this.store.customers.find((item) => item.id === input.customerId);
      const broad = activeIdentityRoles(identity).some((role) => BROAD_ROLES.has(role));
      if (!customer || (!broad && customer.ownerMemberId !== identity.memberId)) throw new Error("Customer not found.");
      if (customer.status !== "submitted") throw new Error("Only a submitted customer can have a contract prepared.");
      if (this.store.contracts.some((item) => item.customerId === customer.id && item.status !== "cancelled")) {
        throw new Error("This customer already has an open or finalized contract.");
      }
      const productCode = customer.vipPlan;
      const product = this.store.products.find((item) => item.code === productCode && item.status === "active");
      if (!product) throw new Error("The customer has no active VIP plan.");
      const scheme = this.store.paymentSchemes.find((item) => item.id === input.schemeId);
      if (!scheme || scheme.availability !== "available") throw new Error("The selected payment scheme is not available.");
      const reservationDate = input.reservationDate ?? today();
      if (!DATE_ONLY.test(reservationDate)) throw new Error("The reservation date must be a valid date.");
      const built = buildSchedule(product, scheme, reservationDate);
      if (built.errors.length > 0) throw new Error(built.errors[0]);
      // A scheme with its own contract-stated price (Spot Cash) is not affected by a catalog price conflict.
      const ownPrice = scheme.priceCentavosByTier[product.code] != null;
      const contract: Contract = {
        id: nextId(this.store, "contract", "ctr"),
        customerId: customer.id,
        productCode: product.code,
        productConfigVersion: product.configVersion,
        priceCentavos: built.priceCentavos,
        priceStatus: ownPrice ? "contract_stated" : product.priceStatus,
        schemeId: scheme.id,
        schemeLabel: scheme.label,
        schemeStatus: scheme.commercialStatus,
        paymentCode: snapshotPaymentCode(scheme, product.code),
        classification: customer.contractClassification ?? "S",
        validityYears: product.validityYears,
        benefits: snapshotBenefits(product),
        schedule: built.schedule,
        requiredInitialCentavos: built.requiredInitialCentavos,
        raNumber: null,
        sellerMemberId: customer.ownerMemberId,
        genealogy: genealogyFor(this.store, customer.ownerMemberId),
        status: "draft",
        customerAccepted: input.customerAccepted,
        preparedBy: identity.id,
        createdAt: today(),
        submittedAt: null,
        reviewedBy: null,
        finalizedAt: null,
        returnReason: null,
        cancelReason: null,
        // Standard Move A/B need no arrangement since the owner ruling; the field is
        // retained (null for new contracts) for historical contracts.
        arrangement: null,
        history: [],
      };
      this.applyDueDates(contract, input.dueDates);
      this.event(contract, identity, BUSINESS_AUDIT_ACTIONS.CONTRACT_PREPARED);
      this.store.contracts.push(contract);
      this.audit(identity, { module: "contracts", action: BUSINESS_AUDIT_ACTIONS.CONTRACT_PREPARED, entityType: "contract", entityId: contract.id, newValue: "draft", relatedRecordIds: [customer.id] });
      return viewContract(this.store, contract);
    });
  }

  async update(id: string, input: UpdateContractInput, options?: MockAsyncOptions): Promise<ContractView> {
    return this.run(options, (identity) => {
      const contract = this.find(identity, id);
      if (!this.isPreparer(identity, contract)) throw new Error("Editing this contract is not allowed for this identity.");
      if (contract.status !== "draft" && contract.status !== "returned") throw new Error("Only a Draft or Returned contract can be edited.");
      this.applyDueDates(contract, input.dueDates);
      if (input.customerAccepted !== undefined) contract.customerAccepted = input.customerAccepted;
      this.event(contract, identity, "CONTRACT_EDITED");
      return viewContract(this.store, contract);
    });
  }

  async submit(id: string, options?: MockAsyncOptions): Promise<ContractView> {
    return this.run(options, (identity) => {
      const contract = this.find(identity, id);
      if (!this.isPreparer(identity, contract)) throw new Error("Submitting this contract is not allowed for this identity.");
      if (contract.status !== "draft" && contract.status !== "returned") throw new Error("Only a Draft or Returned contract can be submitted.");
      contract.status = "submitted";
      contract.submittedAt = today();
      contract.returnReason = null;
      this.event(contract, identity, BUSINESS_AUDIT_ACTIONS.CONTRACT_SUBMITTED);
      this.audit(identity, { module: "contracts", action: BUSINESS_AUDIT_ACTIONS.CONTRACT_SUBMITTED, entityType: "contract", entityId: contract.id, newValue: "submitted" });
      if (!this.store.sales.some((item) => item.contractId === contract.id)) {
        const customer = this.store.customers.find((item) => item.id === contract.customerId);
        const sale = {
          id: nextId(this.store, "sale", "sale"),
          contractId: contract.id,
          customerId: contract.customerId,
          productCode: contract.productCode,
          branchId: customer?.branchId ?? "branch-a",
          valueCentavos: contract.priceCentavos,
          recordedDate: today(),
          sellerMemberId: contract.sellerMemberId,
          team: contract.genealogy.map((entry) => ({ ...entry })),
          status: "pending" as const,
          confirmedDate: null,
          adjustments: [],
        };
        this.store.sales.push(sale);
        this.audit(identity, { module: "sales", action: BUSINESS_AUDIT_ACTIONS.SALE_RECORDED, entityType: "sale", entityId: sale.id, newValue: "pending", relatedRecordIds: [contract.id] });
      }
      // A reservation can be submitted while the contract is still a draft, before any sale exists: link it now.
      const recorded = this.store.sales.find((item) => item.contractId === contract.id);
      if (recorded) for (const payment of this.store.payments) if (payment.contractId === contract.id && !payment.saleId) payment.saleId = recorded.id;
      return viewContract(this.store, contract);
    });
  }

  async startReview(id: string, options?: MockAsyncOptions): Promise<ContractView> {
    return this.run(options, (identity) => {
      this.require(identity, "contracts.approve", "Reviewing contracts is not allowed for this identity.");
      const contract = this.find(identity, id);
      if (contract.status !== "submitted") throw new Error("Only a Submitted contract can enter review.");
      contract.status = "under_review";
      this.event(contract, identity, BUSINESS_AUDIT_ACTIONS.CONTRACT_REVIEW_STARTED);
      this.audit(identity, { module: "contracts", action: BUSINESS_AUDIT_ACTIONS.CONTRACT_REVIEW_STARTED, entityType: "contract", entityId: contract.id, previousValue: "submitted", newValue: "under_review" });
      return viewContract(this.store, contract);
    });
  }

  async returnForCorrection(id: string, reason: string, options?: MockAsyncOptions): Promise<ContractView> {
    return this.run(options, (identity) => {
      this.require(identity, "contracts.approve", "Returning contracts is not allowed for this identity.");
      if (!reason.trim()) throw new Error("A reason is required to return a contract.");
      const contract = this.find(identity, id);
      if (contract.status !== "submitted" && contract.status !== "under_review") throw new Error("Only a contract in review can be returned.");
      const previous = contract.status;
      contract.status = "returned";
      contract.returnReason = reason.trim();
      this.event(contract, identity, BUSINESS_AUDIT_ACTIONS.CONTRACT_RETURNED, reason.trim());
      this.audit(identity, { module: "contracts", action: BUSINESS_AUDIT_ACTIONS.CONTRACT_RETURNED, entityType: "contract", entityId: contract.id, previousValue: previous, newValue: "returned", reason: reason.trim() });
      return viewContract(this.store, contract);
    });
  }

  async finalize(id: string, options?: MockAsyncOptions): Promise<ContractView> {
    return this.run(options, (identity) => {
      this.require(identity, "contracts.approve", "Finalizing contracts needs Admin approval rights. An IST designation does not grant them.");
      const contract = this.find(identity, id);
      if (contract.status !== "submitted" && contract.status !== "under_review") throw new Error("Only a contract in review can be finalized.");
      const holds = finalizationHolds(contract);
      if (holds.length > 0) throw new Error(holds[0]);
      const previous = contract.status;
      contract.status = "finalized";
      contract.finalizedAt = today();
      contract.reviewedBy = identity.id;
      this.event(contract, identity, BUSINESS_AUDIT_ACTIONS.CONTRACT_FINALIZED);
      this.audit(identity, { module: "contracts", action: BUSINESS_AUDIT_ACTIONS.CONTRACT_FINALIZED, entityType: "contract", entityId: contract.id, previousValue: previous, newValue: "finalized" });
      if (!this.store.memberships.some((item) => item.contractId === contract.id)) {
        const membership = {
          id: nextId(this.store, "membership", "memb"),
          customerId: contract.customerId,
          contractId: contract.id,
          productCode: contract.productCode,
          status: "pending" as const,
          activationDate: null,
          validityEndDate: null,
          cardId: null,
          raNumber: contract.raNumber,
          financialHold: false,
          createdAt: today(),
          history: [],
        };
        this.store.memberships.push(membership);
        this.audit(identity, { module: "membership", action: BUSINESS_AUDIT_ACTIONS.MEMBERSHIP_CREATED, entityType: "membership", entityId: membership.id, newValue: "pending", relatedRecordIds: [contract.id] });
      }
      // Money may already be verified (for example a reservation): a finalized contract can now confirm its sale.
      reconcileContract(this.store, contract.id, identity);
      return viewContract(this.store, contract);
    });
  }

  /** Verified money or a Confirmed sale routes cancellation through the two-step forfeiture flow (OD-2). */
  private hasVerifiedMoney(contract: Contract): boolean {
    const sale = this.store.sales.find((item) => item.contractId === contract.id);
    return sale?.status === "confirmed" || totalVerifiedCentavos(paymentsOfContract(this.store, contract.id)) > 0;
  }

  private assertCancellable(contract: Contract): void {
    if (contract.status === "cancelled") throw new Error("The contract is already cancelled.");
    if (this.store.memberships.some((item) => item.contractId === contract.id && item.status === "active")) {
      throw new Error("A contract with an Active membership cannot be cancelled here.");
    }
  }

  async cancel(id: string, reason: string, options?: MockAsyncOptions): Promise<ContractView> {
    return this.run(options, (identity) => {
      const contract = this.find(identity, id);
      const admin = this.can(identity, "contracts.approve");
      if (!admin && !(this.isPreparer(identity, contract) && contract.status === "draft")) throw new Error("Cancelling this contract is not allowed for this identity.");
      if (!reason.trim()) throw new Error("A reason is required to cancel a contract.");
      this.assertCancellable(contract);
      if (this.hasVerifiedMoney(contract)) throw new Error("This contract has verified payments. Request a cancellation with forfeiture; Finance confirms it.");
      const previous = contract.status;
      contract.status = "cancelled";
      contract.cancelReason = reason.trim();
      this.event(contract, identity, BUSINESS_AUDIT_ACTIONS.CONTRACT_CANCELLED, reason.trim());
      this.audit(identity, { module: "contracts", action: BUSINESS_AUDIT_ACTIONS.CONTRACT_CANCELLED, entityType: "contract", entityId: contract.id, previousValue: previous, newValue: "cancelled", reason: reason.trim() });
      const sale = this.store.sales.find((item) => item.contractId === contract.id);
      if (sale && sale.status !== "cancelled") {
        const saleWas = sale.status;
        sale.status = "cancelled";
        this.audit(identity, { module: "sales", action: BUSINESS_AUDIT_ACTIONS.SALE_CANCELLED, entityType: "sale", entityId: sale.id, previousValue: saleWas, newValue: "cancelled", relatedRecordIds: [contract.id] });
      }
      const membership = this.store.memberships.find((item) => item.contractId === contract.id);
      if (membership && membership.status !== "cancelled") {
        const membershipWas = membership.status;
        membership.status = "cancelled";
        membership.history.push({ at: nowIso(), actorId: identity.id, event: BUSINESS_AUDIT_ACTIONS.MEMBERSHIP_CANCELLED, note: null });
        this.audit(identity, { module: "membership", action: BUSINESS_AUDIT_ACTIONS.MEMBERSHIP_CANCELLED, entityType: "membership", entityId: membership.id, previousValue: membershipWas, newValue: "cancelled", relatedRecordIds: [contract.id] });
      }
      return viewContract(this.store, contract);
    });
  }

  async requestCancellation(id: string, ground: ContractCancellationGround, reason: string, options?: MockAsyncOptions): Promise<ContractView> {
    return this.run(options, (identity) => {
      this.require(identity, "contracts.approve", "Requesting a cancellation needs Admin approval rights.");
      if (!(CANCELLATION_GROUNDS as readonly string[]).includes(ground)) throw new Error("Select a cancellation ground from the Reservation Agreement.");
      if (!reason.trim()) throw new Error("A reason is required to request a cancellation.");
      const contract = this.find(identity, id);
      this.assertCancellable(contract);
      if (contract.cancellation?.status === "requested") throw new Error("A cancellation is already awaiting Finance confirmation.");
      if (!this.hasVerifiedMoney(contract)) throw new Error("This contract has no verified payments. Cancel it directly instead.");
      contract.cancellation = { ground, reason: reason.trim(), requestedBy: identity.id, requestedAt: nowIso(), status: "requested", decidedBy: null, decidedAt: null, forfeitedCentavos: null };
      this.event(contract, identity, BUSINESS_AUDIT_ACTIONS.CONTRACT_CANCELLATION_REQUESTED, `${ground}: ${reason.trim()}`);
      this.audit(identity, { module: "contracts", action: BUSINESS_AUDIT_ACTIONS.CONTRACT_CANCELLATION_REQUESTED, entityType: "contract", entityId: contract.id, previousValue: contract.status, newValue: ground, reason: reason.trim() });
      return viewContract(this.store, contract);
    });
  }

  async decideCancellation(id: string, decision: "confirm" | "decline", reason: string, options?: MockAsyncOptions): Promise<ContractView> {
    return this.run(options, (identity) => {
      this.require(identity, "finance.refund", "Only Finance can confirm or decline a cancellation with forfeiture.");
      if (!reason.trim()) throw new Error("A reason is required.");
      const contract = this.find(identity, id);
      const request = contract.cancellation;
      if (!request || request.status !== "requested") throw new Error("No cancellation is awaiting confirmation for this contract.");
      // Separation of duties: requester cannot decide — except Super Admin, who has full control (owner decision 2026-11-10).
      if (request.requestedBy === identity.id && !activeIdentityRoles(identity).includes("super_admin")) throw new Error("The person who requested the cancellation cannot also decide it.");

      if (decision === "decline") {
        contract.cancellation = null;
        this.event(contract, identity, BUSINESS_AUDIT_ACTIONS.CONTRACT_CANCELLATION_DECLINED, reason.trim());
        this.audit(identity, { module: "contracts", action: BUSINESS_AUDIT_ACTIONS.CONTRACT_CANCELLATION_DECLINED, entityType: "contract", entityId: contract.id, previousValue: request.ground, newValue: "declined", reason: reason.trim() });
        return viewContract(this.store, contract);
      }

      this.assertCancellable(contract);
      const date = today();
      // Verified payments stay Verified and on record; the retained amount is recorded as forfeited (Reservation Agreement, CANCELLATION).
      const forfeited = totalVerifiedCentavos(paymentsOfContract(this.store, contract.id));
      const previous = contract.status;
      contract.status = "cancelled";
      contract.cancelReason = `${CANCELLATION_GROUND_LABELS[request.ground]}: ${request.reason}`;
      contract.cancellation = { ...request, status: "confirmed", decidedBy: identity.id, decidedAt: nowIso(), forfeitedCentavos: forfeited };
      this.event(contract, identity, BUSINESS_AUDIT_ACTIONS.CONTRACT_CANCELLED, reason.trim());
      this.audit(identity, { module: "contracts", action: BUSINESS_AUDIT_ACTIONS.CONTRACT_CANCELLED, entityType: "contract", entityId: contract.id, previousValue: previous, newValue: "cancelled", reason: reason.trim() });
      this.audit(identity, { module: "finance", action: BUSINESS_AUDIT_ACTIONS.PAYMENTS_FORFEITED, entityType: "contract", entityId: contract.id, newValue: String(forfeited), relatedRecordIds: paymentsOfContract(this.store, contract.id).map((item) => item.id) });

      const sale = this.store.sales.find((item) => item.contractId === contract.id);
      if (sale && sale.status !== "cancelled") {
        const saleWas = sale.status;
        if (saleWas === "confirmed") {
          // A previously reported Confirmed sale is reversed in the cancellation month (13 section 5.1).
          sale.adjustments.push({ id: nextId(this.store, "adjustment", "adj"), date, amountCentavos: -sale.valueCentavos, kind: "reversal", reason: "Contract cancelled with forfeiture", actorId: identity.id });
        }
        sale.status = "cancelled";
        sale.confirmedDate = null;
        this.audit(identity, { module: "sales", action: BUSINESS_AUDIT_ACTIONS.SALE_CANCELLED, entityType: "sale", entityId: sale.id, previousValue: saleWas, newValue: "cancelled", relatedRecordIds: [contract.id] });
        holdUnpaidCommissions(this.store, sale.id, "The contract was cancelled with forfeiture.");
      }

      const membership = this.store.memberships.find((item) => item.contractId === contract.id);
      if (membership && membership.status !== "cancelled") {
        const membershipWas = membership.status;
        membership.status = "cancelled";
        membership.history.push({ at: nowIso(), actorId: identity.id, event: BUSINESS_AUDIT_ACTIONS.MEMBERSHIP_CANCELLED, note: null });
        this.audit(identity, { module: "membership", action: BUSINESS_AUDIT_ACTIONS.MEMBERSHIP_CANCELLED, entityType: "membership", entityId: membership.id, previousValue: membershipWas, newValue: "cancelled", relatedRecordIds: [contract.id] });
      }
      return viewContract(this.store, contract);
    });
  }

  async approveArrangement(id: string, approvalReference: string, options?: MockAsyncOptions): Promise<ContractView> {
    return this.run(options, (identity) => {
      // Only Super Admin approves; Super Admin may also be the preparer (owner decision 2026-11-09).
      if (!activeIdentityRoles(identity).includes("super_admin")) throw new Error("Only a Super Administrator can approve a special arrangement.");
      const reference = approvalReference.trim();
      if (!reference) throw new Error("Enter the reference of the written approval.");
      const contract = this.find(identity, id);
      if (!contract.arrangement) throw new Error("This contract has no special arrangement.");
      if (contract.arrangement.status === "approved") throw new Error("This arrangement is already approved.");
      if (contract.status === "cancelled" || contract.status === "finalized") throw new Error("Only an open contract's arrangement can be approved.");
      contract.arrangement = { ...contract.arrangement, status: "approved", approvedBy: identity.id, approvedAt: nowIso(), approvalReference: reference };
      this.event(contract, identity, BUSINESS_AUDIT_ACTIONS.CONTRACT_ARRANGEMENT_APPROVED, reference);
      this.audit(identity, { module: "contracts", action: BUSINESS_AUDIT_ACTIONS.CONTRACT_ARRANGEMENT_APPROVED, entityType: "contract", entityId: contract.id, previousValue: "pending", newValue: "approved", reason: reference });
      return viewContract(this.store, contract);
    });
  }

  async resolvePaymentCode(id: string, approvalReference: string, options?: MockAsyncOptions): Promise<ContractView> {
    return this.run(options, (identity) => {
      this.require(identity, "contracts.approve", "Resolving the payment code needs Admin approval rights. An IST designation does not grant them.");
      const reference = approvalReference.trim();
      if (!reference) throw new Error("Enter the reference of the written approval.");
      const contract = this.find(identity, id);
      if (contract.status === "cancelled") throw new Error("The contract is cancelled; the payment code can no longer change.");
      if (this.store.memberships.some((item) => item.contractId === contract.id && item.cardId)) throw new Error("A Card ID was already issued; the payment code can no longer change.");
      if (contract.paymentCode != null) throw new Error("The payment code is already resolved.");
      const scheme = this.store.paymentSchemes.find((item) => item.id === contract.schemeId)!;
      const code = snapshotPaymentCode(scheme, contract.productCode);
      if (!code) throw new Error("There is no documented payment code for this scheme and tier.");
      contract.paymentCode = code;
      this.event(contract, identity, "CONTRACT_PAYMENT_CODE_RESOLVED", reference);
      this.audit(identity, { module: "contracts", action: "CONTRACT_PAYMENT_CODE_RESOLVED", entityType: "contract", entityId: contract.id, previousValue: "not recorded", newValue: code, reason: reference });
      return viewContract(this.store, contract);
    });
  }

  async recordRaNumber(id: string, raNumber: string, options?: MockAsyncOptions): Promise<ContractView> {
    return this.run(options, (identity) => {
      this.require(identity, "contracts.approve", "Recording an RA number needs Admin rights.");
      const contract = this.find(identity, id);
      // Same lifecycle point the contract page offers: the RA is recorded on a finalized contract only.
      if (contract.status !== "finalized") throw new Error("An RA number can only be recorded on a finalized contract.");
      const value = raNumber.trim();
      if (!extractRaSequence(value)) throw new Error("The RA number must end in a hyphen and a 4-digit sequence, for example 2027-0001.");
      if (this.store.contracts.some((item) => item.id !== contract.id && item.status !== "cancelled" && item.raNumber?.toLowerCase() === value.toLowerCase())) {
        throw new Error("This RA number is already recorded on another contract. Collisions are flagged for review, not suffixed.");
      }
      if (this.store.memberships.some((item) => item.contractId === contract.id && item.cardId)) throw new Error("A Card ID was already issued; the RA number can no longer change.");
      const previous = contract.raNumber;
      contract.raNumber = value;
      const membership = this.store.memberships.find((item) => item.contractId === contract.id);
      if (membership) membership.raNumber = value;
      this.event(contract, identity, BUSINESS_AUDIT_ACTIONS.CONTRACT_RA_RECORDED);
      // Previous and new official values are kept for card issuance traceability (06 section 16).
      this.audit(identity, { module: "contracts", action: BUSINESS_AUDIT_ACTIONS.CONTRACT_RA_RECORDED, entityType: "contract", entityId: contract.id, previousValue: previous ?? "not recorded", newValue: value });
      return viewContract(this.store, contract);
    });
  }
}
