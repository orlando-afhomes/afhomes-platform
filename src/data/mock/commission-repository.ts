import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { ApproveCommissionInput, CommissionRepository, CommissionView, EligibleSale } from "@/data/contracts/commission-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import type { Commission } from "@/modules/commissions/types";
import type { DevIdentity } from "@/modules/identity/types";
import { parseManilaDateOnly } from "@/shared/lib/dates";
import { applyBasisPoints } from "@/shared/lib/money";
import { collectedPercent, meetsPayoutRelease, PAYOUT_RELEASE_WAIT_DAYS, payoutReleaseDate } from "@/modules/commissions/rules";
import { BusinessRepository, customerName, nowIso, today } from "./business-base";
import { paymentsOfContract } from "./business-effects";
import type { MockStore } from "./seed";
import { getDescendantIds } from "./scope";


export class MockCommissionRepository extends BusinessRepository implements CommissionRepository {
  constructor(store: MockStore, getIdentity: () => DevIdentity, asyncOptions: MockAsyncOptions = {}) {
    super(store, getIdentity, asyncOptions);
  }

  private view(commission: Commission, restrictDetails: boolean): CommissionView {
    const sale = this.store.sales.find((item) => item.id === commission.saleId);
    const contract = this.store.contracts.find((item) => item.id === commission.contractId);
    const releaseDate = contract ? payoutReleaseDate(contract, paymentsOfContract(this.store, contract.id)) : null;
    const full = { ...commission, customerName: sale ? customerName(this.store, sale.customerId) : "Unknown customer", payoutReleaseDate: releaseDate };
    // Team views never carry payout reference, method or history (08 section 17.2).
    if (restrictDetails) Object.assign(full, { payout: null, history: [] });
    return JSON.parse(JSON.stringify(full)) as CommissionView;
  }

  private find(id: string): Commission {
    const commission = this.store.commissions.find((item) => item.id === id);
    if (!commission) throw new Error("Commission not found.");
    return commission;
  }

  private event(commission: Commission, identity: DevIdentity, event: string, note: string | null = null) {
    commission.history.push({ at: nowIso(), actorId: identity.id, event, note });
  }

  /** Payout steps re-check the sale; the recorded payout itself is never altered (08 section 15.1). */
  private requireConfirmedSale(commission: Commission): void {
    const sale = this.store.sales.find((item) => item.id === commission.saleId);
    if (!sale || sale.status !== "confirmed") throw new Error("The sale is no longer Confirmed, so this payout cannot proceed. Any recorded payout is kept for Finance review.");
  }

  /**
   * shortcut: no approved rule exists for voiding an initiated payout, so a
   * commission whose payout is recorded but not confirmed cannot be cancelled;
   * upgrade when the owner approves a void or recovery procedure.
   */
  private rejectUnresolvedPayout(commission: Commission): void {
    if (commission.payout && !commission.payout.confirmedAt) {
      throw new Error("A payout was recorded for this commission but not confirmed. It cannot be cancelled until Finance resolves that payout.");
    }
  }

  private amountFor(basis: number, percentBp: number): number {
    if (!Number.isInteger(percentBp) || percentBp <= 0 || percentBp > 10_000) throw new Error("Enter a percentage greater than 0 and at most 100.");
    return applyBasisPoints(basis, percentBp);
  }

  async list(options?: MockAsyncOptions): Promise<CommissionView[]> {
    return this.run(options, (identity) => {
      if (this.can(identity, "commission.approve")) return this.store.commissions.map((item) => this.view(item, false));
      const memberId = identity.memberId;
      if (!memberId || identity.status !== "active") return [];
      if (this.can(identity, "commission.viewTeam")) {
        const team = getDescendantIds(memberId, this.store.members);
        return this.store.commissions
          .filter((item) => item.recipientMemberId === memberId || team.has(item.recipientMemberId))
          .map((item) => this.view(item, item.recipientMemberId !== memberId));
      }
      if (this.can(identity, "commission.viewOwn")) {
        return this.store.commissions.filter((item) => item.recipientMemberId === memberId).map((item) => this.view(item, false));
      }
      return [];
    });
  }

  async listEligibleSales(options?: MockAsyncOptions): Promise<EligibleSale[]> {
    return this.run(options, (identity) => {
      this.require(identity, "commission.approve", "Commission review is restricted to Finance.");
      return this.store.sales
        .filter((sale) => sale.status === "confirmed")
        .map((sale) => ({
          saleId: sale.id,
          customerName: customerName(this.store, sale.customerId),
          productCode: sale.productCode,
          valueCentavos: sale.valueCentavos,
          confirmedDate: sale.confirmedDate,
          recipients: sale.team.map((entry) => ({
            memberId: entry.memberId,
            displayName: entry.displayName,
            designation: entry.designation,
            existingCommissionId: this.store.commissions.find((item) => item.saleId === sale.id && item.recipientMemberId === entry.memberId && item.status !== "cancelled")?.id ?? null,
          })),
        }));
    });
  }

