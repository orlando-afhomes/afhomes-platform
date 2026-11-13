import { describe, expect, it } from "vitest";
import { createMockStore } from "./seed";
import { createMockRepositories } from "./repositories";
import { getDevIdentity } from "./dev-identities";

function as(store: ReturnType<typeof createMockStore>, id: string) {
  return createMockRepositories(store, () => getDevIdentity(id));
}

/** A fresh Draft contract for cust-a4 (seller mem-ost-a2). */
async function prepareContract(store: ReturnType<typeof createMockStore>) {
  const admin = as(store, "dev-admin");
  await admin.contracts.cancel("ctr-4", "Re-prepare for an accreditation standing test");
  return admin.contracts.prepare({ customerId: "cust-a4", schemeId: "scheme-installment-4m", customerAccepted: true });
}

describe("sale accreditation standing (doc 03 section 9, OCT R37)", () => {
  it("records a reminder on the sale for an expired seller and referrer, and never blocks the sale", async () => {
    const store = createMockStore();
    store.customers.find((c) => c.id === "cust-a4")!.referrerMemberId = "mem-ost-a1";
    for (const id of ["accr-seed-5", "accr-seed-4"]) Object.assign(store.accreditations.find((r) => r.id === id)!, { adminStatus: "active", expiryDate: "2026-10-01" });
    const contract = await prepareContract(store);
    await as(store, "dev-admin").contracts.submit(contract.id);
    const sale = store.sales.find((item) => item.contractId === contract.id)!;
    expect(sale.expiryReminders).toEqual([
      { role: "seller", memberId: "mem-ost-a2", expiryDate: "2026-10-01", reminder: expect.stringMatching(/^(expired_grace|closed_not_renewed)$/) },
      { role: "referrer", memberId: "mem-ost-a1", expiryDate: "2026-10-01", reminder: expect.stringMatching(/^(expired_grace|closed_not_renewed)$/) },
    ]);
    expect(sale.status).toBe("pending");
  });

  it("records no reminder for a valid seller", async () => {
    const store = createMockStore();
    Object.assign(store.accreditations.find((r) => r.id === "accr-seed-5")!, { adminStatus: "active", expiryDate: "2099-12-31" });
    const contract = await prepareContract(store);
    await as(store, "dev-admin").contracts.submit(contract.id);
    expect(store.sales.find((item) => item.contractId === contract.id)!.expiryReminders ?? []).toEqual([]);
  });

  it("blocks a new sale for a suspended seller, leaving the contract a Draft", async () => {
    const store = createMockStore();
    Object.assign(store.accreditations.find((r) => r.id === "accr-seed-5")!, { adminStatus: "suspended", suspensionEffectiveDate: "2020-01-01" });
    const contract = await prepareContract(store);
    await expect(as(store, "dev-admin").contracts.submit(contract.id)).rejects.toThrow(/suspended/i);
    expect(store.contracts.find((c) => c.id === contract.id)!.status).toBe("draft");
    expect(store.sales.some((item) => item.contractId === contract.id)).toBe(false);
  });

  it("blocks a new sale after the seller's end date, but not a suspension that starts later", async () => {
    const store = createMockStore();
    const record = store.accreditations.find((r) => r.id === "accr-seed-5")!;
    Object.assign(record, { adminStatus: "suspended", suspensionEffectiveDate: "2999-01-01", expiryDate: "2999-12-31" });
    const contract = await prepareContract(store);
    await as(store, "dev-admin").contracts.submit(contract.id);
    expect(store.sales.some((item) => item.contractId === contract.id)).toBe(true);

    const second = createMockStore();
    Object.assign(second.accreditations.find((r) => r.id === "accr-seed-5")!, { adminStatus: "active", endDate: "2020-01-01" });
    const blocked = await prepareContract(second);
    await expect(as(second, "dev-admin").contracts.submit(blocked.id)).rejects.toThrow(/resigned|terminated|left/i);
  });
});
