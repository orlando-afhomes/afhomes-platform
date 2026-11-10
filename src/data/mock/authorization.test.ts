import { describe, expect, it } from "vitest";
import { createMockStore } from "@/data/mock/seed";
import { createMockRepositories } from "@/data/mock/repositories";
import {
  hasModuleAccess,
  resolveEffectiveModules,
  resolveLinkedDepartmentRole,
} from "@/data/mock/authorization";
import { getDevIdentity } from "@/data/mock/dev-identities";
import type { DevIdentity, DevRole } from "@/modules/identity/types";
import { departmentRoleConfersAccess, getDelegableGrants, resolveEmployeeEffectiveModules } from "@/modules/identity/permissions";

/** An admin actor linked to a staff record through the optional `staffId`. */
function linkedIdentity(overrides: Partial<DevIdentity> = {}): DevIdentity {
  return {
    id: "test-linked",
    displayName: "Linked Staff",
    roles: [],
    memberId: null,
    branchId: null,
    status: "active",
    ...overrides,
  };
}

describe("linked department-role resolution", () => {
  it("finds no role without a linked staff record", () => {
    const store = createMockStore();
    expect(resolveLinkedDepartmentRole(store, getDevIdentity("dev-finance"))).toBeNull();
  });

  it("finds no role for inactive identities", () => {
    const store = createMockStore();
    const identity = linkedIdentity({ staffId: "staff-1", status: "inactive" as DevIdentity["status"] });
    expect(resolveLinkedDepartmentRole(store, identity)).toBeNull();
  });

  it("resolves a role through an active staff link", () => {
    const store = createMockStore();
    const identity = linkedIdentity({ staffId: "staff-1" });
    const role = resolveLinkedDepartmentRole(store, identity);
    expect(role?.id).toBe("role-hr-staff");
  });

  it("drops grants when the role is deactivated", async () => {
    const store = createMockStore();
    const adminRepos = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    await adminRepos.roles.update("role-hr-staff", { status: "deactivated" });
    const identity = linkedIdentity({ staffId: "staff-1" });
    expect(resolveLinkedDepartmentRole(store, identity)).toBeNull();
  });

  it("drops grants when the department is deactivated", async () => {
    const store = createMockStore();
    const adminRepos = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    await adminRepos.departments.update("dept-hr", { status: "deactivated" });
    const identity = linkedIdentity({ staffId: "staff-1" });
    expect(resolveLinkedDepartmentRole(store, identity)).toBeNull();
  });
});

describe("effective module grants", () => {
  it("matches system grants when no staff is linked", () => {
    const store = createMockStore();
    const identity = getDevIdentity("dev-hr");
    const granted = resolveEffectiveModules(store, identity);
    expect(granted.has("dashboard")).toBe(true);
    expect(granted.has("departments")).toBe(true);
    expect(granted.has("staff")).toBe(true);
    expect(granted.has("roles")).toBe(false);
    expect(granted.has("accounts")).toBe(false);
  });

  it("adds linked role modules without overriding system grants", async () => {
    const store = createMockStore();
    const adminRepos = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    const created = await adminRepos.roles.create({
      name: "HR Viewer",
      departmentId: "dept-hr",
      moduleIds: ["departments", "staff"],
    });
    await adminRepos.staff.update("staff-1", { departmentRoleId: created.id });
    const identity = linkedIdentity({ roles: ["finance"], staffId: "staff-1" });
    const granted = resolveEffectiveModules(store, identity);
    expect(granted.has("finance")).toBe(true);
    expect(granted.has("departments")).toBe(true);
    expect(granted.has("accounts")).toBe(false);
    expect(granted.has("roles")).toBe(false);
  });

  it("ignores unknown module ids stored on a role", () => {
    const store = createMockStore();
    store.roles.push({
      id: "role-suspicious",
      name: "Suspicious",
      departmentId: "dept-hr",
      moduleIds: ["super-admin", "root"],
      status: "active",
      createdAt: "2026-01-01",
    });
    store.staff.push({
      id: "staff-x",
      displayName: "X",
      position: "X",
      departmentId: "dept-hr",
      departmentRoleId: "role-suspicious",
      status: "active",
      email: "x@afhomes.local",
      createdAt: "2026-01-01",
      avatarUrl: null,
      accountId: null,
    });
    const granted = resolveEffectiveModules(store, linkedIdentity({ staffId: "staff-x" }));
    expect(granted.has("super-admin" as never)).toBe(false);
    expect(granted.size).toBe(0);
  });
});

