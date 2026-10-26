import { describe, expect, it } from "vitest";
import { createMockStore } from "./seed";
import { createMockRepositories } from "./repositories";
import { getDevIdentity } from "./dev-identities";

describe("account repository", () => {
  it("lists accounts for admin", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const accounts = await repo.list();
    expect(accounts.length).toBeGreaterThan(0);
  });

  it("denies non-admin", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-hr")).accounts;
    expect(await repo.list()).toEqual([]);
  });

  it("creates pending account", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const created = await repo.create({ displayName: "New User", email: "new@afhomes.local", roleIds: ["hr"] });
    expect(created.status).toBe("pending");
    expect(created.displayName).toBe("New User");
  });

  it("rejects duplicate email", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    await expect(repo.create({ displayName: "Dup", email: "admin@afhomes.local", roleIds: ["hr"] })).rejects.toThrow();
  });

  it("assigns and revokes roles", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const account = await repo.create({ displayName: "Role User", email: "role@afhomes.local", roleIds: ["hr"] });
    const assigned = await repo.assignRole(account.id, "finance");
    expect(assigned.roleIds).toContain("finance");
    const revoked = await repo.revokeRole(account.id, "finance");
    expect(revoked.roleIds).not.toContain("finance");
  });

  it("updates status", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const account = await repo.create({ displayName: "Status User", email: "status@afhomes.local", roleIds: ["hr"] });
    const updated = await repo.updateStatus(account.id, "active");
    expect(updated.status).toBe("active");
  });

  it("rejects invalid status transition", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const account = await repo.create({ displayName: "Bad Transition", email: "bad@afhomes.local", roleIds: ["hr"] });
    await expect(repo.updateStatus(account.id, "suspended")).rejects.toThrow();
  });

  it("protects super admin account from admin", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    await expect(repo.updateStatus("acct-super-admin", "suspended")).rejects.toThrow();
    await expect(repo.assignRole("acct-super-admin", "hr")).rejects.toThrow();
  });

  it("prevents admin from assigning super_admin role", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const account = await repo.create({ displayName: "Escalation", email: "esc@afhomes.local", roleIds: ["hr"] });
    await expect(repo.assignRole(account.id, "super_admin")).rejects.toThrow();
  });
});
