import { describe, expect, it } from "vitest";
import { createMockStore } from "./seed";
import { MOCK_CUSTOMER_PASSWORD, MockCustomerPortalRepository } from "./customer-portal-repository";

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

  it("signs in only with the right email and password", () => {
    const { portal } = setup();
    expect(portal.authenticate("customer.b1@afhomes.local", MOCK_CUSTOMER_PASSWORD)).toMatchObject({ id: "cust-b1" });
    expect(portal.authenticate("customer.b1@afhomes.local", "wrong")).toBeUndefined();
    expect(portal.authenticate("missing@example.com", MOCK_CUSTOMER_PASSWORD)).toBeUndefined();
  });

  it("refuses an email another customer already uses, ignoring case and spaces", () => {
    const { store, portal } = setup();
    const other = store.customers.find((item) => item.id !== "cust-b1" && item.email)!;
    expect(() => portal.updateContact({ mobileNumber: "09171110002", email: `  ${other.email!.toUpperCase()} `, landline: "" })).toThrow("This email can't be used.");
    expect(store.customers.find((item) => item.id === "cust-b1")?.email).toBe("customer.b1@afhomes.local");
    expect(portal.updateContact({ mobileNumber: "09171110002", email: "customer.b1@afhomes.local", landline: "" }).customer.email).toBe("customer.b1@afhomes.local");
  });

  it("does not sign anyone in when two records share the email", () => {
    const { store, portal } = setup();
    const other = store.customers.find((item) => item.id === "cust-a1")!;
    other.email = "Customer.B1@afhomes.local";
    store.memberships.filter((item) => item.customerId === "cust-a1").forEach((item) => { item.cardId ??= "26110200009A1T04S"; });
    expect(portal.authenticate("customer.b1@afhomes.local", MOCK_CUSTOMER_PASSWORD)).toBeUndefined();
  });

  it("does not sign in a cardholder whose email is also on a customer without a card", () => {
    const { store, portal } = setup();
    const noCard = store.customers.find((item) => item.id === "cust-a1")!;
    store.memberships = store.memberships.filter((item) => item.customerId !== "cust-a1");
    noCard.email = "CUSTOMER.B1@afhomes.local ";
    expect(portal.authenticate("customer.b1@afhomes.local", MOCK_CUSTOMER_PASSWORD)).toBeUndefined();
    noCard.email = "someone.else@afhomes.local";
    expect(portal.authenticate("customer.b1@afhomes.local", MOCK_CUSTOMER_PASSWORD)).toMatchObject({ id: "cust-b1" });
  });

  it("lets the signed-in customer set and remove only their own profile picture", () => {
    const { store, portal } = setup();
    const image = { dataUrl: "data:image/png;base64,aGVsbG8=", fileName: "me.png" };
    expect(portal.updateProfilePhoto(image).customer.photoUrl).toBe(image.dataUrl);
    expect(store.customers.find((item) => item.id === "cust-b1")?.profilePhoto?.fileName).toBe("me.png");
    expect(store.customers.find((item) => item.id === "cust-a1")?.profilePhoto ?? null).toBeNull();
    expect(portal.updateProfilePhoto(null).customer.photoUrl).toBeNull();
  });

  it("rejects a profile picture that is not an image or is over 2MB", () => {
    const { portal } = setup();
    expect(() => portal.updateProfilePhoto({ dataUrl: "data:text/html;base64,aGk=", fileName: "x.html" })).toThrow("Unsupported image format.");
    expect(() => portal.updateProfilePhoto({ dataUrl: "javascript:alert(1)", fileName: "x" })).toThrow("Unsupported image format.");
    const big = `data:image/png;base64,${"A".repeat(Math.ceil((2 * 1024 * 1024 * 4) / 3 / 4) * 4 + 4)}`;
    expect(() => portal.updateProfilePhoto({ dataUrl: big, fileName: "big.png" })).toThrow("Image must be 2MB or smaller.");
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
