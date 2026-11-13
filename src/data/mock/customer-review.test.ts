import { describe, expect, it } from "vitest";
import { CustomerValidationError } from "@/data/contracts/customer-repository";
import type { CustomerDraftInput } from "@/modules/customers/types";
import { getDevIdentity } from "./dev-identities";
import { createMockRepositories } from "./repositories";
import { createMockStore } from "./seed";

function as(store: ReturnType<typeof createMockStore>, id: string) {
  return createMockRepositories(store, () => getDevIdentity(id));
}

function readyInput(overrides: Partial<CustomerDraftInput> = {}): CustomerDraftInput {
  return {
    displayName: "Ida Test",
    firstName: "Ida",
    lastName: "Test",
    dateOfBirth: "1990-01-01",
    gender: "Female",
    civilStatus: "Single",
    mobileNumber: "09171119999",
    address: { street: "1 Test Street", province: "Cebu", city: "Lapu-Lapu City", barangay: "Pajo", postalCode: "6015" },
    vipPlan: "S1",
    paymentSchemeId: "scheme-installment-4m",
    contractClassification: "S",
    consentDataPrivacy: true,
    idReceivedCertified: true,
    ...overrides,
  };
}

/** A seller starts a draft; the Clerk completes and submits it. */
async function submittedBySeller(store: ReturnType<typeof createMockStore>, sellerIdentity = "dev-ost-a1", overrides: Partial<CustomerDraftInput> = {}) {
  const draft = await as(store, sellerIdentity).customers.createDraft({ displayName: "Ida Test" });
  await as(store, "dev-clerk").customers.submit(draft.id, readyInput(overrides));
  return draft.id;
}

