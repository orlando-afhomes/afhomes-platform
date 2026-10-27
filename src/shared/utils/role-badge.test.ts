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

  it("returns readable pastel badge styles", () => {
    const style = getRoleBadgeStyle("role-hr-staff");
    expect(style.backgroundColor).toContain("92%");
    expect(style.color).toContain("26%");
  });
});
