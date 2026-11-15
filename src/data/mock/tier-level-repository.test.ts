import { describe, expect, it } from "vitest";
import type { ProductCreateInput } from "@/data/contracts/product-repository";
import { pesos } from "@/shared/lib/money";
import { getDevIdentity } from "./dev-identities";
import { createMockRepositories } from "./repositories";
import { createMockStore } from "./seed";

const as = (store: ReturnType<typeof createMockStore>, id: string) => createMockRepositories(store, () => getDevIdentity(id));

const productInput = (tierLevelId: string, overrides: Partial<ProductCreateInput> = {}): ProductCreateInput => ({
  code: "P3", name: "Platinum VIP", tierLevelId, priceCentavos: pesos(600000), validityYears: 22, earningCycles: 20,
  vipDiscountPercent: 30, lifetimePoints: 600000, pointsPerCycle: 30000, weekdayPointsPerCycle: 20000, weekendPointsPerCycle: 10000,
  minSpendPerCycleCentavos: pesos(4000), supplementaryHolders: 2, ...overrides,
});

describe("VIP tier levels", () => {
  it("seeds Bronze, Silver and Gold and counts the products in each", async () => {
    const levels = await as(createMockStore(), "dev-admin").tierLevels.list();
    expect(levels.map((level) => [level.name, level.colorKey, level.status, level.productCount])).toEqual([
      ["Bronze", "bronze", "active", 1], ["Silver", "silver", "active", 1], ["Gold", "gold", "active", 1],
    ]);
  });

  it("creates a level with a trimmed name, an audit entry, and refuses a duplicate name ignoring case", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    const created = await admin.tierLevels.create({ name: "  Super   Gold ", colorKey: "gold" });
    expect(created).toMatchObject({ name: "Super Gold", status: "active", sortOrder: 4, productCount: 0 });
    expect(store.auditEvents.filter((item) => item.action === "TIER_LEVEL_CREATED" && item.entityId === created.id)).toHaveLength(1);
    await expect(admin.tierLevels.create({ name: "super gold", colorKey: "neutral" })).rejects.toThrow(/already exists/);
    await expect(admin.tierLevels.create({ name: "gold", colorKey: "neutral" })).rejects.toThrow(/already exists/);
    await expect(admin.tierLevels.create({ name: "   ", colorKey: "neutral" })).rejects.toThrow(/name is required/);
    await expect(admin.tierLevels.create({ name: "x".repeat(41), colorKey: "neutral" })).rejects.toThrow(/40 characters/);
  });

  it("needs the vip-products.manage permission", async () => {
    const store = createMockStore();
    await expect(as(store, "dev-clerk").tierLevels.create({ name: "Platinum", colorKey: "neutral" })).rejects.toThrow(/not allowed/);
    await expect(as(store, "dev-clerk").tierLevels.deactivate("tier-level-gold")).rejects.toThrow(/not allowed/);
    await expect(as(store, "dev-clerk").tierLevels.delete("tier-level-gold")).rejects.toThrow(/not allowed/);
    expect(await as(store, "dev-clerk").tierLevels.list()).toHaveLength(3);
  });

  it("blocks deleting a level a product uses, allows deactivating it, and deletes an unused one", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    await expect(admin.tierLevels.delete("tier-level-gold")).rejects.toThrow(/used by 1 product.*Deactivate it instead/);
    const off = await admin.tierLevels.deactivate("tier-level-gold");
    expect(off).toMatchObject({ status: "inactive", inUse: true });
    expect(store.auditEvents.some((item) => item.action === "TIER_LEVEL_DEACTIVATED")).toBe(true);
    const back = await admin.tierLevels.update("tier-level-gold", { status: "active" });
    expect(back.status).toBe("active");
    expect(store.auditEvents.some((item) => item.action === "TIER_LEVEL_REACTIVATED")).toBe(true);
    const unused = await admin.tierLevels.create({ name: "Platinum", colorKey: "neutral" });
    await admin.tierLevels.delete(unused.id);
    expect(store.tierLevels.some((level) => level.id === unused.id)).toBe(false);
    expect(store.auditEvents.some((item) => item.action === "TIER_LEVEL_DELETED")).toBe(true);
  });

  it("a new product can use an admin-created level, and an inactive level cannot be chosen", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    const platinum = await admin.tierLevels.create({ name: "Platinum", colorKey: "neutral" });
    const product = await admin.products.create(productInput(platinum.id), "Approved by memo");
    expect(product).toMatchObject({ tierLevelId: platinum.id, tier: "Platinum", tierColorKey: "neutral" });
    await admin.tierLevels.deactivate(platinum.id);
    await expect(admin.products.create(productInput(platinum.id, { code: "P4", name: "Platinum Two" }), "Memo")).rejects.toThrow(/inactive/);
    await expect(admin.products.create(productInput("tier-level-unknown", { code: "P4", name: "Platinum Two" }), "Memo")).rejects.toThrow(/Choose a tier level/);
    // The product keeps its inactive level, and a rename shows on the product.
    await admin.tierLevels.update(platinum.id, { name: "Platinum Plus" });
    expect((await admin.products.list()).find((item) => item.code === "P3")).toMatchObject({ tier: "Platinum Plus", tierLevelId: platinum.id });
    await expect(admin.products.update("B1", { tierLevelId: platinum.id }, "Move")).rejects.toThrow(/inactive/);
  });

  it("a product edit never changes a finalized contract's snapshot", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    await admin.contracts.finalize("ctr-3");
    const before = await admin.contracts.getById("ctr-3");
    expect(before?.productCode).toBe("G1");
    await admin.products.update("G1", { priceCentavos: pesos(450000), vipDiscountPercent: 30, description: "New description" }, "Price review");
    const after = await admin.contracts.getById("ctr-3");
    expect(after).toMatchObject({ status: "finalized", priceCentavos: before!.priceCentavos, validityYears: before!.validityYears, productConfigVersion: before!.productConfigVersion });
    expect(after?.benefits).toEqual(before?.benefits);
    const product = (await admin.products.list()).find((item) => item.code === "G1")!;
    expect(product).toMatchObject({ configVersion: 2, description: "New description" });
    expect(product.priceNote).toMatch(/^Updated on \d{4}-\d{2}-\d{2}: Price review$/);
  });
});
