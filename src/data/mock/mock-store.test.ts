import { describe, expect, it } from "vitest";
import { createMockStore, createSeedStore } from "./seed";
import { getDevIdentity, activeRoles } from "./dev-identities";
import { createMockRepositories } from "./repositories";
import { getDescendantIds } from "./scope";

describe("mock seed", () => {
  it("is deterministic", () => {
    expect(createSeedStore()).toEqual(createSeedStore());
  });

  it("has unique member and customer ids", () => {
    const store = createSeedStore();
    const memberIds = store.members.map((item) => item.id);
    const customerIds = store.customers.map((item) => item.id);
    expect(new Set(memberIds).size).toBe(memberIds.length);
    expect(new Set(customerIds).size).toBe(customerIds.length);
  });

  it("has valid genealogy parents and two branches", () => {
    const store = createSeedStore();
    const ids = new Set(store.members.map((item) => item.id));
    for (const member of store.members) {
      if (member.parentId !== null) expect(ids.has(member.parentId)).toBe(true);
    }
    const branches = new Set(store.members.map((item) => item.branchId));
    expect(branches.size).toBeGreaterThanOrEqual(2);
  });

  it("includes direct OST attachments", () => {
    const store = createSeedStore();
    expect(store.members.find((item) => item.id === "mem-ost-a2")?.parentId).toBe("mem-svd-a");
  });
});

describe("mock store lifetime", () => {
  it("creates independent stores", async () => {
    const first = createMockStore();
    const second = createMockStore();
    const identity = getDevIdentity("dev-admin");
    const firstRepo = createMockRepositories(first, () => identity).customers;
    const secondRepo = createMockRepositories(second, () => identity).customers;
    await firstRepo.createDraft({ displayName: "Draft only in first" });
    expect((await firstRepo.list()).some((item) => item.displayName === "Draft only in first")).toBe(true);
    expect((await secondRepo.list()).some((item) => item.displayName === "Draft only in first")).toBe(false);
  });
});

describe("genealogy scoping", () => {
  it("gives SVD all branch descendants", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-svd-a")).members;
    const ids = (await repo.list()).map((item) => item.id);
    expect(ids).toContain("mem-svd-a");
    expect(ids).toContain("mem-ost-a1");
    expect(ids).toContain("mem-ost-a2");
    expect(ids).not.toContain("mem-svd-b");
  });

  it("gives SSM only its downline", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-ssm-a")).members;
    const ids = (await repo.list()).map((item) => item.id);
    expect(ids).toContain("mem-ssm-a");
    expect(ids).toContain("mem-sm-a");
    expect(ids).toContain("mem-ost-a1");
    expect(ids).not.toContain("mem-svd-a");
    expect(ids).not.toContain("mem-svd-b");
  });

  it("gives SM only its direct OSTs", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-sm-a")).members;
    const ids = (await repo.list()).map((item) => item.id);
    expect(ids).toContain("mem-sm-a");
    expect(ids).toContain("mem-ost-a1");
    expect(ids).not.toContain("mem-ssm-a");
    expect(ids).not.toContain("mem-ost-a2");
  });

  it("gives OST only itself", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-ost-a1")).members;
    expect((await repo.list()).map((item) => item.id)).toEqual(["mem-ost-a1"]);
  });

  it("isolates same-branch OST records", async () => {
    const store = createMockStore();
    const first = createMockRepositories(store, () => getDevIdentity("dev-ost-a1")).members;
    const second = createMockRepositories(store, () => getDevIdentity("dev-ost-a2")).members;
    expect((await first.list()).map((item) => item.id)).not.toContain("mem-ost-a2");
    expect((await second.list()).map((item) => item.id)).not.toContain("mem-ost-a1");
  });

  it("denies inactive identities", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-inactive")).members;
    expect(await repo.list()).toEqual([]);
  });

  it("returns only approved upline summaries", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-ost-a1")).members;
    const uplines = await repo.listUplineSummaries();
    expect(uplines.map((item) => item.id)).toEqual(["mem-sm-a", "mem-ssm-a", "mem-svd-a"]);
    expect(Object.keys(uplines[0])).toEqual(["id", "displayName", "designation"]);
  });

  it("prevents genealogy cycles", () => {
    const members = createSeedStore().members;
    const cyclic = [...members, { id: "cycle", displayName: "Cycle", designation: "OST" as const, branchId: "branch-a", parentId: "cycle", status: "active" as const }];
    expect(getDescendantIds("mem-sm-a", cyclic).has("cycle")).toBe(false);
  });
});

