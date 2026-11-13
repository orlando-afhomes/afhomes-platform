import { describe, expect, it } from "vitest";
import {
  canUsePoints, earnPointsForBill, earnReversalPoints, hasBillEarned, isUseVoided,
  promoBalance, promoBalanceByPromo,
} from "./rules";
import type { Promo, PromoPointsEntry } from "./types";

const promo: Promo = {
  id: "p1", name: "Teppanyaki", status: "active",
  startDate: "2026-12-01", endDate: "2026-12-31",
  earnOutletIds: ["tep"], earnPesosPerPointCentavos: 10_000, // P100 per point
  redeemOutletIds: ["tep", "cafe"], pointsExpiryDate: "2027-03-31",
  createdAt: "2026-11-13", updatedAt: "2026-11-13",
};

let n = 0;
const entry = (o: Partial<PromoPointsEntry> & Pick<PromoPointsEntry, "type" | "points">): PromoPointsEntry => ({
  id: `e${++n}`, promoId: "p1", membershipId: "m1", date: "2026-12-10", actorId: "u1", ...o,
});

describe("earnPointsForBill", () => {
  it("rounds down to whole points", () => {
    expect(earnPointsForBill(promo, "tep", "2026-12-10", 99_999)).toBe(9);
    expect(earnPointsForBill(promo, "tep", "2026-12-10", 100_000)).toBe(10);
    expect(earnPointsForBill(promo, "tep", "2026-12-10", 9_999)).toBe(0);
  });
  it("includes both date boundaries and excludes the days around them", () => {
    expect(earnPointsForBill(promo, "tep", "2026-12-01", 100_000)).toBe(10);
    expect(earnPointsForBill(promo, "tep", "2026-12-31", 100_000)).toBe(10);
    expect(earnPointsForBill(promo, "tep", "2026-11-30", 100_000)).toBe(0);
    expect(earnPointsForBill(promo, "tep", "2027-01-01", 100_000)).toBe(0);
  });
  it("is zero at other outlets, for non-active promos and for bad amounts", () => {
    expect(earnPointsForBill(promo, "cafe", "2026-12-10", 100_000)).toBe(0);
    expect(earnPointsForBill({ ...promo, status: "draft" }, "tep", "2026-12-10", 100_000)).toBe(0);
    expect(earnPointsForBill({ ...promo, status: "ended" }, "tep", "2026-12-10", 100_000)).toBe(0);
    expect(earnPointsForBill(promo, "tep", "2026-12-10", 0)).toBe(0);
    expect(earnPointsForBill(promo, "tep", "2026-12-10", -5_000)).toBe(0);
    expect(earnPointsForBill(promo, "tep", "2026-12-10", 100_000.5)).toBe(0);
    expect(earnPointsForBill({ ...promo, earnPesosPerPointCentavos: 0 }, "tep", "2026-12-10", 100_000)).toBe(0);
  });
});

describe("earnReversalPoints", () => {
  // Bill P1,050.00 earns 10 points.
  const net = 105_000;
  it("reverses proportionally to the remaining qualifying amount", () => {
    expect(earnReversalPoints(promo, net, 50_000, 10, 0)).toBe(5); // P550 left -> 5 kept
    expect(earnReversalPoints(promo, net, 5_000, 10, 0)).toBe(0); // P1,000 left -> still 10
    expect(earnReversalPoints(promo, net, 5_001, 10, 0)).toBe(1); // P999.99 left -> 9
  });
  it("never reverses more than earned, even if the refund exceeds the bill", () => {
    expect(earnReversalPoints(promo, net, 500_000, 10, 0)).toBe(10);
  });
  it("subtracts points already reversed (partial refunds in steps)", () => {
    expect(earnReversalPoints(promo, net, 50_000, 10, 5)).toBe(0);
    expect(earnReversalPoints(promo, net, 105_000, 10, 5)).toBe(5);
    expect(earnReversalPoints(promo, net, 105_000, 10, 10)).toBe(0);
  });
  it("is zero when nothing was earned", () => {
    expect(earnReversalPoints(promo, net, 105_000, 0, 0)).toBe(0);
  });
});

