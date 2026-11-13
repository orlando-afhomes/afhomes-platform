import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { MembershipPoints, StayPointsAction, StayPointsRepository } from "@/data/contracts/stay-points-repository";
import { findReferenceConflict } from "@/modules/finance/rules";
import type { DevIdentity } from "@/modules/identity/types";
import type { Membership } from "@/modules/membership/types";
import { WAIVER_GROUNDS } from "@/modules/stay-points/types";
import { addDaysToDate, parseManilaDateOnly } from "@/shared/lib/dates";
import { BusinessRepository, canSeeContract, customerName, today } from "./business-base";
import { earnPromoPointsForBill, reversePromoPointsForRefund } from "./promo-effects";
import { membershipPointsLedger } from "./redemption-points-source";
import { hasImportedReceiptReference, hasRedemptionReceiptReference, hasResortReceiptReference } from "./resort-receipt-reference";

export class MockStayPointsRepository extends BusinessRepository implements StayPointsRepository {
  private member(id: string, identity: DevIdentity): Membership {
    const member = this.store.memberships.find((item) => item.id === id);
    const contract = this.store.contracts.find((item) => item.id === member?.contractId);
    if (!member || !contract || !canSeeContract(identity, contract)) throw new Error("Membership not found.");
    return member;
  }

  private build(membership: Membership): MembershipPoints {
    const spends = this.store.resortSpends.filter((item) => item.membershipId === membership.id);
    return structuredClone({
      membershipId: membership.id,
      customerName: customerName(this.store, membership.customerId),
      productCode: membership.productCode,
      cardId: membership.cardId,
      status: membership.status,
      financialHold: membership.financialHold,
      spends,
      refunds: this.store.stayPoints.refunds.filter((item) => spends.some((spend) => spend.id === item.spendId)),
      waivers: this.store.stayPoints.waivers.filter((item) => item.membershipId === membership.id),
      ledger: membershipPointsLedger(membership, this.store),
    });
  }

  async list(options?: MockAsyncOptions): Promise<MembershipPoints[]> {
    return this.run(options, (identity) => this.store.memberships.filter((membership) => {
      const contract = this.store.contracts.find((item) => item.id === membership.contractId);
      return membership.cardId && contract && canSeeContract(identity, contract);
    }).map((membership) => this.build(membership)));
  }

  async venues(options?: MockAsyncOptions) {
    return this.run(options, (identity) => {
      this.require(identity, "stay-points.enter", "You cannot enter a resort bill.");
      return this.store.outlets.filter((outlet) => outlet.status === "active").map(({ id, name }) => ({ id, name }));
    });
  }

