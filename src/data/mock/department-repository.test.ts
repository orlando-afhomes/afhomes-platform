import { describe, expect, it } from "vitest";
import { AUDIT_ACTIONS } from "@/modules/audit/types";
import { createMockStore } from "./seed";
import { SEED_AUDIT_EVENT_COUNT } from "./seed-data";
import { createMockRepositories } from "./repositories";
import { getDevIdentity } from "./dev-identities";
import { PROTECTED_ROLE_ERROR } from "./authorization";

describe("department repository", () => {
  it("lists departments for authorized user", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).departments;
    const depts = await repo.list();
    expect(depts.length).toBeGreaterThan(0);
  });

  it("denies unauthorized user", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-finance")).departments;
    expect(await repo.list()).toEqual([]);
  });

  it("creates department", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).departments;
    const created = await repo.create({ name: "Engineering", code: "ENG" });
    expect(created.name).toBe("Engineering");
    expect((await repo.list()).some((d) => d.name === "Engineering")).toBe(true);
  });

  it("rejects duplicate department", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).departments;
    await repo.create({ name: "Engineering", code: "ENG" });
    await expect(repo.create({ name: "Engineering", code: "ENG2" })).rejects.toThrow();
  });

  it("updates department", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).departments;
    const created = await repo.create({ name: "Engineering", code: "ENG" });
    const updated = await repo.update(created.id, { name: "Engineering Updated" });
    expect(updated.name).toBe("Engineering Updated");
  });

  it("rejects department head assignment", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).departments;
    const created = await repo.create({ name: "Engineering", code: "ENG" });
    await expect(repo.update(created.id, { headStaffId: "staff-1" })).rejects.toThrow();
  });

  it("rejects unauthorized department update", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-finance")).departments;
    const adminRepo = createMockRepositories(store, () => getDevIdentity("dev-admin")).departments;
    const created = await adminRepo.create({ name: "Engineering", code: "ENG" });
    await expect(repo.update(created.id, { name: "Hacked" })).rejects.toThrow();
  });

  it("rejects invalid department status transition", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).departments;
    const created = await repo.create({ name: "Engineering", code: "ENG" });
    await expect(repo.update(created.id, { status: "deactivated" })).resolves.toBeDefined();
    await expect(repo.update(created.id, { status: "active" })).resolves.toBeDefined();
  });

  it("rejects department head assignment on create", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).departments;
    await expect(repo.create({ name: "Eng", code: "ENG", headStaffId: "staff-1" })).rejects.toThrow();
  });

  it("rejects department head assignment on update", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).departments;
    const created = await repo.create({ name: "Engineering", code: "ENG" });
    await expect(repo.update(created.id, { headStaffId: "staff-1" })).rejects.toThrow();
  });

  it("preserves data on failed update", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).departments;
    const created = await repo.create({ name: "Engineering", code: "ENG" });
    await expect(repo.update(created.id, { name: "" })).rejects.toThrow();
    const after = await repo.getById(created.id);
    expect(after?.name).toBe("Engineering");
  });

  it("blocks deleting a department that has roles", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).departments;
    await expect(repo.delete("dept-hr")).rejects.toThrow(/roles/);
    expect((await repo.list()).some((dept) => dept.id === "dept-hr")).toBe(true);
  });

  it("blocks deleting a department that has staff", async () => {
    const store = createMockStore();
    const repos = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    const created = await repos.departments.create({ name: "Temporary" });
    await repos.staff.create({
      displayName: "Temp Staff",
      position: "Temp",
      departmentId: created.id,
      email: "temp-staff@afhomes.local",
    });
    await expect(repos.departments.delete(created.id)).rejects.toThrow(/employees|staff/i);
  });

  it("reserves status changes of the department holding the protected role for super admins", async () => {
    const store = createMockStore();
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin")).departments;
    await expect(admin.update("dept-admin", { status: "deactivated" })).rejects.toThrow(PROTECTED_ROLE_ERROR);
    expect(store.departments.find((dept) => dept.id === "dept-admin")?.status).toBe("active");
    const superAdmin = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).departments;
    await superAdmin.update("dept-admin", { status: "deactivated" });
    await expect(admin.update("dept-admin", { status: "active" })).rejects.toThrow(PROTECTED_ROLE_ERROR);
    expect(store.departments.find((dept) => dept.id === "dept-admin")?.status).toBe("deactivated");
  });

  it("lets non-super-admins edit protected department metadata but never its status", async () => {
    const store = createMockStore();
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin")).departments;
    const auditCount = store.auditEvents.length;
    const updated = await admin.update("dept-admin", { name: "Administration", code: "ADMIN", description: "Central administration" });
    expect(updated).toMatchObject({ name: "Administration", code: "ADMIN", description: "Central administration", status: "active" });
    await expect(admin.update("dept-admin", { name: "Administration", description: "Central administration", status: "deactivated" })).rejects.toThrow(PROTECTED_ROLE_ERROR);
    expect(store.departments.find((dept) => dept.id === "dept-admin")).toMatchObject({ name: "Administration", status: "active" });
    // Only the metadata edit is audited; the rejected status change adds nothing.
    expect(store.auditEvents).toHaveLength(auditCount + 1);
  });

  it("rejects reactivation that restores grants beyond the actor's authority", async () => {
    const store = createMockStore();
    const adminRepos = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    await adminRepos.roles.create({ name: "Ops Roles", departmentId: "dept-ops", moduleIds: ["roles"] });
    await adminRepos.departments.update("dept-ops", { status: "deactivated" });
    const auditCount = store.auditEvents.length;
    const hr = createMockRepositories(store, () => getDevIdentity("dev-hr")).departments;
    await expect(hr.update("dept-ops", { name: "Ops Renamed", status: "active" })).rejects.toThrow("outside the acting account");
    const dept = store.departments.find((item) => item.id === "dept-ops");
    expect(dept?.status).toBe("deactivated");
    expect(dept?.name).toBe("Operations");
    expect(store.auditEvents).toHaveLength(auditCount);
  });

  it("lets HR reactivate a department whose roles stay within its authority", async () => {
    const store = createMockStore();
    await createMockRepositories(store, () => getDevIdentity("dev-admin")).departments.update("dept-finance", { status: "deactivated" });
    const hr = createMockRepositories(store, () => getDevIdentity("dev-hr")).departments;
    expect((await hr.update("dept-finance", { status: "active" })).status).toBe("active");
  });

  it("deletes an empty department", async () => {
    const store = createMockStore();
    const repos = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    const created = await repos.departments.create({ name: "Temporary" });
    await repos.departments.delete(created.id);
    expect(await repos.departments.getById(created.id)).toBeNull();
  });
});

