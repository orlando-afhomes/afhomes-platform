import "server-only";
import { ApiError } from "@/server/api/errors";
import { requireOperation } from "@/server/auth/authorize";
import type { Actor } from "@/server/auth/actor";
import { dbRead, listAll } from "@/server/db";
import { centavosToInt64 } from "@/server/money";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import { activeRoles } from "@/modules/identity/active-roles";
import {
  computeSourceTotals,
  latestEntry,
  MEASURE_LABELS,
  periodRange,
  validateReconciliationDecision,
  type ReconciliationDecisionInput,
  type ReconciliationEntry,
  type ReconciliationMeasure,
  type SourceTotal,
} from "@/modules/reconciliation/rules";
import { checkMonthSwitchReady, leadersInPostForSwitch, type MonthSwitchSignOff, type MonthSwitchStatus } from "@/modules/reconciliation/switch-signoff";
import type { Sale, SaleAdjustment } from "@/modules/sales/types";
import { loadAllowanceReviews, loadCommissions, loadMembersFull, loadSales, loadSeatVacancies, loadVerifiedPayments } from "@/server/repositories/records";
import { loadReceiptImportBatches } from "@/server/services/payments";
import { conflict, invalid, newId, nowIso, transact } from "@/server/services/common";

type Json = Record<string, unknown>;

/** Live source data for one month's totals: the same records the reports read (doc 11 section 26). */
async function loadSourceData() {
  const [payments, sales, igpRows, commissions, importBatches] = await Promise.all([
    loadVerifiedPayments(),
    loadSales(),
    listAll<{ id: string; details: Json | null }>("igpSales", "id details"),
    loadCommissions(),
    loadReceiptImportBatches(),
  ]);
  // IGP adjustments live in the sale details until the IGP payment pipeline stores them in a table.
  const igpSales: Array<Pick<Sale, "id" | "adjustments">> = igpRows.map((row) => ({
    id: row.id,
    adjustments: ((row.details ?? {}).adjustments as SaleAdjustment[] | undefined) ?? [],
  }));
  const salesForTotals: Array<Pick<Sale, "id" | "adjustments">> = [...sales, ...igpSales];
  return { payments, sales: salesForTotals, commissions, importBatches };
}

type EntryRow = {
  id: string; period: string; measure: string; workbookCentavos: string; liveCentavos: string; differenceCentavos: string;
  decision: string; reason: string | null; actor: { id: string } | null; recordedAt: string;
};
const ENTRY_FIELDS = "id period measure workbookCentavos liveCentavos differenceCentavos decision reason actor { id } recordedAt";

function toEntry(row: EntryRow): ReconciliationEntry {
  return {
    id: row.id, period: row.period, measure: row.measure as ReconciliationMeasure,
    workbookCentavos: Number(row.workbookCentavos), liveCentavos: Number(row.liveCentavos), differenceCentavos: Number(row.differenceCentavos),
    decision: row.decision as ReconciliationEntry["decision"], reason: row.reason, actorId: row.actor?.id ?? "", recordedAt: row.recordedAt,
  };
}

/** Live source totals and their underlying records for a month (doc 11 section 26; F11.3). */
export async function sourceTotals(actor: Actor, period: string): Promise<SourceTotal[]> {
  requireOperation(actor, "reconciliation.manage");
  const month = period.trim();
  if (!periodRange(month)) throw invalid("Choose a valid month.", { period: "Choose a valid month." });
  return computeSourceTotals(await loadSourceData(), month);
}

/** Every decision on record, oldest first. Earlier decisions for the same month and measure are kept. */
export async function listEntries(actor: Actor): Promise<ReconciliationEntry[]> {
  requireOperation(actor, "reconciliation.manage");
  const rows = await listAll<EntryRow>("reconciliationEntries", ENTRY_FIELDS, { orderBy: "[{ recordedAt: ASC }, { id: ASC }]" });
  return rows.map(toEntry);
}

/** Records a sign-off or an explained variance against the live total, which is recomputed here (never trusted from the client). */
export async function recordReconciliation(actor: Actor, input: ReconciliationDecisionInput): Promise<ReconciliationEntry> {
  requireOperation(actor, "reconciliation.manage");
  const period = input.period.trim();
  if (!periodRange(period)) throw invalid("Choose a valid month.", { period: "Choose a valid month." });
  const totals = computeSourceTotals(await loadSourceData(), period);
  const live = totals.find((item) => item.measure === input.measure)?.totalCentavos;
  if (live === undefined) throw invalid("Choose a valid measure.", { measure: "Choose a valid measure." });
  const problem = validateReconciliationDecision({ ...input, period }, live);
  if (problem) throw invalid(problem);
  const reason = input.reason?.trim() || null;
  const previous = latestEntry(await listEntries(actor), period, input.measure);
  const id = newId();
  const recordedAt = nowIso();
  const differenceCentavos = input.workbookCentavos - live;
  const action = input.decision === "signed_off" ? BUSINESS_AUDIT_ACTIONS.RECONCILIATION_SIGNED_OFF : BUSINESS_AUDIT_ACTIONS.RECONCILIATION_VARIANCE_EXPLAINED;
  await transact(actor, {
    variableDefinitions: "$d: ReconciliationEntry_Data!",
    fields: "entry: reconciliationEntry_insert(data: $d)",
    variables: {
      d: {
        id, period, measure: input.measure,
        workbookCentavos: centavosToInt64(input.workbookCentavos), liveCentavos: centavosToInt64(live), differenceCentavos: centavosToInt64(differenceCentavos),
        decision: input.decision, reason, actorId: actor.userId,
      },
    },
    audit: [{
      action, entityType: "reconciliation", entityId: id,
      details: {
        module: "finance", displayReference: `${period} ${MEASURE_LABELS[input.measure]}`,
        previousValue: previous ? `${previous.decision}:${previous.differenceCentavos}` : undefined,
        newValue: `${input.decision}:${differenceCentavos}`, reason: reason ?? undefined,
        relatedRecordIds: previous ? [previous.id] : undefined,
      },
    }],
  });
  return {
    id, period, measure: input.measure, workbookCentavos: input.workbookCentavos, liveCentavos: live,
    differenceCentavos, decision: input.decision, reason, actorId: actor.userId, recordedAt,
  };
}

