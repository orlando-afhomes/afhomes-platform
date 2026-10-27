import { describe, expect, it } from "vitest";
import type { AdminModuleId } from "@/modules/identity/permissions";
import { createMockStore } from "./seed";
import { createMockRepositories } from "./repositories";
import { getDevIdentity } from "./dev-identities";

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
