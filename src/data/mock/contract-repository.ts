import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { ContractRepository, ContractView, NonStandardTermsInput, PrepareContractInput, UpdateContractInput } from "@/data/contracts/contract-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import { buildNonStandardSchedule, buildSchedule, canPrepareVipContract, finalizationHolds, nonStandardPaymentCode, nonStandardStage, nonStandardTermErrors, snapshotBenefits } from "@/modules/contracts/rules";
import { CANCELLATION_GROUNDS, CANCELLATION_GROUND_LABELS, type Contract, type ContractCancellationGround } from "@/modules/contracts/types";
import { totalVerifiedCentavos } from "@/modules/finance/rules";
import type { DevIdentity } from "@/modules/identity/types";
import { findApprovedCommissionRate } from "./commission-effects";
import { evaluateSaleParties, salePartyBlockMessage } from "@/modules/sales/accreditation-standing";
import { applicablePriceStatus } from "@/modules/vip/pricing";
import { isSellableProduct } from "@/modules/vip/tier-options";
import type { PaymentScheme, VipTierCode } from "@/modules/vip/types";
import { BusinessRepository, DATE_ONLY, canSeeContract, customerName, genealogyFor, nowIso, today } from "./business-base";
import { cancelRelatedContractRecords, paymentsOfContract, reconcileContract } from "./business-effects";
import { nextId } from "./ids";
import type { MockStore } from "./seed";
import { BROAD_ROLES, activeIdentityRoles } from "./scope";


// TODO: replace with the central paymentCodeFor(scheme, tier) from @/modules/vip/rules
// once the sibling workstream lands it; this fallback is identical.
function snapshotPaymentCode(scheme: PaymentScheme, tier: VipTierCode): string | null {
  return scheme.paymentCode ?? (scheme as { paymentCodeByTier?: Partial<Record<VipTierCode, string | null>> }).paymentCodeByTier?.[tier] ?? null;
}

/** Builds the Non-Standard schedule and payment code (doc 05 §10.2, item 32); refuses invalid terms. */
function nonStandardBuild(terms: NonStandardTermsInput, reservationCentavos: number, reservationDate: string | null) {
  const invalid = nonStandardTermErrors(terms, reservationCentavos);
  const firstError = invalid.price ?? invalid.months ?? invalid.reason;
  if (firstError) throw new Error(firstError);
  const built = buildNonStandardSchedule(terms.priceCentavos, reservationCentavos, terms.months, reservationDate);
  if (built.errors.length > 0) throw new Error(built.errors[0]);
  return { ...built, paymentCode: nonStandardPaymentCode(terms.months) };
}

/** Clears both Non-Standard approvals, so a returned or changed contract is approved again (doc 05 §10.2 step 3). */
function clearNonStandardApprovals(contract: Contract) {
  if (!contract.nonStandard) return;
  contract.nonStandard = { ...contract.nonStandard, approvedBy: null, approvedAt: null, approvalReference: null, selfApproved: false, confirmedBy: null, confirmedAt: null };
}

