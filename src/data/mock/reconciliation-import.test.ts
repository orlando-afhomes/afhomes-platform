import { describe, expect, it } from "vitest";
import { buildReceiptImportRows, importedReceiptStatusLabel, rowsToReceiptRecords, type ReceiptImportRecord } from "@/modules/imports/receipt-import";
import { periodRange, validateReconciliationDecision } from "@/modules/reconciliation/rules";
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
    const rows = buildReceiptImportRows(
      [
        row({ "Sale status": "Finished" }),
        row({ "Receipt reference": "OR-H-2" }),
        row({ "Receipt reference": "or-h-2" }),
        row({ "Receipt reference": "BT-PAY-1" }),
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
    const batch = await repos.historyImports.createBatch({ fileName: "history.csv", records, declaration: true });
    expect(batch.status).toBe("pending_signoff");
    expect(batch.receipts).toHaveLength(2);
    expect(batch.skipped).toEqual([{ rowNumber: 4, reason: expect.stringMatching(/finished sales/i) }]);
    expect(importedReceiptStatusLabel(batch.status)).toBe("Imported, waiting for confirmation");
    const totals = await repos.reconciliation.sourceTotals("2026-08");
    expect(totals.find((item) => item.measure === "imported_receipts")?.totalCentavos).toBe(0);

    const signed = await repos.historyImports.signOff(batch.id);
    expect(signed.status).toBe("signed_off");
    expect(signed.selfSignedOff).toBe(true);
    expect(importedReceiptStatusLabel(signed.status)).toBe("Approved (imported)");
    const after = await repos.reconciliation.sourceTotals("2026-08");
    expect(after.find((item) => item.measure === "imported_receipts")?.totalCentavos).toBe(5_000_000);
    expect({ payments: store.payments.length, commissions: store.commissions.length, memberships: store.memberships.length }).toEqual(before);
    const actions = store.auditEvents.map((event) => event.action);
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
  it("computes the October live receipt total from existing rules and lists its records", async () => {
    const { repos } = reposFor(undefined, "dev-finance");
    const totals = await repos.reconciliation.sourceTotals("2026-10");
    const receipts = totals.find((item) => item.measure === "verified_receipts")!;
    expect(receipts.totalCentavos).toBe(9_850_000);
    expect(receipts.records.reduce((sum, record) => sum + record.amountCentavos, 0)).toBe(receipts.totalCentavos);
  });

  it("signs off only matching totals and requires a reason for a variance", async () => {
    const { store, repos } = reposFor(undefined, "dev-finance");
    await expect(repos.reconciliation.record({ period: "2026-10", measure: "verified_receipts", workbookCentavos: 9_800_000, decision: "signed_off" })).rejects.toThrow(/Only matching totals/);
    await expect(repos.reconciliation.record({ period: "2026-10", measure: "verified_receipts", workbookCentavos: 9_800_000, decision: "explained_variance", reason: " " })).rejects.toThrow(/reason/i);
    const variance = await repos.reconciliation.record({ period: "2026-10", measure: "verified_receipts", workbookCentavos: 9_800_000, decision: "explained_variance", reason: "Workbook missed one transfer." });
    expect(variance.differenceCentavos).toBe(-50_000);
    const signed = await repos.reconciliation.record({ period: "2026-10", measure: "verified_receipts", workbookCentavos: 9_850_000, decision: "signed_off" });
    expect(signed.liveCentavos).toBe(9_850_000);
    expect((await repos.reconciliation.listEntries()).map((entry) => entry.decision)).toEqual(["explained_variance", "signed_off"]);
    expect(store.auditEvents.map((event) => event.action)).toEqual(expect.arrayContaining(["RECONCILIATION_VARIANCE_EXPLAINED", "RECONCILIATION_SIGNED_OFF"]));
  });

  it("denies identities without the grant and validates the month", async () => {
    const clerk = reposFor(undefined, "dev-clerk").repos;
    await expect(clerk.reconciliation.sourceTotals("2026-10")).rejects.toThrow(/not allowed/);
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
    const status = await repos.reconciliation.monthSwitchStatus("2026-10");
    expect(status).toMatchObject({ month: "2026-10", closed: false, signOff: null, ready: false });
    await expect(repos.reconciliation.recordMonthSwitch("2026-10")).rejects.toThrow(/Super Administrator/);
    const superAdmin = reposFor(store, "dev-super-admin").repos;
    await expect(superAdmin.reconciliation.recordMonthSwitch("2026-10")).rejects.toThrow(/Close the month/);
  });

  it("lists every unexplained difference, then signs off once with an audit event", async () => {
    const { store, repos } = reposFor();
    await repos.sales.closeMonth("2026-10");
    const superAdmin = reposFor(store, "dev-super-admin").repos;
    await expect(superAdmin.reconciliation.recordMonthSwitch("2026-10")).rejects.toThrow(/cannot be signed off yet/);
    const blocked = await superAdmin.reconciliation.monthSwitchStatus("2026-10");
    expect(blocked.closed).toBe(true);
    expect(blocked.ready).toBe(false);
    expect(blocked.unexplained.length).toBeGreaterThan(0);

    const readyRepos = reposFor(createMockStore(), "dev-super-admin");
    const { members, measures } = await readyToSwitch(readyRepos.store, "2026-09");
    const before = await readyRepos.repos.reconciliation.monthSwitchStatus("2026-09");
    expect(before).toMatchObject({ closed: true, ready: true, signOff: null });
    expect(before.unexplained).toEqual([]);
    const signOff = await readyRepos.repos.reconciliation.recordMonthSwitch("2026-09");
    expect(signOff).toMatchObject({ month: "2026-09", actorId: "dev-super-admin", checkedMeasures: measures, checkedLeaders: members });
    expect(signOff.recordedAt).toBeTruthy();
    expect((await readyRepos.repos.reconciliation.monthSwitchStatus("2026-09")).signOff).toEqual(signOff);
    // A second sign-off returns the same record instead of recording twice.
    expect(await readyRepos.repos.reconciliation.recordMonthSwitch("2026-09")).toEqual(signOff);
    expect(readyRepos.store.auditEvents.filter((event) => event.action === "PARALLEL_RUN_SWITCH_SIGNED_OFF")).toHaveLength(1);
    expect(readyRepos.store.auditEvents.find((event) => event.action === "PARALLEL_RUN_SWITCH_SIGNED_OFF")).toMatchObject({ entityType: "reconciliation", entityId: "2026-09" });
  });
});
