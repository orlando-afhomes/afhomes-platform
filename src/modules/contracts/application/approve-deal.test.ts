import { describe, expect, it } from "vitest";
import { getDevIdentity } from "@/data/mock/dev-identities";
import { createMockRepositories } from "@/data/mock/repositories";
import { createMockStore } from "@/data/mock/seed";
import { registerCustomer } from "@/modules/customers/application/register-customer";
import type { CustomerDraftInput } from "@/modules/customers/types";
import { approveDeal } from "./approve-deal";

type Store = ReturnType<typeof createMockStore>;

const DEAL_EVENTS = ["CUSTOMER_APPROVED", "SALE_APPROVED", "CONTRACT_RA_RECORDED", "VIP_NUMBER_ISSUED", "CONTRACT_FINALIZED"];

const customer: CustomerDraftInput = {
  displayName: "Deal Test",
  firstName: "Deal",
  lastName: "Test",
  dateOfBirth: "1990-01-01",
  gender: "Female",
  civilStatus: "Single",
  mobileNumber: "09171118888",
  address: { street: "1 Test Street", province: "Cebu", city: "Lapu-Lapu City", barangay: "Pajo", postalCode: "6015" },
  vipPlan: "S1",
  paymentSchemeId: "scheme-installment-4m",
  contractClassification: "S",
  consentDataPrivacy: true,
  idReceivedCertified: true,
  ownerMemberId: "mem-ost-a1",
};

async function registeredDeal(options: { rate?: boolean; classification?: "S" | "N" } = {}) {
  const store = createMockStore();
  const repositories = createMockRepositories(store, () => getDevIdentity("dev-admin"));
  const classification = options.classification ?? "S";
  const result = await registerCustomer(repositories, {
    customer: { ...customer, contractClassification: classification },
    contract: { schemeId: "scheme-installment-4m", customerAccepted: true, classification },
  });
  if (result.status !== "contract-prepared" || result.submitError) throw new Error(`Unexpected registration outcome: ${result.status}`);
  if (options.rate !== false) store.commissionRateSettings.push({ memberId: "mem-ost-a1", product: "VIP", role: "DSC", rateBp: 500, standardRateBp: null });
  return { store, repositories, customerId: result.customerId, contractId: result.contractId };
}

/** Deal-step audit actions recorded on this deal's customer, sale and contract, in order. */
function dealEvents(store: Store, customerId: string, contractId: string) {
  const saleId = store.sales.find((item) => item.contractId === contractId)?.id;
  const ids = new Set([customerId, contractId, saleId]);
  return store.auditEvents.filter((event) => DEAL_EVENTS.includes(event.action) && ids.has(event.entityId)).map((event) => event.action);
}

describe("approveDeal", () => {
  it("approves the customer and the sale, issues the VIP Number and finalizes, with one audit entry per step", async () => {
    const { store, repositories, customerId, contractId } = await registeredDeal();
    const outcome = await approveDeal(repositories, contractId);

    expect(outcome).toMatchObject({ customerApproved: true, saleApproved: true, vipNumberIssued: true, finalized: true, finalizeHeld: [] });
    expect(outcome.contract).toMatchObject({ status: "finalized", vipNumber: expect.any(String) });
    expect(store.customers.find((item) => item.id === customerId)?.status).toBe("approved");
    expect(store.sales.find((item) => item.contractId === contractId)?.approval).toBeTruthy();
    expect(dealEvents(store, customerId, contractId)).toEqual(DEAL_EVENTS);
  });

  it("changes nothing when a commission rate is missing", async () => {
    const { store, repositories, customerId, contractId } = await registeredDeal({ rate: false });
    await expect(approveDeal(repositories, contractId)).rejects.toThrow(/approved DSC rate/);

    expect(store.customers.find((item) => item.id === customerId)?.status).toBe("submitted");
    expect(store.sales.find((item) => item.contractId === contractId)?.approval).toBeNull();
    expect(store.contracts.find((item) => item.id === contractId)).toMatchObject({ status: "submitted" });
    expect(store.contracts.find((item) => item.id === contractId)?.vipNumber).toBeFalsy();
    expect(dealEvents(store, customerId, contractId)).toEqual([]);
  });

  it("issues the VIP Number but leaves a Non-Standard contract unfinalized and reports the hold", async () => {
    const { store, repositories, customerId, contractId } = await registeredDeal({ classification: "N" });
    const outcome = await approveDeal(repositories, contractId);

    expect(outcome).toMatchObject({ vipNumberIssued: true, finalized: false });
    expect(outcome.finalizeHeld).toContainEqual(expect.stringMatching(/Non-Standard terms need Administrator approval/));
    expect(store.contracts.find((item) => item.id === contractId)).toMatchObject({ status: "submitted", vipNumber: expect.any(String) });
    expect(dealEvents(store, customerId, contractId)).not.toContain("CONTRACT_FINALIZED");
  });

  it("resumes after a failure partway without repeating finished steps", async () => {
    const { store, repositories, customerId, contractId } = await registeredDeal();
    const failing = { ...repositories, contracts: { ...repositories.contracts, getById: repositories.contracts.getById.bind(repositories.contracts), finalize: repositories.contracts.finalize.bind(repositories.contracts), recordSignedAgreement: () => Promise.reject(new Error("Network down.")) } };
    await expect(approveDeal(failing, contractId)).rejects.toThrow("Network down.");
    expect(dealEvents(store, customerId, contractId)).toEqual(["CUSTOMER_APPROVED", "SALE_APPROVED"]);

    const outcome = await approveDeal(repositories, contractId);
    expect(outcome).toMatchObject({ customerApproved: false, saleApproved: false, vipNumberIssued: true, finalized: true });
    expect(dealEvents(store, customerId, contractId)).toEqual(DEAL_EVENTS);
  });

  it("skips a customer who is already approved", async () => {
    const { store, repositories, customerId, contractId } = await registeredDeal();
    await repositories.customers.approve(customerId);
    const outcome = await approveDeal(repositories, contractId);

    expect(outcome).toMatchObject({ customerApproved: false, saleApproved: true, finalized: true });
    expect(dealEvents(store, customerId, contractId).filter((action) => action === "CUSTOMER_APPROVED")).toHaveLength(1);
  });
});