  async act(input: StayPointsAction, options?: MockAsyncOptions): Promise<MembershipPoints> {
    return this.run(options, (identity) => {
      const state = this.store.stayPoints;
      switch (input.action) {
        case "enter": {
          this.require(identity, "stay-points.enter", "Only authorized office staff can enter resort bills.");
          const member = this.member(input.membershipId, identity);
          if (!member.cardId) throw new Error("The membership has no VIP Number.");
          if (!parseManilaDateOnly(input.date) || input.date > today()) throw new Error("Enter a valid bill date on or before today.");
          if (!this.store.outlets.some((outlet) => outlet.id === input.venueId && outlet.status === "active")) throw new Error("Select an AFhomes Direct Operation.");
          if (input.holder !== "primary" && !(input.holder === "supplementary" && member.productCode === "G1")) {
            throw new Error("Only a Gold membership can use supplementary holder spend.");
          }
          const contract = this.store.contracts.find((item) => item.id === member.contractId)!;
          if (input.holder === "supplementary" && !contract.benefits.supplementaryHolders) throw new Error("The signed Grant does not allow a supplementary holder.");
          if (![input.grossCentavos, input.excludedCentavos].every(Number.isSafeInteger) || input.grossCentavos <= 0
            || input.excludedCentavos < 0 || input.excludedCentavos >= input.grossCentavos) {
            throw new Error("Enter a positive gross amount and exclusions below the gross amount.");
          }
          const reference = input.reference.trim();
          if (!reference) throw new Error("Enter the official receipt number.");
          if (hasResortReceiptReference(this.store, reference) || hasRedemptionReceiptReference(this.store, reference) || hasImportedReceiptReference(this.store, reference) || findReferenceConflict(this.store.payments, reference)) {
            throw new Error("This official receipt number is already used.");
          }
          const id = `rs-${this.store.counters.resortSpend++}`;
          this.store.resortSpends.push({
            id, membershipId: member.id, date: input.date, amountCentavos: input.grossCentavos - input.excludedCentavos,
            grossCentavos: input.grossCentavos, excludedCentavos: input.excludedCentavos, venueId: input.venueId, holder: input.holder,
            description: input.description.trim(), status: "submitted", verificationRef: reference, enteredBy: identity.id,
          });
          this.audit(identity, { module: "stay-points", action: "RESORT_BILL_ENTERED", entityType: "resort-spend", entityId: id,
            displayReference: reference, newValue: "submitted", relatedRecordIds: [member.id] });
          return this.build(member);
        }
        case "approve":
        case "refund": {
          this.require(identity, input.action === "approve" ? "stay-points.approve" : "stay-points.refund", "Only Finance or an Administrator can approve or refund resort bills.");
          const spend = this.store.resortSpends.find((item) => item.id === input.spendId);
          if (!spend) throw new Error("Resort bill not found.");
          const member = this.member(spend.membershipId, identity);
          this.build(member);
          if (input.action === "approve") {
            if (spend.status === "verified") return this.build(member);
            if (spend.status !== "submitted") throw new Error("Only submitted resort bills can be approved.");
            spend.status = "verified";
            spend.approvedBy = identity.id;
            spend.approvedDate = today();
            this.audit(identity, { module: "stay-points", action: "RESORT_BILL_APPROVED", entityType: "resort-spend", entityId: spend.id,
              displayReference: spend.verificationRef, previousValue: "submitted", newValue: "verified", relatedRecordIds: [member.id],
              reason: spend.enteredBy === identity.id ? "Self-approval. The approver also entered this bill." : null });
            earnPromoPointsForBill(this.store, identity, spend);
          } else {
            if (spend.status !== "verified") throw new Error("Only approved resort bills can be refunded.");
            if (!parseManilaDateOnly(input.date) || input.date < spend.date || input.date > today()) throw new Error("Enter a refund date from the bill date through today.");
            const refunded = state.refunds.filter((item) => item.spendId === spend.id).reduce((sum, item) => sum + item.amountCentavos, 0);
            if (!Number.isSafeInteger(input.amountCentavos) || input.amountCentavos <= 0 || input.amountCentavos > spend.amountCentavos - refunded) {
              throw new Error("The refund must be positive and cannot exceed the remaining qualifying amount.");
            }
            const reason = input.reason.trim();
            if (!reason) throw new Error("Enter a reason for the refund.");
            const id = `rs-refund-${this.store.counters.resortSpend++}`;
            state.refunds.push({ id, spendId: spend.id, date: input.date, amountCentavos: input.amountCentavos, reason, actorId: identity.id });
            this.audit(identity, { module: "stay-points", action: "RESORT_BILL_REFUNDED", entityType: "resort-spend", entityId: spend.id,
              displayReference: spend.verificationRef, newValue: String(input.amountCentavos), reason, relatedRecordIds: [member.id, id] });
            reversePromoPointsForRefund(this.store, identity, spend, refunded + input.amountCentavos);
          }
          return this.build(member);
        }
        case "request-waiver": {
          this.require(identity, "stay-points.waiver", "Only an Administrator can record a waiver request.");
          const member = this.member(input.membershipId, identity);
          const tranche = this.build(member).ledger?.tranches.find((item) => item.number === input.tranche);
          if (!tranche || tranche.releaseDate || tranche.status === "forfeited") throw new Error("Select a tranche that is still eligible for a waiver.");
          if (!parseManilaDateOnly(input.date) || input.date <= tranche.dueDate || input.date > addDaysToDate(tranche.dueDate, 60)! || input.date > today()) {
            throw new Error("Record the written request received within 60 days after the affected tranche year ended.");
          }
          if (!WAIVER_GROUNDS.includes(input.ground) || !input.supportingReference.trim()) throw new Error("Select a valid ground and enter the supporting document reference.");
          if (state.waivers.some((item) => item.membershipId === member.id && item.tranche === input.tranche && item.decision?.granted !== false)) {
            throw new Error("A waiver request for this tranche already exists.");
          }
          const id = `waiver-${this.store.counters.resortSpend++}`;
          state.waivers.push({ id, membershipId: member.id, tranche: input.tranche, date: input.date,
            ground: input.ground, supportingReference: input.supportingReference.trim(), requestedBy: identity.id });
          this.audit(identity, { module: "stay-points", action: "COMPASSIONATE_WAIVER_REQUESTED", entityType: "membership", entityId: member.id,
            displayReference: member.cardId, newValue: String(input.tranche), reason: input.ground, relatedRecordIds: [id] });
          return this.build(member);
        }
        case "decide-waiver": {
          this.require(identity, "stay-points.waiver", "Only an Administrator can grant or refuse a waiver.");
          const waiver = state.waivers.find((item) => item.id === input.waiverId);
          if (!waiver || waiver.decision) throw new Error("Select a pending waiver.");
          const member = this.member(waiver.membershipId, identity);
          const tranche = this.build(member).ledger?.tranches.find((item) => item.number === waiver.tranche);
          if (input.granted && (!tranche || tranche.releaseDate || tranche.status === "forfeited" || !member.validityEndDate)) {
            throw new Error("This tranche can no longer be released by waiver.");
          }
          if (input.granted && (!input.releaseDate || !parseManilaDateOnly(input.releaseDate) || input.releaseDate <= today() || input.releaseDate >= member.validityEndDate!)) {
            throw new Error("Enter the next administrative cycle date before expiry.");
          }
          const reason = input.reason.trim();
          if (!reason) throw new Error("Enter a written decision reason.");
          waiver.decision = { granted: input.granted, date: today(), actorId: identity.id, reason, releaseDate: input.granted ? input.releaseDate : null };
          this.audit(identity, { module: "stay-points", action: input.granted ? "COMPASSIONATE_WAIVER_GRANTED" : "COMPASSIONATE_WAIVER_REFUSED",
            entityType: "membership", entityId: member.id, displayReference: member.cardId, newValue: String(waiver.tranche), reason, relatedRecordIds: [waiver.id] });
          return this.build(member);
        }
      }
    });
  }
}
