import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { MembershipRepository, MembershipView } from "@/data/contracts/membership-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import type { DevIdentity } from "@/modules/identity/types";
import { buildCardId, checkActivationEligibility, computeValidityEnd } from "@/modules/membership/rules";
import type { Membership } from "@/modules/membership/types";
import { BusinessRepository, canSeeContract, customerName, nowIso, today } from "./business-base";
import { paymentsOfContract } from "./business-effects";
import type { MockStore } from "./seed";

export class MockMembershipRepository extends BusinessRepository implements MembershipRepository {
  constructor(store: MockStore, getIdentity: () => DevIdentity, asyncOptions: MockAsyncOptions = {}) {
    super(store, getIdentity, asyncOptions);
  }

  private view(membership: Membership): MembershipView {
    const contract = this.store.contracts.find((item) => item.id === membership.contractId);
    const product = this.store.products.find((item) => item.code === membership.productCode);
    const check = contract && membership.status === "pending" ? checkActivationEligibility(contract, paymentsOfContract(this.store, contract.id)) : { eligible: false, reasons: [] as string[] };
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
      const check = checkActivationEligibility(contract, paymentsOfContract(this.store, contract.id));
      if (!check.eligible) throw new Error(check.reasons[0]);
      const activationDate = today();
      const built = buildCardId({ activationDate, raNumber: contract.raNumber, tierCode: contract.productCode, paymentCode: contract.paymentCode, classification: contract.classification });
      if ("error" in built) throw new Error(built.error);
      if (this.store.memberships.some((item) => item.cardId === built.cardId)) {
        throw new Error("This Card ID already exists. The collision is flagged for review; no suffix is added.");
      }
      membership.status = "active";
      membership.activationDate = activationDate;
      membership.validityEndDate = computeValidityEnd(activationDate, contract.validityYears);
      membership.cardId = built.cardId;
      membership.raNumber = contract.raNumber;
      membership.history.push({ at: nowIso(), actorId: identity.id, event: BUSINESS_AUDIT_ACTIONS.MEMBERSHIP_ACTIVATED, note: null });
      const customer = this.store.customers.find((item) => item.id === membership.customerId);
      if (customer) customer.status = "active_member";
      this.audit(identity, { module: "membership", action: BUSINESS_AUDIT_ACTIONS.MEMBERSHIP_ACTIVATED, entityType: "membership", entityId: membership.id, previousValue: "pending", newValue: "active", relatedRecordIds: [contract.id] });
      this.audit(identity, { module: "membership", action: BUSINESS_AUDIT_ACTIONS.CARD_ID_ISSUED, entityType: "membership", entityId: membership.id, displayReference: built.cardId, newValue: "issued", relatedRecordIds: [contract.id] });
      return this.view(membership);
    });
  }
}
