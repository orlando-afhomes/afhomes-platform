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

/** Non-Standard terms used by the N tests: ₱200,000 over 12 monthly payments. */
const N_TERMS = { priceCentavos: 20_000_000, months: 12, justification: "Long-time partner discount" };

async function registeredDeal(options: { rate?: boolean; classification?: "S" | "N" } = {}) {
  const store = createMockStore();
  const as = { id: "dev-admin" };
  const repositories = createMockRepositories(store, () => getDevIdentity(as.id));
  const classification = options.classification ?? "S";
  const result = await registerCustomer(repositories, {
    customer: { ...customer, contractClassification: classification },
    contract: { schemeId: "scheme-installment-4m", customerAccepted: true, classification, ...(classification === "N" ? { nonStandardTerms: N_TERMS } : {}) },
  });
  if (result.status !== "contract-prepared" || result.submitError) throw new Error(`Unexpected registration outcome: ${result.status}`);
  // Start the seller without a VIP DSC rate (the seed gives every active seller one), then add it unless the test needs it missing.
  store.commissionRateSettings = store.commissionRateSettings.filter((item) => !(item.memberId === "mem-ost-a1" && item.product === "VIP" && item.role === "DSC"));
  if (options.rate !== false) store.commissionRateSettings.push({ memberId: "mem-ost-a1", product: "VIP", role: "DSC", rateBp: 500, standardRateBp: null });
  return { store, repositories, as, customerId: result.customerId, contractId: result.contractId };
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

  it("records the Administrator step of a Non-Standard deal, issues the VIP Number and waits for Finance", async () => {
    const { store, repositories, customerId, contractId } = await registeredDeal({ classification: "N" });
    await expect(approveDeal(repositories, contractId)).rejects.toThrow(/signed approval reference/);
    expect(dealEvents(store, customerId, contractId)).toEqual([]);

    const outcome = await approveDeal(repositories, contractId, " MEMO-2026-11 ");
    expect(outcome).toMatchObject({ nonStandardApproved: true, vipNumberIssued: true, finalized: false, finalizeHeld: ["Non-Standard terms need Finance confirmation."] });
    const contract = store.contracts.find((item) => item.id === contractId)!;
    expect(contract).toMatchObject({ status: "submitted", priceCentavos: 20_000_000, paymentCode: "T12" });
    expect(contract.vipNumber).toMatch(/^\d{11}S1T12N$/);
    // The Administrator also prepared it: allowed, and flagged (doc 05 item 17).
    expect(contract.nonStandard).toMatchObject({ approvedBy: "dev-admin", approvalReference: "MEMO-2026-11", selfApproved: true, confirmedBy: null });
    expect(store.auditEvents.some((event) => event.action === "CONTRACT_NONSTANDARD_APPROVED" && event.entityId === contractId)).toBe(true);
    expect(dealEvents(store, customerId, contractId)).not.toContain("CONTRACT_FINALIZED");
  });

  it("finalizes a Non-Standard deal on the next Approve deal once Finance confirms", async () => {
    const { store, repositories, as, contractId } = await registeredDeal({ classification: "N" });
    await approveDeal(repositories, contractId, "MEMO-1");

    as.id = "dev-finance";
    await expect(repositories.contracts.approveNonStandard(contractId, "X")).rejects.toThrow(/Administrator rights/);
    await repositories.contracts.confirmNonStandard(contractId);
    expect(store.auditEvents.some((event) => event.action === "CONTRACT_NONSTANDARD_CONFIRMED" && event.entityId === contractId)).toBe(true);

    as.id = "dev-admin";
    const outcome = await approveDeal(repositories, contractId);
    expect(outcome).toMatchObject({ nonStandardApproved: false, vipNumberIssued: false, finalized: true, finalizeHeld: [] });
    // Commission and sale measures use the Non-Standard price (doc 05 section 10.2 rule 5).
    expect(store.sales.find((item) => item.contractId === contractId)?.valueCentavos).toBe(20_000_000);
  });

  it("lets only the Super Administrator confirm terms they approved", async () => {
    const admin = await registeredDeal({ classification: "N" });
    await approveDeal(admin.repositories, admin.contractId, "MEMO-1");
    await expect(admin.repositories.contracts.confirmNonStandard(admin.contractId)).rejects.toThrow(/Only the Super Administrator may do both/);

    const sa = await registeredDeal({ classification: "N" });
    sa.as.id = "dev-super-admin";
    await approveDeal(sa.repositories, sa.contractId, "MEMO-2");
    const confirmed = await sa.repositories.contracts.confirmNonStandard(sa.contractId);
    expect(confirmed.nonStandard).toMatchObject({ approvedBy: "dev-super-admin", confirmedBy: "dev-super-admin" });
    expect(confirmed.holds).toEqual([]);
  });

  it("lets Finance send back waiting terms, which clears both approvals until the terms are approved again", async () => {
    const { store, repositories, as, contractId } = await registeredDeal({ classification: "N" });
    await approveDeal(repositories, contractId, "MEMO-1");
    as.id = "dev-finance";
    const returned = await repositories.contracts.returnForCorrection(contractId, "Price is above the signed memo.");
    expect(returned.status).toBe("returned");
    expect(returned.nonStandard).toMatchObject({ approvedBy: null, approvalReference: null, selfApproved: false, confirmedBy: null });
    // Finance cannot return a contract that is not waiting for it.
    await expect(repositories.contracts.returnForCorrection(contractId, "Again")).rejects.toThrow(/not allowed/);

    as.id = "dev-clerk";
    // The issued VIP Number carries T12, so the months stay; the price may change.
    await expect(repositories.contracts.update(contractId, { nonStandardTerms: { ...N_TERMS, months: 6 } })).rejects.toThrow(/VIP Number is already issued/);
    const fixed = await repositories.contracts.update(contractId, { nonStandardTerms: { ...N_TERMS, priceCentavos: 18_000_000 } });
    expect(fixed).toMatchObject({ priceCentavos: 18_000_000, holds: ["Non-Standard terms need Administrator approval."] });
    expect(store.sales.find((item) => item.contractId === contractId)?.valueCentavos).toBe(18_000_000);
  });

  it("snapshots the normal price and payments and refuses missing or Standard-contract terms", async () => {
    const { store, repositories, contractId } = await registeredDeal({ classification: "N" });
    const contract = store.contracts.find((item) => item.id === contractId)!;
    expect(contract.nonStandard).toMatchObject({ justification: "Long-time partner discount", standardPriceCentavos: 24_000_000, standardInstallments: 4 });
    expect(contract.schedule.reduce((sum, line) => sum + line.amountCentavos, 0)).toBe(20_000_000);

    const second = { customerId: contract.customerId, newPurchaseRequestId: "again", schemeId: "scheme-installment-4m", customerAccepted: true };
    await expect(repositories.contracts.prepare({ ...second, classification: "N" })).rejects.toThrow(/Non-Standard total price/);
    await expect(repositories.contracts.prepare({ ...second, classification: "N", nonStandardTerms: { ...N_TERMS, justification: " " } })).rejects.toThrow(/reason/);
    await expect(repositories.contracts.prepare({ ...second, classification: "S", nonStandardTerms: N_TERMS })).rejects.toThrow(/Only a Non-Standard contract/);
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
