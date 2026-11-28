// @vitest-environment node
// F7: membership lifecycle, card claim and the Annual Welcome Gift Stay Points (doc 09).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { configureEmulatorEnv, emulatorsUp, sessionCookieFor } from "@/server/testing/emulator";
import { addYearsToDate, manilaToday } from "@/shared/lib/dates";

configureEmulatorEnv();
const up = await emulatorsUp();
const { SEED_ACCOUNTS } = await import("@/data/seed/dev-credentials");
const account = (identityId: string) => SEED_ACCOUNTS.find((row) => row.identityId === identityId)!;

describe.skipIf(!up)("membership and Stay Points end to end (emulators)", () => {
  let contracts: typeof import("@/server/services/contracts");
  let sales: typeof import("@/server/services/sales");
  let payments: typeof import("@/server/services/payments");
  let membership: typeof import("@/server/services/membership");
  let stayPoints: typeof import("@/server/services/stay-points");
  let catalogAdmin: typeof import("@/server/services/catalog-admin");
  let catalog: typeof import("@/server/repositories/catalog");
  let records: typeof import("@/server/repositories/records");
  let db: typeof import("@/server/db");
  let superAdmin: Awaited<ReturnType<typeof import("@/server/auth/actor").requireActor>>;
  let admin: typeof superAdmin;
  let clerk: typeof superAdmin;
  let finance: typeof superAdmin;

  const suffix = Date.now();
  const productCode = "Z6";
  const createdContractIds: string[] = [];
  const createdSaleIds: string[] = [];
  const createdMemberIds: string[] = [];
  const createdCustomerIds: string[] = [];
  const createdMembershipIds: string[] = [];
  let createdProduct = false;
  let createdSchemeKey: string | null = null;
  let levelId: string | null = null;
  let sellerMemberId = "";

  const deleteRows = async (table: string, ids: readonly string[]) => {
    for (const id of ids) await db.dbWrite(`mutation($id: UUID!) { ${table}_delete(id: $id) }`, { id }).catch(() => undefined);
  };

  beforeAll(async () => {
    contracts = await import("@/server/services/contracts");
    sales = await import("@/server/services/sales");
    payments = await import("@/server/services/payments");
    membership = await import("@/server/services/membership");
    stayPoints = await import("@/server/services/stay-points");
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
    // Own records only, foreign keys first: waivers/spends â†’ memberships â†’ payments â†’ sales â†’ contracts â†’ rates â†’ members.
    for (const membershipId of createdMembershipIds) {
      await db.dbWrite(`mutation($m: UUID!) { stayPointsWaiver_deleteMany(where: { membership: { id: { eq: $m } } }) }`, { m: membershipId }).catch(() => undefined);
      await db.dbWrite(`mutation($m: UUID!) { resortSpend_deleteMany(where: { membership: { id: { eq: $m } } }) }`, { m: membershipId }).catch(() => undefined);
      await db.dbWrite(`mutation($id: UUID!) { membership_delete(id: $id) }`, { id: membershipId }).catch(() => undefined);
    }
    for (const contractId of createdContractIds) {
      const paymentRows = await db.dbRead<{ payments: Array<{ id: string }> }>(`query($c: UUID!) { payments(where: { contract: { id: { eq: $c } } }) { id } }`, { c: contractId }).catch(() => ({ payments: [] }));
      await deleteRows("payment", paymentRows.payments.map((row) => row.id));
    }
    for (const saleId of createdSaleIds) await db.dbWrite(`mutation($id: UUID!) { sale_delete(id: $id) }`, { id: saleId }).catch(() => undefined);
    for (const contractId of createdContractIds) await db.dbWrite(`mutation($id: UUID!) { contract_delete(id: $id) }`, { id: contractId }).catch(() => undefined);
    for (const customerId of createdCustomerIds) await db.dbWrite(`mutation($id: UUID!) { customer_delete(id: $id) }`, { id: customerId }).catch(() => undefined);
    for (const memberId of createdMemberIds) {
      await db.dbWrite(`mutation($m: UUID!) { commissionRateSetting_deleteMany(where: { member: { id: { eq: $m } } }) }`, { m: memberId }).catch(() => undefined);
      await db.dbWrite(`mutation($id: UUID!) { member_delete(id: $id) }`, { id: memberId }).catch(() => undefined);
    }
    if (createdSchemeKey) await db.dbWrite(`mutation($k: String!) { paymentScheme_deleteMany(where: { key: { eq: $k } }) }`, { k: createdSchemeKey }).catch(() => undefined);
    if (createdProduct) await db.dbWrite(`mutation($c: String!) { product_deleteMany(where: { code: { eq: $c } }) }`, { c: productCode }).catch(() => undefined);
    if (levelId) await db.dbWrite(`mutation($k: String!) { tierLevel_deleteMany(where: { key: { eq: $k } }) }`, { k: levelId }).catch(() => undefined);
  }, 60_000);

  /** Catalog with the Bronze-like Grant benefits, one test seller with an approved VIP rate and a fresh customer. */
  async function setupFixtures() {
    const level = await catalogAdmin.createTierLevel(superAdmin, { name: `F7 Level ${suffix}`, colorKey: "neutral" });
    levelId = level.id;
    await catalogAdmin.createProduct(superAdmin, {
      code: productCode, name: `F7 Product ${suffix}`, tierLevelId: level.id, priceCentavos: 10_000_000,
      validityYears: 7, earningCycles: 5, vipDiscountPercent: 15, lifetimePoints: 50_000, pointsPerCycle: 10_000,
      weekdayPointsPerCycle: 7_000, weekendPointsPerCycle: 3_000, minSpendPerCycleCentavos: 1_000_000, supplementaryHolders: 0,
      benefitsSummary: "F7 test benefits", description: "F7 test product",
    }, "F7 test creation");
    createdProduct = true;
    await catalogAdmin.createScheme(superAdmin, {
      label: `F7 Plan ${suffix}`, paymentCode: "C01", applicableTiers: [productCode],
      priceCentavosByTier: { [productCode]: 10_000_000 }, reservationCentavos: 1_000_000, availability: "available",
    });
    await catalogAdmin.approveProduct(superAdmin, productCode, "F7 test approval");
    createdSchemeKey = (await catalog.loadPaymentSchemes()).find((item) => item.label === `F7 Plan ${suffix}`)!.id;

    await db.dbWrite(`mutation($d: Member_Data!) { member_insert(data: $d) }`, {
      d: { displayName: `F7 Seller ${suffix}`, designation: "OST", branchId: "branch-a", status: "active" },
    });
    sellerMemberId = (await records.loadMembersFull()).find((member) => member.displayName === `F7 Seller ${suffix}`)!.id;
    createdMemberIds.push(sellerMemberId);
    await db.dbWrite(`mutation($d: CommissionRateSetting_Data!) { commissionRateSetting_insert(data: $d) }`, {
      d: { memberId: sellerMemberId, product: "VIP", role: "DSC", rateBp: 500, standardRateBp: 500 },
    });
    return { schemeId: createdSchemeKey!, customerId: await ownCustomer("buyer") };
  }

  /** A test-owned customer, so activation and card servicing never mutate seeded records. */
  async function ownCustomer(tag: string): Promise<string> {
    const displayName = `F7 Customer ${tag} ${suffix}`;
    await db.dbWrite(`mutation($d: Customer_Data!) { customer_insert(data: $d) }`, {
      d: { displayName, branchId: "branch-a", status: "approved", profile: {} },
    });
    const id = (await records.loadCustomers()).find((customer) => customer.displayName === displayName)!.id;
    createdCustomerIds.push(id);
    return id;
  }

  /** Contract â†’ sale â†’ signed agreement â†’ full verified settlement (the membership is created by that receipt). */
  async function settleContract(fixtures: { schemeId: string; customerId: string }) {
    const contract = await contracts.prepareContract(clerk, {
      customerId: fixtures.customerId, schemeId: fixtures.schemeId, productCode, classification: "S", customerAccepted: true, sellerMemberId,
    });
    createdContractIds.push(contract.id);
    const submitted = await contracts.submitContract(clerk, contract.id);
    if (submitted.sale) createdSaleIds.push(submitted.sale.id);
    await sales.approveSale(admin, submitted.sale!.id);
    await contracts.finalizeContract(admin, contract.id);
    await contracts.recordSignedAgreement(admin, contract.id);
    const today = manilaToday();
    const pay = async (purpose: string, amountCentavos: number, tag: string) => {
      const row = await payments.submitPayment(clerk, {
        contractId: contract.id, purpose: purpose as never, amountCentavos, method: "Cash", paidDate: today,
        referenceNo: `F7-${suffix}-${tag}-${Math.floor(Math.random() * 1_000_000)}`,
      });
      await payments.verifyPayment(finance, row.id);
      return row;
    };
    await pay("reservation", 1_000_000, "res");
    // Spot cash settles in full: the balance receipt completes the membership purchase (full settlement).
    const settlement = await pay("full", 9_000_000, "full");
    return { contract: (await records.loadContract(contract.id))!.contract, sale: submitted.sale!, settlement };
  }

  it("creates a pending membership at full settlement, activates it, claims the card and releases the first yearly gift", async () => {
    const fixtures = await setupFixtures();
    const { contract, sale } = await settleContract(fixtures);

    // The fully settled contract carries a pending membership; activation is a separate Admin action (doc 09 §5.1).
    const pending = (await records.loadMemberships()).find((item) => item.contractId === contract.id)!;
    createdMembershipIds.push(pending.id);
    expect(pending.status).toBe("pending");
    expect(pending.cardId).toBeNull();
    const activated = await membership.activate(admin, pending.id);
    expect(activated.status).toBe("active");
    expect(activated.cardId).toBe(contract.vipNumber);
    expect(activated.fullSettlementDate).toBe(manilaToday());

    // The Card Claim Date starts validity; a claim after one year is deemed at the settlement anniversary.
    const claimed = await membership.recordCardClaim(admin, pending.id);
    expect(claimed.cardClaimKind).toBe("actual");
    expect(claimed.validityEndDate).toBe(addYearsToDate(manilaToday(), 7));

    // Backdate the claim so the deemed Points Activation Date (claim + 2 years) has passed and the first gift is due.
    const claimedThreeYearsAgo = addYearsToDate(manilaToday(), -3)!;
    const settledLongerAgo = addYearsToDate(manilaToday(), -3)!;
    await db.dbWrite(`mutation($id: UUID!, $c: Date!, $s: Date!, $v: Date!) { membership_update(id: $id, data: { cardClaimDate: $c, fullSettlementDate: $s, validityEndDate: $v }) }`, {
      id: pending.id, c: claimedThreeYearsAgo, s: settledLongerAgo, v: addYearsToDate(claimedThreeYearsAgo, 7),
    });

    // A Clerk enters the bill; Finance approves it (doc 09 §11). The OR number is system-issued and unique.
    const venues = await stayPoints.venues(clerk);
    expect(venues.length).toBeGreaterThan(0);
    const entered = await stayPoints.act(clerk, {
      action: "enter", membershipId: pending.id, venueId: venues[0].id, date: addYearsToDate(manilaToday(), -1)!,
      grossCentavos: 1_200_000, excludedCentavos: 0, holder: "primary", description: "F7 test resort bill",
    });
    const bill = entered.spends.find((item) => item.status === "submitted")!;
    expect(bill.verificationRef).toBeTruthy();
    await stayPoints.act(finance, { action: "approve", spendId: bill.id });

    // The Year 1 period qualifies, so the fixed Bronze-like tranche releases in full: 7,000 weekday + 3,000 weekend.
    const rows = await stayPoints.list(finance);
    const row = rows.find((item) => item.membershipId === pending.id)!;
    expect(row.ledger).not.toBeNull();
    expect(row.ledger!.tranches[0].status).toBe("released");
    expect(row.ledger!.balances.released).toBe(10_000);
    expect(row.ledger!.balances.spendableWeekday).toBe(7_000);
    expect(row.ledger!.balances.spendableWeekend).toBe(3_000);
    // The deemed Points Activation Date is recorded as a business date (doc 09 §8.5).
    expect((await records.loadMemberships()).find((item) => item.id === pending.id)!.deemedPadDate).toBeTruthy();

    // Staff lookup over active VIPs answers with the available points (doc 11; owner ruling R11).
    const found = await membership.lookupActiveVip(clerk, `F7 Customer buyer ${suffix}`);
    expect(found).toHaveLength(1);
    expect(found[0].membershipId).toBe(pending.id);
    expect(found[0].totalPoints).toBe(10_000);

    // A refund below the minimum never takes a released tranche back (doc 09 §13.3, invariant 12).
    await stayPoints.act(finance, { action: "refund", spendId: bill.id, date: manilaToday(), amountCentavos: 300_000, reason: "F7 test refund after release" });
    const afterRefund = (await stayPoints.list(finance)).find((item) => item.membershipId === pending.id)!;
    expect(afterRefund.ledger!.tranches[0].status).toBe("released");
    expect(afterRefund.ledger!.balances.released).toBe(10_000);

    // An approved transfer closes unused points as not transferred; later tranches continue (doc 09 §18, invariant 14).
    const heirId = await ownCustomer("heir");
    const transferred = await membership.serviceCard(admin, pending.id, {
      kind: "transfer", requestReference: `F7-REQ-${suffix}`, approvalReference: `F7-APR-${suffix}`, nextCustomerId: heirId, holderNotified: true,
    });
    expect(transferred.customerId).toBe(heirId);
    const afterTransfer = (await stayPoints.list(finance)).find((item) => item.membershipId === pending.id)!;
    expect(afterTransfer.ledger!.entries.some((entry) => entry.type === "transfer")).toBe(true);
    expect(afterTransfer.ledger!.balances.spendableWeekday).toBe(0);
    expect(afterTransfer.ledger!.balances.spendableWeekend).toBe(0);

    // A duplicate OR number is refused system-wide (doc 09 §11 item 2).
    await expect(stayPoints.act(clerk, {
      action: "enter", membershipId: pending.id, venueId: venues[0].id, date: addYearsToDate(manilaToday(), -1)!,
      reference: bill.verificationRef!, grossCentavos: 100_000, excludedCentavos: 0, holder: "primary", description: "Duplicate OR",
    })).rejects.toMatchObject({ code: "duplicate_number" });

    // Staff lookup moved above; the sale stays confirmed through the transfer (doc 09 §18).
    expect((await records.loadSale(sale.id))!.status).toBe("confirmed");
  }, 120_000);

  it("holds the membership when a membership payment is reversed and releases the hold on reinstatement", async () => {
    if (!createdProduct) await setupFixtures();
    const fixtures = { schemeId: createdSchemeKey!, customerId: await ownCustomer("hold") };
    const { contract } = await settleContract(fixtures);
    const pending = (await records.loadMemberships()).find((item) => item.contractId === contract.id)!;
    createdMembershipIds.push(pending.id);
    await membership.activate(admin, pending.id);

    // Reverse the settling payment: the sale returns to Pending and the membership goes on Financial Hold (doc 09 §17.2).
    const balanceRow = (await records.loadPaymentsOfContract(contract.id, null)).filter((item) => item.status === "verified").at(-1)!;
    await payments.adjustPayment(finance, balanceRow.id, { kind: "reversal", amountCentavos: balanceRow.amountCentavos, reason: "F7 test reversal" });
    expect((await records.loadMemberships()).find((item) => item.id === pending.id)!.financialHold).toBe(true);

    // A replacement receipt reinstates the sale and releases the hold.
    const replacement = await payments.submitPayment(clerk, {
      contractId: contract.id, purpose: "full" as never, amountCentavos: balanceRow.amountCentavos, method: "Cash", paidDate: manilaToday(),
      referenceNo: `F7-${suffix}-reinst-${Math.floor(Math.random() * 1_000_000)}`,
    });
    await payments.verifyPayment(finance, replacement.id);
    expect((await records.loadMemberships()).find((item) => item.id === pending.id)!.financialHold).toBe(false);
  }, 120_000);
});
