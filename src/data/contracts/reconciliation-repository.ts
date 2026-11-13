import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { ReconciliationDecisionInput, ReconciliationEntry, SourceTotal } from "@/modules/reconciliation/rules";

export interface ReconciliationRepository {
  /** Live source totals and their underlying records for a month (YYYY-MM). */
  sourceTotals(period: string, options?: MockAsyncOptions): Promise<SourceTotal[]>;
  /** Every decision on record, oldest first. Earlier decisions for the same month and measure are kept. */
  listEntries(options?: MockAsyncOptions): Promise<ReconciliationEntry[]>;
  /** Records a sign-off or an explained variance against the live total, which the repository recomputes. */
  record(input: ReconciliationDecisionInput, options?: MockAsyncOptions): Promise<ReconciliationEntry>;
}
