import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { CommissionRateDirectory, CommissionRepository, CommissionView } from "@/data/contracts/commission-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import type { Commission, CommissionClawback, CommissionPayoutList, CommissionRateSetting } from "@/modules/commissions/types";
import type { DevIdentity } from "@/modules/identity/types";
import { parseManilaDateOnly } from "@/shared/lib/dates";
import { firstOpenDate } from "@/modules/finance/month-close";
import { applyBasisPoints } from "@/shared/lib/money";
import { clawbackBalance, collectedPercent, meetsPayoutRelease, payoutReleaseDate, payoutReleaseDateFor } from "@/modules/commissions/rules";
import { BusinessRepository, customerName, nowIso, today } from "./business-base";
import { paymentsOfContract } from "./business-effects";
import type { MockStore } from "./seed";
import { getDescendantIds } from "./scope";
import { applyCommissionTrigger } from "./commission-effects";
import { nextId } from "./ids";
import { calculateAllowances, SHIPPED_ALLOWANCE_TERMS, type AllowanceReview, type AllowanceReviewInput } from "@/modules/commissions/allowances";


export class MockCommissionRepository extends BusinessRepository implements CommissionRepository {
  constructor(store: MockStore, getIdentity: () => DevIdentity, asyncOptions: MockAsyncOptions = {}) {
    super(store, getIdentity, asyncOptions);
  }

  async rateDirectory(options?: MockAsyncOptions): Promise<CommissionRateDirectory> {
    return this.run(options, (identity) => {
      this.require(identity, "commission.rates.manage", "Only an administrator can manage rates.");
      const members = this.store.members.map(({ id, displayName }) => ({ id, name: displayName }));
      return { members, rates: this.store.commissionRateSettings.map((item) => ({
        ...item, memberName: members.find(({ id }) => id === item.memberId)?.name ?? item.memberId,
      })) };
    });
  }

  async setRate(input: CommissionRateSetting & { reason: string }, options?: MockAsyncOptions): Promise<void> {
    return this.run(options, (identity) => {
      this.require(identity, "commission.rates.manage", "Only an administrator can change rates.");
      const { memberId, product, role, rateBp, standardRateBp } = input;
      const reason = input.reason.trim();
      if (!reason) throw new Error("Enter the reason for this approved rate.");
      if (!this.store.members.some((item) => item.id === memberId)) throw new Error("Seller not found.");
      if ((product !== "VIP" && product !== "IGP") || (role !== "DSC" && role !== "DRI")) throw new Error("Choose a product and commission type.");
      if (!Number.isSafeInteger(rateBp) || rateBp < 0 || (standardRateBp !== null && (!Number.isSafeInteger(standardRateBp) || standardRateBp < 0))) {
        throw new Error("Enter a valid nonnegative commission rate.");
      }
      const next = { memberId, product, role, rateBp, standardRateBp };
      const existing = this.store.commissionRateSettings.find((item) => item.memberId === memberId && item.product === product && item.role === role);
      const previous = existing ? `${existing.rateBp}bp / standard ${existing.standardRateBp ?? "unset"}` : undefined;
      if (existing) Object.assign(existing, next);
      else this.store.commissionRateSettings.push(next);
      this.audit(identity, { module: "commissions", action: "COMMISSION_RATE_SET", entityType: "member", entityId: memberId, previousValue: previous, newValue: `${product} ${role}: ${rateBp}bp / standard ${standardRateBp ?? "unset"}`, reason });
    });
  }

  async payoutLists(options?: MockAsyncOptions): Promise<CommissionPayoutList[]> {
    return this.run(options, (identity) => {
      this.require(identity, "commission.payout.prepare", "Payout lists are restricted to authorized staff.");
      return structuredClone(this.store.commissionPayoutLists.map((list) => ({
        ...list, entries: list.entries.map((entry) => {
          const commission = this.find(entry.commissionId);
          const sale = commission.product === "IGP"
            ? this.store.igp.sales.find((item) => item.id === commission.saleId)
            : this.store.sales.find((item) => item.id === commission.saleId);
          return { ...entry, recipientName: commission.recipientName, saleLabel: sale ? customerName(this.store, sale.customerId) : entry.saleId };
        }),
      })));
    });
  }

