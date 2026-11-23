import { describe, expect, it } from "vitest";
import { buildReceiptImportRows, importedReceiptStatusLabel, rowsToReceiptRecords, type ReceiptImportRecord } from "@/modules/imports/receipt-import";
import { periodCollections } from "@/modules/finance/rules";
import { periodRange, validateReconciliationDecision } from "@/modules/reconciliation/rules";
import { addMonthsToDate, manilaToday } from "@/shared/lib/dates";
import { getDevIdentity } from "./dev-identities";
import { createMockRepositories } from "./repositories";
import { createMockStore } from "./seed";

const row = (over: Partial<ReceiptImportRecord> = {}): ReceiptImportRecord => ({
  "Receipt reference": "OR-H-1",
  "Receipt date": "2026-08-15",
  Amount: "25000.00",
  "Payment method": "Cash",
  Purpose: "Down Payment",
  Customer: "Sample Customer",
  "Sale reference": "SALE-X1",
  "Sale status": "Unfinished",
  ...over,
});

/** YYYY-MM of the month `back` months before the current one. The seed closes the months 6 to 3 back and leaves 2 and 1 open. */
const monthBack = (back: number) => addMonthsToDate(`${manilaToday().slice(0, 7)}-01`, -back)!.slice(0, 7);
const LAST_MONTH = monthBack(1);
const OPEN_MONTH = monthBack(2);

const reposFor = (store = createMockStore(), id = "dev-admin") => ({ store, repos: createMockRepositories(store, () => getDevIdentity(id)) });

describe("receipt import validation", () => {
  const context = { payments: createMockStore().payments, batches: [], today: "2026-11-13" };

  it("accepts a clean row and keeps money in centavos", () => {
    const [result] = buildReceiptImportRows([row()], context);
    expect(result.status).toBe("ready");
    expect(result.receipt?.amountCentavos).toBe(2_500_000);
    expect(result.receipt?.purpose).toBe("down_payment");
  });

  it("refuses finished sales, repeated references, live reference conflicts, future dates and bad amounts", () => {
    const liveReference = context.payments.find(({ id }) => id === "pay-1")!.referenceNo!;
    const rows = buildReceiptImportRows(
      [
        row({ "Sale status": "Finished" }),
        row({ "Receipt reference": "OR-H-2" }),
        row({ "Receipt reference": "or-h-2" }),
        row({ "Receipt reference": liveReference.toLowerCase() }),
        row({ "Receipt reference": "OR-H-3", "Receipt date": "2099-01-01" }),
        row({ "Receipt reference": "OR-H-4", Amount: "0" }),
      ],
      context,
    );
    expect(rows.map((item) => item.status)).toEqual(["invalid", "ready", "invalid", "invalid", "invalid", "invalid"]);
    expect(rows[0].errors[0]).toMatch(/finished sales/i);
    expect(rows[2].errors[0]).toMatch(/more than once/);
    expect(rows[3].errors[0]).toMatch(/payment on record/);
  });

  it("reports a missing required column", () => {
    expect(() => rowsToReceiptRecords([["Receipt reference", "Amount"]])).toThrow(/missing the column/);
  });
});