describe("display and authorization parity", () => {
  const sorted = (ids: Iterable<string>) => [...ids].sort();

  it("resolveEmployeeEffectiveModules equals resolveEffectiveModules for equivalent fixtures", () => {
    const accountStatuses = ["active", "pending", "suspended", "deactivated"] as const;
    const roleSets: DevRole[][] = [[], ["hr"], ["admin"], ["super_admin"], ["hr", "finance"]];
    const staffStatuses = ["active", "suspended"] as const;
    const statuses = ["active", "deactivated"] as const;
    const roleModules = [["staff", "roles"], ["accounts", "finance", "legacy", "staff"], []];
    for (const accountStatus of accountStatuses) {
      for (const systemRoles of roleSets) {
        for (const staffStatus of staffStatuses) {
          for (const roleStatus of statuses) {
            for (const departmentStatus of statuses) {
              for (const moduleIds of roleModules) {
                const store = createMockStore();
                const account = store.accounts.find((item) => item.id === "acct-hr")!;
                account.status = accountStatus;
                account.roleIds = systemRoles;
                store.staff.find((item) => item.id === "staff-1")!.status = staffStatus;
                const role = store.roles.find((item) => item.id === "role-hr-staff")!;
                role.status = roleStatus;
                role.moduleIds = moduleIds;
                store.departments.find((item) => item.id === "dept-hr")!.status = departmentStatus;
                const identity = linkedIdentity({ roles: systemRoles, staffId: "staff-1" });
                const conferred = departmentRoleConfersAccess({ staffStatus, roleStatus, departmentStatus });
                const display = resolveEmployeeEffectiveModules({
                  accountStatus,
                  systemRoles,
                  departmentRoleModuleIds: conferred ? moduleIds : null,
                });
                expect(sorted(display)).toEqual(sorted(resolveEffectiveModules(store, identity)));
              }
            }
          }
        }
      }
    }
  });

  it("treats a missing linked account as no access in both evaluators", () => {
    const store = createMockStore();
    store.staff.find((item) => item.id === "staff-1")!.accountId = "acct-missing";
    const identity = linkedIdentity({ roles: ["hr"], staffId: "staff-1" });
    expect(resolveEffectiveModules(store, identity).size).toBe(0);
    expect(resolveEmployeeEffectiveModules({ accountStatus: null, systemRoles: ["hr"], departmentRoleModuleIds: ["staff"] })).toEqual([]);
  });

  it("keeps Super Admin system-role grants and drops non-delegable department-role ids", () => {
    const display = resolveEmployeeEffectiveModules({ accountStatus: "active", systemRoles: ["super_admin"], departmentRoleModuleIds: ["finance", "legacy"] });
    expect(display).toEqual(expect.arrayContaining(["accounts", "roles", "staff", "vip-products"]));
    // Owner rule 2026-11-10: Super Admin holds the union of every role's grants, so finance arrives via system roles.
    expect(display).toContain("finance");
    // "legacy" exists in no role's grants, proving non-delegable department-role ids confer nothing on their own.
    expect(display).not.toContain("legacy");
    expect(getDelegableGrants(["accounts", "finance", "staff", "staff", "legacy"])).toEqual(["staff"]);
  });
});

describe("S3-A effective access restrictions", () => {
  it("ignores non-delegable module grants stored on department roles", () => {
    const store = createMockStore();
    // staff-2 holds role-fin-staff, which stores the non-delegable "finance" grant.
    const financeStaff = resolveEffectiveModules(store, linkedIdentity({ staffId: "staff-2" }));
    expect(financeStaff.has("finance")).toBe(false);
    expect(financeStaff.has("dashboard")).toBe(true);
    // role-admin stores the now non-delegable "accounts" grant.
    store.staff.find((item) => item.id === "staff-3")!.departmentId = "dept-admin";
    store.staff.find((item) => item.id === "staff-3")!.departmentRoleId = "role-admin";
    const adminRoleHolder = resolveEffectiveModules(store, linkedIdentity({ staffId: "staff-3" }));
    expect(adminRoleHolder.has("accounts")).toBe(false);
    expect(adminRoleHolder.has("roles")).toBe(true);
  });

  it.each(["suspended", "deactivated", "pending"] as const)("removes all protected access when the linked account is %s", (status) => {
    const store = createMockStore();
    expect(hasModuleAccess(store, getDevIdentity("dev-hr"), "staff")).toBe(true);
    store.accounts.find((item) => item.id === "acct-hr")!.status = status;
    expect(resolveEffectiveModules(store, getDevIdentity("dev-hr")).size).toBe(0);
    expect(hasModuleAccess(store, getDevIdentity("dev-hr"), "departments")).toBe(false);
  });

  it("removes access through the repository suspension path", async () => {
    const store = createMockStore();
    const adminRepos = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    await adminRepos.accounts.updateStatus("acct-hr", "suspended");
    const hrRepos = createMockRepositories(store, () => getDevIdentity("dev-hr"));
    expect(await hrRepos.staff.list()).toEqual([]);
    await expect(hrRepos.departments.create({ name: "Blocked" })).rejects.toThrow("not allowed");
  });

  it("treats a missing linked account as blocked", () => {
    const store = createMockStore();
    store.staff.find((item) => item.id === "staff-1")!.accountId = "acct-missing";
    expect(resolveEffectiveModules(store, getDevIdentity("dev-hr")).size).toBe(0);
  });

  it("keeps identity-status gating for identities without a linked account", () => {
    const store = createMockStore();
    expect(hasModuleAccess(store, getDevIdentity("dev-finance"), "finance")).toBe(true);
  });
});

describe("hasModuleAccess", () => {
  it("denies inactive identities regardless of grants", () => {
    const store = createMockStore();
    const identity = linkedIdentity({ staffId: "staff-1", status: "inactive" as DevIdentity["status"] });
    expect(hasModuleAccess(store, identity, "departments")).toBe(false);
  });

  it("grants staff module access through a linked role", () => {
    const store = createMockStore();
    expect(hasModuleAccess(store, linkedIdentity({ staffId: "staff-1" }), "departments")).toBe(true);
    expect(hasModuleAccess(store, linkedIdentity({ staffId: "staff-1" }), "roles")).toBe(false);
  });

  it("keeps system grants intact", () => {
    const store = createMockStore();
    expect(hasModuleAccess(store, getDevIdentity("dev-hr"), "departments")).toBe(true);
    expect(hasModuleAccess(store, getDevIdentity("dev-hr"), "accounts")).toBe(false);
  });
});
