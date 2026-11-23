import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { ReconciliationRepository } from "@/data/contracts/reconciliation-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import type { DevIdentity } from "@/modules/identity/types";
import { computeSourceTotals, latestEntry, MEASURE_LABELS, validateReconciliationDecision, type ReconciliationDecisionInput, type ReconciliationEntry, type SourceTotal } from "@/modules/reconciliation/rules";
import { checkMonthSwitchReady, type MonthSwitchSignOff, type MonthSwitchStatus } from "@/modules/reconciliation/switch-signoff";
import { BusinessRepository, nowIso } from "./business-base";
import { nextId } from "./ids";
import type { MockStore } from "./seed";

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export class MockReconciliationRepository extends BusinessRepository implements ReconciliationRepository {
  constructor(store: MockStore, getIdentity: () => DevIdentity, asyncOptions: MockAsyncOptions = {}) {
    super(store, getIdentity, asyncOptions);
  }

  private totals(period: string): SourceTotal[] {
    return computeSourceTotals({ payments: this.store.payments, sales: [...this.store.sales, ...this.store.igp.sales], commissions: this.store.commissions, importBatches: this.store.receiptImportBatches }, period);
  }

  async sourceTotals(period: string, options?: MockAsyncOptions): Promise<SourceTotal[]> {
    return this.run(options, (identity) => {
      this.require(identity, "reconciliation.manage", "Reconciliation is not allowed for this identity.");
      return copy(this.totals(period));
    });
  }

  async listEntries(options?: MockAsyncOptions): Promise<ReconciliationEntry[]> {
    return this.run(options, (identity) => {
      if (!this.can(identity, "reconciliation.manage")) return [];
      return copy(this.store.reconciliationEntries);
    });
  }

  async record(input: ReconciliationDecisionInput, options?: MockAsyncOptions): Promise<ReconciliationEntry> {
    return this.run(options, (identity) => {
      this.require(identity, "reconciliation.manage", "Reconciliation is not allowed for this identity.");
      // The live total is recomputed here; the client's view of it is never trusted.
      const live = this.totals(input.period).find((item) => item.measure === input.measure)?.totalCentavos;
      if (live === undefined) throw new Error("Choose a valid measure.");
      const problem = validateReconciliationDecision(input, live);
      if (problem) throw new Error(problem);
      const previous = latestEntry(this.store.reconciliationEntries, input.period, input.measure);
      const entry: ReconciliationEntry = {
        id: nextId(this.store, "reconciliation", "rec"),
        period: input.period,
        measure: input.measure,
        workbookCentavos: input.workbookCentavos,
        liveCentavos: live,
        differenceCentavos: input.workbookCentavos - live,
        decision: input.decision,
        reason: input.reason?.trim() || null,
        actorId: identity.id,
        recordedAt: nowIso(),
      };
      this.store.reconciliationEntries.push(entry);
      const action = entry.decision === "signed_off" ? BUSINESS_AUDIT_ACTIONS.RECONCILIATION_SIGNED_OFF : BUSINESS_AUDIT_ACTIONS.RECONCILIATION_VARIANCE_EXPLAINED;
      this.audit(identity, {
        module: "finance",
        action,
        entityType: "reconciliation",
        entityId: entry.id,
        displayReference: `${entry.period} ${MEASURE_LABELS[entry.measure]}`,
        previousValue: previous ? `${previous.decision}:${previous.differenceCentavos}` : null,
        newValue: `${entry.decision}:${entry.differenceCentavos}`,
        reason: entry.reason,
        relatedRecordIds: previous ? [previous.id] : undefined,
      });
      return copy(entry);
    });
  }

  async monthSwitchStatus(month: string, options?: MockAsyncOptions): Promise<MonthSwitchStatus> {
    return this.run(options, (identity) => {
      this.require(identity, "reconciliation.manage", "Reconciliation is not allowed for this identity.");
      return copy(this.status(month.trim()));
    });
  }

  async recordMonthSwitch(month: string, options?: MockAsyncOptions): Promise<MonthSwitchSignOff> {
    return this.run(options, (identity) => {
      // Doc 08 section 16: the Super Administrator decides the switch. No delegation.
      if (!identity.roles.includes("super_admin")) throw new Error("Only the Super Administrator can sign off the switch.");
      const period = month.trim();
      const current = this.status(period);
      if (!current.closed) throw new Error("Close the month before signing off the switch.");
      if (current.signOff) return copy(current.signOff);
      if (current.unexplained.length > 0) {
        throw new Error(`The switch cannot be signed off yet: ${current.unexplained.join(" ")}`);
      }
      const signOff: MonthSwitchSignOff = {
        id: nextId(this.store, "switch", "switch"),
        month: period,
        actorId: identity.id,
        recordedAt: nowIso(),
        checkedMeasures: current.checkedMeasures,
        checkedLeaders: current.checkedLeaders,
      };
      this.store.monthSwitchSignOffs.push(signOff);
      this.audit(identity, {
        module: "finance",
        action: BUSINESS_AUDIT_ACTIONS.PARALLEL_RUN_SWITCH_SIGNED_OFF,
        entityType: "reconciliation",
        entityId: period,
        newValue: `signed_off:${signOff.checkedMeasures} measures,${signOff.checkedLeaders} leaders`,
        relatedRecordIds: this.checkedRecordIds(period),
      });
      return copy(signOff);
    });
  }

  /** Readiness of one month: closed state, existing sign-off and every unexplained difference. */
  private status(month: string): MonthSwitchStatus {
    const closed = this.store.closedMonths.some((item) => item.month === month);
    const signOff = this.store.monthSwitchSignOffs.find((item) => item.month === month) ?? null;
    if (!closed) return { month, closed, signOff, unexplained: ["The month is not closed."], ready: false, checkedMeasures: 0, checkedLeaders: 0 };
    const totals = this.totals(month);
    const unexplained = checkMonthSwitchReady({
      totals,
      entries: this.store.reconciliationEntries,
      reviews: this.store.allowanceReviews,
      members: this.store.members,
      vacancies: this.store.seatVacancies,
      month,
    });
    const checkedMeasures = totals.length;
    const checkedLeaders = this.store.members.filter((item) =>
      (item.designation === "SM" || item.designation === "SSM" || item.designation === "SVD")).length;
    return { month, closed, signOff, unexplained, ready: unexplained.length === 0, checkedMeasures, checkedLeaders };
  }

  /** Entry and review ids behind the readiness check, for the audit trail. */
  private checkedRecordIds(month: string): string[] {
    const ids: string[] = [];
    for (const measure of this.totals(month)) {
      const entry = latestEntry(this.store.reconciliationEntries, month, measure.measure);
      if (entry) ids.push(entry.id);
    }
    for (const review of this.store.allowanceReviews) {
      if (review.month === month) ids.push(review.id);
    }
    return ids;
  }
}
