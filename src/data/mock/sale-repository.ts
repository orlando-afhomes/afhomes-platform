import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { SaleRepository, SaleView } from "@/data/contracts/sale-repository";
import type { DevIdentity } from "@/modules/identity/types";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import { firstOpenDate } from "@/modules/finance/month-close";
import { daysPastDue, isFullySettled, periodCollections } from "@/modules/finance/rules";
import { confirmedValueInPeriod } from "@/modules/sales/rules";
import { periodRange } from "@/modules/reconciliation/rules";
import type { Sale } from "@/modules/sales/types";
import { activeRoles } from "./dev-identities";
import { BROAD_BUSINESS_ROLES, BusinessRepository, canSeeContract, customerName, nowIso, today } from "./business-base";
import { paymentsOfContract } from "./business-effects";
import { applyCommissionTrigger } from "./commission-effects";
import { nextId } from "./ids";
import type { MockStore } from "./seed";
import { isActiveIdentity } from "./scope";


export class MockSaleRepository extends BusinessRepository implements SaleRepository {
  constructor(store: MockStore, getIdentity: () => DevIdentity, asyncOptions: MockAsyncOptions = {}) {
    super(store, getIdentity, asyncOptions);
  }

  private defaultEligible(sale: Sale): boolean {
    if (!sale.approval || (sale.status !== "pending" && sale.status !== "confirmed")) return false;
    const payments = paymentsOfContract(this.store, sale.contractId);
    const lastReceipt = payments.filter((receipt) => receipt.status === "verified").map((receipt) => receipt.paidDate).sort().at(-1);
    return !isFullySettled({ priceCentavos: sale.valueCentavos }, payments) && daysPastDue(lastReceipt ?? sale.recordedDate, today()) >= 90;
  }

  private visible(identity: DevIdentity): SaleView[] {
    if (!isActiveIdentity(identity)) return [];
    const broad = activeRoles(identity).some((role) => BROAD_BUSINESS_ROLES.has(role));
    const result: SaleView[] = [];
    for (const sale of this.store.sales) {
      const contract = this.store.contracts.find((item) => item.id === sale.contractId);
      if (!contract) continue;
      // Sales follow the team recorded at the time of sale (13 section 4.3), never the current genealogy.
      const inTeam = Boolean(identity.memberId) && sale.team.some((entry) => entry.memberId === identity.memberId);
      // A referrer also sees the sale in "Referred by me" (owner ruling 2026-11-12, A8).
      const isReferrer = Boolean(identity.memberId) && sale.referrerMemberId === identity.memberId;
      if (!(broad ? canSeeContract(identity, contract) : inTeam || isReferrer)) continue;
      const seller = sale.sellerMemberId ? this.store.members.find((member) => member.id === sale.sellerMemberId) : null;
      result.push(
        JSON.parse(JSON.stringify({ ...sale, customerName: customerName(this.store, sale.customerId), sellerName: seller?.displayName ?? null, schemeLabel: contract.schemeLabel, defaultEligible: this.can(identity, "contracts.approve") && this.defaultEligible(sale) })) as SaleView,
      );
    }
    return result;
  }

  async list(options?: MockAsyncOptions): Promise<SaleView[]> {
    return this.run(options, (identity) => this.visible(identity));
  }

  async approve(id: string, options?: MockAsyncOptions): Promise<SaleView> {
    return this.run(options, (identity) => {
      this.require(identity, "contracts.approve", "Only an Administrator or Super Administrator can approve a sale.");
      const visible = this.visible(identity).find((sale) => sale.id === id);
      if (!visible) throw new Error("Sale not found.");
      const sale = this.store.sales.find((item) => item.id === visible.id)!;
      if (sale.status === "cancelled" || sale.status === "rejected") throw new Error("This sale cannot be approved.");
      if (sale.approval) return visible;
      sale.approval = { approvedAt: nowIso(), approvedBy: identity.id };
      this.audit(identity, {
        module: "sales", action: BUSINESS_AUDIT_ACTIONS.SALE_APPROVED, entityType: "sale", entityId: id,
        newValue: "approved", relatedRecordIds: [sale.contractId],
      });
      return { ...visible, approval: { ...sale.approval } };
    });
  }

