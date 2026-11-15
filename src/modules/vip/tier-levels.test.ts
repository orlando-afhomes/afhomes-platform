import { describe, expect, it } from "vitest";
import { productsInLevel, seedTierLevels, tierLevelNameError, tierLevelOptions } from "./tier-levels";
import { defaultProductCode, tierOptions } from "./tier-options";
import type { VipProduct } from "./types";

describe("tier levels", () => {
  it("checks the name: required, up to 40 characters, unique ignoring case", () => {
    const others = seedTierLevels();
    expect(tierLevelNameError("Platinum", others)).toBeNull();
    expect(tierLevelNameError("  ", others)).toMatch(/required/);
    expect(tierLevelNameError("x".repeat(41), others)).toMatch(/40 characters/);
    expect(tierLevelNameError(" GOLD ", others)).toMatch(/already exists/);
  });

  it("offers active levels in order, plus an inactive one a record already holds", () => {
    const levels = [...seedTierLevels(), { id: "t-plat", name: "Platinum", colorKey: "neutral" as const, sortOrder: 0, status: "inactive" as const }];
    expect(tierLevelOptions(levels).map((item) => item.label)).toEqual(["Bronze", "Silver", "Gold"]);
    expect(tierLevelOptions(levels, ["t-plat"]).map((item) => item.label)).toEqual(["Platinum (inactive)", "Bronze", "Silver", "Gold"]);
  });

  it("counts products per level and builds tier options from the catalog, not a fixed list", () => {
    const products = [
      { code: "B1", tier: "Bronze", tierLevelId: "a", status: "active" },
      { code: "B3", tier: "Bronze", tierLevelId: "a", status: "retired" },
      { code: "P3", tier: "Platinum", tierLevelId: "p", status: "active" },
    ] as VipProduct[];
    expect(productsInLevel(products, "a")).toBe(2);
    expect(tierOptions(products).map((item) => item.label)).toEqual(["Bronze (B1)", "Platinum (P3)"]);
    expect(tierOptions(products, ["B3"]).map((item) => item.value)).toEqual(["B1", "B3", "P3"]);
    expect(tierOptions(undefined)).toEqual([]);
    expect(defaultProductCode(products)).toBe("B1");
    expect(defaultProductCode([])).toBe("");
  });
});