describe("customer scoping", () => {
  it("does not leak same-branch customers to OST", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-ost-a1")).customers;
    const ids = (await repo.list()).map((item) => item.id);
    expect(ids).toContain("cust-a1");
    expect(ids).not.toContain("cust-a2");
  });

  it("allows SSM to see downline customers", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-ssm-a")).customers;
    const ids = (await repo.list()).map((item) => item.id);
    expect(ids).toContain("cust-a1");
    expect(ids).toContain("cust-a2");
  });

  it("denies unauthorized getById", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-ost-a2")).customers;
    expect(await repo.getById("cust-a1")).toBeNull();
  });
});

describe("repository operations", () => {
  it("restricts HR and Finance from broad member/customer access", async () => {
    const store = createMockStore();
    const hrMembers = createMockRepositories(store, () => getDevIdentity("dev-hr")).members;
    const financeCustomers = createMockRepositories(store, () => getDevIdentity("dev-finance")).customers;
    expect(await hrMembers.list()).toEqual([]);
    expect(await financeCustomers.list()).toEqual([]);
  });

  it("combines SM and OST roles without clearing SM scope", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-multi-role")).members;
    const ids = (await repo.list()).map((item) => item.id);
    expect(ids).toContain("mem-sm-a");
    expect(ids).toContain("mem-ost-a1");
    expect(ids).not.toContain("mem-ost-a2");
  });

  it("supports draft lifecycle", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).customers;
    const created = await repo.createDraft({ displayName: "Draft Customer" });
    expect(created.status).toBe("draft");
    const updated = await repo.updateDraft(created.id, { displayName: "Updated Draft" });
    expect(updated.displayName).toBe("Updated Draft");
    await repo.discardDraft(created.id);
    expect(await repo.getById(created.id)).toBeNull();
  });

  it("rejects non-draft mutation", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).customers;
    await expect(repo.updateDraft("cust-a1", { displayName: "Changed" })).rejects.toThrow();
  });

  it("does not reuse draft ids after discard", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).customers;
    const first = await repo.createDraft({ displayName: "First" });
    await repo.discardDraft(first.id);
    const second = await repo.createDraft({ displayName: "Second" });
    expect(second.id).not.toBe(first.id);
  });

  it("supports async delay and error simulation", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin"), { delayMs: 5, shouldFail: true, errorMessage: "simulated" }).members;
    await expect(repo.list()).rejects.toThrow("simulated");
    const fast = createMockRepositories(store, () => getDevIdentity("dev-admin"), { delayMs: 1 }).members;
    await expect(fast.list()).resolves.toBeDefined();
  });

  it("supports cancellation", async () => {
    const store = createMockStore();
    const controller = new AbortController();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin"), { delayMs: 50 }).members;
    const promise = repo.list({ signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toThrow();
  });
});

describe("roles", () => {
  it("resolves multiple active roles and ignores inactive assignments", () => {
    const identity = getDevIdentity("dev-multi-role");
    expect(activeRoles(identity)).toEqual(["sm", "ost"]);
  });

  it("denies inactive accounts", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-inactive")).customers;
    expect(await repo.list()).toEqual([]);
  });
});

describe("upline summary shape", () => {
  it("contains only approved fields", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-ost-a1")).members;
    const summary = (await repo.listUplineSummaries())[0];
    expect(Object.keys(summary)).toEqual(["id", "displayName", "designation"]);
  });
});
