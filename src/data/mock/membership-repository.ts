import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { MembershipRepository, MembershipView } from "@/data/contracts/membership-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import type { DevIdentity } from "@/modules/identity/types";
import { checkActivationEligibility, computeValidityEnd } from "@/modules/membership/rules";
import { approvedCollectionMilestone } from "@/modules/finance/rules";
import { addYearsToDate } from "@/shared/lib/dates";
import type { CardServiceInput, Membership } from "@/modules/membership/types";
import { BusinessRepository, canSeeContract, customerName, nowIso, today } from "./business-base";
import { paymentsOfContract } from "./business-effects";
import type { MockStore } from "./seed";
import { MockRedemptionRepository } from "./redemption-repository";
import { closeStayPointsForTransfer } from "./redemption-points-source";
import { recordDueDeemedClaim } from "./card-claim";

export class MockMembershipRepository extends BusinessRepository implements MembershipRepository {
  constructor(store: MockStore, getIdentity: () => DevIdentity, asyncOptions: MockAsyncOptions = {}) {
    super(store, getIdentity, asyncOptions);
  }

  private view(membership: Membership): MembershipView {
    const contract = this.store.contracts.find((item) => item.id === membership.contractId);
    const product = this.store.products.find((item) => item.code === membership.productCode);
    const check = contract && membership.status === "pending" ? checkActivationEligibility(contract, paymentsOfContract(this.store, contract.id)) : { eligible: false, reasons: [] as string[] };
    if (contract) recordDueDeemedClaim(this.store, membership, contract);
    return JSON.parse(
      JSON.stringify({
        ...membership,
        customerName: customerName(this.store, membership.customerId),
        productName: product?.name ?? membership.productCode,
        schemeLabel: contract?.schemeLabel ?? "",
        eligible: check.eligible,
        blockers: check.reasons,
      }),
    ) as MembershipView;
  }

  async list(options?: MockAsyncOptions): Promise<MembershipView[]> {
    return this.run(options, (identity) =>
      this.store.memberships
        .filter((membership) => {
          const contract = this.store.contracts.find((item) => item.id === membership.contractId);
          return Boolean(contract) && canSeeContract(identity, contract!);
        })
        .map((membership) => this.view(membership)),
    );
  }

  async activate(id: string, options?: MockAsyncOptions): Promise<MembershipView> {
    return this.run(options, (identity) => {
      this.require(identity, "membership.activate", "Only an authorized Admin can activate a membership.");
      const membership = this.store.memberships.find((item) => item.id === id);
      if (!membership) throw new Error("Membership not found.");
      if (membership.cardId || membership.status === "active") throw new Error("This membership was already activated. A Card ID is never regenerated.");
      if (membership.status !== "pending") throw new Error("Only a pending membership can be activated.");
      const contract = this.store.contracts.find((item) => item.id === membership.contractId);
      if (!contract) throw new Error("The contract was not found.");
      const payments = paymentsOfContract(this.store, contract.id);
      const check = checkActivationEligibility(contract, payments);
      if (!check.eligible) throw new Error(check.reasons[0]);
      const activationDate = today();
      const settlement = approvedCollectionMilestone(contract.priceCentavos, payments, 10_000);
      if (!contract.vipNumber || !settlement) throw new Error("A VIP Number and dated full settlement are required.");
      if (this.store.memberships.some((item) => item.cardId === contract.vipNumber)) throw new Error("This VIP Number is already assigned to a card.");
      membership.status = "active";
      membership.activationDate = activationDate;
      membership.fullSettlementDate = settlement.date;
      membership.validityEndDate = null;
      membership.cardId = contract.vipNumber;
      membership.raNumber = contract.raNumber;
      membership.history.push({ at: nowIso(), actorId: identity.id, event: BUSINESS_AUDIT_ACTIONS.MEMBERSHIP_ACTIVATED, note: null });
      const customer = this.store.customers.find((item) => item.id === membership.customerId);
      if (customer) customer.status = "active_member";
      this.audit(identity, { module: "membership", action: BUSINESS_AUDIT_ACTIONS.MEMBERSHIP_ACTIVATED, entityType: "membership", entityId: membership.id, previousValue: "pending", newValue: "active", relatedRecordIds: [contract.id] });
      return this.view(membership);
    });
  }

