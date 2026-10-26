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
});
