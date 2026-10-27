import { describe, expect, it } from "vitest";
import { createMockStore } from "@/data/mock/seed";
import { createMockRepositories } from "@/data/mock/repositories";
import {
  hasModuleAccess,
  resolveEffectiveModules,
  resolveLinkedDepartmentRole,
} from "@/data/mock/authorization";
import { getDevIdentity } from "@/data/mock/dev-identities";
import type { DevIdentity } from "@/modules/identity/types";

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