  async preparePayoutList(month: string, options?: MockAsyncOptions): Promise<CommissionPayoutList> {
    return this.run(options, (identity) => {
      this.require(identity, "commission.payout.prepare", "You cannot prepare a payout list.");
      month = month.trim();
      if (!this.store.closedMonths.some((item) => item.month === month)) throw new Error("Close the release month before preparing its payout list.");
      const listed = new Set(this.store.commissionPayoutLists.flatMap((list) => list.approvedAt
        ? list.approvedCommissionIds ?? list.entries.map(({ commissionId }) => commissionId)
        : list.month === month ? list.entries.map(({ commissionId }) => commissionId) : []));
      const eligible = this.store.commissions.filter((item) => item.status === "released" && item.releaseDate?.slice(0, 7) === month && !listed.has(item.id));
      if (!eligible.length) throw new Error("No released commissions are waiting for a payout list in this month.");
      const list: CommissionPayoutList = {
        id: nextId(this.store, "commissionPayoutList", "commission-list"), month,
        entries: eligible.map(({ id, saleId, recipientMemberId, amountCentavos }) => ({ commissionId: id, saleId, recipientMemberId, amountCentavos })),
        preparedBy: identity.id, preparedAt: nowIso(), approvedBy: null, approvedAt: null,
      };
      this.store.commissionPayoutLists.push(list);
      this.audit(identity, { module: "commissions", action: "COMMISSION_PAYOUT_LIST_PREPARED", entityType: "commission", entityId: list.id, newValue: month, relatedRecordIds: list.entries.map((item) => item.commissionId) });
      return structuredClone(list);
    });
  }

  async approvePayoutList(id: string, options?: MockAsyncOptions): Promise<CommissionPayoutList> {
    return this.run(options, (identity) => {
      this.require(identity, "commission.approve", "You cannot approve payout lists.");
      const list = this.store.commissionPayoutLists.find((item) => item.id === id);
      if (!list) throw new Error("Payout list not found.");
      if (list.approvedAt) throw new Error("This payout list is already approved.");
      const records = list.entries.map(({ commissionId }) => this.find(commissionId));
      const eligible = records.filter((item) => item.status === "released" && item.releaseDate?.slice(0, 7) === list.month);
      if (!eligible.length) throw new Error("Every commission on this list is held or cancelled.");
      const approvalDate = nowIso();
      const reason = list.preparedBy === identity.id ? "Self-approved: the same person prepared and approved this payout list." : undefined;
      list.approvedBy = identity.id;
      list.approvedAt = approvalDate;
      list.approvedCommissionIds = eligible.map((item) => item.id);
      for (const commission of eligible) {
        commission.status = "approved";
        commission.approvedBy = identity.id;
        commission.approvedAt = approvalDate;
        this.event(commission, identity, BUSINESS_AUDIT_ACTIONS.COMMISSION_APPROVED, reason ?? null);
      }
      this.audit(identity, { module: "commissions", action: "COMMISSION_PAYOUT_LIST_APPROVED", entityType: "commission", entityId: id, previousValue: "prepared", newValue: "approved", reason, relatedRecordIds: eligible.map((item) => item.id) });
      return structuredClone(list);
    });
  }

  async clawbacks(options?: MockAsyncOptions): Promise<CommissionClawback[]> {
    return this.run(options, (identity) => {
      if (this.can(identity, "commission.approve")) return structuredClone(this.store.commissionClawbacks);
      if (!identity.memberId || !this.can(identity, "commission.viewOwn")) return [];
      return structuredClone(this.store.commissionClawbacks.filter((item) => item.recipientMemberId === identity.memberId));
    });
  }