describe("seller draft, Clerk submit, Administrator review (doc 04 sections 5 and 10)", () => {
  it("lets sellers and the Clerk start drafts but only office users submit", async () => {
    const store = createMockStore();
    for (const identity of ["dev-ost-a1", "dev-sm-a", "dev-svd-a", "dev-clerk"]) {
      await expect(as(store, identity).customers.createDraft({ displayName: "X" })).resolves.toMatchObject({ status: "draft" });
    }
    const ostDraft = await as(store, "dev-ost-a1").customers.createDraft({ displayName: "Own" });
    await expect(as(store, "dev-ost-a1").customers.submit(ostDraft.id, readyInput())).rejects.toThrow(/not allowed/);
    await expect(as(store, "dev-sm-a").customers.submit(ostDraft.id, readyInput())).rejects.toThrow();
    await expect(as(store, "dev-clerk").customers.submit(ostDraft.id, { displayName: "Own" })).rejects.toBeInstanceOf(CustomerValidationError);
    await expect(as(store, "dev-clerk").customers.submit(ostDraft.id, readyInput())).resolves.toMatchObject({ status: "submitted", ownerMemberId: "mem-ost-a1" });
  });

  it("lets a seller edit only their own draft and never a submitted record", async () => {
    const store = createMockStore();
    const own = await as(store, "dev-ost-a1").customers.createDraft({ displayName: "Own" });
    await expect(as(store, "dev-ost-a1").customers.updateDraft(own.id, { displayName: "Own Edited", firstName: "Own", lastName: "Edited" })).resolves.toMatchObject({ displayName: "Own Edited" });
    await expect(as(store, "dev-ost-b1").customers.updateDraft(own.id, { displayName: "Hijack" })).rejects.toThrow();
    await as(store, "dev-clerk").customers.submit(own.id, readyInput());
    await expect(as(store, "dev-ost-a1").customers.updateDraft(own.id, { displayName: "Late" })).rejects.toThrow();
  });

  it("keeps an OST to its own records", async () => {
    const store = createMockStore();
    const id = await submittedBySeller(store);
    expect(await as(store, "dev-ost-a2").customers.getById(id)).toBeNull();
    expect(await as(store, "dev-ost-a1").customers.getById(id)).not.toBeNull();
  });

  it("approves only for the Administrator or Super Administrator and audits the change", async () => {
    const store = createMockStore();
    const id = await submittedBySeller(store);
    for (const identity of ["dev-clerk", "dev-ost-a1", "dev-finance"]) await expect(as(store, identity).customers.approve(id)).rejects.toThrow(/not allowed/);
    const approved = await as(store, "dev-admin").customers.approve(id);
    expect(approved).toMatchObject({ status: "approved", approvedAt: expect.any(String) });
    expect(approved.statusHistory?.map((entry) => entry.status)).toEqual(["submitted", "approved"]);
    expect(store.auditEvents.some((event) => event.action === "CUSTOMER_APPROVED" && event.entityId === id)).toBe(true);
    await expect(as(store, "dev-admin").customers.approve(id)).rejects.toThrow(/submitted/);
  });

  it("refuses approval without a closing seller", async () => {
    const store = createMockStore();
    const draft = await as(store, "dev-clerk").customers.createDraft({ displayName: "Walk-in" });
    await as(store, "dev-clerk").customers.submit(draft.id, readyInput());
    await expect(as(store, "dev-admin").customers.approve(draft.id)).rejects.toMatchObject({ errors: { ownerMemberId: expect.any(String) } });
    await as(store, "dev-clerk").customers.correct(draft.id, readyInput({ ownerMemberId: "mem-ost-a1" }), "Add the closing seller");
    await expect(as(store, "dev-admin").customers.approve(draft.id)).resolves.toMatchObject({ status: "approved", ownerMemberId: "mem-ost-a1" });
  });

  it("requires a dated referral reference when the closing seller is also the referrer", async () => {
    const store = createMockStore();
    const id = await submittedBySeller(store, "dev-ost-a1", { referrerMemberId: "mem-ost-a1", recommenderMemberId: "mem-ost-a1" });
    await expect(as(store, "dev-admin").customers.approve(id)).rejects.toMatchObject({ errors: { referralReference: expect.any(String) } });
    await as(store, "dev-clerk").customers.correct(id, readyInput({ referralReference: "FB lead 2026-10-30" }), "Record referral");
    await expect(as(store, "dev-admin").customers.approve(id)).resolves.toMatchObject({ status: "approved", referralReference: "FB lead 2026-10-30" });
  });

  it("allows a different referrer than the closing seller, IST or OST", async () => {
    const store = createMockStore();
    const draft = await as(store, "dev-svd-a").customers.createDraft({ displayName: "X", referrerMemberId: "mem-ost-a1", recommenderMemberId: "mem-ost-a1" });
    expect(draft).toMatchObject({ ownerMemberId: "mem-svd-a", referrerMemberId: "mem-ost-a1" });
    await expect(as(store, "dev-clerk").customers.updateDraft(draft.id, { displayName: "X", referrerMemberId: "mem-ost-a2" })).resolves.toMatchObject({ referrerMemberId: "mem-ost-a2" });
  });

  it("refuses approval for a suspended closing seller but not an expired one", async () => {
    const store = createMockStore();
    const id = await submittedBySeller(store);
    const record = store.accreditations.find((item) => item.memberId === "mem-ost-a1")!;
    record.adminStatus = "suspended";
    record.suspensionEffectiveDate = "2026-01-01";
    await expect(as(store, "dev-admin").customers.approve(id)).rejects.toMatchObject({ errors: { ownerMemberId: expect.stringMatching(/suspended/i) } });
    record.adminStatus = "active";
    record.suspensionEffectiveDate = null;
    record.expiryDate = "2026-01-01";
    await expect(as(store, "dev-admin").customers.approve(id)).resolves.toMatchObject({ status: "approved" });
  });

  it("sends back and rejects with a required reason, deleting nothing", async () => {
    const store = createMockStore();
    const id = await submittedBySeller(store);
    await expect(as(store, "dev-admin").customers.sendBack(id, "  ")).rejects.toThrow(/reason/i);
    await expect(as(store, "dev-clerk").customers.sendBack(id, "Fix address")).rejects.toThrow(/not allowed/);
    const back = await as(store, "dev-admin").customers.sendBack(id, "Fix address");
    expect(back).toMatchObject({ status: "sent_back", reviewReason: "Fix address" });
    // The Clerk edits and resubmits; the Customer ID is kept.
    const numberBefore = back.customerNumber;
    await as(store, "dev-clerk").customers.updateDraft(id, readyInput({ email: "ida@example.test" }));
    const resubmitted = await as(store, "dev-clerk").customers.submit(id, readyInput({ email: "ida@example.test" }));
    expect(resubmitted).toMatchObject({ status: "submitted", customerNumber: numberBefore });
    await expect(as(store, "dev-super-admin").customers.reject(id, "")).rejects.toThrow(/reason/i);
    const rejected = await as(store, "dev-super-admin").customers.reject(id, "Duplicate of an existing person");
    expect(rejected).toMatchObject({ status: "rejected", reviewReason: "Duplicate of an existing person" });
    expect(rejected.statusHistory?.map((entry) => entry.status)).toEqual(["submitted", "sent_back", "submitted", "rejected"]);
    expect(store.customers.some((item) => item.id === id)).toBe(true);
    await expect(as(store, "dev-admin").customers.approve(id)).rejects.toThrow();
    await expect(as(store, "dev-clerk").customers.submit(id, readyInput())).rejects.toThrow();
    const actions = store.auditEvents.filter((event) => event.entityId === id).map((event) => event.action);
    expect(actions).toEqual(expect.arrayContaining(["CUSTOMER_SENT_BACK", "CUSTOMER_REJECTED"]));
  });
});
