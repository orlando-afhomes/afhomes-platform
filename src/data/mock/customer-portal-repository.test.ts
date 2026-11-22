import { describe, expect, it } from "vitest";
import { createMockStore } from "./seed";
import { MockCustomerPortalRepository } from "./customer-portal-repository";

function setup() {
  const store = createMockStore();
  store.promoPoints.push({
    id: "pp-1", promoId: "promo-1", membershipId: "memb-1", type: "earn", points: 11,
    sourceBillId: "rs-1", outletId: "outlet-teppanyaki", date: "2026-11-10", actorId: "dev-finance",
  });
  store.stayPoints.ledger.push({
    membershipId: "memb-1", vipNumber: "26110200001B1T04S", tranche: 1, bucket: "weekday",
    type: "release", points: 7000, date: "2026-11-01", reference: null, actorId: "system",
  });
  return { store, portal: new MockCustomerPortalRepository(store, "cust-b1") };
}

describe("customer portal repository", () => {
  it("resolves the sample customer by email and keeps wallets, activity and QR scoped to that customer", () => {
    const { portal } = setup();
    const sample = portal.findCustomerByEmail("customer.b1@afhomes.local");
    expect(sample).toMatchObject({ id: "cust-b1" });
    const overview = portal.overview();
    expect(overview.membership).toMatchObject({ id: "memb-1", cardId: "26110200001B1T04S" });
    expect(overview.promo.total.available).toBe(11);
    expect(overview.stay).toMatchObject({ released: 7000, spendableWeekday: 7000, spendableWeekend: 0 });
    expect(overview.activity.map((item) => item.label)).toEqual(expect.arrayContaining(["Promo Points earned", "Annual Welcome Gift released"]));
    expect(overview.qr).toHaveLength(1);
    expect(portal.overview().qr[0].code).toBe(overview.qr[0].code);
    expect(portal.findCustomerByEmail("missing@example.com")).toBeUndefined();
  });

  it("is bound to the signed-in customer and cannot return another customer's data", () => {
    const { store } = setup();
    const otherCustomer = new MockCustomerPortalRepository(store, "cust-a1");
    // cust-a1 has a pending membership with no VIP Number; it must never fall through to B1's card.
    expect(() => otherCustomer.overview()).toThrow(/No VIP membership/);
    const signedOut = new MockCustomerPortalRepository(store, null);
    expect(() => signedOut.overview()).toThrow(/Sign in first/);
    expect(() => signedOut.updateContact({ mobileNumber: "09170000000", email: "new@example.com", landline: "" })).toThrow(/Sign in first/);
  });

  it("updates only contact fields and validates their formats", () => {
    const { store, portal } = setup();
    const address = store.customers.find((item) => item.id === "cust-b1")!.address;
    const updated = portal.updateContact({ mobileNumber: "09170000000", email: "new@example.com", landline: "02-8123456" });
    expect(updated.customer).toMatchObject({ mobileNumber: "09170000000", email: "new@example.com", landline: "02-8123456" });
    expect(store.customers.find((item) => item.id === "cust-b1")!.address).toEqual(address);
    expect(() => portal.updateContact({ mobileNumber: "123", email: "new@example.com", landline: "" })).toThrow(/Mobile number required/);
    expect(() => portal.updateContact({ mobileNumber: "09170000000", email: "nope", landline: "" })).toThrow(/Email must be valid/);
  });
});
