import { afterEach, describe, expect, it, vi } from "vitest";
import { getDevIdentity } from "@/data/mock/dev-identities";
import { createMockRepositories } from "@/data/mock/repositories";
import { createMockStore } from "@/data/mock/seed";
import { registerCustomer } from "@/modules/customers/application/register-customer";
import type { CustomerDraftInput } from "@/modules/customers/types";
import { manilaToday } from "@/shared/lib/dates";
import { approveDeal } from "./approve-deal";

type Store = ReturnType<typeof createMockStore>;

const DEAL_EVENTS = ["CUSTOMER_APPROVED", "SALE_APPROVED", "CONTRACT_RA_RECORDED", "CONTRACT_FINALIZED"];

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

async function registeredDeal(options: { rate?: boolean; classification?: "S" | "N"; schemeId?: string } = {}) {
  const store = createMockStore();
  const as = { id: "dev-admin" };
  const repositories = createMockRepositories(store, () => getDevIdentity(as.id));
  const classification = options.classification ?? "S";
  const schemeId = options.schemeId ?? "scheme-installment-4m";
  const result = await registerCustomer(repositories, {
    customer: { ...customer, paymentSchemeId: schemeId, contractClassification: classification },
    contract: { schemeId, customerAccepted: true, classification, ...(classification === "N" ? { nonStandardTerms: N_TERMS } : {}) },
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
  afterEach(() => vi.useRealTimers());

  it("issues once after installment 1 and lists a pending membership only while fully paid", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-30T15:55:00Z"));
    const { store, repositories, as, contractId } = await registeredDeal();
    const deal = await approveDeal(repositories, contractId);
    expect(deal.contract.status).toBe("finalized");
    expect(deal.contract.signedAgreementRecordedDate).toBe(manilaToday());
    expect(deal.contract.vipNumber).toBeFalsy();
    expect(store.memberships.some((membership) => membership.contractId === contractId)).toBe(false);

    const submit = async (purpose: "reservation" | "installment" | "full", amountCentavos: number) => {
      as.id = "dev-clerk";
      const receipt = await repositories.payments.submit({ contractId, purpose, amountCentavos, method: "Cash", paidDate: manilaToday() });
      as.id = "dev-finance";
      return receipt;
    };
    const reservation = await submit("reservation", 1_000_000);
    await repositories.payments.verify(reservation.id);
    expect((await repositories.contracts.getById(contractId))?.vipNumber).toBeFalsy();
    const first = await submit("installment", 5_750_000);
    expect((await repositories.contracts.getById(contractId))?.vipNumber).toBeFalsy();
    vi.setSystemTime(new Date("2026-11-30T16:05:00Z"));
    await repositories.payments.verify(first.id);
    const numbered = await repositories.contracts.getById(contractId);
    expect(numbered?.vipNumber).toMatch(/^261201\d{5}S1T04S$/);
    expect(numbered?.vipNumberIssuedDate).toBe("2026-12-01");
    expect(numbered?.signedAgreementRecordedDate).toBe("2026-11-30");
    expect(store.memberships.some((membership) => membership.contractId === contractId)).toBe(false);

    const balance = await submit("full", deal.contract.priceCentavos - 6_750_000);
    await repositories.payments.verify(balance.id);
    const pending = (await repositories.memberships.list()).find((membership) => membership.contractId === contractId);
    expect(pending).toMatchObject({ status: "pending", eligible: true, raNumber: numbered?.vipNumber });
    await repositories.payments.adjust(balance.id, { kind: "reversal", amountCentavos: 100, reason: "Test correction" });
    expect((await repositories.memberships.list()).some((membership) => membership.contractId === contractId)).toBe(false);
    expect(store.memberships.find((membership) => membership.id === pending?.id)).toBeDefined();
    await repositories.payments.verify((await submit("installment", 100)).id);
    expect((await repositories.memberships.list()).find((membership) => membership.contractId === contractId)?.id).toBe(pending?.id);
    expect((await repositories.contracts.getById(contractId))?.vipNumber).toBe(numbered?.vipNumber);
    expect(store.auditEvents.filter((event) => event.entityId === contractId && event.action === "VIP_NUMBER_ISSUED")).toHaveLength(1);
  });

  it.each([
    { schemeId: "scheme-move-a", purpose: "installment", amount: 4_550_000, fullyPaid: false },
    { schemeId: "scheme-move-b", purpose: "down_payment", amount: 8_600_000, fullyPaid: false },
    { schemeId: "scheme-spot-cash", purpose: "full", amount: 18_200_000, fullyPaid: true },
  ] as const)("$schemeId issues only when the first non-reservation line is fully covered", async ({ schemeId, purpose, amount, fullyPaid }) => {
    const { repositories, contractId } = await registeredDeal({ schemeId });
    await approveDeal(repositories, contractId);
    const approveReceipt = async (kind: "reservation" | typeof purpose, amountCentavos: number) => {
      const receipt = await repositories.payments.submit({ contractId, purpose: kind, amountCentavos, method: "Cash", paidDate: manilaToday() });
      await repositories.payments.verify(receipt.id);
    };
    await approveReceipt("reservation", 1_000_000);
    await approveReceipt(purpose, amount - 1);
    expect((await repositories.contracts.getById(contractId))?.vipNumber).toBeUndefined();
    await approveReceipt(purpose, 1);
    expect((await repositories.contracts.getById(contractId))?.vipNumber).toMatch(/^\d{11}S1/);
    expect((await repositories.memberships.list()).some((item) => item.contractId === contractId)).toBe(fullyPaid);
  });

  it("waits for the signed agreement and finalization when the full price was already approved", async () => {
    const { store, repositories, contractId } = await registeredDeal({ schemeId: "scheme-spot-cash" });
    const sale = store.sales.find((item) => item.contractId === contractId)!;
    await repositories.sales.approve(sale.id);
    const payment = await repositories.payments.submit({ contractId, amountCentavos: sale.valueCentavos, purpose: "full", method: "Cash", paidDate: manilaToday() });
    await repositories.payments.verify(payment.id);
    expect((await repositories.contracts.getById(contractId))?.vipNumber).toBeUndefined();
    expect(store.memberships.some((item) => item.contractId === contractId)).toBe(false);

    const outcome = await approveDeal(repositories, contractId);
    expect(outcome).toMatchObject({ vipNumberIssued: true, finalized: true });
    expect((await repositories.memberships.list()).find((item) => item.contractId === contractId)).toMatchObject({ status: "pending", eligible: true });
  });

  it("approves the customer and sale, records the agreement and finalizes with one audit per step", async () => {
    const { store, repositories, customerId, contractId } = await registeredDeal();
    const outcome = await approveDeal(repositories, contractId);

    expect(outcome).toMatchObject({ customerApproved: true, saleApproved: true, vipNumberIssued: false, finalized: true, finalizeHeld: [] });
    expect(outcome.contract).toMatchObject({ status: "finalized", signedAgreementRecordedDate: manilaToday() });
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

  it("records the Administrator step of a Non-Standard deal and waits for Finance", async () => {
    const { store, repositories, customerId, contractId } = await registeredDeal({ classification: "N" });
    await expect(approveDeal(repositories, contractId)).rejects.toThrow(/signed approval reference/);
    expect(dealEvents(store, customerId, contractId)).toEqual([]);

    const outcome = await approveDeal(repositories, contractId, " MEMO-2026-11 ");
    expect(outcome).toMatchObject({ nonStandardApproved: true, vipNumberIssued: false, finalized: false, finalizeHeld: ["Non-Standard terms need Finance confirmation."] });
    const contract = store.contracts.find((item) => item.id === contractId)!;
    expect(contract).toMatchObject({ status: "submitted", priceCentavos: 20_000_000, paymentCode: "T12" });
    expect(contract.vipNumber).toBeUndefined();
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
    const initial = store.contracts.find((item) => item.id === contractId)!.requiredInitialCentavos!;
    const receipt = await repositories.payments.submit({ contractId, amountCentavos: initial, purpose: "installment", method: "Cash", paidDate: manilaToday() });
    as.id = "dev-finance";
    await repositories.payments.verify(receipt.id);
    expect((await repositories.contracts.getById(contractId))?.vipNumber).toMatch(/^\d{11}S1T12N$/);
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
    expect(outcome).toMatchObject({ customerApproved: false, saleApproved: false, vipNumberIssued: false, finalized: true });
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
