import { describe, expect, it } from "vitest";
import { getRoleBadgeHue, getRoleBadgeStyle } from "./role-badge";

describe("role badge", () => {
  it("assigns a stable hue per role id", () => {
    expect(getRoleBadgeHue("role-hr-staff")).toBe(getRoleBadgeHue("role-hr-staff"));
    expect(getRoleBadgeHue("")).toBeGreaterThanOrEqual(0);
  });

  it("gives each seeded role its own badge color", () => {
    const hues = ["role-hr-staff", "role-fin-staff", "role-ops-staff"].map(getRoleBadgeHue);
    expect(new Set(hues).size).toBe(hues.length);
  });

  it("keeps every seeded role at least 30 degrees from the others", () => {
    const hues = ["role-super-admin", "role-admin", "role-hr-staff", "role-ops-staff", "role-finance", "role-fin-staff", "role-sm", "role-ost", "role-hr", "role-svd", "role-ssm"].map(getRoleBadgeHue);
    for (const [index, hue] of hues.entries()) {
      for (const other of hues.slice(index + 1)) {
        const gap = Math.abs(hue - other);
        expect(Math.min(gap, 360 - gap)).toBeGreaterThanOrEqual(30);
      }
    }
  });

  it("returns readable pastel badge styles", () => {
    const style = getRoleBadgeStyle("role-hr-staff");
    expect(style.backgroundColor).toContain("92%");
    expect(style.color).toContain("26%");
  });
});
