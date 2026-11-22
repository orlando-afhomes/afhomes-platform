import { describe, expect, it } from "vitest";
import type { RecordIgpSale } from "@/data/contracts/igp-repository";
import { getDevIdentity } from "./dev-identities";
import { createMockRepositories } from "./repositories";
import { createMockStore } from "./seed";

function setup() {
  const store = createMockStore();
  const as = (id: string) => createMockRepositories(store, () => getDevIdentity(id));
  store.commissionRateSettings.push({ memberId: "mem-ost-a1", product: "IGP", role: "DSC", rateBp: 500, standardRateBp: null });
  const input: RecordIgpSale = {
    customerId: "cust-a6", projectId: "igp-prj-1", unitId: "igp-unit-1",
    priceCentavos: 180_000_000, scheme: "T", termMonths: 12, clauses: "S", date: "2025-01-10",
    sellerMemberId: "mem-ost-a1", referrerMemberId: null, entry: "reservation",
    payment: { paidDate: "2025-01-10", method: "Cash", amountCentavos: 18_000_000, referenceNo: "IGP-0101" },
  };
  return { store, input, admin: as("dev-admin"), finance: as("dev-finance"), clerk: as("dev-clerk"), otherSeller: as("dev-ost-b1") };
}

async function accredit({ admin, input }: ReturnType<typeof setup>) {
  await admin.igp.act({ type: "accredit", memberId: input.sellerMemberId, number: "JAI23010001", approvedDate: "2023-01-01" });
}

describe("JA&D accreditation numbers", () => {
  it("rejects a number whose year and month do not match the approval date, and a repeated number", async () => {
    const fixture = setup();
    const { admin, input, store } = fixture;
    await expect(admin.igp.act({ type: "accredit", memberId: input.sellerMemberId, number: "JAI23020001", approvedDate: "2023-01-01" })).rejects.toThrow(/match the approval date/);
    await expect(admin.igp.act({ type: "accredit", memberId: input.sellerMemberId, number: "JAI23010000", approvedDate: "2023-01-01" })).rejects.toThrow(/JAI or JAO/);
    await accredit(fixture);
    expect(store.igp.accreditations).toMatchObject([{ number: "JAI23010001", approvedDate: "2023-01-01", validUntil: "2024-01-01" }]);
    await expect(admin.igp.act({ type: "accredit", memberId: "mem-ost-b1", number: "JAI23010001", approvedDate: "2023-01-05" })).rejects.toThrow(/already on another accreditation/);
  });
});

describe("IGP catalog on a sale", () => {
  it("copies the names onto the sale, keeps them after a rename and refuses inactive or unrelated picks", async () => {
    const fixture = setup();
    const { admin, input, store } = fixture;
    await accredit(fixture);
    const sale = (await admin.igp.act({ type: "record", input }))!;
    expect(sale).toMatchObject({ projectId: "igp-prj-1", unitId: "igp-unit-1", project: "Sample Heights", unit: "Unit 12A", propertyOwner: "Sample Property Owner" });
    await admin.igpCatalog.updateProject("igp-prj-1", { name: "Renamed Heights" });
    await admin.igpCatalog.updateUnit("igp-unit-1", { unitOrLot: "Unit 99", propertyOwner: "Another Owner" });
    expect(store.igp.sales[0]).toMatchObject({ project: "Sample Heights", unit: "Unit 12A", propertyOwner: "Sample Property Owner" });
    await expect(admin.igp.act({ type: "record", input: { ...input, unitId: "igp-unit-3" } })).rejects.toThrow(/active unit or lot of this project/);
    await admin.igpCatalog.updateUnit("igp-unit-2", { status: "inactive" });
    await expect(admin.igp.act({ type: "record", input: { ...input, unitId: "igp-unit-2" } })).rejects.toThrow(/active unit or lot/);
    await admin.igpCatalog.updateProject("igp-prj-2", { status: "inactive" });
    await expect(admin.igp.act({ type: "record", input: { ...input, projectId: "igp-prj-2", unitId: "igp-unit-3" } })).rejects.toThrow(/active project/);
  });
});

