// @vitest-environment node
// F4: catalog administration, contract lifecycle completion, Non-Standard approvals and sale correction.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { configureEmulatorEnv, emulatorsUp, sessionCookieFor } from "@/server/testing/emulator";

configureEmulatorEnv();
const up = await emulatorsUp();
const { MOCK_ACCOUNTS } = await import("@/data/mock/mock-credentials");
const account = (identityId: string) => MOCK_ACCOUNTS.find((row) => row.identityId === identityId)!;

describe.skipIf(!up)("catalog and contract completion (emulators)", () => {
  let contracts: typeof import("@/server/services/contracts");
  let sales: typeof import("@/server/services/sales");
  let catalogAdmin: typeof import("@/server/services/catalog-admin");
  let catalog: typeof import("@/server/repositories/catalog");
  let records: typeof import("@/server/repositories/records");
  let db: typeof import("@/server/db");
  let auth: typeof import("@/server/auth/actor");
  let superAdmin: Awaited<ReturnType<typeof import("@/server/auth/actor").requireActor>>;
  let admin: typeof superAdmin;
  let clerk: typeof superAdmin;
  let finance: typeof superAdmin;
  const suffix = Date.now();
  const levelName = `Platinum ${suffix}`;
  const productCode = "Z9";
  const createdContractIds: string[] = [];
  const createdSaleIds: string[] = [];
  let levelId: string | null = null;
  let createdProduct = false;
  let createdSchemeKey: string | null = null;
  let nonStandardContractId: string | null = null;
  let nonStandardSaleId: string | null = null;

  beforeAll(async () => {
    contracts = await import("@/server/services/contracts");
    sales = await import("@/server/services/sales");
    catalogAdmin = await import("@/server/services/catalog-admin");
    catalog = await import("@/server/repositories/catalog");
    records = await import("@/server/repositories/records");
    db = await import("@/server/db");
    auth = await import("@/server/auth/actor");
    const session = await import("@/app/api/v1/session/route");
    const cookie = async (identityId: string) => (await auth.resolveActorFromSessionCookie(await sessionCookieFor(session.POST, account(identityId).email, account(identityId).password)))!;
    superAdmin = await cookie("dev-super-admin");
    admin = await cookie("dev-admin");
    clerk = await cookie("dev-clerk");
    finance = await cookie("dev-finance");
  }, 60_000);

  afterAll(async () => {
    for (const id of createdSaleIds) await db.dbWrite(`mutation($id: UUID!) { sale_delete(id: $id) }`, { id }).catch(() => undefined);
    for (const id of createdContractIds) await db.dbWrite(`mutation($id: UUID!) { contract_delete(id: $id) }`, { id }).catch(() => undefined);
    if (createdProduct) await db.dbWrite(`mutation($c: String!) { product_deleteMany(where: { code: { eq: $c } }) }`, { c: productCode }).catch(() => undefined);
    if (createdSchemeKey) await db.dbWrite(`mutation($k: String!) { paymentScheme_deleteMany(where: { key: { eq: $k } }) }`, { k: createdSchemeKey }).catch(() => undefined);
    if (levelId) await db.dbWrite(`mutation($k: String!) { tierLevel_deleteMany(where: { key: { eq: $k } }) }`, { k: levelId }).catch(() => undefined);
  });

  it("creates and versions an admin-managed card level and product, then approves it", async () => {
    const level = await catalogAdmin.createTierLevel(superAdmin, { name: levelName, colorKey: "neutral" });
    levelId = level.id;
    expect(level.productCount).toBe(0);
    const readBack = (await catalog.loadTierLevels()).find((entry) => entry.id === level.id)!;
    expect(readBack.configVersion).toBe(1);
    expect(readBack.changes?.length).toBe(1);

    const priceCentavos = 5_000_000;
    const product = await catalogAdmin.createProduct(superAdmin, {
      code: productCode, name: `Test ${suffix}`, tierLevelId: level.id, priceCentavos,
      validityYears: 2, earningCycles: 2, vipDiscountPercent: 5, lifetimePoints: 200, pointsPerCycle: 100,
      weekdayPointsPerCycle: 60, weekendPointsPerCycle: 40, minSpendPerCycleCentavos: 1_000_000, supplementaryHolders: 1,
      benefitsSummary: "Test benefits", description: "Test product",
    }, "F4 test creation");
    createdProduct = true;
    expect(product.approvalStatus).toBe("draft");
    expect(product.configVersion).toBe(1);

    await catalogAdmin.createScheme(superAdmin, {
      label: `Test Plan ${suffix}`, paymentCode: "C01", applicableTiers: [productCode],
      priceCentavosByTier: { [productCode]: priceCentavos }, reservationCentavos: 100_000, availability: "available",
    });
    const schemes = await catalog.loadPaymentSchemes();
    const created = schemes.find((scheme) => scheme.label === `Test Plan ${suffix}`);
    createdSchemeKey = created?.id ?? null;

    const approved = await catalogAdmin.approveProduct(superAdmin, productCode, "Owner approval reference");
    expect(approved.approvalStatus).toBe("approved");
    expect(approved.configVersion).toBe(2);

    const updated = await catalogAdmin.updateProduct(superAdmin, productCode, { priceCentavos: priceCentavos + 100_000 }, "Price update");
    expect(updated.configVersion).toBe(3);
    await expect(catalogAdmin.updateProduct(admin, productCode, { priceCentavos: priceCentavos + 200_000 }, "Admin price update")).rejects.toMatchObject({ status: 403 });
  }, 60_000);

  it("runs a Non-Standard contract through both approvals and records the VIP Number blocker", async () => {
    const [products, schemes, customerRows, contractRows] = await Promise.all([
      catalog.loadProducts(), catalog.loadPaymentSchemes(),
      db.dbRead<{ customers: Array<{ id: string; ownerMember: { id: string } | null }> }>(`query { customers(where: { status: { eq: "approved" } }, limit: 100) { id ownerMember { id } } }`),
      db.dbRead<{ contracts: Array<{ customer: { id: string } | null }> }>(`query { contracts { customer { id } } }`),
    ]);
    const used = new Set(contractRows.contracts.map((row) => row.customer?.id));
    const customer = customerRows.customers.find((row) => !used.has(row.id))!;
    expect(customer?.ownerMember?.id).toBeTruthy();
    const product = products.find((item) => item.code === productCode) ?? products.find((item) => item.code === "S1") ?? products[0];
    const scheme = schemes.find((item) => item.availability === "available" && item.applicableTiers.includes(product.code));
    expect(scheme).toBeTruthy();
    const price = product.priceCentavos + 10_000_000;
    const contract = await contracts.prepareContract(clerk, {
      customerId: customer.id, schemeId: scheme!.id, productCode: product.code, classification: "N",
      nonStandardTerms: { priceCentavos: price, months: 6, justification: "Owner-approved Non-Standard terms for the test." },
      customerAccepted: true, sellerMemberId: customer.ownerMember!.id,
    });
    createdContractIds.push(contract.id);
    expect(contract.nonStandard).toBeTruthy();
    expect(contract.schedule.filter((line) => line.purpose === "installment")).toHaveLength(6);
    expect(contract.paymentCode).toBe("T06");

    await contracts.updateContract(clerk, contract.id, { nonStandardTerms: { priceCentavos: price + 1_000_000, months: 6, justification: "Adjusted during preparation." } });
    const reloaded = (await records.loadContract(contract.id))!;
    expect(reloaded.contract.priceCentavos).toBe(price + 1_000_000);

    const submitted = await contracts.submitContract(clerk, contract.id);
    nonStandardContractId = contract.id;
    nonStandardSaleId = submitted.sale?.id ?? null;
    if (submitted.sale) createdSaleIds.push(submitted.sale.id);
    await expect(contracts.finalizeContract(admin, contract.id)).rejects.toMatchObject({ status: 409 });
    await contracts.approveNonStandard(admin, contract.id, "SN-APPROVAL-1");
    await expect(contracts.finalizeContract(admin, contract.id)).rejects.toThrow(/Finance/);
    await contracts.confirmNonStandard(finance, contract.id);
    const finalized = await contracts.finalizeContract(admin, contract.id);
    expect(finalized.status).toBe("finalized");

    const sale = (await db.dbRead<{ sales: Array<{ id: string }> }>(`query($c: UUID!) { sales(where: { contract: { id: { eq: $c } } }) { id } }`, { c: contract.id })).sales[0];
    expect(sale?.id).toBeTruthy();
    await sales.approveSale(admin, sale.id);
    const signed = await contracts.recordSignedAgreement(admin, contract.id);
    expect(signed.vipNumber).toBeUndefined();
    // F6: the seeded seller carries approved rates, so only the first scheduled payment blocks issuance.
    expect(signed.vipNumberIssueBlocker).toBe("The first scheduled payment must be recorded before the VIP Number can be issued.");
  }, 60_000);

  it("cancels a draft directly and corrects the sale referrer", async () => {
    const [products, schemes, customerRows, contractRows, members] = await Promise.all([
      catalog.loadProducts(), catalog.loadPaymentSchemes(),
      db.dbRead<{ customers: Array<{ id: string; ownerMember: { id: string } | null }> }>(`query { customers(where: { status: { eq: "approved" } }, limit: 100) { id ownerMember { id } } }`),
      db.dbRead<{ contracts: Array<{ customer: { id: string } | null }> }>(`query { contracts { customer { id } } }`),
      import("@/server/auth/authorize").then((module) => module.loadScopeMembers()),
    ]);
    const used = new Set(contractRows.contracts.map((row) => row.customer?.id));
    const customer = customerRows.customers.find((row) => !used.has(row.id))!;
    expect(customer?.id).toBeTruthy();
    const product = products.find((item) => item.code === "B1") ?? products[0];
    const scheme = schemes.find((item) => item.availability === "available" && item.applicableTiers.includes(product.code))!;
    const draft = await contracts.prepareContract(clerk, { customerId: customer.id, schemeId: scheme.id, productCode: product.code, customerAccepted: true, sellerMemberId: customer.ownerMember?.id });
    createdContractIds.push(draft.id);
    const cancelled = await contracts.cancelContract(clerk, draft.id, "Customer withdrew before submission.");
    expect(cancelled.status).toBe("cancelled");

    const saleRow = nonStandardSaleId
      ? await db.dbRead<{ sales: Array<{ id: string; sellerMember: { id: string } | null }> }>(`query($c: UUID!) { sales(where: { contract: { id: { eq: $c } } }, limit: 1) { id sellerMember { id } } }`, { c: nonStandardContractId! })
      : { sales: [] };
    const sale = saleRow.sales[0];
    if (sale) {
      const referrer = members.find((member) => member.id !== sale.sellerMember?.id);
      const corrected = await sales.correctSaleCommission(admin, sale.id, { referrerMemberId: referrer?.id ?? null, reason: "Test referrer correction" });
      expect(corrected.referrerMemberId).toBe(referrer?.id ?? null);
      const rateOnly = await sales.correctSaleCommission(admin, sale.id, { reason: "Rate-only correction" });
      expect(rateOnly.referrerMemberId).toBe(referrer?.id ?? null);
    }
  }, 60_000);

  it("rejects a contract action for an identity without contract rights", async () => {
    if (!nonStandardContractId) return;
    await expect(contracts.approveNonStandard(clerk, nonStandardContractId, "x")).rejects.toMatchObject({ status: 403 });
  });

  it("keeps a finalized contract's price snapshot when the catalog changes", async () => {
    if (!nonStandardContractId) return;
    const id = nonStandardContractId;
    const before = (await records.loadContract(id))!;
    const product = (await catalog.loadProducts()).find((item) => item.code === productCode)!;
    const changed = await catalogAdmin.updateProduct(superAdmin, productCode, { priceCentavos: product.priceCentavos + 1_000 }, "Immutability test");
    expect(changed.configVersion).toBe(product.configVersion + 1);
    const after = (await records.loadContract(id))!;
    expect(after.contract.priceCentavos).toBe(before.contract.priceCentavos);
    expect(after.contract.productConfigVersion).toBe(before.contract.productConfigVersion);
  });
});
