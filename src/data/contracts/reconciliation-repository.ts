import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { ReconciliationDecisionInput, ReconciliationEntry, SourceTotal } from "@/modules/reconciliation/rules";
import type { MonthSwitchSignOff, MonthSwitchStatus } from "@/modules/reconciliation/switch-signoff";

export interface ReconciliationRepository {
  /** Live source totals and their underlying records for a month (YYYY-MM). */
  sourceTotals(period: string, options?: MockAsyncOptions): Promise<SourceTotal[]>;
  /** Every decision on record, oldest first. Earlier decisions for the same month and measure are kept. */
  listEntries(options?: MockAsyncOptions): Promise<ReconciliationEntry[]>;
  /** Records a sign-off or an explained variance against the live total, which the repository recomputes. */
  record(input: ReconciliationDecisionInput, options?: MockAsyncOptions): Promise<ReconciliationEntry>;
  /** Differences blocking the parallel-run switch for a month, with the closed state and any sign-off (doc 08 section 16; F11.5). */
  monthSwitchStatus(month: string, options?: MockAsyncOptions): Promise<MonthSwitchStatus>;
  /** Super Administrator only: signs off the switch after a month closes with no unexplained differences. Audited. */
  recordMonthSwitch(month: string, options?: MockAsyncOptions): Promise<MonthSwitchSignOff>;
}
