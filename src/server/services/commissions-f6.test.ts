// @vitest-environment node
// F6: rates, VIP Number issuance, staged release, month-end payout list, payouts, holds and clawbacks.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { configureEmulatorEnv, emulatorsUp, sessionCookieFor } from "@/server/testing/emulator";
import { manilaToday } from "@/shared/lib/dates";

configureEmulatorEnv();
const up = await emulatorsUp();
const { SEED_ACCOUNTS } = await import("@/data/seed/dev-credentials");
const account = (identityId: string) => SEED_ACCOUNTS.find((row) => row.identityId === identityId)!;

describe.skipIf(!up)("commissions end to end (emulators)", () => {
  let contracts: typeof import("@/server/services/contracts");
  let sales: typeof import("@/server/services/sales");
  let payments: typeof import("@/server/services/payments");
  let commissions: typeof import("@/server/services/commissions");
  let catalogAdmin: typeof import("@/server/services/catalog-admin");
  let catalog: typeof import("@/server/repositories/catalog");
  let records: typeof import("@/server/repositories/records");
  let db: typeof import("@/server/db");
  let superAdmin: Awaited<ReturnType<typeof import("@/server/auth/actor").requireActor>>;
  let admin: typeof superAdmin;
  let clerk: typeof superAdmin;
  let finance: typeof superAdmin;

  const suffix = Date.now();
  const productCode = "Z7";
  const createdContractIds: string[] = [];
  const createdSaleIds: string[] = [];
  const createdMemberIds: string[] = [];
  let createdProduct = false;
  let createdSchemeKey: string | null = null;
  let levelId: string | null = null;
  let sellerMemberId = "";
  let referrerMemberId = "";
  let closedMonthKey: string | null = null;
  const payoutListIds: string[] = [];
  let allowanceReviewId: string | null = null;

  const deleteRows = async (table: string, ids: readonly string[]) => {
    for (const id of ids) await db.dbWrite(`mutation($id: UUID!) { ${table}_delete(id: $id) }`, { id }).catch(() => undefined);
  };

  beforeAll(async () => {
    contracts = await import("@/server/services/contracts");
    sales = await import("@/server/services/sales");
    payments = await import("@/server/services/payments");
    commissions = await import("@/server/services/commissions");
    catalogAdmin = await import("@/server/services/catalog-admin");
    catalog = await import("@/server/repositories/catalog");
    records = await import("@/server/repositories/records");
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
    // Own records only, foreign keys first: clawbacks â†’ commissions â†’ payments â†’ sales â†’ contracts â†’ rates/reviews â†’ members.
    for (const saleId of createdSaleIds) {
      const rows = await db.dbRead<{ commissions: Array<{ id: string }> }>(`query($s: UUID!) { commissions(where: { sale: { id: { eq: $s } } }) { id } }`, { s: saleId }).catch(() => ({ commissions: [] }));
      const ids = rows.commissions.map((row) => row.id);
      if (ids.length) await db.dbWrite(`mutation($s: UUID!) { commissionClawback_deleteMany(where: { sale: { id: { eq: $s } } }) }`, { s: saleId }).catch(() => undefined);
      await deleteRows("commission", ids);
    }
    for (const contractId of createdContractIds) {
      const paymentRows = await db.dbRead<{ payments: Array<{ id: string }> }>(`query($c: UUID!) { payments(where: { contract: { id: { eq: $c } } }) { id } }`, { c: contractId }).catch(() => ({ payments: [] }));
      await deleteRows("payment", paymentRows.payments.map((row) => row.id));
    }
    for (const saleId of createdSaleIds) await db.dbWrite(`mutation($id: UUID!) { sale_delete(id: $id) }`, { id: saleId }).catch(() => undefined);
    for (const id of payoutListIds) await db.dbWrite(`mutation($id: UUID!) { commissionPayoutList_delete(id: $id) }`, { id }).catch(() => undefined);
    if (closedMonthKey) await db.dbWrite(`mutation($m: String!) { closedMonth_deleteMany(where: { month: { eq: $m } }) }`, { m: closedMonthKey }).catch(() => undefined);
    if (allowanceReviewId) await db.dbWrite(`mutation($id: UUID!) { allowanceReview_delete(id: $id) }`, { id: allowanceReviewId }).catch(() => undefined);
    for (const contractId of createdContractIds) await db.dbWrite(`mutation($id: UUID!) { contract_delete(id: $id) }`, { id: contractId }).catch(() => undefined);
    for (const memberId of createdMemberIds) {
      await db.dbWrite(`mutation($m: UUID!) { commissionRateSetting_deleteMany(where: { member: { id: { eq: $m } } }) }`, { m: memberId }).catch(() => undefined);
      await db.dbWrite(`mutation($id: UUID!) { member_delete(id: $id) }`, { id: memberId }).catch(() => undefined);
    }
    if (createdSchemeKey) await db.dbWrite(`mutation($k: String!) { paymentScheme_deleteMany(where: { key: { eq: $k } }) }`, { k: createdSchemeKey }).catch(() => undefined);
    if (createdProduct) await db.dbWrite(`mutation($c: String!) { product_deleteMany(where: { code: { eq: $c } }) }`, { c: productCode }).catch(() => undefined);
    if (levelId) await db.dbWrite(`mutation($k: String!) { tierLevel_deleteMany(where: { key: { eq: $k } }) }`, { k: levelId }).catch(() => undefined);
  }, 60_000);

  /** Creates the catalog rows, two test members and their approved VIP rates; returns the scheme and a fresh customer. */
  async function setupFixtures() {
    const level = await catalogAdmin.createTierLevel(superAdmin, { name: `F6 Level ${suffix}`, colorKey: "neutral" });
    levelId = level.id;
    await catalogAdmin.createProduct(superAdmin, {
      code: productCode, name: `F6 Product ${suffix}`, tierLevelId: level.id, priceCentavos: 10_000_000,
      validityYears: 2, earningCycles: 2, vipDiscountPercent: 5, lifetimePoints: 200, pointsPerCycle: 100,
      weekdayPointsPerCycle: 60, weekendPointsPerCycle: 40, minSpendPerCycleCentavos: 1_000_000, supplementaryHolders: 1,
      benefitsSummary: "F6 test benefits", description: "F6 test product",
    }, "F6 test creation");
    createdProduct = true;
    await catalogAdmin.createScheme(superAdmin, {
      label: `F6 Plan ${suffix}`, paymentCode: "C01", applicableTiers: [productCode],
      priceCentavosByTier: { [productCode]: 10_000_000 }, reservationCentavos: 1_000_000, availability: "available",
    });
    await catalogAdmin.approveProduct(superAdmin, productCode, "F6 test approval");
    const scheme = (await catalog.loadPaymentSchemes()).find((item) => item.label === `F6 Plan ${suffix}`)!;
    createdSchemeKey = scheme.id;

    await db.dbWrite(`mutation($d: Member_Data!) { member_insert(data: $d) }`, {
      d: { displayName: `F6 Seller ${suffix}`, designation: "OST", branchId: "branch-a", status: "active" },
    });
    await db.dbWrite(`mutation($d: Member_Data!) { member_insert(data: $d) }`, {
      d: { displayName: `F6 Referrer ${suffix}`, designation: "SM", branchId: "branch-a", status: "active" },
    });
    const members = await records.loadMembersFull();
    sellerMemberId = members.find((member) => member.displayName === `F6 Seller ${suffix}`)!.id;
    referrerMemberId = members.find((member) => member.displayName === `F6 Referrer ${suffix}`)!.id;
    createdMemberIds.push(sellerMemberId, referrerMemberId);
    for (const [memberId, role, rateBp] of [[sellerMemberId, "DSC", 500], [referrerMemberId, "DRI", 200]] as const) {
      await db.dbWrite(`mutation($d: CommissionRateSetting_Data!) { commissionRateSetting_insert(data: $d) }`, {
        d: { memberId, product: "VIP", role, rateBp, standardRateBp: rateBp },
      });
    }
    return { schemeId: scheme.id, customerId: await freshCustomerId() };
  }

  async function freshCustomerId(): Promise<string> {
    const [customerRows, usedRows] = await Promise.all([
      db.dbRead<{ customers: Array<{ id: string }> }>(`query { customers(where: { status: { eq: "approved" } }, limit: 100) { id } }`),
      db.dbRead<{ contracts: Array<{ customer: { id: string } | null }> }>(`query { contracts { customer { id } } }`),
    ]);
    const used = new Set(usedRows.contracts.map((row) => row.customer?.id));
    return customerRows.customers.find((row) => !used.has(row.id))!.id;
  }

  async function openContract(fixtures: { schemeId: string; customerId: string }) {
    const contract = await contracts.prepareContract(clerk, {
      customerId: fixtures.customerId, schemeId: fixtures.schemeId, productCode, classification: "S", customerAccepted: true, sellerMemberId,
    });
    createdContractIds.push(contract.id);
    const submitted = await contracts.submitContract(clerk, contract.id);
    if (submitted.sale) createdSaleIds.push(submitted.sale.id);
    await sales.approveSale(admin, submitted.sale!.id);
    await sales.correctSaleCommission(admin, submitted.sale!.id, { referrerMemberId, reason: "F6 test referral" });
    return { contract, sale: submitted.sale! };
  }

  async function payAndVerify(contractId: string, input: { purpose: string; amountCentavos: number; paidDate: string; tag: string }) {
    const submitted = await payments.submitPayment(clerk, {
      contractId, purpose: input.purpose as never, amountCentavos: input.amountCentavos, method: "Cash", paidDate: input.paidDate,
      referenceNo: `F6-${suffix}-${input.tag}-${Math.floor(Math.random() * 1_000_000)}`,
    });
    await payments.verifyPayment(finance, submitted.id);
    return submitted.id;
  }

  it("issues the number, freezes the rates, releases at 40%, pays out at month-end and claws back on cancellation", async () => {
    const fixtures = await setupFixtures();
    const { contract, sale } = await openContract(fixtures);
    // Manila business dates: the release month is the previous Manila month, so it can be closed and paid out.
    const todayISO = manilaToday();
    const [todayYear, todayMonth] = todayISO.split("-").map(Number);
    const lastMonthISO = new Date(Date.UTC(todayYear, todayMonth - 2, 10)).toISOString().slice(0, 10);
    const lastMonthKey = lastMonthISO.slice(0, 7);
    closedMonthKey = lastMonthKey;

    // The signed agreement alone does not issue: the first scheduled payment is still missing.
    const signed = await contracts.recordSignedAgreement(admin, contract.id);
    expect(signed.vipNumber).toBeUndefined();
    expect(signed.vipNumberIssueBlocker).toBeTruthy();

    // Verify the reservation and then the balance: spot cash settles in full, and the receipt that covers
    // the first scheduled payment also issues the number and freezes the rates (doc 06 §8 step 5).
    const required = (await records.loadContract(contract.id))!.contract.requiredInitialCentavos ?? 1_000_000;
    await payAndVerify(contract.id, { purpose: "reservation", amountCentavos: 1_000_000, paidDate: `${lastMonthKey}-01`, tag: "res" });
    let issued = (await records.loadContract(contract.id))!.contract;
    if (!issued.vipNumber && required > 1_000_000) {
      await payAndVerify(contract.id, { purpose: "installment", amountCentavos: required - 1_000_000, paidDate: `${lastMonthKey}-10`, tag: "inst" });
      issued = (await records.loadContract(contract.id))!.contract;
    }
    expect(issued.vipNumber).toHaveLength(17);
    expect(issued.vipNumber!.endsWith(`${productCode}C01S`)).toBe(true);
    const saleRow = await records.loadSale(sale.id);
    expect(saleRow!.commissionRates).toEqual([
      { memberId: sellerMemberId, role: "DSC", rateBp: 500 },
      { memberId: referrerMemberId, role: "DRI", rateBp: 200 },
    ]);

    // The receipt that first reaches 40% of the TCP releases the stage-1 commissions in its month (doc 08 §8.2).
    const released = await records.loadCommissionsOfSale(sale.id);
    expect(released).toHaveLength(2);
    const sellerCommission = released.find((item) => item.role === "DSC")!;
    expect(sellerCommission.amountCentavos).toBe(500_000);
    expect(sellerCommission.percentBp).toBe(500);
    expect(sellerCommission.status).toBe("released");
    expect(sellerCommission.releaseDate).toBe(`${lastMonthKey}-10`);

    // Closing the release month prepares the payout list automatically (2026-11-16 amendment).
    await payments.closeMonth(admin, lastMonthKey);
    const lists = await commissions.payoutLists(finance);
    const list = lists.find((item) => item.month === lastMonthKey)!;
    payoutListIds.push(list.id);
    expect(list.entries.map((entry) => entry.commissionId).sort()).toEqual(released.map((item) => item.id).sort());

    // Approval, then one bulk payout instruction and one bulk confirmation (doc 08 §11.6):
    // Approved is not Paid until disbursement is confirmed (doc 08 §12).
    const approvedList = await commissions.approvePayoutList(finance, list.id);
    expect(approvedList.approvedCommissionIds).toHaveLength(2);
    const afterApprove = await records.loadCommissionsOfSale(sale.id);
    expect(afterApprove.every((item) => item.status === "approved")).toBe(true);
    const recorded = await commissions.recordBulkPayout(finance, list.id, { reference: `F6-PAYOUT-${suffix}`, method: "Cash", payoutDate: todayISO, evidenceFileName: "proof.pdf" });
    expect(recorded).toMatchObject({ recorded: 2, skipped: [] });
    // A repeated instruction never creates a duplicate settlement; the failures are reported.
    const duplicate = await commissions.recordBulkPayout(finance, list.id, { reference: `F6-DUP-${suffix}`, method: "Cash", payoutDate: todayISO, evidenceFileName: "proof.pdf" });
    expect(duplicate.recorded).toBe(0);
    expect(duplicate.skipped).toHaveLength(2);
    const confirmed = await commissions.confirmBulkPayout(finance, list.id);
    expect(confirmed).toMatchObject({ confirmed: 2, skipped: [] });
    for (const commission of await records.loadCommissionsOfSale(sale.id)) {
      expect(commission.status).toBe("paid");
      expect(commission.payout?.confirmedAt).toBeTruthy();
    }

    // Cancelling the sale after the payout takes the paid commission back as clawbacks owed (doc 08 §14.1).
    const ground = (await import("@/modules/contracts/types")).CANCELLATION_GROUNDS[0];
    await contracts.requestCancellation(admin, contract.id, ground, "F6 test cancellation ground");
    await contracts.decideCancellation(admin, contract.id, "confirm", "F6 test cancellation decision");
    const clawbacks = (await commissions.clawbacks(admin)).filter((item) => item.saleId === sale.id);
    expect(clawbacks).toHaveLength(2);
    expect(clawbacks.every((item) => item.trigger === "cancellation" && item.amountCentavos > 0)).toBe(true);
    expect((await records.loadSale(sale.id))!.status).toBe("cancelled");

    // The sale is cancelled, so the correction refuses on the closed status; the released guard is on test 2's live sale.
    await expect(sales.correctSaleCommission(admin, sale.id, { reason: "Too late" })).rejects.toMatchObject({ code: "sale_closed" });
  }, 120_000);

  it("holds released commission when a reversal drops the sale back to Pending and restores it on reconfirmation", async () => {
    const fixtures = { schemeId: (await catalog.loadPaymentSchemes()).find((item) => item.label === `F6 Plan ${suffix}`)!.id, customerId: await freshCustomerId() };
    const { contract, sale } = await openContract(fixtures);
    const todayISO = manilaToday();

    await contracts.recordSignedAgreement(admin, contract.id);
    const required = (await records.loadContract(contract.id))!.contract.requiredInitialCentavos ?? 1_000_000;
    await payAndVerify(contract.id, { purpose: "reservation", amountCentavos: 1_000_000, paidDate: todayISO, tag: "res2" });
    if (!(await records.loadContract(contract.id))!.contract.vipNumber && required > 1_000_000) {
      await payAndVerify(contract.id, { purpose: "installment", amountCentavos: required - 1_000_000, paidDate: todayISO, tag: "inst2" });
    }
    const balance = (await records.loadPaymentsOfContract(contract.id, sale.id)).find((item) => item.purpose !== "reservation")!;
    expect((await records.loadCommissionsOfSale(sale.id)).length).toBe(2);

    // Once any commission on the sale is released, the referrer and rates can never change (doc 08 §9.3).
    await expect(sales.correctSaleCommission(admin, sale.id, { reason: "Too late" })).rejects.toMatchObject({ code: "commission_released" });

    // Reversing the balance receipt drops the sale to Pending and holds the unpaid commission (doc 08 §13).
    await payments.adjustPayment(finance, balance.id, { kind: "reversal", amountCentavos: balance.amountCentavos, reason: "F6 test reversal" });
    const after = await records.loadSale(sale.id);
    expect(after!.status).toBe("pending");
    const held = await records.loadCommissionsOfSale(sale.id);
    expect(held.length).toBe(2);
    expect(held.every((item) => item.status === "on_hold")).toBe(true);

    // A replacement receipt reconfirms the sale and restores the held commission (doc 08 §13).
    const replacement = await payAndVerify(contract.id, { purpose: "installment", amountCentavos: balance.amountCentavos, paidDate: todayISO, tag: "repl" });
    void replacement;
    const restored = await records.loadCommissionsOfSale(sale.id);
    expect(restored.some((item) => item.status === "released")).toBe(true);
  }, 120_000);

  it("records an IST addendum signing date and saves an allowance review with workbook figures", async () => {
    if (!referrerMemberId) await setupFixtures();
    await commissions.setClawbackAddendum(admin, referrerMemberId, `${manilaToday().slice(0, 7)}-01`);
    const directory = await commissions.rateDirectory(admin);
    expect(directory.members.find((member) => member.id === referrerMemberId)?.clawbackAddendumSignedDate).toBe(`${manilaToday().slice(0, 7)}-01`);
    const review = await commissions.saveAllowanceReview(finance, {
      month: manilaToday().slice(0, 7), memberId: referrerMemberId,
      qualifying: { days: 15, teamTcpCentavos: 2_500_000, collectionsCentavos: 1_200_000, assumedCreditCentavos: 0 },
      extended: { days: 15, teamTcpCentavos: 2_500_000, collectionsCentavos: 1_200_000, assumedCreditCentavos: 0 },
      workbook: { baCentavos: 12_500, paCentavos: 12_500, pbCentavos: 18_000 },
    });
    expect(review.position).toBe("SM");
    expect(review.result.baCentavos).toBeGreaterThan(0);
    expect(review.workbook).toEqual({ baCentavos: 12_500, paCentavos: 12_500, pbCentavos: 18_000 });
    allowanceReviewId = review.id;
  }, 120_000);

  it("records a rescission or downgrade through one status action and claws back released commission", async () => {
    const fixtures = { schemeId: (await catalog.loadPaymentSchemes()).find((item) => item.label === `F6 Plan ${suffix}`)!.id, customerId: await freshCustomerId() };
    const { contract, sale } = await openContract(fixtures);
    const todayISO = manilaToday();
    await contracts.recordSignedAgreement(admin, contract.id);
    const required = (await records.loadContract(contract.id))!.contract.requiredInitialCentavos ?? 1_000_000;
    await payAndVerify(contract.id, { purpose: "reservation", amountCentavos: 1_000_000, paidDate: todayISO, tag: "res3" });
    if (!(await records.loadContract(contract.id))!.contract.vipNumber && required > 1_000_000) {
      await payAndVerify(contract.id, { purpose: "installment", amountCentavos: required - 1_000_000, paidDate: todayISO, tag: "inst3" });
    }
    expect((await records.loadCommissionsOfSale(sale.id)).length).toBe(2);

    // Clawback Addendum §2(d): a contract can only be rescinded ninety days after booking.
    await expect(sales.changeSaleStatus(admin, sale.id, { status: "rescinded", reason: "Too early" }))
      .rejects.toMatchObject({ code: "rescission_early" });

    // Backdate the test sale's own booking date, then rescind: the Closed Deal is removed, a dated reversal is
    // recorded, and the unpaid released commission is held (doc 08 §14.1, OCT R32).
    const backdated = new Date(Date.parse(todayISO) - 100 * 86_400_000).toISOString().slice(0, 10);
    await db.dbWrite(`mutation($id: UUID!, $d: Date!) { sale_update(id: $id, data: { recordedDate: $d }) }`, { id: sale.id, d: backdated });
    const rescinded = await sales.changeSaleStatus(admin, sale.id, { status: "rescinded", reason: "Legal rescission after the ninety-day window." });
    expect(rescinded.status).toBe("rescinded");
    expect(rescinded.adjustments.some((item) => item.kind === "reversal")).toBe(true);
    const heldByRescission = await records.loadCommissionsOfSale(sale.id);
    expect(heldByRescission.every((item) => item.status === "on_hold" && item.holdTrigger === "rescission")).toBe(true);

    // Downgrade: the buyer revised to a lower purchasing amount; the repurchase is a new sale from zero (doc 08 §14.1).
    const second = await openContract({ schemeId: fixtures.schemeId, customerId: await freshCustomerId() });
    await contracts.recordSignedAgreement(admin, second.contract.id);
    await payAndVerify(second.contract.id, { purpose: "reservation", amountCentavos: 1_000_000, paidDate: todayISO, tag: "res4" });
    if (!(await records.loadContract(second.contract.id))!.contract.vipNumber && required > 1_000_000) {
      await payAndVerify(second.contract.id, { purpose: "installment", amountCentavos: required - 1_000_000, paidDate: todayISO, tag: "inst4" });
    }
    expect((await records.loadCommissionsOfSale(second.sale.id)).length).toBe(2);
    const downgraded = await sales.changeSaleStatus(admin, second.sale.id, { status: "downgraded", reason: "Buyer revised to a lower purchasing amount." });
    expect(downgraded.status).toBe("downgraded");
    const heldByDowngrade = await records.loadCommissionsOfSale(second.sale.id);
    expect(heldByDowngrade.every((item) => item.status === "on_hold" && item.holdTrigger === "downgrade")).toBe(true);
  }, 120_000);
});
