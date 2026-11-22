import { describe, expect, it } from "vitest";
import { productsInLevel, seedTierLevels, tierLevelNameError, tierLevelOptions } from "./tier-levels";
import { defaultProductCode, tierDisplayName, tierOptions, configurationTierOptions } from "./tier-options";
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
      { code: "B1", tier: "Bronze", tierLevelId: "a", status: "active", approvalStatus: "approved" },
      { code: "B3", tier: "Bronze", tierLevelId: "a", status: "retired", approvalStatus: "approved" },
      { code: "P3", tier: "Platinum", tierLevelId: "p", status: "active", approvalStatus: "approved" },
    ] as VipProduct[];
    expect(productsInLevel(products, "a")).toBe(2);
    expect(tierOptions(products)).toEqual([{ value: "B1", label: "Bronze" }, { value: "P3", label: "Platinum" }]);
    expect(tierOptions(products, ["B3"]).map((item) => item.value)).toEqual(["B1", "B3", "P3"]);
    expect(tierOptions(undefined)).toEqual([]);
    const draft = { code: "B9", tier: "Bronze", tierLevelId: "a", status: "active", approvalStatus: "draft" } as VipProduct;
    expect(tierOptions([draft], ["B9"])).toEqual([]);
    expect(configurationTierOptions([draft]).map((item) => item.value)).toContain("B9");
    expect(defaultProductCode([draft])).toBe("");
    expect(defaultProductCode(products)).toBe("B1");
    expect(defaultProductCode([])).toBe("");
  });

  it("shows the configured tier and resolves documented historical products without exposing raw codes", () => {
    expect(tierDisplayName("P3", [{ code: "P3", tier: "Platinum" }])).toBe("Platinum");
    expect(tierDisplayName("B1", undefined)).toBe("Bronze");
    expect(tierDisplayName("B2", undefined)).toBe("Super Bronze");
    expect(tierDisplayName("Z9", undefined)).toBeNull();
    expect(tierDisplayName(null, undefined)).toBeNull();
  });
});
