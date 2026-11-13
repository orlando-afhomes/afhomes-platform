import { describe, expect, it } from "vitest";
import type { PromoInput } from "@/data/contracts/promo-repository";
import { manilaToday } from "@/shared/lib/dates";
import { pesos } from "@/shared/lib/money";
import { getDevIdentity } from "./dev-identities";
import { outletInUse } from "./outlet-repository";
import { createMockRepositories } from "./repositories";
import { createMockStore } from "./seed";

const TEPPAN = "outlet-teppanyaki";
const SPA = "outlet-spa";

const promoInput = (over: Partial<PromoInput> = {}): PromoInput => ({
  name: "Test Promo", status: "active", startDate: "2000-01-01", endDate: "2099-12-31", earnOutletIds: [TEPPAN],
  earnPesosPerPointCentavos: pesos(100), redeemOutletIds: [TEPPAN], pointsExpiryDate: "2099-12-31", ...over,
});

function setup() {
  const store = createMockStore();
  store.promos.length = 0;
  const as = (id: string) => createMockRepositories(store, () => getDevIdentity(id));
  let n = 0;
  const bill = async (venueId: string, amount = pesos(1100), date = manilaToday()) => {
    n += 1;
    const entered = await as("dev-clerk").stayPoints.act({
      action: "enter", membershipId: "memb-1", venueId, date, grossCentavos: amount, excludedCentavos: 0,
      reference: `PROMO-OR-${n}`, holder: "primary", description: "Dinner",
    });
    return entered.spends.at(-1)!;
  };
  return { store, as, admin: as("dev-admin"), finance: as("dev-finance"), clerk: as("dev-clerk"), bill };
}

const balanceOf = async (r: ReturnType<typeof setup>["admin"]) => (await r.promos.balances()).find((b) => b.membershipId === "memb-1")?.total;