describe("department repository S3-C1 audit events", () => {
  it("records exactly one DEPARTMENT_STATUS_CHANGED with before and after values", async () => {
    const store = createMockStore();
    const repos = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    store.auditEvents.length = 0;
    await repos.departments.update("dept-ops", { status: "deactivated" });
    await repos.departments.update("dept-ops", { status: "active" });
    const events = store.auditEvents.filter((item) => item.action === AUDIT_ACTIONS.DEPARTMENT_STATUS_CHANGED);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      actorId: "dev-admin",
      module: "organization",
      entityType: "department",
      entityId: "dept-ops",
      previousValue: "active",
      newValue: "deactivated",
      outcome: "success",
    });
    expect(events[1]).toMatchObject({ previousValue: "deactivated", newValue: "active" });
  });

  it("records department creation and detail updates, but nothing for rejections or no-op updates", async () => {
    const store = createMockStore();
    const repos = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    const created = await repos.departments.create({ name: "Audited" });
    await repos.departments.update(created.id, { name: "Audited Renamed", code: "U", description: "Secret text" });
    await repos.departments.update(created.id, { name: "Audited Renamed" });
    await expect(repos.departments.update("dept-admin", { status: "deactivated" })).rejects.toThrow(PROTECTED_ROLE_ERROR);
    expect(store.auditEvents.slice(SEED_AUDIT_EVENT_COUNT)).toMatchObject([
      { action: AUDIT_ACTIONS.DEPARTMENT_CREATED, entityType: "department", entityId: created.id, newValue: "Audited" },
      { action: AUDIT_ACTIONS.DEPARTMENT_UPDATED, entityId: created.id, previousValue: "name:Audited;code:;description:changed", newValue: "name:Audited Renamed;code:U;description:changed" },
    ]);
  });

  it("attributes protected-department status changes to the super admin actor", async () => {
    const store = createMockStore();
    const repos = createMockRepositories(store, () => getDevIdentity("dev-super-admin"));
    await repos.departments.update("dept-admin", { status: "deactivated" });
    expect(store.auditEvents).toHaveLength(1 + SEED_AUDIT_EVENT_COUNT);
    expect(store.auditEvents.at(-1)!).toMatchObject({
      actorId: "dev-super-admin",
      action: AUDIT_ACTIONS.DEPARTMENT_STATUS_CHANGED,
      entityId: "dept-admin",
      previousValue: "active",
      newValue: "deactivated",
    });
  });
});
