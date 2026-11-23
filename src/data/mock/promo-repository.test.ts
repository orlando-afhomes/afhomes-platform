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
  // Start with no promos and no Promo Points so each test builds its own (the seed has both).
  store.promos.length = 0;
  store.promoPoints.length = 0;
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
    const seededEvents = store.auditEvents.length;
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
    expect(store.auditEvents.slice(seededEvents).some((e) => e.action === "PROMO_POINTS_EARNED")).toBe(true);
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
    const use = { requestId: "test-use", holder: "primary" as const, identityChecked: true, membershipId: "memb-1", promoId: promo.id, outletId: TEPPAN, points: 4, note: "Dinner" };
    await expect(clerk.promos.recordUse({ ...use, points: 12 })).rejects.toThrow(/Not enough/);
    await expect(clerk.promos.recordUse({ ...use, outletId: SPA })).rejects.toThrow(/cannot be used at this outlet/);
    await expect(clerk.promos.recordUse({ ...use, identityChecked: false })).rejects.toThrow(/checked the cardholder/);
    const [issued] = await admin.memberQr.holders("memb-1");
    await admin.memberQr.replace("memb-1", "primary");
    await expect(clerk.promos.recordUse({ ...use, scannedCode: issued.code })).rejects.toThrow(/no longer valid/);
    const entry = await clerk.promos.recordUse(use);
    expect(entry).toMatchObject({ holder: "primary", identityChecked: true, actorId: "dev-clerk" });
    expect((await clerk.promos.recordUse(use)).id).toBe(entry.id);
    await expect(clerk.promos.recordUse({ ...use, points: 5 })).rejects.toThrow(/different details/);
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
    await expect(as("dev-finance").promos.recordUse({ requestId: "denied", holder: "primary", identityChecked: true, membershipId: "memb-1", promoId: promo.id, outletId: TEPPAN, points: 1, note: "" })).rejects.toThrow(/not allowed/);
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

  it("previews a draft public offer without publishing it", async () => {
    const { store, admin, as } = setup();
    const draft = await admin.promos.create(promoInput({
      name: "Previewed Weekend", rewards: [{ name: "Spa Day Pass", description: "One day pass", outletId: SPA, pointsCost: 3 }],
      redeemOutletIds: [SPA], publicTitle: "Previewed Weekend", publicSummary: "A previewed offer.", publicTerms: "One reward per visit.",
      published: false,
    }));

    const preview = await admin.promos.previewOffer(draft.id);
    expect(preview).toMatchObject({ title: "Previewed Weekend", summary: "A previewed offer.", terms: "One reward per visit." });
    expect(preview.rewards).toHaveLength(1);
    expect(store.promos.find((promo) => promo.id === draft.id)!.published).toBe(false);
    await expect(admin.promos.publicOffers()).resolves.toHaveLength(0);
    await expect(admin.promos.previewOffer("missing-promo")).rejects.toThrow(/not found/i);
    for (const id of ["dev-clerk", "dev-finance", "dev-ost-a1"]) {
      await expect(as(id).promos.previewOffer(draft.id)).rejects.toThrow(/not allowed/i);
    }
  });

  it("publishes only complete public offers and uses named rewards at their configured cost", async () => {
    const { store, admin, clerk, finance, bill } = setup();
    await expect(admin.promos.create(promoInput({
      name: "Incomplete", published: true, publicTitle: "Incomplete offer", publicSummary: "Missing rewards",
      publicTerms: "Terms", rewards: [],
    }))).rejects.toThrow(/at least one reward/i);

    const reward = { name: "Spa Day Pass", description: "One day pass", outletId: SPA, pointsCost: 3 };
    const offer = await admin.promos.create(promoInput({
      name: "Wellness Weekend", startDate: "2000-01-01", endDate: "2099-12-31",
      earnOutletIds: [SPA], redeemOutletIds: [SPA], pointsExpiryDate: "2099-12-31",
      rewards: [reward], published: true, publicTitle: "Wellness Weekend",
      publicSummary: "Earn and use points at the spa.", publicTerms: "One reward per visit.",
    }));
    expect((await admin.promos.publicOffers()).map((item) => item.id)).toContain(offer.id);
    expect((await admin.promos.publicOffers())[0].rewards[0]).toMatchObject({ name: "Spa Day Pass", pointsCost: 3 });

    const spend = await bill(SPA);
    await finance.stayPoints.act({ action: "approve", spendId: spend.id });
    const use = await clerk.promos.recordUse({
      requestId: "reward-use", membershipId: "memb-1", promoId: offer.id, rewardId: offer.rewards[0].id,
      holder: "primary", identityChecked: true, note: "Spa visit",
    });
    expect(use).toMatchObject({ points: 3, rewardName: "Spa Day Pass", outletId: SPA });
    expect((await balanceOf(admin))?.available).toBe(8);

    await admin.promos.update(offer.id, promoInput({
      name: "Wellness Weekend", startDate: "2000-01-01", endDate: "2099-12-31",
      earnOutletIds: [SPA], redeemOutletIds: [SPA], pointsExpiryDate: "2099-12-31",
      rewards: [{ ...reward, id: offer.rewards[0].id, status: "archived" }], published: false,
      publicTitle: "Wellness Weekend", publicSummary: "Ended.", publicTerms: "One reward per visit.",
    }));
    await expect(admin.promos.publicOffers()).resolves.toHaveLength(0);
    await expect(clerk.promos.recordUse({
      requestId: "archived-use", membershipId: "memb-1", promoId: offer.id, rewardId: offer.rewards[0].id,
      holder: "primary", identityChecked: true, note: "",
    })).rejects.toThrow(/not available/i);
    expect(store.promoPoints.filter((entry) => entry.type === "use")).toHaveLength(1);
  });

  it("lets the demo GSD identity use a reward, while scanning alone and approval remain blocked", async () => {
    const { as, admin, finance, bill } = setup();
    const promo = await admin.promos.create(promoInput({
      rewards: [{ name: "Spa Day Pass", description: "One day pass", outletId: SPA, pointsCost: 3 }],
      redeemOutletIds: [SPA],
    }));
    const spend = await bill(TEPPAN);
    await finance.stayPoints.act({ action: "approve", spendId: spend.id });
    const [issued] = await admin.memberQr.holders("memb-1");
    const gsd = as("dev-gsd");
    const before = (await admin.promos.balances()).find((item) => item.membershipId === "memb-1")!.total.available;
    await expect(gsd.memberQr.resolve(issued.code)).resolves.toMatchObject({ membershipId: "memb-1" });
    expect((await admin.promos.balances()).find((item) => item.membershipId === "memb-1")!.total.available).toBe(before);
    await expect(gsd.stayPoints.act({ action: "approve", spendId: spend.id })).rejects.toThrow(/Finance or an Administrator/);
    await expect(gsd.promos.recordUse({
      requestId: "gsd-use", membershipId: "memb-1", promoId: promo.id, rewardId: promo.rewards[0].id,
      holder: "primary", identityChecked: true, scannedCode: issued.code, note: "Counter service",
    })).resolves.toMatchObject({ points: 3, actorId: "dev-gsd" });
  });

  it("keeps a used outlet from being deleted", async () => {
    const { store, admin } = setup();
    // Seeded resort bills already use the spa, so it stays protected; a new outlet starts unused.
    expect(outletInUse(store, SPA)).toBe(true);
    await expect(admin.outlets.delete(SPA)).rejects.toThrow(/used by existing records/);
    const outlet = await admin.outlets.create({ name: "Garden Spa", type: "spa" });
    expect(outletInUse(store, outlet.id)).toBe(false);
    const promo = await admin.promos.create(promoInput({ name: "Spa", earnOutletIds: [outlet.id], redeemOutletIds: [outlet.id] }));
    expect(outletInUse(store, outlet.id)).toBe(true);
    await expect(admin.outlets.delete(outlet.id)).rejects.toThrow(/used by existing records/);
    await admin.promos.delete(promo.id);
    expect(outletInUse(store, outlet.id)).toBe(false);
  });
});
