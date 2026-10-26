import { describe, expect, it } from "vitest";
import { createMockStore } from "./seed";
import { createMockRepositories } from "./repositories";
import { getDevIdentity } from "./dev-identities";

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
});
