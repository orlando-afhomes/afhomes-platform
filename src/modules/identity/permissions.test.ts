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
    expect(hasOperationPermission(identity, "finance.verify")).toBe(true);
  });

  it("keeps parent and unresolved scopes denied while business modules follow the interim grants", () => {
    const admin = getDevIdentity("dev-super-admin");
    expect(isModuleGranted(admin, "accreditation")).toBe(false);
    expect(isModuleGranted(admin, "organization")).toBe(false);
    for (const moduleId of ["customers", "sales", "commissions", "membership", "stay-points", "reports", "audit-logs"] as const) {
      expect(isModuleGranted(admin, moduleId)).toBe(true);
    }
    const hr = getDevIdentity("dev-hr");
    expect(isModuleGranted(hr, "customers")).toBe(false);
    expect(isModuleGranted(hr, "audit-logs")).toBe(false);
    const ost = getDevIdentity("dev-ost-a1");
    expect(isModuleGranted(ost, "audit-logs")).toBe(false);
    expect(isModuleGranted(ost, "finance")).toBe(false);
    expect(hasOperationPermission(ost, "customers.manage")).toBe(false);
    // Slip upload is proof only (doc 07 5.1): sellers neither enter receipts nor prepare contracts.
    expect(hasOperationPermission(ost, "payments.submit")).toBe(false);
    expect(hasOperationPermission(getDevIdentity("dev-admin"), "finance.verify")).toBe(true);
  });

  it("grants super admin protected operations", () => {
    const identity = getDevIdentity("dev-super-admin");
    expect(hasOperationPermission(identity, "admin.protected")).toBe(true);
    expect(hasOperationPermission(identity, "organization.roles.manage")).toBe(true);
  });

  it("lets sellers start a draft only: no submit, receipts, or contracts", () => {
    for (const id of ["dev-svd-a", "dev-ssm-a", "dev-sm-a", "dev-ost-a1"]) {
      const seller = getDevIdentity(id);
      expect(hasOperationPermission(seller, "customers.draft")).toBe(true);
      for (const operation of ["customers.manage", "payments.submit", "contracts.prepare", "finance.verify"] as const) {
        expect(hasOperationPermission(seller, operation)).toBe(false);
      }
    }
  });

  it("limits customer registration approval to the Administrator and Super Administrator", () => {
    for (const id of ["dev-admin", "dev-super-admin"]) expect(hasOperationPermission(getDevIdentity(id), "customers.approve")).toBe(true);
    for (const id of ["dev-clerk", "dev-finance", "dev-hr", "dev-svd-a", "dev-ost-a1"]) expect(hasOperationPermission(getDevIdentity(id), "customers.approve")).toBe(false);
  });

  it("lets the Clerk enter and complete but never approve", () => {
    const clerk = getDevIdentity("dev-clerk");
    for (const operation of ["customers.manage", "customers.draft", "contracts.prepare", "payments.submit"] as const) {
      expect(hasOperationPermission(clerk, operation)).toBe(true);
    }
    for (const operation of ["finance.verify", "contracts.approve", "membership.activate", "organization.staff.manage", "audit.read", "customers.approve"] as const) {
      expect(hasOperationPermission(clerk, operation)).toBe(false);
    }
  });

  it("limits reconciliation and the history import to the right roles", () => {
    const can = (id: string, operation: "reconciliation.manage" | "history-import.manage" | "history-import.signoff") => hasOperationPermission(getDevIdentity(id), operation);
    for (const id of ["dev-admin", "dev-super-admin"]) {
      for (const operation of ["reconciliation.manage", "history-import.manage", "history-import.signoff"] as const) expect(can(id, operation)).toBe(true);
    }
    expect(can("dev-finance", "reconciliation.manage")).toBe(true);
    expect(can("dev-finance", "history-import.signoff")).toBe(false);
    for (const id of ["dev-clerk", "dev-hr", "dev-svd-a", "dev-ost-a1"]) {
      for (const operation of ["reconciliation.manage", "history-import.manage", "history-import.signoff"] as const) expect(can(id, operation)).toBe(false);
    }
  });
});