  async recordCardClaim(id: string, options?: MockAsyncOptions): Promise<MembershipView> {
    return this.run(options, (identity) => {
      this.require(identity, "membership.activate", "This account cannot record a card claim.");
      const membership = this.store.memberships.find((item) => item.id === id);
      const contract = this.store.contracts.find((item) => item.id === membership?.contractId);
      if (!membership || !contract || !canSeeContract(identity, contract)) throw new Error("Membership not found.");
      recordDueDeemedClaim(this.store, membership, contract);
      if (membership.cardClaimDate) return this.view(membership);
      if (membership.status !== "active" || !membership.cardId || !membership.fullSettlementDate) throw new Error("An active membership with a dated full settlement is required.");
      const deadline = addYearsToDate(membership.fullSettlementDate, 1);
      if (!deadline) throw new Error("The full settlement date is invalid.");
      const current = today();
      const deemed = current >= deadline;
      membership.cardClaimDate = deemed ? deadline : current;
      membership.cardClaimKind = deemed ? "deemed" : "actual";
      membership.validityEndDate = computeValidityEnd(membership.cardClaimDate, contract.validityYears);
      const action = deemed ? "CARD_CLAIM_DEEMED" : "CARD_CLAIM_RECORDED";
      membership.history.push({ at: nowIso(), actorId: identity.id, event: action, note: membership.cardClaimDate });
      this.audit(identity, { module: "membership", action, entityType: "membership", entityId: id, newValue: membership.cardClaimDate, relatedRecordIds: [contract.id] });
      return this.view(membership);
    });
  }

  async serviceCard(id: string, input: CardServiceInput, options?: MockAsyncOptions): Promise<MembershipView> {
    return this.run(options, (identity) => {
      this.require(identity, "contracts.approve", "Card servicing requires management approval.");
      const membership = this.store.memberships.find((item) => item.id === id);
      const contract = this.store.contracts.find((item) => item.id === membership?.contractId);
      if (!membership || !contract || !canSeeContract(identity, contract)) throw new Error("Membership not found.");
      if (membership.status !== "active" || !membership.cardId) throw new Error("An active VIP card is required.");
      const requestReference = input.requestReference.trim();
      const approvalReference = input.approvalReference.trim();
      if (!requestReference || !approvalReference) throw new Error("Record the written request and management approval references.");
      if (membership.cardServices?.some((item) => item.approvalReference === approvalReference)) throw new Error("This approval has already been recorded.");
      const previousCustomerId = membership.customerId;
      const date = today();
      if (input.kind !== "replacement") {
        const next = this.store.customers.find((item) => item.id === input.nextCustomerId);
        if (!next || next.id === previousCustomerId || !["approved", "active_member"].includes(next.status)) throw new Error("Choose a different approved customer as the new holder.");
        if (input.kind === "transfer" && !input.holderNotified) throw new Error("Notify the former holder about their future bookings before finalizing the transfer.");
        if (input.kind === "inheritance" && (!input.inheritanceReference.trim() || !input.acknowledgementReference.trim())) throw new Error("Record the inheritance documents and the signed successor acknowledgement.");
        new MockRedemptionRepository(this.store, () => identity).cancelForTransfer(identity, id, date);
        closeStayPointsForTransfer(this.store, membership, date, identity.id, approvalReference);
        membership.customerId = next.id;
      } else if (!["voided", "recalled"].includes(input.custody)) {
        throw new Error("Record whether the former card was voided or recalled.");
      }
      (membership.cardServices ??= []).push({ ...input, requestReference, approvalReference, previousCustomerId, date, actorId: identity.id, entitlementVersion: contract.productConfigVersion });
      const action = input.kind === "replacement" ? "CARD_REPLACED" : "CARD_TRANSFERRED";
      membership.history.push({ at: nowIso(), actorId: identity.id, event: action, note: approvalReference });
      this.audit(identity, { module: "membership", action, entityType: "membership", entityId: id, previousValue: previousCustomerId, newValue: membership.customerId, relatedRecordIds: [contract.id] });
      return this.view(membership);
    });
  }
}