describe("Promo Points", () => {
  it("earns on approval at the promo outlet, once per bill, and leaves Grant Stay Points unchanged", async () => {
    const { store, admin, finance, bill } = setup();
    await admin.promos.create(promoInput());
    const grantBefore = (await admin.stayPoints.list()).find((m) => m.membershipId === "memb-1")!.ledger;
    const spend = await bill(TEPPAN);
    expect(store.promoPoints).toHaveLength(0);
    await finance.stayPoints.act({ action: "approve", spendId: spend.id });
    expect(store.promoPoints).toMatchObject([{ type: "earn", points: 11, sourceBillId: spend.id, outletId: TEPPAN }]);
    await finance.stayPoints.act({ action: "approve", spendId: spend.id });
    expect(store.promoPoints).toHaveLength(1);
    expect((await balanceOf(admin))?.available).toBe(11);
    const grantAfter = (await admin.stayPoints.list()).find((m) => m.membershipId === "memb-1")!.ledger;
    expect(grantAfter?.entries).toEqual(grantBefore?.entries);
    expect(grantAfter?.balances).toEqual(grantBefore?.balances);
    expect(store.auditEvents.some((e) => e.action === "PROMO_POINTS_EARNED")).toBe(true);
  });

  it("does not earn outside the promo outlets, dates, or when the promo is a draft", async () => {
    const { store, admin, finance, bill } = setup();
    await admin.promos.create(promoInput({ name: "Future", startDate: "2098-01-01", endDate: "2098-12-31", pointsExpiryDate: null }));
    await admin.promos.create(promoInput({ name: "Draft", status: "draft" }));
    await admin.promos.create(promoInput({ name: "Spa only", earnOutletIds: [SPA] }));
    const spend = await bill(TEPPAN);
    await finance.stayPoints.act({ action: "approve", spendId: spend.id });
    expect(store.promoPoints).toHaveLength(0);
  });

  it("reverses points on refund using the cumulative refunded amount", async () => {
    const { store, admin, finance, bill } = setup();
    await admin.promos.create(promoInput());
    const spend = await bill(TEPPAN);
    await finance.stayPoints.act({ action: "approve", spendId: spend.id });
    await finance.stayPoints.act({ action: "refund", spendId: spend.id, date: manilaToday(), amountCentavos: pesos(500), reason: "Wrong item" });
    expect(store.promoPoints.filter((e) => e.type === "earn_reversal").reduce((s, e) => s + e.points, 0)).toBe(5);
    await finance.stayPoints.act({ action: "refund", spendId: spend.id, date: manilaToday(), amountCentavos: pesos(600), reason: "Rest" });
    expect(store.promoPoints.filter((e) => e.type === "earn_reversal").reduce((s, e) => s + e.points, 0)).toBe(11);
    expect((await balanceOf(admin))?.available).toBe(0);
  });

  it("records use only with enough balance at a redeem outlet, and a void returns the points once", async () => {
    const { store, admin, clerk, finance, bill } = setup();
    const promo = await admin.promos.create(promoInput({ redeemOutletIds: [TEPPAN] }));
    const spend = await bill(TEPPAN);
    await finance.stayPoints.act({ action: "approve", spendId: spend.id });
    const use = { membershipId: "memb-1", promoId: promo.id, outletId: TEPPAN, points: 4, note: "Dinner" };
    await expect(clerk.promos.recordUse({ ...use, points: 12 })).rejects.toThrow(/Not enough/);
    await expect(clerk.promos.recordUse({ ...use, outletId: SPA })).rejects.toThrow(/cannot be used at this outlet/);
    const entry = await clerk.promos.recordUse(use);
    expect((await balanceOf(admin))?.available).toBe(7);
    await expect(clerk.promos.voidUse(entry.id, " ")).rejects.toThrow(/reason/i);
    await clerk.promos.voidUse(entry.id, "Entered by mistake");
    expect((await balanceOf(admin))?.available).toBe(11);
    await expect(clerk.promos.voidUse(entry.id, "Again")).rejects.toThrow(/already voided/);
    expect((await clerk.promos.ledger()).find((row) => row.id === entry.id)?.voided).toBe(true);
    expect(store.auditEvents.filter((e) => e.action === "PROMO_POINTS_USED" || e.action === "PROMO_POINTS_USE_VOIDED")).toHaveLength(2);
  });

  it("limits promo management and use by permission", async () => {
    const { as, admin } = setup();
    const promo = await admin.promos.create(promoInput());
    for (const id of ["dev-clerk", "dev-finance", "dev-ost-a1"]) await expect(as(id).promos.create(promoInput({ name: "X" }))).rejects.toThrow(/not allowed/);
    await expect(as("dev-clerk").promos.end(promo.id)).rejects.toThrow(/not allowed/);
    await expect(as("dev-finance").promos.recordUse({ membershipId: "memb-1", promoId: promo.id, outletId: TEPPAN, points: 1, note: "" })).rejects.toThrow(/not allowed/);
  });

  it("validates promos, deletes only without activity, and ends early otherwise", async () => {
    const { store, admin, finance, bill } = setup();
    await expect(admin.promos.create(promoInput({ name: " " }))).rejects.toThrow(/name/i);
    await expect(admin.promos.create(promoInput({ endDate: "1999-01-01" }))).rejects.toThrow(/before the start/);
    await expect(admin.promos.create(promoInput({ earnPesosPerPointCentavos: 0 }))).rejects.toThrow(/above zero/);
    await expect(admin.promos.create(promoInput({ earnOutletIds: ["nope"] }))).rejects.toThrow(/outlet list/);
    const unused = await admin.promos.create(promoInput({ name: "Unused" }));
    await admin.promos.delete(unused.id);
    expect(store.promos).toHaveLength(0);
    const promo = await admin.promos.create(promoInput());
    await finance.stayPoints.act({ action: "approve", spendId: (await bill(TEPPAN)).id });
    await expect(admin.promos.delete(promo.id)).rejects.toThrow(/End it instead/);
    await expect(admin.promos.update(promo.id, promoInput({ earnPesosPerPointCentavos: pesos(50) }))).rejects.toThrow(/cannot change/);
    const ended = await admin.promos.end(promo.id);
    expect(ended.status).toBe("ended");
    expect(ended.endDate <= manilaToday()).toBe(true);
    // An ended promo earns nothing more, while earned points stay usable.
    await finance.stayPoints.act({ action: "approve", spendId: (await bill(TEPPAN)).id });
    expect(store.promoPoints.filter((e) => e.type === "earn")).toHaveLength(1);
    expect(store.auditEvents.filter((e) => e.entityType === "promo" && e.action.startsWith("PROMO_")).length).toBeGreaterThanOrEqual(5);
  });

  it("keeps a used outlet from being deleted", async () => {
    const { store, admin } = setup();
    expect(outletInUse(store, SPA)).toBe(false);
    const promo = await admin.promos.create(promoInput({ name: "Spa", earnOutletIds: [SPA], redeemOutletIds: [SPA] }));
    expect(outletInUse(store, SPA)).toBe(true);
    await expect(admin.outlets.delete(SPA)).rejects.toThrow(/used by existing records/);
    await admin.promos.delete(promo.id);
    expect(outletInUse(store, SPA)).toBe(false);
  });
});