type SignOffRow = { id: string; month: string; actor: { id: string } | null; recordedAt: string; checkedMeasures: number; checkedLeaders: number };

function toSignOff(row: SignOffRow): MonthSwitchSignOff {
  return { id: row.id, month: row.month, actorId: row.actor?.id ?? "", recordedAt: row.recordedAt, checkedMeasures: row.checkedMeasures, checkedLeaders: row.checkedLeaders };
}

/** Readiness of one month: closed state, existing sign-off and every unexplained difference (doc 08 section 16). */
async function switchStatusOf(month: string): Promise<MonthSwitchStatus> {
  const [closedRows, signOffRows] = await Promise.all([
    listAll<{ month: string }>("closedMonths", "month"),
    dbRead<{ monthSwitchSignOffs: SignOffRow[] }>(`query($m: String!) { monthSwitchSignOffs(where: { month: { eq: $m } }, limit: 1) { id month actor { id } recordedAt checkedMeasures checkedLeaders } }`, { m: month }),
  ]);
  const closed = closedRows.some((row) => row.month === month);
  const signOff = signOffRows.monthSwitchSignOffs[0] ? toSignOff(signOffRows.monthSwitchSignOffs[0]) : null;
  if (!closed) return { month, closed, signOff, unexplained: ["The month is not closed."], ready: false, checkedMeasures: 0, checkedLeaders: 0 };
  const [data, entryRows, reviews, members, vacancies] = await Promise.all([
    loadSourceData(),
    listAll<EntryRow>("reconciliationEntries", ENTRY_FIELDS, { orderBy: "[{ recordedAt: ASC }, { id: ASC }]" }),
    loadAllowanceReviews(),
    loadMembersFull(),
    loadSeatVacancies(),
  ]);
  const totals = computeSourceTotals(data, month);
  const entries = entryRows.map(toEntry);
  const unexplained = checkMonthSwitchReady({ totals, entries, reviews, members, vacancies, month });
  const checkedLeaders = leadersInPostForSwitch(members, vacancies, month).length;
  return { month, closed, signOff, unexplained, ready: unexplained.length === 0, checkedMeasures: totals.length, checkedLeaders };
}

/** Differences blocking the parallel-run switch for a month, with the closed state and any sign-off. */
export async function monthSwitchStatus(actor: Actor, month: string): Promise<MonthSwitchStatus> {
  requireOperation(actor, "reconciliation.manage");
  return switchStatusOf(month.trim());
}

/** Super Administrator only: signs off the switch after a month closes with no unexplained differences. Audited. */
export async function recordMonthSwitch(actor: Actor, month: string): Promise<MonthSwitchSignOff> {
  if (!activeRoles(actor.identity).includes("super_admin")) {
    throw new ApiError(403, "forbidden", "Only the Super Administrator can sign off the switch.");
  }
  const period = month.trim();
  const current = await switchStatusOf(period);
  if (!current.closed) throw conflict("month_open", "Close the month before signing off the switch.");
  if (current.signOff) return current.signOff;
  if (current.unexplained.length > 0) throw conflict("switch_not_ready", `The switch cannot be signed off yet: ${current.unexplained.join(" ")}`);
  const [totals, entries, reviews] = await Promise.all([
    loadSourceData().then((data) => computeSourceTotals(data, period)),
    listAll<EntryRow>("reconciliationEntries", ENTRY_FIELDS).then((rows) => rows.map(toEntry)),
    loadAllowanceReviews(),
  ]);
  const relatedRecordIds: string[] = [];
  for (const total of totals) {
    const entry = latestEntry(entries, period, total.measure);
    if (entry) relatedRecordIds.push(entry.id);
  }
  for (const review of reviews) if (review.month === period) relatedRecordIds.push(review.id);
  const id = newId();
  const recordedAt = nowIso();
  await transact(actor, {
    variableDefinitions: "$d: MonthSwitchSignOff_Data!",
    fields: "signOff: monthSwitchSignOff_insert(data: $d)",
    variables: { d: { id, month: period, actorId: actor.userId, checkedMeasures: current.checkedMeasures, checkedLeaders: current.checkedLeaders } },
    audit: [{
      action: BUSINESS_AUDIT_ACTIONS.PARALLEL_RUN_SWITCH_SIGNED_OFF, entityType: "reconciliation", entityId: period,
      details: { module: "finance", newValue: `signed_off:${current.checkedMeasures} measures,${current.checkedLeaders} leaders`, relatedRecordIds },
    }],
  });
  return { id, month: period, actorId: actor.userId, recordedAt, checkedMeasures: current.checkedMeasures, checkedLeaders: current.checkedLeaders };
}