  async getById(id: string, options?: MockAsyncOptions): Promise<SaleView | null> {
    return this.run(options, (identity) => this.visible(identity).find((sale) => sale.id === id) ?? null);
  }

  async markDefaulted(id: string, reason: string, options?: MockAsyncOptions): Promise<SaleView> {
    return this.run(options, (identity) => {
      this.require(identity, "contracts.approve", "Only an Administrator or Super Administrator can mark a sale Defaulted.");
      if (!reason.trim()) throw new Error("Enter a reason for marking the sale Defaulted.");
      const sale = this.store.sales.find((item) => item.id === id);
      if (!sale || !this.defaultEligible(sale)) throw new Error("The sale is not on the 90-day no-payment list.");
      const previous = sale.status;
      const date = firstOpenDate(this.store.closedMonths, today());
      if (previous === "confirmed") sale.adjustments.push({
        id: nextId(this.store, "adjustment", "adj"), date, amountCentavos: -sale.valueCentavos,
        kind: "reversal", reason: reason.trim(), actorId: identity.id,
      });
      sale.status = "defaulted";
      sale.defaultedAt = today();
      applyCommissionTrigger(this.store, identity, id, "default", date);
      this.audit(identity, { module: "sales", action: BUSINESS_AUDIT_ACTIONS.SALE_DEFAULTED, entityType: "sale", entityId: id, previousValue: previous, newValue: "defaulted", reason: reason.trim() });
      return this.visible(identity).find((item) => item.id === id)!;
    });
  }

  async listClosedMonths(options?: MockAsyncOptions) {
    return this.run(options, (identity) => {
      this.require(identity, "finance.verify", "This account cannot view closed months.");
      return structuredClone(this.store.closedMonths);
    });
  }

  async closeMonth(month: string, options?: MockAsyncOptions) {
    return this.run(options, (identity) => {
      this.require(identity, "contracts.approve", "Only an Administrator or Super Administrator can close a month.");
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month >= today().slice(0, 7)) throw new Error("Select a month that has ended.");
      const existing = this.store.closedMonths.find((entry) => entry.month === month);
      if (existing) return structuredClone(existing);
      const range = periodRange(month)!;
      const { from, to: through } = range;
      const collections = periodCollections(this.store.payments, from, through);
      const released = this.store.commissions.filter((item) => item.releaseDate?.startsWith(month));
      const paid = this.store.commissions.filter((item) => item.payout?.confirmedAt && (item.payout.countedDate ?? item.payout.payoutDate).startsWith(month));
      const reviews = new Map(this.store.allowanceReviews.filter((item) => item.month === month).map((item) => [item.memberId, item.result]));
      const allowanceReviewCentavos = reviews.size === 0 ? null : [...reviews.values()].reduce((totals, item) => ({
        baCentavos: totals.baCentavos + item.baCentavos,
        paCentavos: totals.paCentavos + item.paCentavos,
        pbCentavos: totals.pbCentavos + item.pbCentavos,
      }), { baCentavos: 0, paCentavos: 0, pbCentavos: 0 });
      const snapshot = { month, closedAt: nowIso(), closedBy: identity.id,
        recognizedSalesCentavos: confirmedValueInPeriod([...this.store.sales, ...this.store.igp.sales], from, through),
        grossCollectionsCentavos: collections.gross, adjustedCollectionsCentavos: collections.adjusted,
        releasedCommissionCentavos: released.reduce((total, item) => total + item.amountCentavos, 0),
        paidCommissionCentavos: paid.reduce((total, item) => total + item.amountCentavos, 0),
        allowanceReviewCentavos, allowanceReviewCount: reviews.size,
        calculationPolicy: "approved-receipt-date-v1" as const };
      this.store.closedMonths.push(snapshot);
      this.audit(identity, { module: "finance", action: BUSINESS_AUDIT_ACTIONS.MONTH_CLOSED, entityType: "sale", entityId: month, newValue: "closed" });
      return structuredClone(snapshot);
    });
  }
}
