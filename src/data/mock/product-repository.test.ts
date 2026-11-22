import { describe, expect, it } from "vitest";
import type { ProductCreateInput } from "@/data/contracts/product-repository";
import { buildVipNumber } from "@/modules/membership/rules";
import { tierOptions } from "@/modules/vip/tier-options";
import { isValidTierCode } from "@/modules/vip/types";
import { pesos } from "@/shared/lib/money";
import { getDevIdentity } from "./dev-identities";
import { createMockRepositories } from "./repositories";
import { createMockStore } from "./seed";

function as(store: ReturnType<typeof createMockStore>, id: string) {
  return createMockRepositories(store, () => getDevIdentity(id));
}

const input = (overrides: Partial<ProductCreateInput> = {}): ProductCreateInput => ({
  code: "B3", name: "Bronze Plus VIP", tierLevelId: "tier-level-bronze", priceCentavos: pesos(90000), validityYears: 7, earningCycles: 5,
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
    await expect(admin.products.create(input({ code: "B2" }), "Memo")).rejects.toThrow(/used before/);
    await expect(admin.products.create(input({ code: "G2" }), "Memo")).rejects.toThrow(/held for future use/);
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
    expect((await admin.products.deleteBlockers()).B4).toMatch(/payment plan/);
    await expect(admin.products.delete("B4", "Cleanup")).rejects.toThrow(/Retire it instead/);
    await expect(admin.products.delete("B4", "")).rejects.toThrow(/reason/);
    await expect(admin.products.delete("ZZ", "Cleanup")).rejects.toThrow(/not found/);
  });
});