  async recordRecovery(id: string, input: { amountCentavos: number; reference: string }, options?: MockAsyncOptions): Promise<void> {
    return this.run(options, (identity) => {
      this.require(identity, "commission.clawback.collect", "You cannot record a clawback collection.");
      const item = this.store.commissionClawbacks.find((entry) => entry.id === id);
      if (!item) throw new Error("Clawback not found.");
      const reference = input.reference.trim();
      if (!reference) throw new Error("Enter the collection reference.");
      if (item.recoveries.some((entry) => entry.reference.toLowerCase() === reference.toLowerCase())) throw new Error("This collection was already recorded.");
      if (!Number.isSafeInteger(input.amountCentavos) || input.amountCentavos <= 0 || input.amountCentavos > clawbackBalance(item)) {
        throw new Error("Enter an amount above zero and within the remaining balance.");
      }
      item.recoveries.push({ date: today(), actorId: identity.id, amountCentavos: input.amountCentavos, reference });
      this.audit(identity, { module: "commissions", action: "COMMISSION_CLAWBACK_RECOVERED", entityType: "commission", entityId: item.commissionId, newValue: String(input.amountCentavos), relatedRecordIds: [item.saleId, item.id] });
    });
  }

  async writeOff(id: string, reason: string, options?: MockAsyncOptions): Promise<void> {
    return this.run(options, (identity) => {
      this.require(identity, "commission.clawback.writeOff", "Only an administrator can write off clawbacks.");
      const item = this.store.commissionClawbacks.find((entry) => entry.id === id);
      if (!item) throw new Error("Clawback not found.");
      if (!reason.trim()) throw new Error("Enter the reason for writing this off.");
      const balance = clawbackBalance(item);
      if (balance <= 0) throw new Error("This clawback has no open balance.");
      item.writeOff = { date: today(), actorId: identity.id, reason: reason.trim() };
      this.audit(identity, { module: "commissions", action: "COMMISSION_CLAWBACK_WRITTEN_OFF", entityType: "commission", entityId: item.commissionId, previousValue: String(balance), newValue: "written_off", reason: reason.trim(), relatedRecordIds: [item.saleId, item.id] });
    });
  }

  async allowanceReviews(options?: MockAsyncOptions) {
    return this.run(options, (identity) => {
      this.require(identity, "commission.approve", "Allowance review is restricted to authorized staff.");
      return structuredClone({
        reviews: this.store.allowanceReviews,
        members: this.store.members.flatMap(({ id, displayName: name, designation: position }) =>
          position === "OST" ? [] : [{ id, name, position }],
        ),
      });
    });
  }

  async saveAllowanceReview(input: AllowanceReviewInput, options?: MockAsyncOptions): Promise<AllowanceReview> {
    return this.run(options, (identity) => {
      this.require(identity, "commission.approve", "You cannot save allowance reviews.");
      const { month, memberId, qualifying, extended, workbook } = input;
      const monthDate = parseManilaDateOnly(`${month}-01`);
      if (!monthDate) throw new Error("Enter a valid month.");
      if (this.store.closedMonths.some((item) => item.month === month)) throw new Error("This month is closed. Its figures are locked.");
      const member = this.store.members.find((item) => item.id === memberId);
      if (!member || member.designation === "OST") throw new Error("Choose an IST leader.");
      if (workbook && Object.values(workbook).some((value) => !Number.isSafeInteger(value) || value < 0)) throw new Error("Enter valid workbook figures.");
      const previous = this.store.allowanceReviews.findLast((item) => item.month === month && item.memberId === memberId);
      const withholdingReason = input.withholdingReason === undefined ? previous?.withholdingReason ?? "" : input.withholdingReason.trim();
      if (withholdingReason !== (previous?.withholdingReason ?? "")) this.require(identity, "commission.rates.manage", "Only an administrator can change BA withholding.");
      const daysInMonth = new Date(Date.UTC(monthDate.year, monthDate.month, 0)).getUTCDate();
      const position = member.designation;
      const result = calculateAllowances({
        daysInMonth, terms: SHIPPED_ALLOWANCE_TERMS[position], qualifying, extended, withholdBa: Boolean(withholdingReason),
      });
      const review: AllowanceReview = {
        id: nextId(this.store, "allowanceReview", "allowance"), month, memberId, memberName: member.displayName, position,
        result, workbook, qualifying, extended, withholdingReason, withholdBa: Boolean(withholdingReason),
        reviewedAt: nowIso(), reviewedBy: identity.id,
      };
      this.store.allowanceReviews.push(structuredClone(review));
      this.audit(identity, { module: "commissions", action: "COMMISSION_ALLOWANCE_REVIEWED", entityType: "member", entityId: memberId,
        previousValue: previous ? JSON.stringify(previous.result) : undefined, newValue: JSON.stringify(result),
        reason: withholdingReason || undefined, relatedRecordIds: [review.id] });
      return review;
    });
  }

