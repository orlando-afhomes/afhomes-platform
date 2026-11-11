import { describe, expect, it } from "vitest";
import type { AdminModuleId } from "@/modules/identity/permissions";
import { AUDIT_ACTIONS } from "@/modules/audit/types";
import { createMockStore } from "./seed";
import { SEED_AUDIT_EVENT_COUNT } from "./seed-data";
import { createMockRepositories } from "./repositories";
import { getDevIdentity } from "./dev-identities";
import { PROTECTED_ROLE_ERROR } from "./authorization";

function adminRepos(store: ReturnType<typeof createMockStore>) {
  return createMockRepositories(store, () => getDevIdentity("dev-admin"));
}

function hrRepos(store: ReturnType<typeof createMockStore>) {
  return createMockRepositories(store, () => getDevIdentity("dev-hr"));
}

function superRepos(store: ReturnType<typeof createMockStore>) {
  return createMockRepositories(store, () => getDevIdentity("dev-super-admin"));
}

describe("department role repository", () => {
  it("lists seeded roles for authorized actors", async () => {
    const store = createMockStore();
    const roles = await adminRepos(store).roles.list();
    expect(roles.map((role) => role.id)).toEqual([
      "role-hr-staff",
      "role-fin-staff",
      "role-ops-staff",
      "role-super-admin",
      "role-admin",
      "role-hr",
      "role-finance",
      "role-svd",
      "role-ssm",
      "role-sm",
      "role-ost",
    ]);
  });

  it("denies listing for unauthorized identities", async () => {
    const store = createMockStore();
    expect(await hrRepos(store).roles.list()).toEqual([]);
  });

  it("creates a role with delegable modules", async () => {
    const store = createMockStore();
    const created = await adminRepos(store).roles.create({
      name: "HR Viewer",
      departmentId: "dept-hr",
      moduleIds: ["departments"],
    });
    expect(created.id).toMatch(/^role-\d+$/);
    expect(created.status).toBe("active");
    expect(created.moduleIds).toEqual(["departments"]);
  });

  it("rejects duplicate role names within a department", async () => {
    const store = createMockStore();
    await expect(
      adminRepos(store).roles.create({ name: "HR Staff", departmentId: "dept-hr", moduleIds: ["departments"] }),
    ).rejects.toThrow("already exists");
  });

  it("allows the same role name in different departments", async () => {
    const store = createMockStore();
    const created = await superRepos(store).roles.create({
      name: "HR Staff",
      departmentId: "dept-finance",
      moduleIds: ["departments"],
    });
    expect(created.departmentId).toBe("dept-finance");
  });

  it("rejects roles under deactivated departments", async () => {
    const store = createMockStore();
    await adminRepos(store).departments.update("dept-ops", { status: "deactivated" });
    await expect(
      adminRepos(store).roles.create({ name: "Ops Temp", departmentId: "dept-ops", moduleIds: ["departments"] }),
    ).rejects.toThrow("deactivated");
  });

  it("rejects non-delegable and out-of-scope modules", async () => {
    const store = createMockStore();
    // "finance" is a real module but not delegable through department roles.
    await expect(
      adminRepos(store).roles.create({ name: "Bad", departmentId: "dept-hr", moduleIds: ["finance"] }),
    ).rejects.toThrow("cannot be delegated");
    // "staff" is delegable, but this acting account (linked only to a roles-only
    // department role) does not hold it.
    const scopedStore = createMockStore();
    const scopedRole = await superRepos(scopedStore).roles.create({
      name: "Role Keeper",
      departmentId: "dept-hr",
      moduleIds: ["roles"],
    });
    const scopedStaff = await superRepos(scopedStore).staff.create({
      displayName: "Role Keeper",
      position: "Keeper",
      departmentId: "dept-hr",
      departmentRoleId: scopedRole.id,
      email: "keeper@afhomes.local",
    });
    const scopedIdentity = { ...getDevIdentity("dev-hr"), id: "scoped", roles: [] as never[], staffId: scopedStaff.id };
    const scopedRepos = createMockRepositories(scopedStore, () => scopedIdentity);
    await expect(
      scopedRepos.roles.create({ name: "Bad", departmentId: "dept-hr", moduleIds: ["staff"] }),
    ).rejects.toThrow("outside the acting account");
    await expect(
      adminRepos(store).roles.create({
        name: "Bad",
        departmentId: "dept-hr",
        moduleIds: ["unknown-mod" as AdminModuleId],
      }),
    ).rejects.toThrow("cannot be delegated");
  });

  it("prevents hr from creating roles", async () => {
    const store = createMockStore();
    await expect(
      hrRepos(store).roles.create({ name: "HR Custom", departmentId: "dept-hr", moduleIds: ["departments"] }),
    ).rejects.toThrow("not allowed");
  });

  it("renames and re-scopes a role when unused", async () => {
    const store = createMockStore();
    const created = await adminRepos(store).roles.create({
      name: "Temp",
      departmentId: "dept-hr",
      moduleIds: ["departments"],
    });
    const updated = await adminRepos(store).roles.update(created.id, { name: "Temp Renamed" });
    expect(updated.name).toBe("Temp Renamed");
  });

  it("blocks department transfer while staff are assigned", async () => {
    const store = createMockStore();
    await expect(adminRepos(store).roles.update("role-hr-staff", { departmentId: "dept-finance" })).rejects.toThrow(
      "assigned",
    );
  });

  it("blocks deleting an assigned role", async () => {
    const store = createMockStore();
    await expect(adminRepos(store).roles.delete("role-hr-staff")).rejects.toThrow("assigned");
    expect((await adminRepos(store).roles.list()).some((role) => role.id === "role-hr-staff")).toBe(true);
  });

  it("deletes an unassigned role", async () => {
    const store = createMockStore();
    const created = await adminRepos(store).roles.create({
      name: "Temp",
      departmentId: "dept-hr",
      moduleIds: ["departments"],
    });
    await adminRepos(store).roles.delete(created.id);
    expect((await adminRepos(store).roles.getById(created.id))).toBeNull();
  });

  it("requires at least one module", async () => {
    const store = createMockStore();
    await expect(adminRepos(store).roles.create({ name: "Empty", departmentId: "dept-hr", moduleIds: [] })).rejects.toThrow(
      "At least one authorized module",
    );
  });

  it("includes every account role as an active department role", async () => {
    const store = createMockStore();
    const expected: Array<[systemRole: string, roleName: string, departmentId: string]> = [
      ["super_admin", "Super Admin", "dept-admin"],
      ["admin", "Administrator", "dept-admin"],
      ["hr", "Human Resources", "dept-hr"],
      ["finance", "Finance", "dept-finance"],
      ["svd", "Sales Vice Director", "dept-sales"],
      ["ssm", "Senior Sales Manager", "dept-sales"],
      ["sm", "Sales Manager", "dept-sales"],
      ["ost", "OST", "dept-sales"],
    ];
    const roles = await adminRepos(store).roles.list();
    const departments = await adminRepos(store).departments.list();
    for (const [systemRole, roleName, departmentId] of expected) {
      const role = roles.find((item) => item.name === roleName && item.status === "active");
      expect(role, `missing department role for account role ${systemRole}`).toBeDefined();
      expect(role?.departmentId).toBe(departmentId);
      expect(departments.some((dept) => dept.id === departmentId && dept.status === "active")).toBe(true);
    }
  });
});