describe("idempotency helpers", () => {
  const entries = [entry({ type: "earn", points: 10, sourceBillId: "b1" })];
  it("detects a bill that already earned, even after reversal", () => {
    expect(hasBillEarned(entries, "p1", "b1")).toBe(true);
    expect(hasBillEarned(entries, "p1", "b2")).toBe(false);
    expect(hasBillEarned(entries, "p2", "b1")).toBe(false);
    const withReversal = [...entries, entry({ type: "earn_reversal", points: 10, sourceBillId: "b1" })];
    expect(hasBillEarned(withReversal, "p1", "b1")).toBe(true);
  });
  it("detects a voided use", () => {
    const use = entry({ type: "use", points: 3 });
    const list = [use, entry({ type: "use_void", points: 3, voidsEntryId: use.id })];
    expect(isUseVoided(list, use.id)).toBe(true);
    expect(isUseVoided([use], use.id)).toBe(false);
  });
});

describe("promoBalance", () => {
  it("combines earn, reversal, use and void", () => {
    const use = entry({ type: "use", points: 4 });
    const list = [
      entry({ type: "earn", points: 10, sourceBillId: "b1" }),
      entry({ type: "earn_reversal", points: 2, sourceBillId: "b1" }),
      use,
      entry({ type: "use_void", points: 4, voidsEntryId: use.id }),
      entry({ type: "use", points: 1 }),
    ];
    expect(promoBalance(list, "2027-01-01", [promo]).available).toBe(7);
  });
  it("never goes below zero", () => {
    const list = [entry({ type: "earn", points: 1 }), entry({ type: "earn_reversal", points: 5 })];
    expect(promoBalance(list, "2027-01-01", [promo]).available).toBe(0);
  });
  it("is still available on the expiry date and expired the day after", () => {
    const list = [entry({ type: "earn", points: 10 }), entry({ type: "use", points: 3 })];
    expect(promoBalance(list, "2027-03-31", [promo]).available).toBe(7);
    const after = promoBalance(list, "2027-04-01", [promo]);
    expect(after.available).toBe(0);
    expect(after.expired).toBe(7);
  });
  it("does not expire when the promo has no expiry date", () => {
    const open = { ...promo, pointsExpiryDate: null };
    expect(promoBalance([entry({ type: "earn", points: 10 })], "2035-01-01", [open]).available).toBe(10);
  });
  it("honors explicit expiry entries without double counting", () => {
    const list = [entry({ type: "earn", points: 10 }), entry({ type: "expiry", points: 10, date: "2027-04-01" })];
    const b = promoBalance(list, "2027-05-01", [promo]);
    expect(b.available).toBe(0);
    expect(b.expired).toBe(10);
  });
  it("keeps promos separate and can filter by promo", () => {
    const other: Promo = { ...promo, id: "p2", pointsExpiryDate: "2026-12-31" };
    const list = [
      entry({ type: "earn", points: 10 }),
      entry({ type: "earn", points: 6, promoId: "p2" }),
    ];
    const byPromo = promoBalanceByPromo(list, "2027-01-15", [promo, other]);
    expect(byPromo.get("p1")?.available).toBe(10);
    expect(byPromo.get("p2")?.available).toBe(0);
    expect(promoBalance(list, "2027-01-15", [promo, other]).available).toBe(10);
    expect(promoBalance(list, "2027-01-15", [promo, other], "p2").expired).toBe(6);
  });
});

describe("canUsePoints", () => {
  it("allows a valid use", () => {
    expect(canUsePoints(10, 10, promo, "cafe", "2026-12-15")).toEqual({ ok: true });
  });
  it("rejects invalid point counts", () => {
    for (const p of [0, -1, 1.5]) expect(canUsePoints(10, p, promo, "tep", "2026-12-15").ok).toBe(false);
  });
  it("rejects more than the balance with a clear message", () => {
    expect(canUsePoints(3, 4, promo, "tep", "2026-12-15")).toEqual({
      ok: false, error: "Not enough Promo Points. Available: 3.",
    });
  });
  it("rejects other outlets, draft promos, before start and after expiry", () => {
    expect(canUsePoints(10, 1, promo, "spa", "2026-12-15")).toEqual({
      ok: false, error: "Promo Points cannot be used at this outlet.",
    });
    expect(canUsePoints(10, 1, { ...promo, status: "draft" }, "tep", "2026-12-15").ok).toBe(false);
    expect(canUsePoints(10, 1, promo, "tep", "2026-11-30").ok).toBe(false);
    expect(canUsePoints(10, 1, promo, "tep", "2027-03-31").ok).toBe(true);
    expect(canUsePoints(10, 1, promo, "tep", "2027-04-01")).toEqual({
      ok: false, error: "These Promo Points have expired.",
    });
  });
  it("allows use after the promo ended while points are not expired", () => {
    expect(canUsePoints(10, 1, { ...promo, status: "ended" }, "tep", "2027-02-01").ok).toBe(true);
  });
});