  private view(commission: Commission, restrictDetails: boolean): CommissionView {
    const sale = commission.product === "IGP"
      ? this.store.igp.sales.find((item) => item.id === commission.saleId)
      : this.store.sales.find((item) => item.id === commission.saleId);
    const contract = this.store.contracts.find((item) => item.id === commission.contractId);
    const releaseDate = commission.releaseDate ? payoutReleaseDateFor(commission.releaseDate) : contract ? payoutReleaseDate(contract, paymentsOfContract(this.store, contract.id)) : null;
    const saleReference = sale && "seriesNumber" in sale ? sale.seriesNumber : contract?.vipNumber ?? contract?.raNumber ?? undefined;
    const full = { ...commission, customerName: sale ? customerName(this.store, sale.customerId) : "Unknown customer", saleReference, payoutReleaseDate: releaseDate };
    // Team views never carry payout reference, method or history (08 section 17.2).
    if (restrictDetails) Object.assign(full, { payout: null, history: [], previousPayouts: [] });
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
    if (commission.product === "IGP") {
      const sale = this.store.igp.sales.find((item) => item.id === commission.saleId);
      if (!sale || sale.status !== "approved" || !sale.closedDealDate) throw new Error("The IGP sale is no longer Confirmed.");
      if (!(commission.stage === "full" ? sale.fullPaymentDate : sale.stage1Date)) throw new Error("The IGP sale no longer meets the release threshold.");
      return;
    }
    const sale = this.store.sales.find((item) => item.id === commission.saleId);
    if (!sale || sale.status !== "confirmed") throw new Error("The sale is no longer Confirmed, so this payout cannot proceed. Any recorded payout is kept for Finance review.");
  }

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

