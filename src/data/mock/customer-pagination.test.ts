import { describe, expect, it } from "vitest";
import { createMockStore } from "./seed";
import { createMockRepositories } from "./repositories";
import { getDevIdentity } from "./dev-identities";

describe("customer cursor pages", () => {
  it("traverses the same visible records once in stable ID order", async () => {
    const store = createMockStore();
    const repository = createMockRepositories(store, () => getDevIdentity("dev-admin")).customers;
    const expected = (await repository.list()).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    const ids: string[] = [];
    let afterId: string | undefined;
    do {
      const page = await repository.listPage({ limit: 1, afterId });
      expect(page.total).toBe(expected.length);
      ids.push(...page.items.map((item) => item.id));
      afterId = page.nextCursor ?? undefined;
    } while (afterId);
    expect(ids).toEqual(expected.map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("counts and pages only the active identity's visible projections", async () => {
    const store = createMockStore();
    const repository = createMockRepositories(store, () => getDevIdentity("dev-ost-a1")).customers;
    const visible = await repository.list();
    const page = await repository.listPage({ limit: 10 });
    expect(page.total).toBe(visible.length);
    expect(page.items).toEqual(visible.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const inactive = createMockRepositories(store, () => ({ ...getDevIdentity("dev-admin"), status: "inactive" })).customers;
    expect(await inactive.listPage({ limit: 10 })).toEqual({ items: [], total: 0, nextCursor: null });
  });

  it("rejects invalid page sizes instead of allowing unbounded requests", async () => {
    const repository = createMockRepositories(createMockStore(), () => getDevIdentity("dev-admin")).customers;
    for (const limit of [0, -1, 1.5, 101]) await expect(repository.listPage({ limit })).rejects.toThrow(/page size/i);
  });

  it("continues after a deleted cursor record without repeating prior records", async () => {
    const store = createMockStore();
    const repository = createMockRepositories(store, () => getDevIdentity("dev-admin")).customers;
    const first = await repository.listPage({ limit: 1 });
    const cursor = first.items[0].id;
    store.customers = store.customers.filter((item) => item.id !== cursor);
    const next = await repository.listPage({ limit: 100, afterId: cursor });
    expect(next.items.every((item) => item.id > cursor)).toBe(true);
    expect(next.total).toBe(first.total - 1);
  });
});