describe("department role repository S3-A protections", () => {
  function roleSnapshot(store: ReturnType<typeof createMockStore>, id: string) {
    const role = store.roles.find((item) => item.id === id);
    return role ? { ...role, moduleIds: [...role.moduleIds] } : undefined;
  }

  /** Actor whose only authority is a roles-only department role. */
  async function rolesOnlyRepos(store: ReturnType<typeof createMockStore>) {
    const keeperRole = await superRepos(store).roles.create({ name: "Role Keeper", departmentId: "dept-hr", moduleIds: ["roles"] });
    const keeper = await superRepos(store).staff.create({
      displayName: "Role Keeper",
      position: "Keeper",
      departmentId: "dept-hr",
      departmentRoleId: keeperRole.id,
      email: "keeper@afhomes.local",
    });
    const identity = { ...getDevIdentity("dev-hr"), id: "scoped", roles: [] as never[], staffId: keeper.id };
    return createMockRepositories(store, () => identity);
  }

  it("no longer offers accounts as a delegable module", async () => {
    const store = createMockStore();
    await expect(adminRepos(store).roles.create({ name: "Accounts Lead", departmentId: "dept-hr", moduleIds: ["accounts"] })).rejects.toThrow(
      'Module "Accounts" cannot be delegated through a department role.',
    );
  });

  it("reserves the protected Super Admin role for super admins", async () => {
    const store = createMockStore();
    const before = roleSnapshot(store, "role-super-admin");
    await expect(adminRepos(store).roles.update("role-super-admin", { name: "Renamed" })).rejects.toThrow(PROTECTED_ROLE_ERROR);
    await expect(adminRepos(store).roles.update("role-super-admin", { status: "deactivated" })).rejects.toThrow(PROTECTED_ROLE_ERROR);
    await expect(adminRepos(store).roles.delete("role-super-admin")).rejects.toThrow(PROTECTED_ROLE_ERROR);
    expect(roleSnapshot(store, "role-super-admin")).toEqual(before);
    const updated = await superRepos(store).roles.update("role-super-admin", { status: "deactivated" });
    expect(updated.status).toBe("deactivated");
    await expect(adminRepos(store).roles.update("role-super-admin", { status: "active" })).rejects.toThrow(PROTECTED_ROLE_ERROR);
  });

  it("rejects reactivation of a role beyond the actor's authority", async () => {
    const store = createMockStore();
    const scoped = await rolesOnlyRepos(store);
    await adminRepos(store).roles.update("role-hr-staff", { status: "deactivated" });
    await expect(scoped.roles.update("role-hr-staff", { status: "active" })).rejects.toThrow("outside the acting account");
    await expect(scoped.roles.update("role-hr-staff", { name: "Renamed" })).rejects.toThrow("outside the acting account");
    expect(roleSnapshot(store, "role-hr-staff")?.status).toBe("deactivated");
    expect(roleSnapshot(store, "role-hr-staff")?.name).toBe("HR Staff");
  });

  it("rejects deleting a role beyond the actor's authority", async () => {
    const store = createMockStore();
    const created = await adminRepos(store).roles.create({ name: "Staff Desk", departmentId: "dept-hr", moduleIds: ["staff"] });
    const scoped = await rolesOnlyRepos(store);
    await expect(scoped.roles.delete(created.id)).rejects.toThrow("outside the acting account");
    expect(roleSnapshot(store, created.id)).toBeDefined();
  });

  it("lets admin edit a role that retains a legacy non-delegable grant", async () => {
    const store = createMockStore();
    const updated = await adminRepos(store).roles.update("role-admin", {
      name: "Administrator",
      moduleIds: ["dashboard", "departments", "roles", "staff", "accounts"],
    });
    expect(updated.moduleIds).toContain("accounts");
    await expect(adminRepos(store).roles.update("role-hr", { moduleIds: ["dashboard", "accounts"] })).rejects.toThrow("cannot be delegated");
  });

  it("lists role options for staff holders with assign authority, without granting Roles management", async () => {
    const store = createMockStore();
    expect(await hrRepos(store).roles.list()).toEqual([]);
    const options = await hrRepos(store).roles.listForAssignment();
    const byId = new Map(options.map((role) => [role.id, role]));
    expect(byId.get("role-hr-staff")).toMatchObject({ manageable: true, assignable: true });
    expect(byId.get("role-admin")).toMatchObject({ manageable: false, assignable: false });
    expect(byId.get("role-super-admin")).toMatchObject({ manageable: false, assignable: false });
    // role-fin-staff only confers dashboard; its stored finance grant is inert.
    expect(byId.get("role-fin-staff")).toMatchObject({ assignable: true });
    await adminRepos(store).roles.update("role-ops-staff", { status: "deactivated" });
    expect((await hrRepos(store).roles.listForAssignment()).find((role) => role.id === "role-ops-staff")).toMatchObject({ manageable: true, assignable: false });
    const finance = createMockRepositories(store, () => getDevIdentity("dev-finance"));
    expect(await finance.roles.listForAssignment()).toEqual([]);
  });

  it("marks the protected role manageable only for super admins", async () => {
    const store = createMockStore();
    const forAdmin = await adminRepos(store).roles.listForAssignment();
    expect(forAdmin.find((role) => role.id === "role-super-admin")?.manageable).toBe(false);
    expect(forAdmin.find((role) => role.id === "role-admin")?.assignable).toBe(true);
    const forSuper = await superRepos(store).roles.listForAssignment();
    expect(forSuper.find((role) => role.id === "role-super-admin")?.assignable).toBe(true);
  });

  it("does not partially apply a rejected role update", async () => {
    const store = createMockStore();
    const before = roleSnapshot(store, "role-hr");
    await expect(adminRepos(store).roles.update("role-hr", { name: "Mutated", status: "deactivated", moduleIds: ["finance"] })).rejects.toThrow();
    expect(roleSnapshot(store, "role-hr")).toEqual(before);
    expect(store.auditEvents).toHaveLength(SEED_AUDIT_EVENT_COUNT);
  });
});