describe("product drafts and Super Administrator approval", () => {
  const complete = (overrides: Partial<ProductCreateInput> = {}) => input({ benefitsSummary: "Priority reservations and a welcome gift.", ...overrides });

  async function draft(store: ReturnType<typeof createMockStore>) {
    const admin = as(store, "dev-admin");
    const created = await admin.products.create(complete(), "Draft for management review");
    return { admin, created };
  }

  async function offerScheme(admin: ReturnType<typeof as>) {
    await admin.products.updateScheme("scheme-spot-cash", { applicableTiers: ["B1", "S1", "G1", "B3"] }, "Offer the new product");
  }

  it("creates new products as drafts that are neither public nor selectable", async () => {
    const store = createMockStore();
    const { admin, created } = await draft(store);
    expect(created).toMatchObject({ code: "B3", approvalStatus: "draft", publiclyListed: false, status: "active" });
    expect((await admin.products.listPublic()).some((item) => item.code === "B3")).toBe(false);
    expect(tierOptions(await admin.products.list()).map((item) => item.value)).not.toContain("B3");
    expect(tierOptions(await admin.products.list(), ["B3"]).map((item) => item.value)).not.toContain("B3");
  });

  it("keeps drafts out of customer plans and contract preparation", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    await admin.products.create(complete(), "Draft for management review");

    await expect(admin.customers.createDraft({ displayName: "Draft Plan Buyer", vipPlan: "B3" })).rejects.toThrow(/approved and active/);

    store.customers.find((item) => item.id === "cust-b1")!.vipPlan = "B3";
    await expect(admin.contracts.prepare({
      customerId: "cust-b1",
      schemeId: "scheme-spot-cash",
      classification: "S",
      customerAccepted: true,
      newPurchaseRequestId: "draft-product-contract",
    })).rejects.toThrow(/approved, active VIP plan/);
  });

  it("only a Super Administrator approves, with complete terms, a payment plan and a reason", async () => {
    const store = createMockStore();
    const { admin } = await draft(store);
    const superAdmin = as(store, "dev-super-admin");

    await expect(admin.products.approve("B3", "Approved by management")).rejects.toThrow(/not allowed/);
    await expect(superAdmin.products.approve("B3", "Approved by management")).rejects.toThrow(/payment plan/);
    await offerScheme(admin);
    await expect(superAdmin.products.approve("B3", "  ")).rejects.toThrow(/reason/);

    const approved = await superAdmin.products.approve("B3", "Approved by management");
    expect(approved).toMatchObject({ approvalStatus: "approved", status: "active", publiclyListed: false });
    expect(store.auditEvents.filter((item) => item.action === "PRODUCT_APPROVED" && item.entityId === "B3")).toHaveLength(1);
    expect(approved.changes.at(-1)?.reason).toBe("Approved by management");
  });

  it("refuses approval without stated benefits", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    await admin.products.create(input(), "Draft for management review");
    await offerScheme(admin);
    await expect(as(store, "dev-super-admin").products.approve("B3", "Approved")).rejects.toThrow(/benefits/i);
  });

  it("keeps the stated benefits once the product is approved", async () => {
    const store = createMockStore();
    const { admin } = await draft(store);
    await offerScheme(admin);
    await as(store, "dev-super-admin").products.approve("B3", "Approved by management");

    await expect(admin.products.update("B3", { benefitsSummary: "   " }, "Cleanup")).rejects.toThrow(/benefits/i);
    await expect(admin.products.update("B3", { benefitsSummary: null }, "Cleanup")).rejects.toThrow(/benefits/i);
    expect(store.products.find((item) => item.code === "B3")?.benefitsSummary).toBe("Priority reservations and a welcome gift.");
  });

  it("lets trimmed benefits through but never a cleared one on an approved product", async () => {
    const store = createMockStore();
    const { admin } = await draft(store);
    await offerScheme(admin);
    await as(store, "dev-super-admin").products.approve("B3", "Approved by management");
    const updated = await admin.products.update("B3", { benefitsSummary: "  Priority reservations only.  " }, "Trim the wording");
    expect(updated.benefitsSummary).toBe("  Priority reservations only.  ");
    await expect(admin.products.update("B3", { benefitsSummary: "" }, "Cleanup")).rejects.toThrow(/stated benefits/i);
  });

  it("does not approve a retired draft", async () => {
    const store = createMockStore();
    const { admin } = await draft(store);
    await offerScheme(admin);
    await admin.products.update("B3", { status: "retired" }, "Stop offering the product");
    await expect(as(store, "dev-super-admin").products.approve("B3", "Approved by management")).rejects.toThrow(/active/i);
    expect(store.products.find((item) => item.code === "B3")).toMatchObject({ approvalStatus: "draft", status: "retired" });
  });

  it("keeps the price, points and discount of an approved product with the Super Administrator", async () => {
    const store = createMockStore();
    const { admin } = await draft(store);
    await offerScheme(admin);
    const superAdmin = as(store, "dev-super-admin");
    await superAdmin.products.approve("B3", "Approved by management");
    await expect(admin.products.update("B3", { priceCentavos: pesos(95000) }, "Price change")).rejects.toThrow(/Super Administrator/);
    await expect(admin.products.update("B3", { vipDiscountPercent: 12 }, "Discount change")).rejects.toThrow(/Super Administrator/);
    await expect(admin.products.update("B3", { description: "A new description." }, "Wording")).resolves.toMatchObject({ description: "A new description." });
    await expect(superAdmin.products.update("B3", { priceCentavos: pesos(95000) }, "Price change")).resolves.toMatchObject({ priceCentavos: pesos(95000) });
  });

  it("refuses approval when validity, earning cycles or points are zero", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    await admin.products.create(complete(), "Draft for management review");
    await offerScheme(admin);
    const superAdmin = as(store, "dev-super-admin");
    const product = store.products.find((item) => item.code === "B3")!;

    product.validityYears = 0;
    await expect(superAdmin.products.approve("B3", "Approved by management")).rejects.toThrow(/Validity/);

    product.validityYears = 7;
    product.earningCycles = 0;
    product.lifetimePoints = 0;
    await expect(superAdmin.products.approve("B3", "Approved by management")).rejects.toThrow(/Earning cycles/);

    product.earningCycles = 5;
    product.pointsPerCycle = 0;
    product.weekdayPointsPerCycle = 0;
    product.weekendPointsPerCycle = 0;
    product.lifetimePoints = 0;
    await expect(superAdmin.products.approve("B3", "Approved by management")).rejects.toThrow(/Points per cycle/);
  });

  it("does not create or renumber VIP Numbers when a product is created or approved", async () => {
    const store = createMockStore();
    const membershipsBefore = JSON.stringify(store.memberships);
    const { admin } = await draft(store);
    await offerScheme(admin);
    await as(store, "dev-super-admin").products.approve("B3", "Approved by management");
    expect(JSON.stringify(store.memberships)).toBe(membershipsBefore);
    expect(store.memberships.some((item) => item.productCode === "B3")).toBe(false);
  });

  it("publishes only approved, active and explicitly listed products", async () => {
    const store = createMockStore();
    const { admin } = await draft(store);
    await offerScheme(admin);
    const superAdmin = as(store, "dev-super-admin");
    await superAdmin.products.approve("B3", "Approved by management");

    expect((await admin.products.listPublic()).some((item) => item.code === "B3")).toBe(false);
    await admin.products.update("B3", { publiclyListed: true }, "List on the public website");
    expect((await admin.products.listPublic()).some((item) => item.code === "B3")).toBe(true);
    await admin.products.update("B3", { status: "retired" }, "Stop offering the product");
    expect((await admin.products.listPublic()).some((item) => item.code === "B3")).toBe(false);
  });

  it("keeps the three seeded products approved and public", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    const publicProducts = await admin.products.listPublic();
    expect(publicProducts.map((item) => item.code).sort()).toEqual(["B1", "G1", "S1"]);
    const catalog = await admin.products.list();
    expect(catalog.filter((item) => ["B1", "S1", "G1"].includes(item.code)).every((item) => item.approvalStatus === "approved" && item.publiclyListed && item.status === "active")).toBe(true);
  });
});

describe("supplementary holder rule follows the product", () => {
  const bill = { action: "enter", membershipId: "memb-1", venueId: "venue-wellness-hotel", date: "2026-11-10", grossCentavos: pesos(1200), excludedCentavos: 0, reference: "SUPP-OR-1", holder: "supplementary", description: "Restaurant" } as const;

  it("refuses supplementary spend on a product without supplementary holders, and allows it once the product has some", async () => {
    const store = createMockStore();
    await expect(as(store, "dev-clerk").stayPoints.act(bill)).rejects.toThrow(/product allows an extra cardholder/);
    store.products.find((item) => item.code === "B1")!.supplementaryHolders = 1;
    // The product check now passes; the signed Grant of this membership still decides.
    await expect(as(store, "dev-clerk").stayPoints.act(bill)).rejects.toThrow(/signed Grant does not allow/);
  });
});
