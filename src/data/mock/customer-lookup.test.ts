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
  it("finds an active VIP by part of the name, VIP Number or email, case-insensitive", async () => {
    const store = createMockStore();
    const clerk = as(store, "dev-clerk");
    const [byName] = await clerk.lookupActiveVip("b one");
    expect(byName).toMatchObject({ customerName: "Customer B One", productCode: "B1", vipNumber: "26110200001B1T04S", validUntil: "2033-11-02" });
    expect(byName.totalPoints).toBe(byName.weekdayPoints + byName.weekendPoints);
    expect(await clerk.lookupActiveVip("26110200001")).toHaveLength(1);
    expect(await clerk.lookupActiveVip("CUSTOMER.B1@")).toHaveLength(1);
  });

  it("needs at least 2 characters and skips pending or expired memberships", async () => {
    const store = createMockStore();
    const finance = as(store, "dev-finance");
    expect(await finance.lookupActiveVip("C")).toEqual([]);
    // Customer A One holds only a pending membership.
    expect(await finance.lookupActiveVip("A One")).toEqual([]);
    store.memberships[0].validityEndDate = "2020-01-01";
    expect(await finance.lookupActiveVip("B One")).toEqual([]);
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
