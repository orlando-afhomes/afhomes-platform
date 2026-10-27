import { describe, expect, it } from "vitest";
import { createMockStore } from "./seed";
import { createMockRepositories } from "./repositories";
import { getDevIdentity } from "./dev-identities";

describe("staff repository", () => {
  it("lists staff for authorized user", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const staff = await repo.list();
    expect(staff.length).toBeGreaterThan(0);
  });

  it("denies unauthorized user", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-finance")).staff;
    expect(await repo.list()).toEqual([]);
  });

  it("creates staff", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await repo.create({ displayName: "New Staff", position: "Analyst", departmentId: null, email: "new@afhomes.local" });
    expect(created.displayName).toBe("New Staff");
    expect((await repo.list()).some((s) => s.displayName === "New Staff")).toBe(true);
  });

  it("rejects missing name", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    await expect(repo.create({ displayName: "", position: "Analyst", departmentId: null, email: "x@afhomes.local" })).rejects.toThrow();
  });

  it("updates staff", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await repo.create({ displayName: "Staff", position: "Analyst", departmentId: null, email: "staff@afhomes.local" });
    const updated = await repo.update(created.id, { position: "Senior Analyst" });
    expect(updated.position).toBe("Senior Analyst");
  });

  it("rejects employment status changes", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await repo.create({ displayName: "Staff", position: "Analyst", departmentId: null, email: "staff2@afhomes.local" });
    await expect(repo.update(created.id, { status: "inactive" })).rejects.toThrow();
  });

  it("rejects unauthorized staff update", async () => {
    const store = createMockStore();
    const adminRepo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await adminRepo.create({ displayName: "Staff", position: "Analyst", departmentId: null, email: "staff3@afhomes.local" });
    const financeRepo = createMockRepositories(store, () => getDevIdentity("dev-finance")).staff;
    await expect(financeRepo.update(created.id, { position: "Hacked" })).rejects.toThrow();
  });

  it("preserves account separation on staff update", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await repo.create({ displayName: "Staff", position: "Analyst", departmentId: null, email: "staff4@afhomes.local" });
    const updated = await repo.update(created.id, { displayName: "Staff Updated" });
    expect(updated.displayName).toBe("Staff Updated");
  });

  it("rejects invalid department reference on create", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    await expect(repo.create({ displayName: "Staff", position: "Analyst", departmentId: "dept-unknown", email: "staff5@afhomes.local" })).rejects.toThrow();
  });

  it("rejects invalid department reference on update", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await repo.create({ displayName: "Staff", position: "Analyst", departmentId: null, email: "staff6@afhomes.local" });
    await expect(repo.update(created.id, { departmentId: "dept-unknown" })).rejects.toThrow();
  });

  it("rejects employment status mutation", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await repo.create({ displayName: "Staff", position: "Analyst", departmentId: null, email: "staff7@afhomes.local" });
    await expect(repo.update(created.id, { status: "inactive" })).rejects.toThrow();
  });

  it("preserves data on failed update", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await repo.create({ displayName: "Staff", position: "Analyst", departmentId: null, email: "staff8@afhomes.local" });
    await expect(repo.update(created.id, { displayName: "" })).rejects.toThrow();
    const after = await repo.getById(created.id);
    expect(after?.displayName).toBe("Staff");
  });
  it("creates staff with a compatible department role", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await repo.create({
      displayName: "Role Staff",
      position: "Analyst",
      departmentId: "dept-hr",
      departmentRoleId: "role-hr-staff",
      email: "rolestaff@afhomes.local",
    });
    expect(created.departmentRoleId).toBe("role-hr-staff");
  });

  it("rejects a role from another department", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    await expect(
      repo.create({
        displayName: "Mismatch",
        position: "Analyst",
        departmentId: "dept-hr",
        departmentRoleId: "role-fin-staff",
        email: "mismatch@afhomes.local",
      }),
    ).rejects.toThrow(/department/);
  });

  it("rejects a deactivated role on assignment", async () => {
    const store = createMockStore();
    const repos = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    await repos.roles.update("role-hr-staff", { status: "deactivated" });
    await expect(
      repos.staff.create({
        displayName: "Deactivated Role",
        position: "Analyst",
        departmentId: "dept-hr",
        departmentRoleId: "role-hr-staff",
        email: "inactive-role@afhomes.local",
      }),
    ).rejects.toThrow(/active/);
  });

  it("clears an incompatible role on department transfer", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await repo.create({
      displayName: "Transfer",
      position: "Analyst",
      departmentId: "dept-hr",
      departmentRoleId: "role-hr-staff",
      email: "transfer@afhomes.local",
    });
    const updated = await repo.update(created.id, { departmentId: "dept-finance" });
    expect(updated.departmentId).toBe("dept-finance");
    expect(updated.departmentRoleId).toBeNull();
  });

  it("accepts a compatible role on department transfer", async () => {
    const store = createMockStore();
    const repos = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    const created = await repos.staff.create({
      displayName: "Transfer Two",
      position: "Analyst",
      departmentId: "dept-hr",
      departmentRoleId: "role-hr-staff",
      email: "transfer2@afhomes.local",
    });
    const finRole = await repos.roles.create({ name: "Finance Staff Two", departmentId: "dept-finance", moduleIds: ["departments"] });
    const updated = await repos.staff.update(created.id, { departmentId: "dept-finance", departmentRoleId: finRole.id });
    expect(updated.departmentId).toBe("dept-finance");
    expect(updated.departmentRoleId).toBe(finRole.id);
  });

  it("stores staff department role ids in seed data", () => {
    const store = createMockStore();
    expect(store.staff.find((item) => item.id === "staff-1")?.departmentRoleId).toBe("role-hr-staff");
  });
});