describe("history import repository", () => {
  it("ignores a hand-typed reference and never reuses a historical receipt reference", async () => {
    const { store, repos } = reposFor();
    await repos.historyImports.createBatch({ fileName: "history.csv", records: [row()], declaration: true });
    const clerk = reposFor(store, "dev-clerk").repos;
    const payment = await clerk.payments.submit({ contractId: "ctr-4", purpose: "installment", amountCentavos: 250000, method: "Cash", paidDate: "2026-11-10", referenceNo: "or-h-1" });
    expect(payment.referenceNo).toMatch(/^PAY-\d{8}-\d{4}$/);
    expect(payment.referenceNo).not.toBe("OR-H-1");
  });
  const records = [row(), row({ "Receipt reference": "OR-H-2", "Receipt date": "2026-08-16" }), row({ "Receipt reference": "OR-H-3", "Sale status": "Finished" })];

  it("stores a pending batch, counts nothing until sign-off, and touches no live record", async () => {
    const { store, repos } = reposFor();
    const before = { payments: store.payments.length, commissions: store.commissions.length, memberships: store.memberships.length };
    const seededEvents = store.auditEvents.length;
    const batch = await repos.historyImports.createBatch({ fileName: "history.csv", records, declaration: true });
    expect(batch.status).toBe("pending_signoff");
    expect(batch.receipts).toHaveLength(2);
    expect(batch.skipped).toEqual([{ rowNumber: 4, reason: expect.stringMatching(/finished sales/i) }]);
    expect(importedReceiptStatusLabel(batch.status)).toBe("Imported, waiting for confirmation");
    // Seeded imports may fall in the same month; only this batch's 50,000 pesos may be added, and only at sign-off.
    const seededImported = store.receiptImportBatches.filter(({ status }) => status === "signed_off").flatMap(({ receipts }) => receipts)
      .filter(({ paidDate }) => paidDate.startsWith("2026-08")).reduce((sum, { amountCentavos }) => sum + amountCentavos, 0);
    const totals = await repos.reconciliation.sourceTotals("2026-08");
    expect(totals.find((item) => item.measure === "imported_receipts")?.totalCentavos).toBe(seededImported);

    const signed = await repos.historyImports.signOff(batch.id);
    expect(signed.status).toBe("signed_off");
    expect(signed.selfSignedOff).toBe(true);
    expect(importedReceiptStatusLabel(signed.status)).toBe("Approved (imported)");
    const after = await repos.reconciliation.sourceTotals("2026-08");
    expect(after.find((item) => item.measure === "imported_receipts")?.totalCentavos).toBe(seededImported + 5_000_000);
    expect({ payments: store.payments.length, commissions: store.commissions.length, memberships: store.memberships.length }).toEqual(before);
    const actions = store.auditEvents.slice(seededEvents).map((event) => event.action);
    expect(actions).toContain("RECEIPT_IMPORT_CREATED");
    expect(actions).toContain("RECEIPT_IMPORT_SIGNED_OFF");
    expect(JSON.stringify(store.auditEvents.filter((event) => event.entityType === "receipt-import"))).not.toContain("OR-H-1");
  });

  it("rejects a whole batch with a reason, frees its references and never double-decides", async () => {
    const { repos } = reposFor();
    const batch = await repos.historyImports.createBatch({ fileName: "a.csv", records: [row()], declaration: true });
    await expect(repos.historyImports.reject(batch.id, "  ")).rejects.toThrow(/reason/i);
    const rejected = await repos.historyImports.reject(batch.id, "Wrong month");
    expect(rejected.status).toBe("rejected");
    await expect(repos.historyImports.signOff(batch.id)).rejects.toThrow();
    // Same reference can be re-imported after a rejection, but not while a batch is open.
    const again = await repos.historyImports.createBatch({ fileName: "b.csv", records: [row()], declaration: true });
    await expect(repos.historyImports.createBatch({ fileName: "c.csv", records: [row()], declaration: true })).rejects.toThrow(/No row can be imported/);
    expect(again.status).toBe("pending_signoff");
  });

  it("requires the declaration and the right role", async () => {
    const { repos } = reposFor();
    await expect(repos.historyImports.createBatch({ fileName: "a.csv", records: [row()], declaration: false })).rejects.toThrow(/official company records/);
    const finance = reposFor(undefined, "dev-finance").repos;
    await expect(finance.historyImports.createBatch({ fileName: "a.csv", records: [row()], declaration: true })).rejects.toThrow(/not allowed/);
    expect(await finance.historyImports.listBatches()).toEqual([]);
  });
});

