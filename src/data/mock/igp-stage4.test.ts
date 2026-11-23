import { describe, expect, it } from "vitest";
import type { RecordIgpSale } from "@/data/contracts/igp-repository";
import type { IgpHistoryRecord } from "@/modules/igp/history-import";
import { IGP_BUYER_NO_POINTS_COPY } from "@/modules/igp/rules";
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
  return { store, input, admin: as("dev-admin"), clerk: as("dev-clerk") };
}

async function toFullPayment(fixture: ReturnType<typeof setup>) {
  const { store, input, admin, clerk } = fixture;
  await admin.igp.act({ type: "accredit", memberId: input.sellerMemberId, number: "JAI23010001", approvedDate: "2023-01-01" });
  const sale = (await admin.igp.act({ type: "record", input }))!;
  await admin.igp.act({ type: "approve", id: sale.id });
  const finance = createMockRepositories(store, () => getDevIdentity("dev-finance"));
  await finance.payments.verify(store.payments.find(({ contractId }) => contractId === sale.id)!.id);
  for (const [referenceNo, paidDate, amountCentavos] of [["IGP-0102", "2025-01-11", 54_000_000], ["IGP-0103", "2025-02-12", 108_000_000]] as const) {
    const receipt = await clerk.payments.submit({ contractId: sale.id, purpose: "installment", method: "Cash", referenceNo, paidDate, amountCentavos });
    await finance.payments.verify(receipt.id);
  }
  return sale;
}

describe("IGP buyer membership (IGP-1)", () => {
  it("creates the membership with the frozen tier when the Formal VIP Grant is first signed", async () => {
    const fixture = setup();
    const { store, admin } = fixture;
    const sale = await toFullPayment(fixture);
    const sign = { type: "document", id: sale.id, key: "formal_grant", signedDate: "2025-02-13", signers: "AFhomes" } as const;
    await admin.igp.act(sign);

    const memberships = store.igp.buyerMemberships.filter(({ saleId }) => saleId === sale.id);
    expect(memberships).toHaveLength(1);
    expect(memberships[0]).toMatchObject({
      seriesNumber: sale.seriesNumber, customerId: sale.customerId, tier: "B1",
      grantSignedDate: "2025-02-13", status: "recorded", stayPoints: "none",
    });

    // A later rule edit never changes the frozen tier, and re-signing creates no second record.
    await admin.igp.act({
      type: "grantTierRules",
      rules: [
        { tier: "B1", minPriceCentavos: 150_000_000 },
        { tier: "S1", minPriceCentavos: 250_000_000 },
        { tier: "G1", minPriceCentavos: 450_000_000 },
      ],
      reason: "Owner update.",
    });
    await admin.igp.act({ ...sign, signedDate: "2025-02-14" });
    expect(store.igp.sales[0].grantTier).toBe("B1");
    expect(store.igp.buyerMemberships.filter(({ saleId }) => saleId === sale.id)).toHaveLength(1);
    expect(store.igp.buyerMemberships[0].tier).toBe("B1");

    const frozen = store.auditEvents.filter(({ action }) => action === "IGP_GRANT_TIER_FROZEN");
    expect(frozen).toHaveLength(1);
    expect(frozen[0].relatedRecordIds).toEqual([store.igp.buyerMemberships[0].id]);
  });

  it("credits no Stay Points, issues no VIP Number, and leaves earlier grants alone", async () => {
    const fixture = setup();
    const { store, admin } = fixture;
    const sale = await toFullPayment(fixture);
    await admin.igp.act({ type: "document", id: sale.id, key: "formal_grant", signedDate: "2025-02-13", signers: "AFhomes" });

    const membership = store.igp.buyerMemberships.find(({ saleId }) => saleId === sale.id)!;
    expect(membership.stayPoints).toBe("none");
    expect(membership).not.toHaveProperty("cardId");
    expect(membership).not.toHaveProperty("vipNumber");
    // No VIP membership, no Stay Points ledger entry and no VIP Number came from this grant.
    expect(store.memberships.some(({ contractId }) => contractId === sale.id)).toBe(false);
    expect(store.stayPoints.ledger.some(({ membershipId }) => membershipId === membership.id)).toBe(false);
    expect(IGP_BUYER_NO_POINTS_COPY).toMatch(/no Stay Points/i);

    // A grant signed before this build keeps its current state: no membership is backfilled.
    store.igp.sales.push({ ...store.igp.sales[0], id: "igp-legacy", seriesNumber: "A25010100012T12S", grantTier: "B1" as const });
    await admin.igp.act({ type: "document", id: "igp-legacy", key: "formal_grant", signedDate: "2025-02-14", signers: "AFhomes" });
    expect(store.igp.buyerMemberships.some(({ saleId }) => saleId === "igp-legacy")).toBe(false);
  });
});