describe("IGP sale and receipts", () => {
  it("rejects incorrectly formatted JA&D accreditation numbers", async () => {
    const { admin, input } = setup();
    await expect(admin.igp.act({ type: "accredit", memberId: input.sellerMemberId, number: "AAO23010001", approvedDate: "2023-01-01" })).rejects.toThrow(/JAI|JAO/);
  });
  it("validates before allocating a number, and Clerk records but cannot approve", async () => {
    const fixture = setup();
    const { store, input, clerk, finance, admin, otherSeller } = fixture;
    await expect(clerk.igp.act({ type: "record", input })).rejects.toThrow(/JA&D/);
    await accredit(fixture);
    const sale = (await clerk.igp.act({ type: "record", input }))!;
    const receipt = store.payments.find(({ contractId }) => contractId === sale.id)!;
    expect(sale.seriesNumber).toBe("A25011000012T12S");
    expect(sale.expiryReminders).toEqual([{ party: "Closing seller", validUntil: "2024-01-01" }]);
    await expect(otherSeller.igp.list()).resolves.toMatchObject({ sales: [], buyers: [], sellers: [] });
    await expect(clerk.igp.act({ type: "approve", id: sale.id })).rejects.toThrow(/Administrator/);
    await expect(finance.payments.verify(receipt.id)).rejects.toThrow(/sale must be approved/i);
    await admin.igp.act({ type: "approve", id: sale.id });
    await finance.payments.verify(receipt.id);
    expect(store.igp.sales[0]).toMatchObject({ closedDealDate: "2025-01-10", stage1Date: null, fullPaymentDate: null });
    expect(store.igp.sales[0].adjustments).toMatchObject([{ amountCentavos: 180_000_000, date: "2025-01-10" }]);
    await expect(clerk.payments.submit({ ...input.payment, purpose: "installment", contractId: "ctr-1" })).rejects.toThrow(/already used|outstanding/);
  });

  it("issues band 0 for a price above 9,000,000 and keeps the exact price", async () => {
    const fixture = setup();
    const { input, admin } = fixture;
    await accredit(fixture);
    const sale = (await admin.igp.act({ type: "record", input: { ...input, priceCentavos: 1_000_000_000 } }))!;
    expect(sale.seriesNumber).toBe("A25011000010T12S");
    expect(sale.seriesNumber).toHaveLength(16);
    expect(sale.priceCentavos).toBe(1_000_000_000);
  });

  it("freezes the Formal VIP Grant card level when it is signed, and only management edits the rules", async () => {
    const fixture = setup();
    const { store, input, clerk, finance, admin } = fixture;
    await accredit(fixture);
    const sale = (await admin.igp.act({ type: "record", input }))!;
    await admin.igp.act({ type: "approve", id: sale.id });
    await finance.payments.verify(store.payments.find(({ contractId }) => contractId === sale.id)!.id);
    for (const [referenceNo, paidDate, amountCentavos] of [["IGP-0102", "2025-01-11", 54_000_000], ["IGP-0103", "2025-02-12", 108_000_000]] as const) {
      const receipt = await clerk.payments.submit({ contractId: sale.id, purpose: "installment", method: "Cash", referenceNo, paidDate, amountCentavos });
      await finance.payments.verify(receipt.id);
    }
    const sign = { type: "document", id: sale.id, key: "formal_grant", signedDate: "2025-02-13", signers: "AFhomes" } as const;
    await clerk.igp.act(sign);
    expect(store.igp.sales[0].grantTier).toBe("B1");

    const raised = [{ tier: "B1", minPriceCentavos: 100_000_000 }, { tier: "S1", minPriceCentavos: 150_000_000 }];
    await expect(clerk.igp.act({ type: "grantTierRules", rules: raised, reason: "Clerk" })).rejects.toThrow(/Administrator/);
    await expect(admin.igp.act({ type: "grantTierRules", rules: [raised[1], raised[0]], reason: "Wrong order" })).rejects.toThrow(/higher minimum/);
    await admin.igp.act({ type: "grantTierRules", rules: raised, reason: "Owner update." });
    expect((await admin.igp.list()).grantTierRules).toEqual(raised);
    await clerk.igp.act({ ...sign, signedDate: "2025-02-14" });
    expect(store.igp.sales[0].grantTier).toBe("B1");
  });

  it("releases IGP commissions in two stages and moves each receipt once when reissued", async () => {
    const fixture = setup();
    const { store, input, clerk, finance, admin } = fixture;
    await accredit(fixture);
    const first = (await admin.igp.act({ type: "record", input }))!;
    await admin.igp.act({ type: "approve", id: first.id });
    await finance.payments.verify(store.payments.find(({ contractId }) => contractId === first.id)!.id);
    for (const [referenceNo, paidDate, amountCentavos] of [["IGP-0102", "2025-01-11", 54_000_000], ["IGP-0103", "2025-02-12", 108_000_000]] as const) {
      const receipt = await clerk.payments.submit({ contractId: first.id, purpose: "installment", method: "Cash", referenceNo, paidDate, amountCentavos });
      await finance.payments.verify(receipt.id);
    }
    expect(store.commissions.filter(({ saleId }) => saleId === first.id)).toMatchObject([
      { stage: "stage1", amountCentavos: 3_600_000, releaseDate: "2025-01-11" },
      { stage: "full", amountCentavos: 5_400_000, releaseDate: "2025-02-12" },
    ]);
    const replacement = (await admin.igp.act({ type: "reissue", id: first.id, input: {
      ...input, unitId: "igp-unit-2", priceCentavos: 260_000_000, date: "2025-02-15", reason: "Buyer switched lots.",
    } }))!;
    await expect(admin.igp.act({ type: "reissue", id: first.id, input: { ...input, unitId: "igp-unit-2", reason: "Retry" } })).rejects.toThrow(/closed/);
    expect(replacement).toMatchObject({ seriesNumber: "A25021500013T12S", replacesId: first.id });
    expect(store.igp.sales[0]).toMatchObject({ status: "replaced", replacedById: replacement.id });
    expect(store.payments.filter(({ contractId }) => contractId === first.id)).toHaveLength(0);
    expect(store.payments.filter(({ contractId }) => contractId === replacement.id)).toHaveLength(3);
    await admin.igp.act({ type: "approve", id: replacement.id });
    expect(store.commissions.filter(({ saleId }) => saleId === replacement.id)).toMatchObject([{ stage: "stage1", amountCentavos: 5_200_000 }]);
    expect(store.igp.sales[1].fullPaymentDate).toBeNull();
    expect(store.memberships.some(({ contractId }) => contractId === replacement.id)).toBe(false);
  });
});
