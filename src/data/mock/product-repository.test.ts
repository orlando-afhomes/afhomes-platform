import { describe, expect, it } from "vitest";
import type { ProductCreateInput } from "@/data/contracts/product-repository";
import { buildVipNumber } from "@/modules/membership/rules";
import { isValidTierCode } from "@/modules/vip/types";
import { pesos } from "@/shared/lib/money";
import { getDevIdentity } from "./dev-identities";
import { createMockRepositories } from "./repositories";
import { createMockStore } from "./seed";

function as(store: ReturnType<typeof createMockStore>, id: string) {
  return createMockRepositories(store, () => getDevIdentity(id));
}

const input = (overrides: Partial<ProductCreateInput> = {}): ProductCreateInput => ({
  code: "B3", name: "Bronze Plus VIP", tier: "Bronze", priceCentavos: pesos(90000), validityYears: 7, earningCycles: 5,
  vipDiscountPercent: 10, lifetimePoints: 50000, pointsPerCycle: 10000, weekdayPointsPerCycle: 7000, weekendPointsPerCycle: 3000,
  minSpendPerCycleCentavos: pesos(1000), supplementaryHolders: 0, ...overrides,
});

describe("product catalog create and delete", () => {
  it("creates a product at version 1 with an audit entry", async () => {
    const store = createMockStore();
    const created = await as(store, "dev-admin").products.create(input(), "Approved by management memo");
    expect(created).toMatchObject({ code: "B3", configVersion: 1, status: "active" });
    expect((await as(store, "dev-admin").products.list()).some((item) => item.code === "B3")).toBe(true);
    expect(store.auditEvents.filter((item) => item.action === "PRODUCT_CREATED" && item.entityId === "B3")).toHaveLength(1);
  });

  it("normalizes the code and the new code builds a VIP Number", async () => {
    const store = createMockStore();
    const created = await as(store, "dev-admin").products.create(input({ code: "b3" }), "Memo");
    expect(created.code).toBe("B3");
    expect(buildVipNumber("2026-11-13", 1, created.code, "C01", "S")).toBe("26111300001B3C01S");
    expect(buildVipNumber("2026-11-13", 1, "G1", "T04", "S")).toBe("26111300001G1T04S");
  });

  it("rejects bad, duplicate and reserved codes, and invalid terms", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    expect(isValidTierCode("B3")).toBe(true);
    await expect(admin.products.create(input({ code: "BRZ" }), "Memo")).rejects.toThrow(/exactly 2 characters/);
    await expect(admin.products.create(input({ code: "33" }), "Memo")).rejects.toThrow(/exactly 2 characters/);
    await expect(admin.products.create(input({ code: "B1" }), "Memo")).rejects.toThrow(/already exists/);
    await expect(admin.products.create(input({ code: "B2" }), "Memo")).rejects.toThrow(/historical/);
    await expect(admin.products.create(input({ code: "G2" }), "Memo")).rejects.toThrow(/reserved/);
    await expect(admin.products.create(input({ priceCentavos: 0 }), "Memo")).rejects.toThrow(/price/);
    await expect(admin.products.create(input({ lifetimePoints: 1 }), "Memo")).rejects.toThrow(/Lifetime points/);
    await expect(admin.products.create(input({ weekdayPointsPerCycle: 1 }), "Memo")).rejects.toThrow(/add up/);
    await expect(admin.products.create(input({ earningCycles: 9, lifetimePoints: 90000 }), "Memo")).rejects.toThrow(/Earning cycles/);
    await expect(admin.products.create(input(), "  ")).rejects.toThrow(/reason/);
    expect(store.products.some((item) => item.code === "B3")).toBe(false);
  });

  it("needs the manage permission", async () => {
    const store = createMockStore();
    await expect(as(store, "dev-clerk").products.create(input(), "Memo")).rejects.toThrow(/not allowed/);
    await expect(as(store, "dev-clerk").products.delete("B1", "Memo")).rejects.toThrow(/not allowed/);
  });

  it("refuses to delete a used product and says why", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    const blockers = await admin.products.deleteBlockers();
    expect(blockers.B1).toMatch(/contract/);
    expect(blockers.G1).toMatch(/sale/);
    await expect(admin.products.delete("B1", "Cleanup")).rejects.toThrow(/Already used by/);
    expect(store.products.some((item) => item.code === "B1")).toBe(true);
  });

  it("deletes an unused product, audits it, and blocks once a scheme uses it", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    await admin.products.create(input(), "Memo");
    expect((await admin.products.deleteBlockers()).B3).toBeNull();
    await admin.products.delete("B3", "Created by mistake");
    expect(store.products.some((item) => item.code === "B3")).toBe(false);
    expect(store.auditEvents.filter((item) => item.action === "PRODUCT_DELETED" && item.entityId === "B3")).toHaveLength(1);

    await admin.products.create(input({ code: "B4", name: "Bronze Two" }), "Memo");
    await admin.products.updateScheme("scheme-spot-cash", { applicableTiers: ["B1", "S1", "G1", "B4"] }, "Offer B4");
    expect((await admin.products.deleteBlockers()).B4).toMatch(/payment scheme/);
    await expect(admin.products.delete("B4", "Cleanup")).rejects.toThrow(/Retire it instead/);
    await expect(admin.products.delete("B4", "")).rejects.toThrow(/reason/);
    await expect(admin.products.delete("ZZ", "Cleanup")).rejects.toThrow(/not found/);
  });
});