describe("IGP history import (IGP-2)", () => {
  const replacement: IgpHistoryRecord = {
    "Series Number": "A26112000013T12S", "Issue date": "2026-11-20", "Contract price": "2600000.00",
    "Payment plan": "Terms", "Term months": "12", "Contract type": "Standard",
    Buyer: "Sample Buyer", Status: "Active", Replaces: "",
  };
  const superseded: IgpHistoryRecord = {
    "Series Number": "A26111500012T12S", "Issue date": "2026-11-15", "Contract price": "1800000.00",
    "Payment plan": "Terms", "Term months": "12", "Contract type": "Standard",
    Buyer: "Sample Buyer", Status: "SUPERSEDED", Replaces: "A26112000013T12S",
  };

  it("stores ready rows with their Replaces link, reserves the numbers and audits the batch", async () => {
    const { store, admin, clerk } = setup();
    const before = { sales: store.igp.sales.length, payments: store.payments.length, commissions: store.commissions.length, memberships: store.memberships.length };
    await expect(clerk.igp.importHistory({ fileName: "history.csv", records: [replacement], declaration: true }))
      .rejects.toThrow(/Administrator/);
    await expect(admin.igp.importHistory({ fileName: "history.csv", records: [replacement], declaration: false }))
      .rejects.toThrow(/official company records/);
    const batch = await admin.igp.importHistory({ fileName: "history.csv", records: [superseded, replacement], declaration: true });
    expect(batch.rows).toHaveLength(2);
    expect(batch.rows.find(({ seriesNumber }) => seriesNumber === "A26111500012T12S")).toMatchObject({
      status: "replaced", replaces: "A26112000013T12S",
    });
    expect(batch.skipped).toEqual([]);
    expect(store.auditEvents.some(({ action }) => action === "IGP_HISTORY_IMPORTED")).toBe(true);
    // Imported rows are history only: no live sale, receipt, commission or VIP Number comes from them.
    expect({ sales: store.igp.sales.length, payments: store.payments.length, commissions: store.commissions.length, memberships: store.memberships.length }).toEqual(before);

    // The numbers are reserved: neither a second import nor a live record may reuse them.
    await expect(admin.igp.importHistory({ fileName: "retry.csv", records: [replacement], declaration: true }))
      .rejects.toThrow(/No row can be imported/);
    const list = await admin.igp.list();
    expect(list.historyBatches).toHaveLength(1);
    expect(list.historyBatches[0].rows).toHaveLength(2);
  });

  it("runs the monthly sequence past imported history so a later issue never reuses a number", async () => {
    const fixture = setup();
    const { store, input, admin } = fixture;
    await admin.igp.act({ type: "accredit", memberId: input.sellerMemberId, number: "JAI23010001", approvedDate: "2023-01-01" });
    const batch = await admin.igp.importHistory({ fileName: "history.csv", records: [{
      "Series Number": "A25011500022T12S", "Issue date": "2025-01-15", "Contract price": "1800000.00",
      "Payment plan": "Terms", "Term months": "12", "Contract type": "Standard",
      Buyer: "Sample Buyer", Status: "Active", Replaces: "",
    }], declaration: true });
    expect(batch.rows).toHaveLength(1);
    const sale = (await admin.igp.act({ type: "record", input }))!;
    expect(sale.seriesNumber).toBe("A25011000032T12S");
    expect(store.igp.sales.map(({ seriesNumber }) => seriesNumber)).not.toContain("A25011500022T12S");
  });
});