describe("reconciliation", () => {
  it("computes last month's live receipt total from existing rules and lists its records", async () => {
    const { store, repos } = reposFor(undefined, "dev-finance");
    const totals = await repos.reconciliation.sourceTotals(LAST_MONTH);
    const receipts = totals.find((item) => item.measure === "verified_receipts")!;
    const range = periodRange(LAST_MONTH)!;
    expect(receipts.totalCentavos).toBeGreaterThan(0);
    expect(receipts.totalCentavos).toBe(periodCollections(store.payments, range.from, range.to).net);
    expect(receipts.records.reduce((sum, record) => sum + record.amountCentavos, 0)).toBe(receipts.totalCentavos);
  });

  it("signs off only matching totals and requires a reason for a variance", async () => {
    const { store, repos } = reposFor(undefined, "dev-finance");
    const live = (await repos.reconciliation.sourceTotals(LAST_MONTH)).find((item) => item.measure === "verified_receipts")!.totalCentavos;
    const short = live - 50_000;
    const seededEvents = store.auditEvents.length;
    await expect(repos.reconciliation.record({ period: LAST_MONTH, measure: "verified_receipts", workbookCentavos: short, decision: "signed_off" })).rejects.toThrow(/Only matching totals/);
    await expect(repos.reconciliation.record({ period: LAST_MONTH, measure: "verified_receipts", workbookCentavos: short, decision: "explained_variance", reason: " " })).rejects.toThrow(/reason/i);
    const variance = await repos.reconciliation.record({ period: LAST_MONTH, measure: "verified_receipts", workbookCentavos: short, decision: "explained_variance", reason: "Workbook missed one transfer." });
    expect(variance.differenceCentavos).toBe(-50_000);
    const signed = await repos.reconciliation.record({ period: LAST_MONTH, measure: "verified_receipts", workbookCentavos: live, decision: "signed_off" });
    expect(signed.liveCentavos).toBe(live);
    // The seed records decisions for other months only.
    expect((await repos.reconciliation.listEntries()).filter(({ period }) => period === LAST_MONTH).map((entry) => entry.decision)).toEqual(["explained_variance", "signed_off"]);
    expect(store.auditEvents.slice(seededEvents).map((event) => event.action)).toEqual(expect.arrayContaining(["RECONCILIATION_VARIANCE_EXPLAINED", "RECONCILIATION_SIGNED_OFF"]));
  });

  it("denies identities without the grant and validates the month", async () => {
    const clerk = reposFor(undefined, "dev-clerk").repos;
    await expect(clerk.reconciliation.sourceTotals(LAST_MONTH)).rejects.toThrow(/not allowed/);
    expect(await clerk.reconciliation.listEntries()).toEqual([]);
    expect(periodRange("2026-13")).toBeNull();
    expect(periodRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(validateReconciliationDecision({ period: "bad", measure: "sales_value", workbookCentavos: 0, decision: "signed_off" }, 0)).toMatch(/month/);
  });

  async function readyToSwitch(store: ReturnType<typeof createMockStore>, month: string) {
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    const { members } = await admin.commissions.allowanceReviews();
    const stretch = { days: 0, teamTcpCentavos: 0, collectionsCentavos: 0, assumedCreditCentavos: 0 };
    for (const member of members) {
      await admin.commissions.saveAllowanceReview({
        month, memberId: member.id, qualifying: { ...stretch, days: 30 }, extended: stretch,
        workbook: { baCentavos: 0, paCentavos: 0, pbCentavos: 0 }, workbookDifferenceReason: "Seed demo: no allowance due.",
      });
    }
    await admin.sales.closeMonth(month);
    const totals = await admin.reconciliation.sourceTotals(month);
    for (const total of totals) {
      await admin.reconciliation.record({ period: month, measure: total.measure, workbookCentavos: total.totalCentavos, decision: "signed_off" });
    }
    return { members: members.length, measures: totals.length };
  }

  it("refuses the switch before the month closes and for anyone but the Super Administrator", async () => {
    const { store, repos } = reposFor();
    const status = await repos.reconciliation.monthSwitchStatus(LAST_MONTH);
    expect(status).toMatchObject({ month: LAST_MONTH, closed: false, signOff: null, ready: false });
    await expect(repos.reconciliation.recordMonthSwitch(LAST_MONTH)).rejects.toThrow(/Super Administrator/);
    const superAdmin = reposFor(store, "dev-super-admin").repos;
    await expect(superAdmin.reconciliation.recordMonthSwitch(LAST_MONTH)).rejects.toThrow(/Close the month/);
  });

  it("lists every unexplained difference, then signs off once with an audit event", async () => {
    const { store, repos } = reposFor();
    await repos.sales.closeMonth(LAST_MONTH);
    const superAdmin = reposFor(store, "dev-super-admin").repos;
    await expect(superAdmin.reconciliation.recordMonthSwitch(LAST_MONTH)).rejects.toThrow(/cannot be signed off yet/);
    const blocked = await superAdmin.reconciliation.monthSwitchStatus(LAST_MONTH);
    expect(blocked.closed).toBe(true);
    expect(blocked.ready).toBe(false);
    expect(blocked.unexplained.length).toBeGreaterThan(0);

    const readyRepos = reposFor(createMockStore(), "dev-super-admin");
    const { members, measures } = await readyToSwitch(readyRepos.store, OPEN_MONTH);
    const before = await readyRepos.repos.reconciliation.monthSwitchStatus(OPEN_MONTH);
    expect(before).toMatchObject({ closed: true, ready: true, signOff: null });
    expect(before.unexplained).toEqual([]);
    const signOff = await readyRepos.repos.reconciliation.recordMonthSwitch(OPEN_MONTH);
    expect(signOff).toMatchObject({ month: OPEN_MONTH, actorId: "dev-super-admin", checkedMeasures: measures, checkedLeaders: members });
    expect(signOff.recordedAt).toBeTruthy();
    expect((await readyRepos.repos.reconciliation.monthSwitchStatus(OPEN_MONTH)).signOff).toEqual(signOff);
    // A second sign-off returns the same record instead of recording twice.
    expect(await readyRepos.repos.reconciliation.recordMonthSwitch(OPEN_MONTH)).toEqual(signOff);
    expect(readyRepos.store.auditEvents.filter((event) => event.action === "PARALLEL_RUN_SWITCH_SIGNED_OFF")).toHaveLength(1);
    expect(readyRepos.store.auditEvents.find((event) => event.action === "PARALLEL_RUN_SWITCH_SIGNED_OFF")).toMatchObject({ entityType: "reconciliation", entityId: OPEN_MONTH });
  });
});
