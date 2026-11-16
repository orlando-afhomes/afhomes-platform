import { describe, expect, it } from "vitest";
import { applyCommissionTrigger, freezeCommissionRates, releaseSaleCommissions, restoreDefaultedCommission } from "./commission-effects";
import { createMockStore } from "./seed";
import { DEV_IDENTITIES, getDevIdentity } from "./dev-identities";
import { MockCommissionRepository } from "./commission-repository";
import { createMockRepositories } from "./repositories";
import { clawbackBalance } from "@/modules/commissions/rules";
import { SYSTEM_ACTOR_ID } from "@/modules/audit/types";
import { manilaToday } from "@/shared/lib/dates";
import { runBulkCommissionPayout } from "@/data/business-queries";

describe("commission rates at issuance", () => {
  const store = {
    commissionRateSettings: [
      { memberId: "seller", product: "VIP" as const, role: "DSC" as const, rateBp: 0, standardRateBp: 500 },
      { memberId: "seller", product: "VIP" as const, role: "DRI" as const, rateBp: 100, standardRateBp: 100 },
      { memberId: "seller", product: "IGP" as const, role: "DSC" as const, rateBp: 225, standardRateBp: 225 },
    ],
  };

  it("keeps a valid zero and snapshots DSC and DRI independently", () => {
    const frozen = freezeCommissionRates(store, "VIP", "seller", "seller");
    expect(frozen).toEqual([
      { memberId: "seller", role: "DSC", rateBp: 0 },
      { memberId: "seller", role: "DRI", rateBp: 100 },
    ]);
    expect(freezeCommissionRates(store, "IGP", "seller", null)).toEqual([{ memberId: "seller", role: "DSC", rateBp: 225 }]);
  });

  it("requires the closing seller's rate and a rate for any named referrer", () => {
    expect(() => freezeCommissionRates(store, "VIP", "absent", null)).toThrow(/approved DSC rate/i);
    expect(() => freezeCommissionRates(store, "VIP", "seller", "absent")).toThrow(/approved DRI rate/i);
  });
});

it("keeps separate idempotent releases for the same DSC and DRI recipient", () => {
  const store = createMockStore();
  const sale = {
    saleId: "new", contractId: "new", product: "IGP" as const, valueCentavos: 1_000_000,
    rates: [{ memberId: "mem-ost-a1", role: "DSC" as const, rateBp: 500 }, { memberId: "mem-ost-a1", role: "DRI" as const, rateBp: 100 }],
    stage1Date: "2026-09-30", fullPaymentDate: null,
  };
  releaseSaleCommissions(store, DEV_IDENTITIES[0], sale);
  releaseSaleCommissions(store, DEV_IDENTITIES[0], sale);
  releaseSaleCommissions(store, DEV_IDENTITIES[0], { ...sale, fullPaymentDate: "2026-10-01" });
  expect(store.commissions.filter((entry) => entry.saleId === "new").map(({ role, stage, amountCentavos }) => ({ role, stage, amountCentavos }))).toEqual([
    { role: "DSC", stage: "stage1", amountCentavos: 20_000 },
    { role: "DRI", stage: "stage1", amountCentavos: 4_000 },
    { role: "DSC", stage: "full", amountCentavos: 30_000 },
    { role: "DRI", stage: "full", amountCentavos: 6_000 },
  ]);
});

it("requires a closed month for a payout list and flags preparer self-approval", async () => {
  const store = createMockStore();
  const finance = DEV_IDENTITIES.find(({ id }) => id === "dev-finance")!;
  const clerk = DEV_IDENTITIES.find(({ id }) => id === "dev-clerk")!;
  const repository = new MockCommissionRepository(store, () => finance, { delayMs: 0 });
  const clerkRepository = new MockCommissionRepository(store, () => clerk, { delayMs: 0 });
  releaseSaleCommissions(store, finance, { saleId: "sale-1", contractId: "ctr-1", product: "VIP", valueCentavos: 1_000_000,
    rates: [{ memberId: "mem-ost-a1", role: "DSC", rateBp: 500 }], stage1Date: "2026-09-25", fullPaymentDate: null });
  await expect(repository.preparePayoutList("2026-09")).rejects.toThrow(/close the release month/i);
  store.closedMonths.push({
    month: "2026-09", closedAt: "2026-10-01", closedBy: "dev-admin",
    recognizedSalesCentavos: 0, grossCollectionsCentavos: 0, adjustedCollectionsCentavos: 0,
    releasedCommissionCentavos: 50_000, paidCommissionCentavos: 0, calculationPolicy: "approved-receipt-date-v1",
    allowanceReviewCentavos: null, allowanceReviewCount: 0,
  });
  const list = await repository.preparePayoutList("2026-09");
  await expect(clerkRepository.approvePayoutList(list.id)).rejects.toThrow(/cannot approve/i);
  await expect(repository.preparePayoutList("2026-09")).rejects.toThrow(/no released/i);
  await repository.approvePayoutList(list.id);
  expect(store.commissions.find(({ id }) => id === list.entries[0].commissionId)?.status).toBe("approved");
  expect(store.auditEvents.at(-1)?.reason).toMatch(/self-approved/i);
});