  async adjust(id: string, percentBp: number, reason: string, options?: MockAsyncOptions): Promise<CommissionView> {
    return this.run(options, (identity) => {
      this.require(identity, "commission.approve", "Only Finance can adjust commissions.");
      if (!reason.trim()) throw new Error("A reason is required.");
      const commission = this.find(id);
      if (commission.releaseDate) throw new Error("A released commission cannot change its frozen rate.");
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
        this.requireConfirmedSale(commission);
        const reissueReview = commission.product === "IGP" && this.store.igp.sales.some((item) => item.id === commission.saleId && item.commissionReviewReason);
        if (reissueReview || (commission.releaseDate && !commission.holdTrigger && !commission.releaseRestorable)) throw new Error("This commission requires a separate financial review.");
        const contract = this.store.contracts.find((item) => item.id === commission.contractId);
        if (commission.product !== "IGP" && commission.releaseDate && contract && !meetsPayoutRelease(contract, paymentsOfContract(this.store, contract.id))) {
          throw new Error("The sale must meet the release threshold before the hold can be restored.");
        }
        commission.status = commission.approvedAt ? "approved" : "released";
        commission.holdReason = null;
        delete commission.holdTrigger;
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

  async recordPayout(id: string, input: { reference: string; method?: string | null; payoutDate: string; evidenceFileName?: string }, options?: MockAsyncOptions): Promise<CommissionView> {
    return this.run(options, (identity) => {
      this.require(identity, "commission.payout", "Only Finance can record payouts.");
      const commission = this.find(id);
      if (commission.status !== "approved") throw new Error("Only an approved commission can be paid out.");
      if (commission.payout) throw new Error("A payout was already recorded. Duplicate payouts are not allowed.");
      this.requireConfirmedSale(commission);
      const contract = this.store.contracts.find((item) => item.id === commission.contractId);
      if (!contract && commission.product !== "IGP") throw new Error("Contract not found.");
      const payments = contract ? paymentsOfContract(this.store, contract.id) : [];
      if (contract && !meetsPayoutRelease(contract, payments)) {
        throw new Error(`Commission pays out once 40% of the contract value is Finance-verified (currently ${collectedPercent(contract, payments)}%).`);
      }
      const releaseDate = commission.releaseDate ? payoutReleaseDateFor(commission.releaseDate) : contract ? payoutReleaseDate(contract, payments) : null;
      if (!releaseDate) throw new Error("Finance must reconcile the receipt and verification dates before recording this payout.");
      if (today() < releaseDate) {
        throw new Error(`Commission release opens on ${releaseDate}, after its release month.`);
      }
      if (!input.reference.trim()) throw new Error("Enter the payment reference.");
      if (!parseManilaDateOnly(input.payoutDate)) throw new Error("Enter a valid payout date.");
      if (input.payoutDate < releaseDate) throw new Error("The payout date must be on or after the release date.");
      if (input.payoutDate > today()) throw new Error("The payout date cannot be in the future.");
      if (commission.releaseDate && (!input.method?.trim() || !input.evidenceFileName?.trim())) {
        throw new Error("Enter the payment method and attach proof of disbursement.");
      }
      commission.payout = { reference: input.reference.trim(), method: input.method?.trim() || null, payoutDate: input.payoutDate, processedBy: identity.id, initiatedAt: nowIso(), confirmedAt: null, evidenceFileName: input.evidenceFileName?.trim() || null };
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
      const previous = commission.status;
      if (previous !== "approved" && previous !== "on_hold") throw new Error("Only an approved or held commission with an initiated payout can be confirmed.");
      if (previous === "approved") this.requireConfirmedSale(commission);
      commission.payout.confirmedAt = nowIso();
      commission.payout.countedDate = firstOpenDate(this.store.closedMonths, commission.payout.payoutDate);
      commission.status = "paid";
      this.event(commission, identity, BUSINESS_AUDIT_ACTIONS.COMMISSION_PAID);
      this.audit(identity, { module: "commissions", action: BUSINESS_AUDIT_ACTIONS.COMMISSION_PAID, entityType: "commission", entityId: commission.id, previousValue: previous, newValue: "paid" });
      if (previous === "on_hold" && commission.holdTrigger) applyCommissionTrigger(this.store, identity, commission.saleId, commission.holdTrigger, today(), [commission.stage ?? "stage1"]);
      return this.view(commission, false);
    });
  }

  async voidPayout(id: string, reason: string, options?: MockAsyncOptions): Promise<CommissionView> {
    return this.run(options, (identity) => {
      this.require(identity, "commission.payout", "You cannot void payouts.");
      const commission = this.find(id);
      if (commission.status !== "on_hold" || !commission.payout || commission.payout.confirmedAt) throw new Error("Only an unconfirmed payout on a held commission can be voided.");
      if (!reason.trim()) throw new Error("Enter a reason for voiding the payout.");
      (commission.previousPayouts ??= []).push({ ...commission.payout, voidedAt: nowIso(), voidedBy: identity.id, reason: reason.trim() });
      commission.payout = null;
      this.event(commission, identity, "COMMISSION_PAYOUT_VOIDED", reason.trim());
      this.audit(identity, { module: "commissions", action: "COMMISSION_PAYOUT_VOIDED", entityType: "commission", entityId: id, previousValue: "payout_initiated", newValue: "voided", reason: reason.trim() });
      return this.view(commission, false);
    });
  }
}