describe("department role repository S3-C1 audit events", () => {
  it("records exactly one ROLE_CREATED with name, modules, and department correlation", async () => {
    const store = createMockStore();
    const role = await adminRepos(store).roles.create({ name: "Audit Desk", departmentId: "dept-hr", moduleIds: ["departments", "staff"] });
    expect(store.auditEvents).toHaveLength(1 + SEED_AUDIT_EVENT_COUNT);
    expect(store.auditEvents.at(-1)!).toMatchObject({
      actorId: "dev-admin",
      module: "organization",
      action: AUDIT_ACTIONS.ROLE_CREATED,
      entityType: "department-role",
      entityId: role.id,
      newValue: "Audit Desk [departments,staff]",
      outcome: "success",
      relatedRecordIds: ["dept-hr"],
    });
  });

  it("records module and status changes once per update with before and after values", async () => {
    const store = createMockStore();
    const role = await adminRepos(store).roles.create({ name: "Audit Scope", departmentId: "dept-hr", moduleIds: ["staff"] });
    store.auditEvents.length = 0;
    await adminRepos(store).roles.update(role.id, { moduleIds: ["departments", "staff"], status: "deactivated" });
    expect(store.auditEvents).toHaveLength(1);
    expect(store.auditEvents[0]).toMatchObject({
      action: AUDIT_ACTIONS.ROLE_UPDATED,
      entityType: "department-role",
      entityId: role.id,
      previousValue: "modules:staff;status:active",
      newValue: "modules:departments,staff;status:deactivated",
    });
  });

  it("records no event for unchanged resends or rejected updates", async () => {
    const store = createMockStore();
    const role = await adminRepos(store).roles.create({ name: "Audit Quiet", departmentId: "dept-hr", moduleIds: ["staff"] });
    store.auditEvents.length = 0;
    await adminRepos(store).roles.update(role.id, { name: "Audit Quiet", moduleIds: ["staff"] });
    await expect(adminRepos(store).roles.update("role-hr", { name: "Mutated", moduleIds: ["finance"] })).rejects.toThrow();
    await expect(adminRepos(store).roles.delete("role-hr-staff")).rejects.toThrow();
    expect(store.auditEvents).toHaveLength(0);
  });

  it("records no event for role deletion (deferred)", async () => {
    const store = createMockStore();
    const role = await adminRepos(store).roles.create({ name: "Audit Gone", departmentId: "dept-hr", moduleIds: ["staff"] });
    store.auditEvents.length = 0;
    await adminRepos(store).roles.delete(role.id);
    expect(store.auditEvents).toHaveLength(0);
  });

  it("attributes protected-role changes to the super admin actor", async () => {
    const store = createMockStore();
    await superRepos(store).roles.update("role-super-admin", { name: "Super Administrator" });
    expect(store.auditEvents).toHaveLength(1 + SEED_AUDIT_EVENT_COUNT);
    expect(store.auditEvents.at(-1)!).toMatchObject({
      actorId: "dev-super-admin",
      action: AUDIT_ACTIONS.ROLE_UPDATED,
      entityId: "role-super-admin",
      previousValue: "name:Super Admin",
      newValue: "name:Super Administrator",
    });
    expect(store.auditEvents.at(-1)!.actorRoles).toContain("super_admin");
  });
});
