import { describe, expect, it } from "vitest";
import { getDevIdentity } from "@/data/mock/dev-identities";
import { getRoleAwareAdminNavigation as getNav } from "@/panels/admin/navigation";
import {
  getGrantedModuleIds,
  getGrantedOperations,
  hasOperationPermission,
  isModuleGranted,
} from "@/modules/identity/permissions";

describe("role-aware permissions", () => {
  it("denies inactive accounts", () => {
    const identity = getDevIdentity("dev-inactive");
    expect(getGrantedModuleIds(identity).size).toBe(0);
    expect(getGrantedOperations(identity).size).toBe(0);
    expect(getNav(identity)).toEqual([]);
  });

  it("denies unknown or empty roles", () => {
    const identity = { ...getDevIdentity("dev-admin"), roles: [] as never };
    expect(getGrantedModuleIds(identity).size).toBe(0);
  });

  it("unions multiple active roles", () => {
    const identity = getDevIdentity("dev-multi-role");
    const granted = getGrantedModuleIds(identity);
    expect(granted.has("dashboard")).toBe(true);
    expect(granted.has("sales-network")).toBe(true);
  });

  it("excludes inactive role assignments", () => {
    const identity = getDevIdentity("dev-multi-role");
    const granted = getGrantedModuleIds(identity);
    // admin assignment is inactive in the fixture
    expect(granted.has("accounts")).toBe(false);
    expect(granted.has("departments")).toBe(false);
  });

  it("limits HR to departments and staff, not roles", () => {
    const identity = getDevIdentity("dev-hr");
    const granted = getGrantedModuleIds(identity);
    expect(granted.has("dashboard")).toBe(true);
    expect(granted.has("departments")).toBe(true);
    expect(granted.has("staff")).toBe(true);
    expect(granted.has("roles")).toBe(false);
    expect(granted.has("organization")).toBe(false);
    expect(granted.has("accounts")).toBe(false);
    expect(granted.has("finance")).toBe(false);
    expect(granted.has("sales-network")).toBe(false);
    expect(hasOperationPermission(identity, "organization.staff.manage")).toBe(true);
    expect(hasOperationPermission(identity, "organization.roles.manage")).toBe(false);
  });

  it("limits finance to finance module and operations", () => {
    const identity = getDevIdentity("dev-finance");
    const granted = getGrantedModuleIds(identity);
    expect(granted.has("dashboard")).toBe(true);
    expect(granted.has("finance")).toBe(true);
    expect(granted.has("organization")).toBe(false);
    expect(granted.has("sales-network")).toBe(false);
    expect(hasOperationPermission(identity, "finance.verify")).toBe(true);
    expect(hasOperationPermission(identity, "commission.approve")).toBe(true);
    expect(hasOperationPermission(identity, "organization.staff.manage")).toBe(false);
  });

  it("limits sales roles to sales network", () => {
    const identity = getDevIdentity("dev-ost-a1");
    const granted = getGrantedModuleIds(identity);
    expect(granted.has("dashboard")).toBe(true);
    expect(granted.has("sales-network")).toBe(true);
    expect(granted.has("finance")).toBe(false);
    expect(granted.has("departments")).toBe(false);
    expect(granted.has("roles")).toBe(false);
    expect(hasOperationPermission(identity, "sales.viewOwn")).toBe(true);
    expect(hasOperationPermission(identity, "commission.viewOwn")).toBe(true);
    expect(hasOperationPermission(identity, "finance.verify")).toBe(false);
  });

  it("filters navigation by grants", () => {
    const identity = getDevIdentity("dev-hr");
    const items = getNav(identity);
    expect(items.map((item) => item.href)).toEqual(["/admin", "/admin/organization"]);
    expect(items.find((item) => item.id === "organization")?.children?.map((child) => child.id)).toEqual([
      "departments",
      "staff",
    ]);
  });

  it("grants admin departments, roles, accounts and vip products", () => {
    const identity = getDevIdentity("dev-admin");
    expect(isModuleGranted(identity, "departments")).toBe(true);
    expect(isModuleGranted(identity, "roles")).toBe(true);
    expect(isModuleGranted(identity, "accounts")).toBe(true);
    expect(isModuleGranted(identity, "vip-products")).toBe(true);
    expect(isModuleGranted(identity, "finance")).toBe(false);
    expect(isModuleGranted(identity, "organization")).toBe(false);
    expect(hasOperationPermission(identity, "vip-products.manage")).toBe(true);
    expect(hasOperationPermission(identity, "finance.verify")).toBe(false);
  });

  it("denies unresolved modules for every role", () => {
    const identity = getDevIdentity("dev-super-admin");
    expect(isModuleGranted(identity, "audit-logs")).toBe(false);
    expect(isModuleGranted(identity, "customers")).toBe(false);
    expect(isModuleGranted(identity, "reports")).toBe(false);
    expect(isModuleGranted(identity, "accreditation")).toBe(false);
  });

  it("grants super admin protected operations", () => {
    const identity = getDevIdentity("dev-super-admin");
    expect(hasOperationPermission(identity, "admin.protected")).toBe(true);
    expect(hasOperationPermission(identity, "organization.roles.manage")).toBe(true);
  });
});