  async approve(input: ApproveCommissionInput, options?: MockAsyncOptions): Promise<CommissionView[]> {
    return this.run(options, (identity) => {
      this.require(identity, "commission.approve", "Only Finance can approve commissions.");
      const sale = this.store.sales.find((item) => item.id === input.saleId);
      if (!sale) throw new Error("Sale not found.");
      if (sale.status !== "confirmed") throw new Error("A commission needs a Confirmed Sale. A reservation, receipt or submitted contract is not enough.");
      if (input.entries.length === 0) throw new Error("Select at least one recipient.");
      const seen = new Set<string>();
      const prepared = input.entries.map((entry) => {
        const recipient = sale.team.find((item) => item.memberId === entry.memberId);
        if (!recipient) throw new Error("A selected recipient is not part of the sale genealogy.");
        if (seen.has(entry.memberId)) throw new Error("A recipient was selected twice.");
        seen.add(entry.memberId);
        if (entry.memberId === identity.memberId) throw new Error("A seller can never approve their own commission.");
        if (this.store.commissions.some((item) => item.saleId === sale.id && item.recipientMemberId === entry.memberId && item.status !== "cancelled")) {
          throw new Error(`${recipient.displayName} already has a commission for this sale.`);
        }
        return { recipient, amount: this.amountFor(sale.valueCentavos, entry.percentBp), percentBp: entry.percentBp };
      });
      return prepared.map(({ recipient, amount, percentBp }) => {
        const commission: Commission = {
          id: `comm-${this.store.counters.commission ?? 1}`,
          saleId: sale.id,
          contractId: sale.contractId,
          recipientMemberId: recipient.memberId,
          recipientName: recipient.displayName,
          recipientDesignation: recipient.designation,
          basisCentavos: sale.valueCentavos,
          percentBp,
          amountCentavos: amount,
          status: "approved",
          approvedBy: identity.id,
          approvedAt: nowIso(),
          holdReason: null,
          payout: null,
          history: [],
        };
        this.store.counters.commission = (this.store.counters.commission ?? 1) + 1;
        this.store.commissions.push(commission);
        this.event(commission, identity, BUSINESS_AUDIT_ACTIONS.COMMISSION_APPROVED);
        this.audit(identity, { module: "commissions", action: BUSINESS_AUDIT_ACTIONS.COMMISSION_APPROVED, entityType: "commission", entityId: commission.id, newValue: `${percentBp}bp/${amount}`, relatedRecordIds: [sale.id] });
        return this.view(commission, false);
      });
    });
  }

  async adjust(id: string, percentBp: number, reason: string, options?: MockAsyncOptions): Promise<CommissionView> {
    return this.run(options, (identity) => {
      this.require(identity, "commission.approve", "Only Finance can adjust commissions.");
      if (!reason.trim()) throw new Error("A reason is required.");
      const commission = this.find(id);
      if (commission.status === "paid" || commission.status === "cancelled") throw new Error("A paid or cancelled commission cannot be adjusted here.");
      if (commission.payout) throw new Error("A commission with a recorded payout cannot be adjusted.");
      const previous = `${commission.percentBp}bp/${commission.amountCentavos}`;
      commission.amountCentavos = this.amountFor(commission.basisCentavos, percentBp);
      commission.percentBp = percentBp;
      this.event(commission, identity, BUSINESS_AUDIT_ACTIONS.COMMISSION_ADJUSTED, reason.trim());
      this.audit(identity, { module: "commissions", action: BUSINESS_AUDIT_ACTIONS.COMMISSION_ADJUSTED, entityType: "commission", entityId: commission.id, previousValue: previous, newValue: `${percentBp}bp/${commission.amountCentavos}`, reason: reason.trim() });
      return this.view(commission, false);
    });
  }

  async resolveHold(id: string, action: "keep" | "cancel" | "restore", reason: string, options?: MockAsyncOptions): Promise<CommissionView> {
    return this.run(options, (identity) => {
      this.require(identity, "commission.approve", "Only Finance can resolve commission holds.");
      if (!reason.trim()) throw new Error("A reason is required.");
      const commission = this.find(id);
      if (commission.status !== "on_hold") throw new Error("Only a held commission can be resolved.");
      if (action === "restore") {
        const sale = this.store.sales.find((item) => item.id === commission.saleId);
        if (!sale || sale.status !== "confirmed") throw new Error("The sale is not Confirmed, so the hold cannot be released.");
        commission.status = "approved";
        commission.holdReason = null;
      } else if (action === "cancel") {
        this.rejectUnresolvedPayout(commission);
        commission.status = "cancelled";
      }
      this.event(commission, identity, BUSINESS_AUDIT_ACTIONS.COMMISSION_HOLD_RESOLVED, `${action}: ${reason.trim()}`);
      this.audit(identity, { module: "commissions", action: BUSINESS_AUDIT_ACTIONS.COMMISSION_HOLD_RESOLVED, entityType: "commission", entityId: commission.id, previousValue: "on_hold", newValue: commission.status, reason: reason.trim() });
      return this.view(commission, false);
    });
  }

