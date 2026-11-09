import { describe, expect, it } from "vitest";
import { resolveEmployeeEffectiveModules } from "./permissions";

describe("resolveEmployeeEffectiveModules", () => {
  it("grants nothing without an Active linked account", () => {
    for (const accountStatus of [null, "pending", "suspended", "deactivated"] as const) {
      expect(resolveEmployeeEffectiveModules({ accountStatus, systemRoles: ["admin"], departmentRoleModuleIds: ["staff"] })).toEqual([]);
    }
  });

  it("combines system-role grants with delegable department-role grants", () => {
    const modules = resolveEmployeeEffectiveModules({ accountStatus: "active", systemRoles: ["hr"], departmentRoleModuleIds: ["roles"] });
    expect(modules).toEqual(expect.arrayContaining(["dashboard", "departments", "staff", "roles"]));
    expect(modules).not.toContain("accounts");
  });

  it("ignores non-delegable department-role modules and an inactive department role", () => {
    const withInert = resolveEmployeeEffectiveModules({ accountStatus: "active", systemRoles: [], departmentRoleModuleIds: ["accounts", "finance", "unknown", "staff"] });
    expect(withInert).toEqual(["staff"]);
    expect(resolveEmployeeEffectiveModules({ accountStatus: "active", systemRoles: [], departmentRoleModuleIds: null })).toEqual([]);
  });
});
