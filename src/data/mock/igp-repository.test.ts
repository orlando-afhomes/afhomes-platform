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
    customerId: "cust-a6", project: "Sample Project", unit: "Lot 12", propertyOwner: "Sample Owner",
    priceCentavos: 180_000_000, scheme: "T", termMonths: 12, clauses: "S", date: "2025-01-10",
    sellerMemberId: "mem-ost-a1", referrerMemberId: null, entry: "reservation",
    payment: { paidDate: "2025-01-10", method: "Cash", amountCentavos: 18_000_000, referenceNo: "IGP-0101" },
  };
  return { store, input, admin: as("dev-admin"), finance: as("dev-finance"), clerk: as("dev-clerk"), otherSeller: as("dev-ost-b1") };
}

async function accredit({ admin, input }: ReturnType<typeof setup>) {
  await admin.igp.act({ type: "accredit", memberId: input.sellerMemberId, number: "JAI23010001", approvedDate: "2023-01-01" });
}

describe("IGP sale and receipts", () => {
  it("validates before allocating a number, and Clerk records but cannot approve", async () => {
    const fixture = setup();
    const { store, input, clerk, finance, admin, otherSeller } = fixture;
    await expect(clerk.igp.act({ type: "record", input })).rejects.toThrow(/JA&D/);
    await accredit(fixture);
    await expect(clerk.igp.act({ type: "record", input: { ...input, priceCentavos: 900_000_001 } })).rejects.toThrow(/₱9,000,000/);
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
      ...input, unit: "Lot 18", priceCentavos: 260_000_000, date: "2025-02-15", reason: "Buyer switched lots.",
    } }))!;
    await expect(admin.igp.act({ type: "reissue", id: first.id, input: { ...input, unit: "Lot 19", reason: "Retry" } })).rejects.toThrow(/closed/);
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