export function viewContract(store: MockStore, contract: Contract): ContractView {
  const sale = store.sales.find((item) => item.contractId === contract.id);
  const seller = contract.sellerMemberId ? store.members.find((member) => member.id === contract.sellerMemberId) : null;
  const parties = sale ?? contract;
  const missingCommissionRates: ContractView["missingCommissionRates"] = [];
  if (!contract.vipNumber && contract.status !== "cancelled") {
    const referrerMemberId = !sale && contract.referrerMemberId === undefined
      ? store.customers.find((item) => item.id === contract.customerId)?.referrerMemberId
      : parties.referrerMemberId;
    const recipients = [["DSC", parties.sellerMemberId], ["DRI", referrerMemberId]] as const;
    for (const [role, memberId] of recipients) {
      if (memberId && !findApprovedCommissionRate(store, memberId, "VIP", role)) {
        missingCommissionRates.push({ role, memberName: store.members.find((member) => member.id === memberId)?.displayName ?? null });
      }
    }
  }
  return JSON.parse(
    JSON.stringify({
      ...contract,
      customerName: customerName(store, contract.customerId),
      sellerName: seller?.displayName ?? null,
      sale: sale ? { id: sale.id, status: sale.status, confirmedDate: sale.confirmedDate } : null,
      holds: finalizationHolds(contract),
      missingCommissionRates,
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
      if (!canPrepareVipContract(customer.status)) throw new Error("Only a submitted or approved customer or an active member can have a contract prepared.");
      const requestId = input.newPurchaseRequestId?.trim();
      const customerContracts = this.store.contracts.filter((item) => item.customerId === customer.id);
      if (requestId) {
        const previous = customerContracts.find((item) => item.newPurchaseRequestId === requestId);
        if (previous) return viewContract(this.store, this.find(identity, previous.id));
      } else if (customerContracts.some((item) => item.status !== "cancelled")) {
        throw new Error("Open the existing contract to continue this purchase. Start a new VIP purchase for a separate transaction.");
      }
      const productCode = input.productCode ?? customer.vipPlan;
      const classification = input.classification ?? customer.contractClassification ?? "S";
      if (classification !== "S" && classification !== "N") throw new Error("Choose Standard or Non-Standard terms.");
      const sellerMemberId = input.sellerMemberId ?? customer.ownerMemberId;
      if (input.sellerMemberId !== undefined && !this.store.members.some((item) => item.id === sellerMemberId)) throw new Error("Choose a valid closing seller.");
      if (input.referrerMemberId && !this.store.members.some((item) => item.id === input.referrerMemberId)) throw new Error("Choose a valid referrer.");
      const product = this.store.products.find((item) => item.code === productCode && isSellableProduct(item));
      if (!product) throw new Error("The customer has no approved, active VIP plan.");
      const scheme = this.store.paymentSchemes.find((item) => item.id === input.schemeId);
      if (!scheme || scheme.availability !== "available") throw new Error("The selected payment plan is not available.");
      const reservationDate = input.reservationDate ?? today();
      if (!DATE_ONLY.test(reservationDate)) throw new Error("The reservation date must be a valid date.");
      const built = buildSchedule(product, scheme, reservationDate);
      if (built.errors.length > 0) throw new Error(built.errors[0]);
      // Doc 05 §10.2: a Non-Standard contract has its own price and monthly payments; the normal terms are kept as a snapshot.
      let terms = { schedule: built.schedule, priceCentavos: built.priceCentavos, requiredInitialCentavos: built.requiredInitialCentavos, paymentCode: snapshotPaymentCode(scheme, product.code) };
      let nonStandard: Contract["nonStandard"] = null;
      if (classification === "N") {
        if (!input.nonStandardTerms) throw new Error("Enter the Non-Standard total price, number of monthly payments and reason.");
        const custom = nonStandardBuild(input.nonStandardTerms, scheme.reservationCentavos ?? 0, reservationDate);
        terms = { schedule: custom.schedule, priceCentavos: input.nonStandardTerms.priceCentavos, requiredInitialCentavos: custom.requiredInitialCentavos, paymentCode: custom.paymentCode };
        nonStandard = {
          justification: input.nonStandardTerms.justification.trim(),
          standardPriceCentavos: built.priceCentavos,
          standardInstallments: built.schedule.filter((line) => line.purpose === "installment").length,
          approvedBy: null,
          approvedAt: null,
          approvalReference: null,
          selfApproved: false,
          confirmedBy: null,
          confirmedAt: null,
        };
      } else if (input.nonStandardTerms) {
        throw new Error("Only a Non-Standard contract can have its own price and monthly payments.");
      }
      const contract: Contract = {
        id: nextId(this.store, "contract", "ctr"),
        customerId: customer.id,
        ...(requestId ? { newPurchaseRequestId: requestId } : {}),
        productCode: product.code,
        productConfigVersion: product.configVersion,
        priceCentavos: terms.priceCentavos,
        // A Non-Standard price is stated by the approvers, so a catalog price conflict does not apply to it.
        priceStatus: nonStandard ? "contract_stated" : applicablePriceStatus(product, scheme),
        schemeId: scheme.id,
        schemeLabel: scheme.label,
        schemeStatus: scheme.commercialStatus,
        paymentCode: terms.paymentCode,
        classification,
        validityYears: product.validityYears,
        benefits: snapshotBenefits(product),
        schedule: terms.schedule,
        requiredInitialCentavos: terms.requiredInitialCentavos,
        raNumber: null,
        sellerMemberId,
        ...(input.referrerMemberId !== undefined ? { referrerMemberId: input.referrerMemberId } : {}),
        genealogy: genealogyFor(this.store, sellerMemberId),
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
        ...(nonStandard ? { nonStandard } : {}),
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
      if (input.nonStandardTerms) this.changeNonStandardTerms(identity, contract, input.nonStandardTerms);
      this.applyDueDates(contract, input.dueDates);
      if (input.customerAccepted !== undefined) contract.customerAccepted = input.customerAccepted;
      this.event(contract, identity, "CONTRACT_EDITED");
      return viewContract(this.store, contract);
    });
  }

  /** New Non-Standard terms on a Draft or Returned contract: rebuild the schedule and clear both approvals (doc 05 §10.2 step 3). */
  private changeNonStandardTerms(identity: DevIdentity, contract: Contract, input: NonStandardTermsInput) {
    if (contract.classification !== "N" || !contract.nonStandard) throw new Error("Only a Non-Standard contract can have its own price and monthly payments.");
    const sale = this.store.sales.find((item) => item.contractId === contract.id);
    if (sale && sale.status !== "pending") throw new Error("The sale is no longer pending, so the Non-Standard price and payments can no longer change.");
    // The payment code is part of an issued VIP Number, which is never renumbered (doc 06).
    if (contract.vipNumber && nonStandardPaymentCode(input.months) !== contract.paymentCode) throw new Error("The VIP Number is already issued, so the number of monthly payments can no longer change.");
    const reservationLine = contract.schedule.find((line) => line.purpose === "reservation");
    const built = nonStandardBuild(input, reservationLine?.amountCentavos ?? 0, reservationLine?.dueDate ?? contract.createdAt);
    const previous = contract.priceCentavos;
    if (!contract.vipNumber && (previous !== input.priceCentavos || contract.paymentCode !== built.paymentCode)) {
      delete contract.signedAgreementRecordedDate;
    }
    contract.priceCentavos = input.priceCentavos;
    contract.schedule = built.schedule;
    contract.requiredInitialCentavos = built.requiredInitialCentavos;
    contract.paymentCode = built.paymentCode;
    contract.nonStandard = { ...contract.nonStandard, justification: input.justification.trim() };
    clearNonStandardApprovals(contract);
    // Commission and sale measures use the Non-Standard price (doc 05 §10.2 rule 5).
    if (sale) sale.valueCentavos = input.priceCentavos;
    this.event(contract, identity, BUSINESS_AUDIT_ACTIONS.CONTRACT_NONSTANDARD_CHANGED, `${input.months} monthly payments`);
    this.audit(identity, { module: "contracts", action: BUSINESS_AUDIT_ACTIONS.CONTRACT_NONSTANDARD_CHANGED, entityType: "contract", entityId: contract.id, previousValue: String(previous), newValue: String(input.priceCentavos), reason: input.justification.trim() });
  }

  async submit(id: string, options?: MockAsyncOptions): Promise<ContractView> {
    return this.run(options, (identity) => {
      const contract = this.find(identity, id);
      if (!this.isPreparer(identity, contract)) throw new Error("Submitting this contract is not allowed for this identity.");
      if (contract.status !== "draft" && contract.status !== "returned") throw new Error("Only a Draft or Returned contract can be submitted.");
      // Doc 03 section 9: an expired salesperson or referrer never blocks a sale (a reminder is recorded on it);
      // a suspension or departure blocks a new sale dated on or after it. Checked before anything changes.
      const isNewSale = !this.store.sales.some((item) => item.contractId === contract.id);
      const customer = this.store.customers.find((item) => item.id === contract.customerId);
      const referrerMemberId = contract.referrerMemberId === undefined ? customer?.referrerMemberId ?? null : contract.referrerMemberId;
      const saleParties = evaluateSaleParties(
        [{ role: "seller", memberId: contract.sellerMemberId }, { role: "referrer", memberId: referrerMemberId }],
        this.store.accreditations,
        today(),
      );
      if (isNewSale && saleParties.blocked.length > 0) throw new Error(salePartyBlockMessage(saleParties.blocked[0]));
      contract.status = "submitted";
      contract.submittedAt = today();
      contract.returnReason = null;
      this.event(contract, identity, BUSINESS_AUDIT_ACTIONS.CONTRACT_SUBMITTED);
      this.audit(identity, { module: "contracts", action: BUSINESS_AUDIT_ACTIONS.CONTRACT_SUBMITTED, entityType: "contract", entityId: contract.id, newValue: "submitted" });
      if (isNewSale) {
        const sale = {
          id: nextId(this.store, "sale", "sale"),
          contractId: contract.id,
          customerId: contract.customerId,
          productCode: contract.productCode,
          branchId: this.store.members.find((member) => member.id === contract.sellerMemberId)?.branchId ?? customer?.branchId ?? "branch-a",
          valueCentavos: contract.priceCentavos,
          recordedDate: today(),
          approval: null,
          sellerMemberId: contract.sellerMemberId,
          referrerMemberId,
          team: contract.genealogy.map((entry) => ({ ...entry })),
          status: "pending" as const,
          confirmedDate: null,
          adjustments: [],
          ...(saleParties.reminders.length > 0 ? { expiryReminders: saleParties.reminders } : {}),
        };
        this.store.sales.push(sale);
        this.audit(identity, { module: "sales", action: BUSINESS_AUDIT_ACTIONS.SALE_RECORDED, entityType: "sale", entityId: sale.id, newValue: "pending", relatedRecordIds: [contract.id] });
      }
      // A reservation can be submitted while the contract is still a draft, before any sale exists: link it now.
      const recorded = this.store.sales.find((item) => item.contractId === contract.id);
      if (recorded) for (const payment of this.store.payments) if (payment.contractId === contract.id && !payment.saleId) payment.saleId = recorded.id;
      if (contract.signedAgreementRecordedDate && !contract.vipNumber) reconcileContract(this.store, contract.id, identity);
      return viewContract(this.store, contract);
    });
  }

  async returnForCorrection(id: string, reason: string, options?: MockAsyncOptions): Promise<ContractView> {
    return this.run(options, (identity) => {
      // Finance may send back a Non-Standard contract waiting for its confirmation (doc 05 §10.2 step 3).
      const admin = this.can(identity, "contracts.approve");
      if (!admin && !this.can(identity, "finance.verify")) throw new Error("Returning contracts is not allowed for this identity.");
      if (!reason.trim()) throw new Error("A reason is required to return a contract.");
      const contract = this.find(identity, id);
      if (!admin && nonStandardStage(contract) !== "finance") throw new Error("Returning contracts is not allowed for this identity.");
      if (contract.status !== "submitted" && contract.status !== "under_review") throw new Error("Only a contract in review can be returned.");
      const previous = contract.status;
      contract.status = "returned";
      contract.returnReason = reason.trim();
      clearNonStandardApprovals(contract);
      this.event(contract, identity, BUSINESS_AUDIT_ACTIONS.CONTRACT_RETURNED, reason.trim());
      this.audit(identity, { module: "contracts", action: BUSINESS_AUDIT_ACTIONS.CONTRACT_RETURNED, entityType: "contract", entityId: contract.id, previousValue: previous, newValue: "returned", reason: reason.trim() });
      return viewContract(this.store, contract);
    });
  }

  async finalize(id: string, options?: MockAsyncOptions): Promise<ContractView> {
    return this.run(options, (identity) => {
      this.require(identity, "contracts.approve", "Finalizing contracts needs Admin approval rights. An Internal Seller (IST) position does not grant them.");
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
      if (this.hasVerifiedMoney(contract)) throw new Error("This contract has verified payments. Request a cancellation where payments are kept; Finance confirms it.");
      const previous = contract.status;
      contract.status = "cancelled";
      contract.cancelReason = reason.trim();
      this.event(contract, identity, BUSINESS_AUDIT_ACTIONS.CONTRACT_CANCELLED, reason.trim());
      this.audit(identity, { module: "contracts", action: BUSINESS_AUDIT_ACTIONS.CONTRACT_CANCELLED, entityType: "contract", entityId: contract.id, previousValue: previous, newValue: "cancelled", reason: reason.trim() });
      cancelRelatedContractRecords(this.store, contract.id, identity);
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
      this.require(identity, "finance.refund", "Only Finance can confirm or decline a cancellation where payments are kept.");
      if (!reason.trim()) throw new Error("A reason is required.");
      const contract = this.find(identity, id);
      const request = contract.cancellation;
      if (!request || request.status !== "requested") throw new Error("No cancellation is awaiting confirmation for this contract.");
      // Owner ruling 2026-11-12 (authority rule, doc 07 item 8): an authorized decider may decide a request they made themselves; the history flags it.
      const selfDecided = request.requestedBy === identity.id;
      const selfNote = selfDecided ? "Self-approved: the decider also requested this cancellation." : null;

      if (decision === "decline") {
        contract.cancellation = null;
        this.event(contract, identity, BUSINESS_AUDIT_ACTIONS.CONTRACT_CANCELLATION_DECLINED, [reason.trim(), selfNote].filter(Boolean).join(" · "));
        this.audit(identity, { module: "contracts", action: BUSINESS_AUDIT_ACTIONS.CONTRACT_CANCELLATION_DECLINED, entityType: "contract", entityId: contract.id, previousValue: request.ground, newValue: "declined", reason: [reason.trim(), selfNote].filter(Boolean).join(" · ") });
        reconcileContract(this.store, contract.id, identity);
        return viewContract(this.store, contract);
      }

      this.assertCancellable(contract);
      const date = today();
      // Verified payments stay Verified and on record; the retained amount is recorded as forfeited (Reservation Agreement, CANCELLATION).
      const payments = paymentsOfContract(this.store, contract.id);
      const forfeited = totalVerifiedCentavos(payments);
      const previous = contract.status;
      contract.status = "cancelled";
      contract.cancelReason = `${CANCELLATION_GROUND_LABELS[request.ground]}: ${request.reason}`;
      contract.cancellation = { ...request, status: "confirmed", decidedBy: identity.id, decidedAt: nowIso(), forfeitedCentavos: forfeited };
      this.event(contract, identity, BUSINESS_AUDIT_ACTIONS.CONTRACT_CANCELLED, [reason.trim(), selfNote].filter(Boolean).join(" · "));
      this.audit(identity, { module: "contracts", action: BUSINESS_AUDIT_ACTIONS.CONTRACT_CANCELLED, entityType: "contract", entityId: contract.id, previousValue: previous, newValue: "cancelled", reason: [reason.trim(), selfNote].filter(Boolean).join(" · ") });
      this.audit(identity, { module: "finance", action: BUSINESS_AUDIT_ACTIONS.PAYMENTS_FORFEITED, entityType: "contract", entityId: contract.id, newValue: String(forfeited), relatedRecordIds: payments.map((item) => item.id) });
      cancelRelatedContractRecords(this.store, contract.id, identity, date);
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

  async approveNonStandard(id: string, approvalReference: string, options?: MockAsyncOptions): Promise<ContractView> {
    return this.run(options, (identity) => {
      this.require(identity, "contracts.approve", "Approving Non-Standard terms needs Administrator rights.");
      const reference = approvalReference.trim();
      if (!reference) throw new Error("Enter the signed approval reference.");
      const contract = this.find(identity, id);
      const terms = contract.nonStandard;
      if (contract.classification !== "N" || !terms) throw new Error("This contract has no Non-Standard terms.");
      if (contract.status !== "submitted" && contract.status !== "under_review") throw new Error("Only a submitted contract's Non-Standard terms can be approved.");
      if (terms.approvedBy) throw new Error("The Non-Standard terms are already approved.");
      // Owner authority rule (doc 05 item 17): the preparer may approve; the history shows it.
      const selfApproved = contract.preparedBy === identity.id;
      contract.nonStandard = { ...terms, approvedBy: identity.id, approvedAt: nowIso(), approvalReference: reference, selfApproved };
      const note = [reference, selfApproved ? "Same person prepared and approved." : null].filter(Boolean).join(" · ");
      this.event(contract, identity, BUSINESS_AUDIT_ACTIONS.CONTRACT_NONSTANDARD_APPROVED, note);
      this.audit(identity, { module: "contracts", action: BUSINESS_AUDIT_ACTIONS.CONTRACT_NONSTANDARD_APPROVED, entityType: "contract", entityId: contract.id, previousValue: "waiting for Administrator", newValue: "waiting for Finance", reason: note });
      return viewContract(this.store, contract);
    });
  }

  async confirmNonStandard(id: string, options?: MockAsyncOptions): Promise<ContractView> {
    return this.run(options, (identity) => {
      this.require(identity, "finance.verify", "Only Finance can confirm Non-Standard terms.");
      const contract = this.find(identity, id);
      const terms = contract.nonStandard;
      if (contract.classification !== "N" || !terms) throw new Error("This contract has no Non-Standard terms.");
      if (contract.status !== "submitted" && contract.status !== "under_review") throw new Error("Only a submitted contract's Non-Standard terms can be confirmed.");
      if (!terms.approvedBy) throw new Error("The Administrator must approve the Non-Standard terms first.");
      if (terms.confirmedBy) throw new Error("The Non-Standard terms are already confirmed.");
      // Doc 05 §10.2: only the Super Administrator may do both steps alone.
      const sameApprover = terms.approvedBy === identity.id;
      if (sameApprover && !activeIdentityRoles(identity).includes("super_admin")) throw new Error("Someone else must confirm terms you approved. Only the Super Administrator may do both steps.");
      contract.nonStandard = { ...terms, confirmedBy: identity.id, confirmedAt: nowIso() };
      const note = sameApprover ? "Same person approved and confirmed (Super Administrator)." : null;
      this.event(contract, identity, BUSINESS_AUDIT_ACTIONS.CONTRACT_NONSTANDARD_CONFIRMED, note);
      this.audit(identity, { module: "contracts", action: BUSINESS_AUDIT_ACTIONS.CONTRACT_NONSTANDARD_CONFIRMED, entityType: "contract", entityId: contract.id, previousValue: "waiting for Finance", newValue: "approved", ...(note ? { reason: note } : {}) });
      return viewContract(this.store, contract);
    });
  }

  async resolvePaymentCode(id: string, approvalReference: string, options?: MockAsyncOptions): Promise<ContractView> {
    return this.run(options, (identity) => {
      this.require(identity, "contracts.approve", "Resolving the payment code needs Admin approval rights. An Internal Seller (IST) position does not grant them.");
      const reference = approvalReference.trim();
      if (!reference) throw new Error("Enter the reference of the written approval.");
      const contract = this.find(identity, id);
      if (contract.status === "cancelled") throw new Error("The contract is cancelled; the payment code can no longer change.");
      if (this.store.memberships.some((item) => item.contractId === contract.id && item.cardId)) throw new Error("A Card ID was already issued; the payment code can no longer change.");
      if (contract.paymentCode != null) throw new Error("The payment code is already resolved.");
      const scheme = this.store.paymentSchemes.find((item) => item.id === contract.schemeId)!;
      const code = snapshotPaymentCode(scheme, contract.productCode);
      if (!code) throw new Error("There is no documented payment code for this payment plan and card level.");
      contract.paymentCode = code;
      this.event(contract, identity, "CONTRACT_PAYMENT_CODE_RESOLVED", reference);
      this.audit(identity, { module: "contracts", action: "CONTRACT_PAYMENT_CODE_RESOLVED", entityType: "contract", entityId: contract.id, previousValue: "not recorded", newValue: code, reason: reference });
      reconcileContract(this.store, contract.id, identity);
      return viewContract(this.store, contract);
    });
  }

  async recordSignedAgreement(id: string, options?: MockAsyncOptions): Promise<ContractView> {
    return this.run(options, (identity) => {
      this.require(identity, "contracts.approve", "Recording a signed Reservation Agreement needs Admin rights.");
      const contract = this.find(identity, id);
      if (contract.vipNumber) return viewContract(this.store, contract);
      if (!["submitted", "under_review", "finalized"].includes(contract.status)) throw new Error("Submit the contract before recording the signed agreement.");
      const sale = this.store.sales.find((item) => item.contractId === contract.id);
      if (!sale?.approval) throw new Error("Approve the sale before recording the signed agreement.");
      if (sale.sellerMemberId && sale.sellerMemberId === sale.referrerMemberId) {
        const customer = this.store.customers.find((item) => item.id === sale.customerId);
        if (!customer?.approvedAt || customer.referrerMemberId !== sale.referrerMemberId || !customer.referralReference?.trim()) throw new Error("The Administrator must verify the dated referral reference before VIP Number issuance.");
      }
      const membership = this.store.memberships.find((item) => item.contractId === contract.id);
      if (membership?.cardId) throw new Error("This contract has an existing card number. Keep it for historical review.");
      if (!contract.signedAgreementRecordedDate) {
        contract.signedAgreementRecordedDate = today();
        this.event(contract, identity, BUSINESS_AUDIT_ACTIONS.CONTRACT_RA_RECORDED);
        this.audit(identity, { module: "contracts", action: BUSINESS_AUDIT_ACTIONS.CONTRACT_RA_RECORDED, entityType: "contract", entityId: contract.id, newValue: contract.signedAgreementRecordedDate });
      }
      reconcileContract(this.store, contract.id, identity);
      return viewContract(this.store, contract);
    });
  }
}