describe("month-end payouts", () => {
  const finance = DEV_IDENTITIES.find(({ id }) => id === "dev-finance")!;
  const releaseSeptember = (store: ReturnType<typeof createMockStore>) => releaseSaleCommissions(store, finance, {
    saleId: "sale-2", contractId: "ctr-2", product: "VIP", valueCentavos: 1_000_000, stage1Date: "2026-09-25", fullPaymentDate: null,
    rates: [{ memberId: "mem-ost-a1", role: "DSC", rateBp: 500 }, { memberId: "mem-svd-b", role: "DRI", rateBp: 100 }],
  });

  it("prepares the payout list automatically when the month closes", async () => {
    const store = createMockStore();
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    releaseSeptember(store);
    await admin.sales.closeMonth("2026-09");
    const list = store.commissionPayoutLists.find(({ month }) => month === "2026-09")!;
    expect(list).toMatchObject({ preparedBy: SYSTEM_ACTOR_ID, approvedAt: null });
    expect(list.entries).toHaveLength(2);
    expect(store.auditEvents.find(({ action, entityId }) => action === "COMMISSION_PAYOUT_LIST_PREPARED" && entityId === list.id)?.actorId).toBe(SYSTEM_ACTOR_ID);
    await admin.sales.closeMonth("2026-09");
    expect(store.commissionPayoutLists.filter(({ month }) => month === "2026-09")).toHaveLength(1);
    await expect(admin.commissions.preparePayoutList("2026-09")).rejects.toThrow(/no released/i);
    await admin.commissions.approvePayoutList(list.id);
    // The system prepared it, so the approver is not flagged as self-approving.
    expect(store.auditEvents.at(-1)).toMatchObject({ action: "COMMISSION_PAYOUT_LIST_APPROVED", reason: undefined });
  });

  it("records and confirms payouts in bulk, each with its own guard and audit entry", async () => {
    const store = createMockStore();
    const repositories = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    releaseSeptember(store);
    await repositories.sales.closeMonth("2026-09");
    await repositories.commissions.approvePayoutList(store.commissionPayoutLists.at(-1)!.id);
    const ids = store.commissionPayoutLists.at(-1)!.entries.map(({ commissionId }) => commissionId);
    const payout = { kind: "payout" as const, reference: "BATCH-NOV", method: "Bank Transfer", payoutDate: manilaToday(), evidenceFileName: "batch.pdf" };

    const recorded = await runBulkCommissionPayout(repositories, { ...payout, ids: [...ids, "comm-3"] });
    expect(recorded.done).toBe(2);
    expect(recorded.failed).toEqual([{ id: "comm-3", reason: expect.stringMatching(/approved commission/) }]);
    for (const id of ids) {
      expect(store.auditEvents.filter((event) => event.entityId === id && event.action === "COMMISSION_PAYOUT_RECORDED")).toHaveLength(1);
    }
    const again = await runBulkCommissionPayout(repositories, { ...payout, ids });
    expect(again).toMatchObject({ done: 0, failed: [{ reason: expect.stringMatching(/duplicate/i) }, { reason: expect.stringMatching(/duplicate/i) }] });

    expect(await runBulkCommissionPayout(repositories, { kind: "confirm", ids })).toEqual({ done: 2, failed: [] });
    expect(ids.map((id) => store.commissions.find((item) => item.id === id)?.status)).toEqual(["paid", "paid"]);
  });
});

