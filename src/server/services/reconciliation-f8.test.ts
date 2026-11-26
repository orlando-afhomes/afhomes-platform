// @vitest-environment node
// F8: audit read with filters and paging, reconciliation decisions, month close and the switch sign-off.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { configureEmulatorEnv, emulatorsUp, sessionCookieFor } from "@/server/testing/emulator";
import { manilaToday } from "@/shared/lib/dates";

configureEmulatorEnv();
const up = await emulatorsUp();
const { SEED_ACCOUNTS } = await import("@/data/seed/dev-credentials");
const account = (identityId: string) => SEED_ACCOUNTS.find((row) => row.identityId === identityId)!;

describe.skipIf(!up)("audit read and reconciliation end to end (emulators)", () => {
  let auditRead: typeof import("@/server/services/audit-read");
  let reconciliation: typeof import("@/server/services/reconciliation");
  let payments: typeof import("@/server/services/payments");
  let commissions: typeof import("@/server/services/commissions");
  let records: typeof import("@/server/repositories/records");
  let audit: typeof import("@/server/audit");
  let db: typeof import("@/server/db");
  let superAdmin: Awaited<ReturnType<typeof import("@/server/auth/actor").requireActor>>;
  let admin: typeof superAdmin;
  let clerk: typeof superAdmin;
  let finance: typeof superAdmin;

  const suffix = Date.now();
  // A month with no seed data, safely in the past, used only by this test.
  const month = "2024-03";
  const marker = `F8 test ${suffix}`;
  const reviewIds: string[] = [];
  const entryIds: string[] = [];

  beforeAll(async () => {
    auditRead = await import("@/server/services/audit-read");
    reconciliation = await import("@/server/services/reconciliation");
    payments = await import("@/server/services/payments");
    commissions = await import("@/server/services/commissions");
    records = await import("@/server/repositories/records");
    audit = await import("@/server/audit");
    db = await import("@/server/db");
    const auth = await import("@/server/auth/actor");
    const session = await import("@/app/api/v1/session/route");
    const cookie = async (identityId: string) => (await auth.resolveActorFromSessionCookie(await sessionCookieFor(session.POST, account(identityId).email, account(identityId).password)))!;
    superAdmin = await cookie("dev-super-admin");
    admin = await cookie("dev-admin");
    clerk = await cookie("dev-clerk");
    finance = await cookie("dev-finance");
  }, 60_000);

  afterAll(async () => {
    // Own records only: decisions, sign-off, closed month, allowance reviews and audit events.
    await db.dbWrite(`mutation($p: String!) { reconciliationEntry_deleteMany(where: { period: { eq: $p } }) }`, { p: month }).catch(() => undefined);
    await db.dbWrite(`mutation($m: String!) { monthSwitchSignOff_deleteMany(where: { month: { eq: $m } }) }`, { m: month }).catch(() => undefined);
    await db.dbWrite(`mutation($m: String!) { closedMonth_deleteMany(where: { month: { eq: $m } }) }`, { m: month }).catch(() => undefined);
    for (const id of reviewIds) await db.dbWrite(`mutation($id: UUID!) { allowanceReview_delete(id: $id) }`, { id }).catch(() => undefined);
    await db.dbWrite(`mutation($e: String!) { auditEvent_deleteMany(where: { entityId: { eq: $e } }) }`, { e: marker }).catch(() => undefined);
    for (const id of entryIds) await db.dbWrite(`mutation($e: String!) { auditEvent_deleteMany(where: { entityId: { eq: $e } }) }`, { e: id }).catch(() => undefined);
    await db.dbWrite(`mutation($m: String!) { auditEvent_deleteMany(where: { entityId: { eq: $m } }) }`, { m: month }).catch(() => undefined);
  }, 120_000);

  it("reads the audit history with filters and paging and refuses identities without audit.read", async () => {
    for (const value of ["one", "two"]) {
      await audit.recordAudit({
        actorUserId: superAdmin.userId, action: "F8_AUDIT_READ_TEST", entityType: "reconciliation", entityId: marker,
        details: { module: "finance", displayReference: marker, newValue: value, relatedRecordIds: [marker] },
      });
    }

    // Newest first with a page size of one: two matching events, one item per page.
    const first = await auditRead.listAuditEvents(admin, { action: "F8_AUDIT_READ_TEST", pageSize: 1 });
    expect(first.total).toBe(2);
    expect(first.items).toHaveLength(1);
    expect(first.items[0].module).toBe("finance");
    expect(first.items[0].action).toBe("F8_AUDIT_READ_TEST");
    expect(first.items[0].entityName).toBe(marker);
    const second = await auditRead.listAuditEvents(admin, { action: "F8_AUDIT_READ_TEST", page: 2, pageSize: 1 });
    expect(second.items).toHaveLength(1);
    expect(second.items[0].id).not.toBe(first.items[0].id);

    // The date filter covers the events just written; a date-only bound means the whole Manila day.
    const today = manilaToday();
    const todayPage = await auditRead.listAuditEvents(admin, { action: "F8_AUDIT_READ_TEST", from: today, to: today });
    expect(todayPage.total).toBe(2);
    const pastPage = await auditRead.listAuditEvents(admin, { action: "F8_AUDIT_READ_TEST", to: "2020-01-01" });
    expect(pastPage.total).toBe(0);

    // A pre-F8 row without the module column is displayed and filtered under its record type's module.
    await db.dbWrite(`mutation($e: String!) { auditEvent_insert(data: { action: "F8_LEGACY_TEST", entityType: "payment", entityId: $e }) }`, { e: marker });
    const legacy = await auditRead.listAuditEvents(admin, { action: "F8_LEGACY_TEST", module: "finance" });
    expect(legacy.total).toBe(1);
    expect(legacy.items[0].module).toBe("finance");
    const notSales = await auditRead.listAuditEvents(admin, { action: "F8_LEGACY_TEST", module: "sales" });
    expect(notSales.total).toBe(0);

    const actors = await auditRead.listAuditActors(admin);
    expect(actors.some((option) => option.value === superAdmin.userId)).toBe(true);

    // Audit history belongs to the Administrator and Super Administrator only (owner decision 2026-11-26).
    await expect(auditRead.listAuditEvents(clerk, {})).rejects.toMatchObject({ code: "forbidden" });
    await expect(auditRead.listAuditEvents(finance, {})).rejects.toMatchObject({ code: "forbidden" });
  }, 120_000);

  it("keeps the collections report to the Administrator and Finance (owner decision 2026-11-26)", async () => {
    const reports = await import("@/server/services/reports");
    const range = { from: `${month}-01`, to: `${month}-31` };
    const asAdmin = await reports.collectionsReport(admin, range);
    expect(asAdmin.grossCentavos).toBeGreaterThanOrEqual(0);
    const asFinance = await reports.collectionsReport(finance, range);
    expect(asFinance.netCentavos).toBe(asAdmin.netCentavos);
    await expect(reports.collectionsReport(clerk, range)).rejects.toMatchObject({ code: "forbidden" });
  }, 60_000);

  it("reconciles a month, gates the switch and the Super Administrator signs off after the close", async () => {
    // The switch needs an allowance review for every leader in post that month; save them while the month is open.
    const members = await records.loadMembersFull();
    const leaders = members.filter((item) => item.designation === "SM" || item.designation === "SSM" || item.designation === "SVD");
    expect(leaders.length).toBeGreaterThan(0);
    const emptyStretch = { days: 0, teamTcpCentavos: 0, collectionsCentavos: 0, assumedCreditCentavos: 0 };
    for (const leader of leaders) {
      const review = await commissions.saveAllowanceReview(superAdmin, {
        month, memberId: leader.id, qualifying: emptyStretch, extended: emptyStretch,
        workbook: { baCentavos: 0, paCentavos: 0, pbCentavos: 0 },
      });
      reviewIds.push(review.id);
    }

    // Source totals: all five measures, read through the loader that the reports use.
    const totals = await reconciliation.sourceTotals(admin, month);
    expect(totals.map((item) => item.measure)).toEqual(["verified_receipts", "imported_receipts", "sales_value", "commissions_payable", "commissions_paid"]);
    const live = new Map(totals.map((item) => [item.measure, item.totalCentavos]));

    // A sign-off never hides a difference; an explained difference needs a real difference and a reason.
    await expect(reconciliation.recordReconciliation(admin, { period: month, measure: "verified_receipts", workbookCentavos: 100, decision: "signed_off" }))
      .rejects.toMatchObject({ code: "validation_failed" });
    await expect(reconciliation.recordReconciliation(admin, { period: month, measure: "verified_receipts", workbookCentavos: 0, decision: "explained_variance", reason: "No difference at all" }))
      .rejects.toMatchObject({ code: "validation_failed" });

    // Four of five measures checked; the month is still open, so the switch is not ready.
    for (const total of totals.slice(0, 4)) {
      const entry = await reconciliation.recordReconciliation(admin, { period: month, measure: total.measure, workbookCentavos: live.get(total.measure)!, decision: "signed_off" });
      entryIds.push(entry.id);
    }
    const beforeClose = await reconciliation.monthSwitchStatus(admin, month);
    expect(beforeClose.closed).toBe(false);
    expect(beforeClose.ready).toBe(false);
    expect(beforeClose.unexplained).toContain("The month is not closed.");

    // Close the month (F5 close), then the missing fifth check blocks the switch.
    const closed = await payments.closeMonth(superAdmin, month);
    expect(closed.month).toBe(month);
    const gate = await reconciliation.monthSwitchStatus(admin, month);
    expect(gate.closed).toBe(true);
    expect(gate.ready).toBe(false);
    expect(gate.unexplained.join(" ")).toContain("No company-spreadsheet check");
    await expect(reconciliation.recordMonthSwitch(superAdmin, month)).rejects.toMatchObject({ code: "switch_not_ready" });

    // Fifth check recorded: ready, but only the Super Administrator may sign off.
    const lastEntry = await reconciliation.recordReconciliation(admin, { period: month, measure: totals[4].measure, workbookCentavos: live.get(totals[4].measure)!, decision: "signed_off" });
    entryIds.push(lastEntry.id);
    const ready = await reconciliation.monthSwitchStatus(admin, month);
    expect(ready.ready).toBe(true);
    expect(ready.unexplained).toEqual([]);
    await expect(reconciliation.recordMonthSwitch(admin, month)).rejects.toMatchObject({ code: "forbidden" });

    const signOff = await reconciliation.recordMonthSwitch(superAdmin, month);
    expect(signOff.month).toBe(month);
    expect(signOff.checkedMeasures).toBe(5);
    expect(signOff.checkedLeaders).toBe(leaders.length);
    // Repeating the sign-off returns the recorded one; nothing is duplicated.
    const again = await reconciliation.recordMonthSwitch(superAdmin, month);
    expect(again.id).toBe(signOff.id);

    // The decisions and the sign-off are on record through the API reads.
    const entries = await reconciliation.listEntries(admin);
    expect(entries.filter((entry) => entry.period === month)).toHaveLength(5);
    // Reading the decisions needs reconciliation.manage like every other reconciliation action.
    await expect(reconciliation.listEntries(clerk)).rejects.toMatchObject({ code: "forbidden" });
    const signed = await reconciliation.monthSwitchStatus(admin, month);
    expect(signed.signOff?.id).toBe(signOff.id);
  }, 180_000);
});
