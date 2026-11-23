import { describe, expect, it } from "vitest";
import { createMockStore } from "./seed";
import { createMockRepositories } from "./repositories";
import { getDevIdentity } from "./dev-identities";
import { CUSTOMER_LOOKUP_MAX_RESULTS } from "@/data/contracts/membership-repository";
import type { Membership } from "@/modules/membership/types";

function as(store: ReturnType<typeof createMockStore>, id: string) {
  return createMockRepositories(store, () => getDevIdentity(id)).memberships;
}

describe("staff Customer Look Up (UI21)", () => {
  it("lets GSD verify an active member by name", async () => {
    const store = createMockStore();
    const member = store.memberships.find((item) => item.id === "memb-1")!;
    const customer = store.customers.find((item) => item.id === member.customerId)!;
    await expect(as(store, "dev-gsd").lookupActiveVip(customer.displayName))
      .resolves.toContainEqual(expect.objectContaining({ membershipId: member.id, vipNumber: member.cardId }));
  });

  it("finds an active VIP by part of the name, VIP Number or email, case-insensitive", async () => {
    const store = createMockStore();
    const clerk = as(store, "dev-clerk");
    // memb-1 is an active, carded membership; its VIP Number and dates are relative to today.
    const membership = store.memberships.find((item) => item.id === "memb-1")!;
    const customer = store.customers.find((item) => item.id === membership.customerId)!;
    const [byName] = await clerk.lookupActiveVip(customer.displayName.slice(2, -2).toUpperCase());
    expect(byName).toMatchObject({ customerName: customer.displayName, productCode: "B1", vipNumber: membership.cardId, validUntil: membership.validityEndDate });
    expect(byName.totalPoints).toBe(byName.weekdayPoints + byName.weekendPoints);
    expect(await clerk.lookupActiveVip(membership.cardId!.slice(0, 11))).toHaveLength(1);
    expect(await clerk.lookupActiveVip(customer.email!.split("@")[0].toUpperCase() + "@")).toHaveLength(1);
  });

  it("needs at least 2 characters and skips pending or expired memberships", async () => {
    const store = createMockStore();
    const finance = as(store, "dev-finance");
    expect(await finance.lookupActiveVip("C")).toEqual([]);
    // cust-a1 holds only a pending membership.
    const pending = store.customers.find((item) => item.id === "cust-a1")!;
    expect(store.memberships.filter((item) => item.customerId === pending.id).map((item) => item.status)).toEqual(["pending"]);
    expect(await finance.lookupActiveVip(pending.displayName)).toEqual([]);
    const expiring = store.memberships[0];
    const holder = store.customers.find((item) => item.id === expiring.customerId)!;
    expect(await finance.lookupActiveVip(holder.displayName)).toHaveLength(1);
    expiring.validityEndDate = "2020-01-01";
    expect(await finance.lookupActiveVip(holder.displayName)).toEqual([]);
  });

  it("caps results at 50 and lists names that start with the term first", async () => {
    const store = createMockStore();
    const base = store.memberships[0];
    for (let i = 0; i < 60; i += 1) {
      const customerId = `cust-extra-${i}`;
      store.customers.push({ ...store.customers.find((c) => c.id === base.customerId)!, id: customerId, displayName: `Zed Vip ${i}` });
      store.memberships.push({ ...base, id: `memb-extra-${i}`, customerId } satisfies Membership);
    }
    store.customers.push({ ...store.customers.find((c) => c.id === base.customerId)!, id: "cust-vip-first", displayName: "Vip First" });
    store.memberships.push({ ...base, id: "memb-vip-first", customerId: "cust-vip-first" });
    const results = await as(store, "dev-admin").lookupActiveVip("vip");
    expect(results).toHaveLength(CUSTOMER_LOOKUP_MAX_RESULTS);
    expect(results[0].customerName).toBe("Vip First");
  });

  it("refuses sellers and inactive accounts", async () => {
    const store = createMockStore();
    await expect(as(store, "dev-ost-a1").lookupActiveVip("B One")).rejects.toThrow("cannot look up customers");
    await expect(as(store, "dev-svd-a").lookupActiveVip("B One")).rejects.toThrow("cannot look up customers");
    await expect(as(store, "dev-inactive").lookupActiveVip("B One")).rejects.toThrow();
  });
});