it("recovers a paid default directly and keeps the collected amount visible for refund on reinstatement", async () => {
  const store = createMockStore();
  const finance = DEV_IDENTITIES.find(({ id }) => id === "dev-finance")!;
  const admin = DEV_IDENTITIES.find(({ id }) => id === "dev-admin")!;
  const repository = new MockCommissionRepository(store, () => finance, { delayMs: 0 });
  const paid = store.commissions.find(({ id }) => id === "comm-2")!;
  applyCommissionTrigger(store, admin, paid.saleId, "default", "2026-11-11");
  applyCommissionTrigger(store, admin, paid.saleId, "default", "2026-11-11");
  const clawback = store.commissionClawbacks[0];
  expect(store.commissionClawbacks).toHaveLength(1);
  await repository.recordRecovery(clawback.id, { amountCentavos: 5_000, reference: "REC-1" });
  await expect(repository.recordRecovery(clawback.id, { amountCentavos: 5_000, reference: "rec-1" })).rejects.toThrow(/already/i);
  await expect(repository.writeOff(clawback.id, "Reason")).rejects.toThrow(/administrator/i);
  restoreDefaultedCommission(store, admin, paid.saleId, "2026-11-12");
  expect(clawbackBalance(clawback)).toBe(0);
  expect(clawback.refundDueCentavos).toBe(5_000);
  expect(paid.payout?.reference).toBe("PAY-2026-0011");
});

it("keeps previous allowance reviews, preserves Admin withholding, and locks a closed month", async () => {
  const store = createMockStore();
  const finance = DEV_IDENTITIES.find(({ id }) => id === "dev-finance")!;
  const admin = DEV_IDENTITIES.find(({ id }) => id === "dev-admin")!;
  const financeRepository = new MockCommissionRepository(store, () => finance, { delayMs: 0 });
  const adminRepository = new MockCommissionRepository(store, () => admin, { delayMs: 0 });
  const stretch = { days: 0, teamTcpCentavos: 0, collectionsCentavos: 0, assumedCreditCentavos: 0 };
  const input = { month: "2026-09", memberId: "mem-sm-a", qualifying: { ...stretch, days: 30 }, extended: stretch, workbook: null };
  await expect(financeRepository.saveAllowanceReview({ ...input, withholdingReason: "Office instruction" })).rejects.toThrow(/administrator/i);
  const first = await adminRepository.saveAllowanceReview({ ...input, withholdingReason: "Office instruction" });
  expect(first.result.baCentavos).toBe(0);
  const second = await financeRepository.saveAllowanceReview(input);
  expect(second.withholdingReason).toBe("Office instruction");
  expect((await financeRepository.allowanceReviews()).reviews.map(({ id }) => id)).toEqual([first.id, second.id]);
  expect(store.auditEvents.at(-1)?.action).toBe("COMMISSION_ALLOWANCE_REVIEWED");
  store.closedMonths.push({
    month: "2026-09", closedAt: "2026-10-01", closedBy: "dev-admin",
    recognizedSalesCentavos: 0, grossCollectionsCentavos: 0, adjustedCollectionsCentavos: 0,
    releasedCommissionCentavos: 0, paidCommissionCentavos: 0, calculationPolicy: "approved-receipt-date-v1",
    allowanceReviewCentavos: second.result, allowanceReviewCount: 1,
  });
  await expect(financeRepository.saveAllowanceReview(input)).rejects.toThrow(/closed/i);
});

it("preserves the actual payout date and posts late confirmation to the first open month", async () => {
  const store = createMockStore();
  const finance = DEV_IDENTITIES.find(({ id }) => id === "dev-finance")!;
  const repository = new MockCommissionRepository(store, () => finance, { delayMs: 0 });
  const commission = store.commissions.find(({ id }) => id === "comm-1")!;
  const payoutDate = "2026-09-30";
  commission.payout = { reference: "LATE-PAYOUT", method: "Bank Transfer", payoutDate, processedBy: finance.id, initiatedAt: payoutDate, confirmedAt: null };
  for (const month of ["2026-09", "2026-10"]) {
    store.closedMonths.push({
      month, closedAt: "2026-11-01", closedBy: "dev-admin",
      recognizedSalesCentavos: 0, grossCollectionsCentavos: 0, adjustedCollectionsCentavos: 0,
      releasedCommissionCentavos: 0, paidCommissionCentavos: 0, calculationPolicy: "approved-receipt-date-v1",
      allowanceReviewCentavos: null, allowanceReviewCount: 0,
    });
  }
  const confirmed = await repository.confirmPayout(commission.id);
  expect(confirmed.status).toBe("paid");
  expect(confirmed.payout).toMatchObject({ payoutDate, countedDate: "2026-11-01", confirmedAt: expect.any(String) });
  await expect(repository.confirmPayout(commission.id)).rejects.toThrow(/already confirmed/i);
});