  async cancel(id: string, reason: string, options?: MockAsyncOptions): Promise<CommissionView> {
    return this.run(options, (identity) => {
      this.require(identity, "commission.approve", "Only Finance can cancel commissions.");
      if (!reason.trim()) throw new Error("A reason is required.");
      const commission = this.find(id);
      if (commission.status === "paid" || commission.status === "cancelled") throw new Error("A paid or cancelled commission cannot be cancelled here.");
      this.rejectUnresolvedPayout(commission);
      const previous = commission.status;
      commission.status = "cancelled";
      this.event(commission, identity, BUSINESS_AUDIT_ACTIONS.COMMISSION_CANCELLED, reason.trim());
      this.audit(identity, { module: "commissions", action: BUSINESS_AUDIT_ACTIONS.COMMISSION_CANCELLED, entityType: "commission", entityId: commission.id, previousValue: previous, newValue: "cancelled", reason: reason.trim() });
      return this.view(commission, false);
    });
  }

  async recordPayout(id: string, input: { reference: string; method?: string | null; payoutDate: string }, options?: MockAsyncOptions): Promise<CommissionView> {
    return this.run(options, (identity) => {
      this.require(identity, "commission.payout", "Only Finance can record payouts.");
      const commission = this.find(id);
      if (commission.status !== "approved") throw new Error("Only an approved commission can be paid out.");
      if (commission.payout) throw new Error("A payout was already recorded. Duplicate payouts are not allowed.");
      this.requireConfirmedSale(commission);
      const contract = this.store.contracts.find((item) => item.id === commission.contractId);
      if (!contract) throw new Error("Contract not found.");
      const payments = paymentsOfContract(this.store, contract.id);
      if (!meetsPayoutRelease(contract, payments)) {
        throw new Error(`Commission pays out once 40% of the contract value is Finance-verified (currently ${collectedPercent(contract, payments)}%).`);
      }
      const releaseDate = payoutReleaseDate(contract, payments);
      if (!releaseDate) throw new Error("Finance must reconcile the payment verification date before recording this payout.");
      if (today() < releaseDate) {
        throw new Error(`Commission release opens on ${releaseDate}, ${PAYOUT_RELEASE_WAIT_DAYS} days after 40% of the contract value was verified.`);
      }
      if (!input.reference.trim()) throw new Error("Enter the payment reference.");
      if (!parseManilaDateOnly(input.payoutDate)) throw new Error("Enter a valid payout date.");
      if (input.payoutDate < releaseDate) throw new Error("The payout date must be on or after the release date.");
      commission.payout = { reference: input.reference.trim(), method: input.method?.trim() || null, payoutDate: input.payoutDate, processedBy: identity.id, initiatedAt: nowIso(), confirmedAt: null };
      this.event(commission, identity, BUSINESS_AUDIT_ACTIONS.COMMISSION_PAYOUT_RECORDED);
      this.audit(identity, { module: "commissions", action: BUSINESS_AUDIT_ACTIONS.COMMISSION_PAYOUT_RECORDED, entityType: "commission", entityId: commission.id, newValue: "payout_initiated" });
      return this.view(commission, false);
    });
  }

  async confirmPayout(id: string, options?: MockAsyncOptions): Promise<CommissionView> {
    return this.run(options, (identity) => {
      this.require(identity, "commission.payout", "Only Finance can confirm disbursement.");
      const commission = this.find(id);
      if (!commission.payout) throw new Error("Record a payout before confirming disbursement.");
      if (commission.payout.confirmedAt) throw new Error("Disbursement was already confirmed.");
      if (commission.status !== "approved") throw new Error("Only an approved commission can be confirmed as paid. The recorded payout is kept.");
      this.requireConfirmedSale(commission);
      commission.payout.confirmedAt = nowIso();
      commission.status = "paid";
      this.event(commission, identity, BUSINESS_AUDIT_ACTIONS.COMMISSION_PAID);
      this.audit(identity, { module: "commissions", action: BUSINESS_AUDIT_ACTIONS.COMMISSION_PAID, entityType: "commission", entityId: commission.id, previousValue: "approved", newValue: "paid" });
      return this.view(commission, false);
    });
  }
}
