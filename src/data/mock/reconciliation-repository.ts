import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { ReconciliationRepository } from "@/data/contracts/reconciliation-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import type { DevIdentity } from "@/modules/identity/types";
import { computeSourceTotals, latestEntry, MEASURE_LABELS, validateReconciliationDecision, type ReconciliationDecisionInput, type ReconciliationEntry, type SourceTotal } from "@/modules/reconciliation/rules";
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
}
