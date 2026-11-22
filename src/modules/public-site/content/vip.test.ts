import { describe, expect, it } from "vitest";
import type { PublicVipProduct } from "@/modules/vip/types";
import { vipCardView } from "./vip";

const product = (overrides: Partial<PublicVipProduct> = {}): PublicVipProduct => ({
  code: "B9", name: "Bronze Plus", tier: "Bronze", tierColorKey: "bronze", vipDiscountPercent: 10,
  pointsPerCycle: 10000, lifetimePoints: 70000, earningCycles: 7, supplementaryHolders: 0, benefitsSummary: null, imageUrl: null, ...overrides,
});

describe("vipCardView", () => {
  it("takes the points years from the product's earning cycles, so an edited product stays consistent", () => {
    expect(vipCardView(product({ code: "G1", earningCycles: 18, lifetimePoints: 450000, pointsPerCycle: 25000 })).pointsYears).toBe(18);
    expect(vipCardView(product()).pointsYears).toBe(7);
  });

  it("lists a repeated benefit line once", () => {
    const card = vipCardView(product({ benefitsSummary: "Free parking; Free parking\nWelcome drink" }));
    expect(card.perks.filter((perk) => perk === "Free parking")).toHaveLength(1);
    expect(card.perks).toContain("Welcome drink");
  });
});
