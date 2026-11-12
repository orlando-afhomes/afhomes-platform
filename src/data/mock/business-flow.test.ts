import { describe, expect, it } from "vitest";
import { CustomerValidationError } from "@/data/contracts/customer-repository";
import { meetsPayoutRelease } from "@/modules/commissions/rules";
import { buildScheduleState } from "@/modules/finance/rules";
import type { Payment } from "@/modules/finance/types";
import type { DevIdentity } from "@/modules/identity/types";
import type { CustomerDraftInput } from "@/modules/customers/types";
import { currentManilaYear } from "@/modules/customers/customer-number";
import { registerCustomer } from "@/modules/customers/application/register-customer";
import { buildCardId, extractRaSequence } from "@/modules/membership/rules";
import { computePointsLedger } from "@/modules/stay-points/engine";
import { confirmedValueInPeriod, totalsFor } from "@/modules/sales/rules";
import { addDaysToDate, addMonthsToDate, manilaToday, startOfNextMonthDate } from "@/shared/lib/dates";
import { pesos } from "@/shared/lib/money";
import { getDevIdentity } from "./dev-identities";
import { createMockRepositories } from "./repositories";
import { createMockStore } from "./seed";

function as(store: ReturnType<typeof createMockStore>, id: string) {
  return createMockRepositories(store, () => getDevIdentity(id));
}

/** Minimum Submit-ready customer; Customer ID tests override only the ID fields. */
function validCustomerInput(overrides: Partial<CustomerDraftInput> = {}): CustomerDraftInput {
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

describe("Customer Registration workflow", () => {
  const contract = { schemeId: "scheme-installment-4m", customerAccepted: true };

  it("saves an unnamed draft and preserves partial customer details without issuing a Customer ID", async () => {
    const { customers } = as(createMockStore(), "dev-super-admin");
    const supplementaryHolder = { firstName: "", lastName: "", middleName: null, suffix: null, gender: null, dateOfBirth: null, citizenship: "Filipino" };
    const draft = await customers.createDraft({ displayName: "", vipPlan: "G1", landline: "8123456", occupation: "Teacher", customerIdMode: "manual", supplementaryHolder });
    expect(await customers.getById(draft.id)).toMatchObject({ status: "draft", displayName: "", vipPlan: "G1", landline: "8123456", occupation: "Teacher", customerIdMode: "manual", supplementaryHolder });
    expect(draft.customerNumber).toBeFalsy();
  });

  it.each(["recommenderMemberId", "referrerMemberId"] as const)("rejects a pending OST supplied as %s", async (field) => {
    const store = createMockStore();
    const pending = store.accreditations.find((record) => record.memberId === "mem-ost-a1")!;
    pending.adminStatus = "pending";
    const { customers } = as(store, "dev-super-admin");
    const input = validCustomerInput({ [field]: pending.memberId });
    const expected = { errors: { [field]: expect.stringMatching(/pending accreditation/i) } };

    await expect(customers.createDraft(input)).rejects.toMatchObject(expected);
    const draft = await customers.createDraft(validCustomerInput());
    await expect(customers.updateDraft(draft.id, input)).rejects.toMatchObject(expected);
    await expect(customers.submit(draft.id, input)).rejects.toMatchObject(expected);
    await expect(customers.submit(draft.id, validCustomerInput())).resolves.toMatchObject({ status: "submitted" });
  });

  it.each(["recommenderMemberId", "referrerMemberId"] as const)("rechecks saved %s when accreditation changes before submission", async (field) => {
    const store = createMockStore();
    const current = store.accreditations.find((record) => record.memberId === "mem-ost-a1")!;
    const { customers } = as(store, "dev-super-admin");
    const input = validCustomerInput({ [field]: current.memberId });
    const draft = await customers.createDraft(input);
    store.accreditations.push({ ...current, id: "older-approval", adminStatus: "active", effectiveDate: "2025-01-01" });
    current.adminStatus = "pending";

    const expected = { errors: { [field]: expect.stringMatching(/pending accreditation/i) } };
    await expect(customers.submit(draft.id, validCustomerInput())).rejects.toMatchObject(expected);
    await expect(customers.submit(draft.id, validCustomerInput({ [field]: undefined }))).rejects.toMatchObject(expected);
    expect((await customers.getById(draft.id))?.status).toBe("draft");
    await expect(customers.submit(draft.id, validCustomerInput({ [field]: null }))).resolves.toMatchObject({ status: "submitted", [field]: null });
  });

  it.each([
    ["older record", false],
    ["tied record", true],
  ] as const)("uses pending status from the latest effective date (%s)", async (_scenario, blocked) => {
    const store = createMockStore();
    const current = store.accreditations.find((record) => record.memberId === "mem-ost-a1")!;
    const effectiveDate = blocked ? current.effectiveDate : "2025-01-01";
    store.accreditations.push({ ...current, id: "other-accreditation", adminStatus: "pending", effectiveDate });
    const { customers } = as(store, "dev-super-admin");
    const creation = customers.createDraft(validCustomerInput({ recommenderMemberId: current.memberId }));
    if (blocked) {
      await expect(creation).rejects.toMatchObject({ errors: { recommenderMemberId: expect.stringMatching(/pending accreditation/i) } });
    } else {
      await expect(creation).resolves.toMatchObject({ recommenderMemberId: current.memberId });
    }
  });

  it.each(["mem-svd-a", "mem-ost-b1", "missing-member"])("rejects an unavailable referrer without disclosing accreditation status (%s)", async (referrerMemberId) => {
    const store = createMockStore();
    store.accreditations.find((record) => record.memberId === "mem-ost-b1")!.adminStatus = "pending";
    const { customers } = as(store, "dev-svd-a");
    await expect(customers.createDraft(validCustomerInput({ referrerMemberId }))).rejects.toMatchObject({
      errors: { referrerMemberId: "Choose an OST available to your account." },
    });
  });

  it("preserves submitted attribution when correcting a customer after the OST becomes pending", async () => {
    const store = createMockStore();
    const current = store.accreditations.find((record) => record.memberId === "mem-ost-a1")!;
    const { customers } = as(store, "dev-super-admin");
    const input = validCustomerInput({ recommenderMemberId: current.memberId, referrerMemberId: current.memberId });
    const draft = await customers.createDraft(input);
    await customers.submit(draft.id, input);
    current.adminStatus = "pending";
    await expect(customers.correct(draft.id, { ...input, email: "updated@example.test" }, "Correct email")).resolves.toMatchObject({
      recommenderMemberId: current.memberId,
      referrerMemberId: current.memberId,
      email: "updated@example.test",
    });
  });

  it("uses the receipt date for the schedule and leaves payment pending Finance verification", async () => {
    const store = createMockStore();
    const repositories = as(store, "dev-super-admin");
    const paidDate = "2026-01-30";
    const result = await registerCustomer(repositories, {
      customer: validCustomerInput(),
      contract: { ...contract, reservation: { amountCentavos: pesos(10_000), method: "Cash", paidDate } },
    });

    expect(result.status).toBe("reservation-submitted");
    const prepared = store.contracts.find((record) => record.customerId === result.customerId);
    expect(prepared?.schedule.slice(0, 2).map((line) => line.dueDate)).toEqual([paidDate, "2026-02-28"]);
    expect(store.payments.find((record) => record.contractId === prepared?.id)).toMatchObject({
      purpose: "reservation", paidDate, status: "submitted", verifiedBy: null,
    });
  });

  it("keeps the saved draft when submission validation fails", async () => {
    const store = createMockStore();
    const repositories = as(store, "dev-admin");
    const result = await registerCustomer(repositories, { customer: { displayName: "Partial Person" }, contract });

    expect(result.status).toBe("draft-kept");
    expect(await repositories.customers.getById(result.customerId)).toMatchObject({ status: "draft" });
    expect(store.contracts.some((record) => record.customerId === result.customerId)).toBe(false);
  });

  it("preserves the submitted customer when contract preparation fails", async () => {
    const store = createMockStore();
    const repositories = as(store, "dev-admin");
    const result = await registerCustomer(repositories, {
      customer: validCustomerInput(),
      contract: { ...contract, schemeId: "missing-scheme" },
    });

    expect(result).toMatchObject({ status: "contract-failed", error: expect.any(Error) });
    expect(await repositories.customers.getById(result.customerId)).toMatchObject({ status: "submitted" });
    expect(store.contracts.some((record) => record.customerId === result.customerId)).toBe(false);
  });

  it("preserves the prepared contract when reservation submission fails", async () => {
    const store = createMockStore();
    const repositories = as(store, "dev-super-admin");
    const result = await registerCustomer(repositories, {
      customer: validCustomerInput(),
      contract: { ...contract, reservation: { amountCentavos: 0, method: "Cash", paidDate: manilaToday() } },
    });

    expect(result).toMatchObject({ status: "reservation-failed", error: expect.any(Error) });
    const prepared = store.contracts.find((record) => record.customerId === result.customerId);
    expect(prepared).toMatchObject({ status: "draft" });
    expect(store.payments.some((record) => record.contractId === prepared?.id)).toBe(false);
  });
});

/** Verifies ctr-1 installment MA2: Silver 240,000 moves from 67,500 (28%) to 125,000 (52%) verified, past the 40% payout release (OD-4). */
async function collectMa2(store: ReturnType<typeof createMockStore>) {
  const payment = await as(store, "dev-ost-a1").payments.submit({ contractId: "ctr-1", purpose: "installment", amountCentavos: pesos(57500), method: "Cash", paidDate: manilaToday(), referenceNo: "MA2" });
  await as(store, "dev-finance").payments.verify(payment.id);
  ageVerifications(store, "ctr-1");
  return payment.id;
}

/** Moves a contract's verification dates into the previous month so the payout release (first day of the next month, R8) has passed. */
function ageVerifications(store: ReturnType<typeof createMockStore>, contractId: string) {
  const past = addMonthsToDate(manilaToday(), -1)!;
  for (const payment of store.payments) if (payment.contractId === contractId && payment.verifiedDate) payment.verifiedDate = past;
}

describe("card id and points rules", () => {
  it("builds the documented example Card ID", () => {
    expect(buildCardId({ activationDate: "2027-03-20", raNumber: "2027-0001", tierCode: "G1", paymentCode: "C01", classification: "S" })).toEqual({ cardId: "27032000001G1C01S" });
    expect(buildCardId({ activationDate: "2027-03-20", raNumber: null, tierCode: "G1", paymentCode: "C01", classification: "S" })).toHaveProperty("error");
    expect(buildCardId({ activationDate: "2027-03-20", raNumber: "2027-0001", tierCode: "G1", paymentCode: null, classification: "S" })).toHaveProperty("error");
  });

  it("splits Bronze spend 700 weekday and 300 weekend once the minimum is reached", () => {
    const store = createMockStore();
    const memb = store.memberships.find((m) => m.id === "memb-1")!;
    const contract = store.contracts.find((c) => c.id === memb.contractId)!;
    const spends = store.resortSpends.filter((s) => s.membershipId === "memb-1" && s.status === "verified");
    const first = computePointsLedger(memb.activationDate!, contract.benefits, [spends[0]]);
    expect(first.balances.pending).toBe(400);
    expect(first.balances.spendableWeekday).toBe(0);
    const both = computePointsLedger(memb.activationDate!, contract.benefits, spends);
    expect(both.balances.spendableWeekday).toBe(700);
    expect(both.balances.spendableWeekend).toBe(300);
  });

  it("caps Bronze credit at 10,000 and records the excess", () => {
    const store = createMockStore();
    const contract = store.contracts.find((c) => c.id === "ctr-2")!;
    const ledger = computePointsLedger("2026-11-02", contract.benefits, [
      { id: "x", membershipId: "memb-1", date: "2026-11-03", amountCentavos: pesos(12000), description: "", status: "verified", verificationRef: null },
    ]);
    expect(ledger.entries[0].earnedWeekday + ledger.entries[0].earnedWeekend).toBe(10000);
    expect(ledger.entries[0].cappedExcess).toBe(2000);
  });

  it("blocks fractional splits instead of rounding", () => {
    const store = createMockStore();
    const contract = store.contracts.find((c) => c.id === "ctr-2")!;
    const ledger = computePointsLedger("2026-11-02", contract.benefits, [
      { id: "y", membershipId: "memb-1", date: "2026-11-03", amountCentavos: pesos(5), description: "", status: "verified", verificationRef: null },
    ]);
    expect(ledger.entries[0].status).toBe("blocked_rounding");
  });
});

describe("sales reporting examples (doc 13)", () => {
  it("counts a sale once at full value and nets reversal and reconfirmation by month", () => {
    const sale = { adjustments: [
      { id: "a", date: "2026-10-28", amountCentavos: pesos(240000), kind: "confirmation", reason: "", actorId: "x" },
      { id: "b", date: "2026-11-10", amountCentavos: -pesos(240000), kind: "reversal", reason: "", actorId: "x" },
      { id: "c", date: "2026-12-05", amountCentavos: pesos(240000), kind: "reconfirmation", reason: "", actorId: "x" },
    ] } as never;
    expect(confirmedValueInPeriod([sale], "2026-10-01", "2026-10-31")).toBe(pesos(240000));
    expect(confirmedValueInPeriod([sale], "2026-11-01", "2026-11-30")).toBe(-pesos(240000));
    expect(confirmedValueInPeriod([sale], "2026-10-01", "2026-12-31")).toBe(pesos(240000));
  });

  it("totals Confirmed, Pending and Overall Recorded", () => {
    const store = createMockStore();
    const totals = totalsFor(store.sales);
    expect(totals.overall).toBe(totals.confirmed + totals.pending);
    expect(totals.confirmed).toBe(pesos(240000 + 72000));
  });
});

describe("customer rules", () => {
  it("rejects OST draft creation and reports every Submit error while keeping the draft", async () => {
    const store = createMockStore();
    await expect(as(store, "dev-ost-a1").customers.createDraft({ displayName: "X" })).rejects.toThrow();
    const sm = as(store, "dev-sm-a");
    const draft = await sm.customers.createDraft({ displayName: "Partial Person" });
    await expect(sm.customers.submit(draft.id, { displayName: "Partial Person" })).rejects.toBeInstanceOf(CustomerValidationError);
    expect((await sm.customers.getById(draft.id))?.status).toBe("draft");
  });

  it("shows a restricted projection of downline customers", async () => {
    const store = createMockStore();
    const ssm = await as(store, "dev-ssm-a").customers.list();
    const downline = ssm.find((c) => c.id === "cust-a1")!;
    expect(downline.restricted).toBe(true);
    expect(downline.mobileNumber).toBeUndefined();
    const own = await as(store, "dev-ost-a1").customers.getById("cust-a1");
    expect(own?.mobileNumber).toBeDefined();
  });
});

describe("supplementary holder and internal ids (G5)", () => {
  const holder = { firstName: "Jose", middleName: null, lastName: "Santos", suffix: null, gender: "Male", dateOfBirth: "1992-08-20" };

  it("allows a supplementary holder on Gold only, and gives new customers a random numeric id", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    const gold = await admin.customers.createDraft({ displayName: "Gold Buyer", vipPlan: "G1", supplementaryHolder: holder });
    expect(gold.id).toMatch(/^[1-9]\d{11}$/);
    expect(gold.supplementaryHolder?.lastName).toBe("Santos");
    await expect(admin.customers.createDraft({ displayName: "Silver Buyer", vipPlan: "S1", supplementaryHolder: holder })).rejects.toThrow(/does not allow/);
    await expect(admin.customers.updateDraft(gold.id, { displayName: "Gold Buyer", vipPlan: "S1", supplementaryHolder: holder })).rejects.toThrow(/does not allow/);
  });
});

describe("contract, payment, sale and membership workflow", () => {
  it("limits contract visibility to the recorded team", async () => {
    const store = createMockStore();
    expect((await as(store, "dev-ost-a1").contracts.list()).map((c) => c.id)).toEqual(["ctr-1"]);
    expect((await as(store, "dev-svd-a").contracts.list()).map((c) => c.id).sort()).toEqual(["ctr-1", "ctr-3", "ctr-4"]);
    expect((await as(store, "dev-finance").contracts.list()).length).toBe(4);
    expect(await as(store, "dev-ost-b1").contracts.getById("ctr-1")).toBeNull();
  });

  it("finalizes Gold now that the price conflict is resolved, and still denies finalization without Admin approval", async () => {
    const store = createMockStore();
    await expect(as(store, "dev-sm-a").contracts.finalize("ctr-3")).rejects.toThrow();
    const finalized = await as(store, "dev-admin").contracts.finalize("ctr-3");
    expect(finalized.status).toBe("finalized");
  });

  it("confirms the sale only after the required initial payment, and reverses it with holds", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    const finance = as(store, "dev-finance");
    const ost = as(store, "dev-ost-a2");
    await admin.contracts.finalize("ctr-4");
    await finance.payments.verify("pay-4");
    expect(store.sales.find((s) => s.id === "sale-4")!.status).toBe("pending"); // reservation alone never confirms

    const ma1 = await ost.payments.submit({ contractId: "ctr-4", purpose: "installment", amountCentavos: pesos(15500), method: "GCash", paidDate: manilaToday() });
    await expect(ost.payments.verify(ma1.id)).rejects.toThrow();
    await finance.payments.verify(ma1.id);
    const sale = store.sales.find((s) => s.id === "sale-4")!;
    expect(sale.status).toBe("confirmed");
    expect(sale.adjustments.at(-1)?.amountCentavos).toBe(pesos(72000));

    const [first] = await finance.commissions.approve({ saleId: "sale-4", entries: [{ memberId: "mem-svd-a", percentBp: 100 }] });
    await finance.payments.adjust(ma1.id, { kind: "refund", amountCentavos: pesos(15500), reason: "Customer refund" });
    expect(sale.status).toBe("pending");
    expect(sale.adjustments.at(-1)?.amountCentavos).toBe(-pesos(72000));
    expect(store.commissions.find((c) => c.id === first.id)!.status).toBe("on_hold");
    await expect(finance.commissions.recordPayout(first.id, { reference: "R1", payoutDate: manilaToday() })).rejects.toThrow();

    await finance.payments.verify((await ost.payments.submit({ contractId: "ctr-4", purpose: "installment", amountCentavos: pesos(15500), method: "Cash", paidDate: manilaToday(), referenceNo: "new" })).id);
    expect(sale.status).toBe("confirmed");
    expect(sale.adjustments.at(-1)?.kind).toBe("reconfirmation");
  });

  it("lets one full payment, with no separate reservation fee, settle every schedule line and confirm the sale", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    const finance = as(store, "dev-finance");
    await admin.contracts.finalize("ctr-4");
    await finance.payments.reject("pay-4", "Customer pays in full instead");
    const full = await as(store, "dev-ost-a2").payments.submit({ contractId: "ctr-4", purpose: "full", amountCentavos: pesos(72000), method: "Bank Transfer", paidDate: manilaToday(), referenceNo: "FULL-1" });
    await finance.payments.verify(full.id);
    expect(store.sales.find((s) => s.id === "sale-4")!.status).toBe("confirmed");
    const contract = store.contracts.find((c) => c.id === "ctr-4")!;
    const lines = buildScheduleState(contract, store.payments.filter((p) => p.contractId === "ctr-4"), manilaToday());
    expect(lines[0].label).toBe("Reservation fee");
    expect(lines.every((line) => line.status === "paid")).toBe(true);
  });

  it("rejects duplicate, over-balance and self-verified payments", async () => {
    const store = createMockStore();
    const ost = as(store, "dev-ost-a1");
    await expect(ost.payments.submit({ contractId: "ctr-1", purpose: "reservation", amountCentavos: pesos(10000), method: "Bank Transfer", paidDate: "2026-09-30" })).rejects.toThrow(/duplicate/i);
    await expect(ost.payments.submit({ contractId: "ctr-1", purpose: "installment", amountCentavos: pesos(500000), method: "Cash", paidDate: manilaToday() })).rejects.toThrow(/exceeds/i);
    await expect(as(store, "dev-admin").payments.verify("pay-4")).rejects.toThrow();
  });

  it("pays a commission only after confirmed disbursement and never twice", async () => {
    const store = createMockStore();
    const finance = as(store, "dev-finance");
    const [commission] = await finance.commissions.approve({ saleId: "sale-1", entries: [{ memberId: "mem-ost-a1", percentBp: 500 }] });
    expect(commission.amountCentavos).toBe(pesos(12000));
    await expect(finance.commissions.approve({ saleId: "sale-1", entries: [{ memberId: "mem-ost-a1", percentBp: 500 }] })).rejects.toThrow(/already/);
    await expect(finance.commissions.confirmPayout(commission.id)).rejects.toThrow();
    await collectMa2(store);
    await finance.commissions.recordPayout(commission.id, { reference: "PAYREF", payoutDate: manilaToday() });
    expect(store.commissions.find((item) => item.id === commission.id)!.status).toBe("approved");
    await expect(finance.commissions.recordPayout(commission.id, { reference: "PAYREF2", payoutDate: manilaToday() })).rejects.toThrow(/duplicate/i);
    await finance.commissions.confirmPayout(commission.id);
    expect(store.commissions.find((item) => item.id === commission.id)!.status).toBe("paid");
    // Team members see their own amounts, upline sees no payout details.
    const upline = await as(store, "dev-svd-a").commissions.list();
    expect(upline).toHaveLength(1);
    expect(upline[0].payout).toBeNull();
    expect(await as(store, "dev-ost-a2").commissions.list()).toEqual([]);
  });

  it("activates a fully paid membership once with a 17-character Card ID", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    const finance = as(store, "dev-finance");
    const ost = as(store, "dev-ost-a2");
    await admin.contracts.finalize("ctr-4");
    const membership = store.memberships.find((m) => m.contractId === "ctr-4")!;
    await expect(admin.memberships.activate(membership.id)).rejects.toThrow();
    await finance.payments.verify("pay-4");
    for (let index = 0; index < 4; index += 1) {
      const payment = await ost.payments.submit({ contractId: "ctr-4", purpose: "installment", amountCentavos: pesos(15500), method: "Cash", paidDate: manilaToday(), referenceNo: `MA${index}` });
      await finance.payments.verify(payment.id);
    }
    await expect(admin.memberships.activate(membership.id)).rejects.toThrow(/RA/);
    await admin.contracts.recordRaNumber("ctr-4", "2026-0002");
    await expect(admin.contracts.recordRaNumber("ctr-1", "2026-0002")).rejects.toThrow(/already/);
    await expect(ost.memberships.activate(membership.id)).rejects.toThrow();
    const active = await finance.memberships.activate(membership.id); // Finance activates too (owner ruling 2026-11-09)
    const today = manilaToday().replace(/-/g, "").slice(2);
    expect(active.cardId).toBe(`${today}00002B1T04S`);
    expect(active.cardId).toHaveLength(17);
    await expect(admin.memberships.activate(membership.id)).rejects.toThrow(/already/);
  });

  it("applies a Financial Hold when a verified payment is reversed on an active membership, then releases it", async () => {
    const store = createMockStore();
    const finance = as(store, "dev-finance");
    await finance.payments.adjust("pay-3", { kind: "reversal", amountCentavos: pesos(10000), reason: "Bank reversal" });
    expect(store.memberships.find((m) => m.id === "memb-1")!.financialHold).toBe(true);
    await as(store, "dev-ost-b1").payments.submit({ contractId: "ctr-2", purpose: "full", amountCentavos: pesos(10000), method: "Cash", paidDate: manilaToday() });
    const pending = store.payments.find((p) => p.status === "submitted" && p.contractId === "ctr-2")!;
    await finance.payments.verify(pending.id);
    expect(store.memberships.find((m) => m.id === "memb-1")!.financialHold).toBe(false);
  });
});

describe("integrity guards (C1)", () => {
  it("keeps an initiated payout on a reversed sale, flags it, and refuses to confirm or cancel it", async () => {
    const store = createMockStore();
    const finance = as(store, "dev-finance");
    const [commission] = await finance.commissions.approve({ saleId: "sale-1", entries: [{ memberId: "mem-ost-a1", percentBp: 500 }] });
    const ma2 = await collectMa2(store);
    await finance.commissions.recordPayout(commission.id, { reference: "PAYREF", payoutDate: manilaToday() });
    await finance.payments.adjust(ma2, { kind: "reversal", amountCentavos: pesos(57500), reason: "Bank reversal" });
    await finance.payments.adjust("pay-2", { kind: "reversal", amountCentavos: pesos(57500), reason: "Bank reversal" });

    const held = store.commissions.find((c) => c.id === commission.id)!;
    expect(held.status).toBe("on_hold");
    expect(held.holdReason).toMatch(/payout was recorded but not confirmed/);
    expect(held.payout).toMatchObject({ reference: "PAYREF", confirmedAt: null });
    await expect(finance.commissions.confirmPayout(commission.id)).rejects.toThrow(/approved/);
    await expect(finance.commissions.cancel(commission.id, "Sale reversed")).rejects.toThrow(/not confirmed/);
    await expect(finance.commissions.resolveHold(commission.id, "cancel", "Sale reversed")).rejects.toThrow(/not confirmed/);
    await expect(finance.commissions.resolveHold(commission.id, "restore", "Try")).rejects.toThrow(/not Confirmed/);
    expect(held.payout).toMatchObject({ reference: "PAYREF", confirmedAt: null });
    expect(held.status).toBe("on_hold");
  });

  it("refuses to record or confirm a payout once the sale is no longer Confirmed", async () => {
    const store = createMockStore();
    const finance = as(store, "dev-finance");
    const [first, second] = await finance.commissions.approve({ saleId: "sale-1", entries: [{ memberId: "mem-ost-a1", percentBp: 500 }, { memberId: "mem-sm-a", percentBp: 100 }] });
    await collectMa2(store);
    await finance.commissions.recordPayout(second.id, { reference: "PAY-2", payoutDate: manilaToday() });
    // Defense in depth: every current path holds approved commissions when a sale leaves Confirmed, but payout steps still re-check the sale.
    store.sales.find((s) => s.id === "sale-1")!.status = "cancelled";
    await expect(finance.commissions.recordPayout(first.id, { reference: "PAY-1", payoutDate: manilaToday() })).rejects.toThrow(/no longer Confirmed/);
    await expect(finance.commissions.confirmPayout(second.id)).rejects.toThrow(/no longer Confirmed/);
    expect(store.commissions.find((c) => c.id === first.id)!.payout).toBeNull();
    expect(store.commissions.find((c) => c.id === second.id)!.payout).toMatchObject({ reference: "PAY-2", confirmedAt: null });
  });

  it("does not verify a payment on a cancelled contract, but still lets Finance reject it", async () => {
    const store = createMockStore();
    await as(store, "dev-admin").contracts.cancel("ctr-4", "Customer withdrew");
    const finance = as(store, "dev-finance");
    await expect(finance.payments.verify("pay-4")).rejects.toThrow(/cancelled/);
    expect(store.payments.find((p) => p.id === "pay-4")!.status).toBe("submitted");
    expect((await finance.payments.reject("pay-4", "Contract cancelled")).status).toBe("rejected");
  });

  it("lets an approver verify a receipt they submitted or corrected, and flags it in the history (R6)", async () => {
    const store = createMockStore();
    const finance = as(store, "dev-finance");
    const superAdmin = as(store, "dev-super-admin");
    await finance.payments.returnForCorrection("pay-4", "Wrong date");
    await superAdmin.payments.resubmit("pay-4", { paidDate: "2026-11-06" });
    expect(store.payments.find((p) => p.id === "pay-4")!.submittedBy).toBe("dev-ost-a2");
    // Owner ruling 2026-11-12 (R6): self-approval is allowed and audited.
    const verified = await superAdmin.payments.verify("pay-4");
    expect(verified.status).toBe("verified");
    expect(verified.verifiedBy).toBe("dev-super-admin");
    expect(store.payments.find((p) => p.id === "pay-4")!.status).toBe("verified");

    // Finance can also verify a receipt they submitted themselves; the history flags it.
    const dual: DevIdentity = { id: "test-finance-ost", displayName: "Finance OST (Test)", roles: ["finance", "ost"], memberId: "mem-ost-a2", branchId: "branch-a", status: "active" };
    const dualRepos = createMockRepositories(store, () => dual);
    const own = await dualRepos.payments.submit({ contractId: "ctr-4", purpose: "installment", amountCentavos: pesos(15500), method: "Cash", paidDate: manilaToday(), referenceNo: "SELF-1" });
    const selfVerified = await dualRepos.payments.verify(own.id);
    expect(selfVerified.status).toBe("verified");
    expect(store.payments.find((p) => p.id === own.id)!.history.some((h) => (h.note ?? "").includes("Self-approved"))).toBe(true);
  });

  it("records an RA only on a finalized contract, with an exact 4-digit sequence and its previous value audited", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    expect(extractRaSequence("2027-0001")).toBe("0001");
    expect(extractRaSequence("2027-1")).toBeNull();
    expect(extractRaSequence("2027-00001")).toBeNull();
    await expect(admin.contracts.recordRaNumber("ctr-3", "2026-0007")).rejects.toThrow(/finalized/);
    await expect(admin.contracts.recordRaNumber("ctr-1", "2026-7")).rejects.toThrow(/4-digit/);
    await expect(admin.contracts.recordRaNumber("ctr-1", "2026-0001")).rejects.toThrow(/already/);
    await admin.contracts.recordRaNumber("ctr-1", "2026-0007");
    await admin.contracts.recordRaNumber("ctr-1", "2026-0008");
    const events = store.auditEvents.filter((e) => e.action === "CONTRACT_RA_RECORDED" && e.entityId === "ctr-1");
    expect(events.map((e) => [e.previousValue, e.newValue])).toEqual([["not recorded", "2026-0007"], ["2026-0007", "2026-0008"]]);
  });

  it("audits the actual previous contract status on finalize and the previous Customer ID on correction", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    store.contracts.find((c) => c.id === "ctr-4")!.status = "submitted";
    await admin.contracts.finalize("ctr-4");
    expect(store.auditEvents.find((e) => e.action === "CONTRACT_FINALIZED" && e.entityId === "ctr-4")?.previousValue).toBe("submitted");

    const customer = store.customers.find((c) => c.id === "cust-a1")!;
    const before = customer.customerNumber ?? null;
    // The legacy free-text form is no longer valid; a correction must use YYYY-NNNN.
    await expect(
      admin.customers.correct("cust-a1", { displayName: customer.displayName, customerNumber: "CUST-9001" }, "Typo in Customer ID"),
    ).rejects.toMatchObject({ errors: { customerNumber: "Customer ID must use the format YYYY-NNNN, for example 2026-0001." } });
    await admin.customers.correct("cust-a1", { displayName: customer.displayName, customerNumber: "2026-0901" }, "Typo in Customer ID");
    // Another record cannot reuse an assigned Customer ID.
    await expect(
      admin.customers.correct("cust-a3", { displayName: "Elena Bautista", customerNumber: "2026-0901" }, "Duplicate Customer ID"),
    ).rejects.toMatchObject({ errors: { customerNumber: "This Customer ID is already in use." } });
    expect(store.customers.find((c) => c.id === "cust-a1")!.customerNumber).toBe("2026-0901");
    const corrected = store.auditEvents.filter((e) => e.action === "CUSTOMER_CORRECTED").at(-1)!;
    expect(corrected.previousValue).toBe(`customerNumber:${before ?? "none"}`);
    expect(corrected.newValue).toBe("customerNumber:2026-0901");
  });

  it("assigns the next automatic Customer ID only at Submit and audits the assigned value", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    const year = currentManilaYear();
    const draft = await admin.customers.createDraft({ displayName: "Ida Test", customerIdMode: "auto" });
    expect(draft.customerNumber ?? null).toBeNull();

    const submitted = await admin.customers.submit(draft.id, validCustomerInput({ customerIdMode: "auto" }));
    expect(submitted.status).toBe("submitted");
    expect(submitted.customerNumber).toMatch(new RegExp(`^${year}-\\d{4}$`));
    expect(submitted.customerNumber).toBe(`${year}-0001`);
    const audit = store.auditEvents.find((e) => e.action === "CUSTOMER_SUBMITTED" && e.entityId === draft.id)!;
    expect(audit.newValue).toContain(`${year}-0001`);

    const second = await admin.customers.createDraft({ displayName: "Ida Second", customerIdMode: "auto" });
    const submittedSecond = await admin.customers.submit(second.id, validCustomerInput({ displayName: "Ida Second", lastName: "Second", customerIdMode: "auto" }));
    expect(submittedSecond.customerNumber).toBe(`${year}-0002`);
  });

  it("rejects a blank, malformed, or duplicate manual Customer ID and keeps the draft", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    const year = currentManilaYear();
    const draft = await admin.customers.createDraft({ displayName: "Manual One" });

    await expect(admin.customers.submit(draft.id, validCustomerInput({ customerIdMode: "manual", customerNumber: null }))).rejects.toMatchObject({
      errors: { customerNumber: "Enter a Customer ID or choose Automatic." },
    });
    await expect(admin.customers.submit(draft.id, validCustomerInput({ customerIdMode: "manual", customerNumber: "2024-1" }))).rejects.toMatchObject({
      errors: { customerNumber: "Customer ID must use the format YYYY-NNNN, for example 2026-0001." },
    });
    expect((await admin.customers.getById(draft.id))?.status).toBe("draft");

    await admin.customers.correct("cust-a1", { displayName: "Customer A One", customerNumber: `${year}-0123` }, "Assign Customer ID");
    await expect(admin.customers.submit(draft.id, validCustomerInput({ customerIdMode: "manual", customerNumber: `${year}-0123` }))).rejects.toMatchObject({
      errors: { customerNumber: "This Customer ID is already in use." },
    });

    const submitted = await admin.customers.submit(draft.id, validCustomerInput({ customerIdMode: "manual", customerNumber: `${year}-0124` }));
    expect(submitted.customerNumber).toBe(`${year}-0124`);
  });

  it("never allocates a Customer ID on drafts or imports", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    const draft = await admin.customers.createDraft({ displayName: "Pending Draft", customerIdMode: "auto" });
    expect(draft.customerNumber ?? null).toBeNull();

    const job = await admin.customers.importCustomers({
      fileName: "customers.csv",
      declaration: true,
      records: [
        {
          "First name": "Imported",
          "Last name": "Ready",
          "Birth date": "1990-02-03",
          "Gender": "Female",
          "Civil status": "Single",
          "Mobile number": "09171234599",
          Email: "imported.ready@afhomes.local",
          Province: "Cebu",
          "City / Municipality": "Lapu-Lapu City",
          Barangay: "Pajo",
          "VIP tier": "Silver",
          "Payment scheme": "4-Month Installment",
          "Contract classification": "Standard",
        },
      ],
    });
    expect(job.createdCount).toBe(1);
    const imported = store.customers.find((customer) => customer.id === job.createdCustomerIds[0])!;
    expect(imported.status).toBe("draft");
    expect(imported.customerNumber ?? null).toBeNull();
  });

  it("removes business authority and visibility from an identity whose linked account is suspended", async () => {
    const store = createMockStore();
    store.accounts.find((a) => a.id === "acct-admin")!.status = "suspended";
    const admin = as(store, "dev-admin");
    await expect(admin.contracts.finalize("ctr-4")).rejects.toThrow();
    expect(await admin.contracts.list()).toEqual([]);
    expect(await admin.payments.list()).toEqual([]);
    expect(store.contracts.find((c) => c.id === "ctr-4")!.status).toBe("under_review");
    // Identities without a linked account keep identity-status gating.
    expect((await as(store, "dev-finance").payments.verify("pay-4")).status).toBe("verified");
    store.accounts.find((a) => a.id === "acct-admin")!.status = "active";
    expect((await admin.contracts.finalize("ctr-4")).status).toBe("finalized");
  });
});

describe("payment and cancellation audit trail", () => {
  it("records the verified amount and the contract on the verification audit event", async () => {
    const store = createMockStore();
    await as(store, "dev-finance").payments.verify("pay-4");
    const event = store.auditEvents.find((e) => e.action === "PAYMENT_VERIFIED" && e.entityId === "pay-4")!;
    expect(event.newValue).toBe(String(pesos(10000)));
    expect(event.relatedRecordIds).toEqual(["ctr-4"]);
  });

  it("audits the sale cancellation when a contract is cancelled directly", async () => {
    const store = createMockStore();
    await as(store, "dev-admin").contracts.cancel("ctr-4", "Customer withdrew before payment");
    expect(store.sales.find((s) => s.id === "sale-4")!.status).toBe("cancelled");
    expect(store.auditEvents.some((e) => e.action === "SALE_CANCELLED" && e.entityId === "sale-4")).toBe(true);
  });

  it("links a draft-stage payment to the sale when the contract is submitted", async () => {
    const store = createMockStore();
    store.contracts.find((c) => c.id === "ctr-4")!.status = "draft";
    store.payments.find((p) => p.id === "pay-4")!.saleId = null;
    await as(store, "dev-admin").contracts.submit("ctr-4");
    expect(store.payments.find((p) => p.id === "pay-4")!.saleId).toBe("sale-4");
  });
});

describe("Move schemes with an authorized Card ID payment code (06 section 6.3, doc 05 item 12)", () => {
  it.each([
    ["scheme-move-a", pesos(54000)],
    ["scheme-move-b", pesos(72000)],
  ])("%s: pays and finalizes, and activation issues a B1 T04 Card ID", async (schemeId, price) => {
    const store = createMockStore();
    const superAdmin = as(store, "dev-super-admin");
    const finance = as(store, "dev-finance");
    await superAdmin.contracts.cancel("ctr-4", "Re-prepare under a Move scheme");
    const prepared = await superAdmin.contracts.prepare({ customerId: "cust-a4", schemeId, customerAccepted: true });
    expect(prepared).toMatchObject({ paymentCode: "T04", priceCentavos: price, arrangement: null });
    expect(prepared.holds.filter((hold) => /arrangement/.test(hold))).toHaveLength(0);
    await superAdmin.contracts.submit(prepared.id);
    await superAdmin.contracts.startReview(prepared.id);
    const finalized = await superAdmin.contracts.finalize(prepared.id);
    expect(finalized.status).toBe("finalized");

    for (const [index, line] of prepared.schedule.entries()) {
      const payment = await superAdmin.payments.submit({ contractId: prepared.id, purpose: line.purpose, amountCentavos: line.amountCentavos, method: "Cash", paidDate: manilaToday(), referenceNo: `${schemeId}-${index}` });
      expect((await finance.payments.verify(payment.id)).status).toBe("verified");
    }
    const verified = store.payments.filter((p) => p.contractId === prepared.id && p.status === "verified").reduce((sum, p) => sum + p.amountCentavos, 0);
    expect(verified).toBe(price);
    expect(store.sales.find((s) => s.contractId === prepared.id)!.status).toBe("confirmed");

    await superAdmin.contracts.recordRaNumber(prepared.id, "2026-0009");
    const membership = store.memberships.find((m) => m.contractId === prepared.id)!;
    const active = await finance.memberships.activate(membership.id);
    const today = manilaToday().replace(/-/g, "").slice(2);
    expect(active.cardId).toBe(`${today}00009B1T04S`);
    expect(active.cardId).toMatch(/^\d{6}0\d{4}B1T04S$/);
    expect(store.auditEvents.some((e) => e.action === "CARD_ID_ISSUED" && e.relatedRecordIds?.includes(prepared.id))).toBe(true);
  });

  it("keeps the official codes and the historical Card ID: Spot Cash C01, 4-month installment T04", () => {
    const store = createMockStore();
    expect(store.paymentSchemes.find((s) => s.id === "scheme-spot-cash")!.paymentCode).toBe("C01");
    expect(store.paymentSchemes.find((s) => s.id === "scheme-installment-4m")!.paymentCode).toBe("T04");
    expect(store.memberships.find((m) => m.id === "memb-1")!.cardId).toBe("26110200001B1T04S");
  });

  it("prices all Gold schemes without a price conflict hold", async () => {
    const prepareFor = async (schemeId: string) => {
      const store = createMockStore();
      const admin = as(store, "dev-admin");
      await admin.contracts.cancel("ctr-3", "Re-prepare");
      return admin.contracts.prepare({ customerId: "cust-a3", schemeId, customerAccepted: true });
    };
    const spotCash = await prepareFor("scheme-spot-cash");
    expect(spotCash).toMatchObject({ priceCentavos: pesos(312000), priceStatus: "contract_stated" });
    expect(spotCash.holds.filter((hold) => /price is in conflict/.test(hold))).toHaveLength(0);
    const installment = await prepareFor("scheme-installment-4m");
    expect(installment).toMatchObject({ priceCentavos: pesos(390000), priceStatus: "contract_stated" });
    expect(installment.holds.filter((hold) => /price is in conflict/.test(hold))).toHaveLength(0);
    const moveA = await prepareFor("scheme-move-a");
    expect(moveA).toMatchObject({ priceCentavos: pesos(312000), priceStatus: "contract_stated", paymentCode: "T04", arrangement: null });
    expect(moveA.holds.filter((hold) => /price is in conflict/.test(hold))).toHaveLength(0);
    expect(moveA.holds.filter((hold) => /arrangement/.test(hold))).toHaveLength(0);
    const moveB = await prepareFor("scheme-move-b");
    expect(moveB).toMatchObject({ priceCentavos: pesos(390000), priceStatus: "contract_stated", paymentCode: "T12", arrangement: null });
    expect(moveB.holds.filter((hold) => /price is in conflict/.test(hold))).toHaveLength(0);
    expect(moveB.holds.filter((hold) => /arrangement/.test(hold))).toHaveLength(0);
  });
});

describe("owner-decided restrictions (C2)", () => {
  it("never refunds the Reservation Fee but still allows a reversal (OD-12)", async () => {
    const store = createMockStore();
    const finance = as(store, "dev-finance");
    await expect(finance.payments.adjust("pay-1", { kind: "refund", amountCentavos: pesos(10000), reason: "Customer asked" })).rejects.toThrow(/non-refundable/);
    expect(store.payments.find((p) => p.id === "pay-1")!.adjustments).toEqual([]);
    const reversed = await finance.payments.adjust("pay-1", { kind: "reversal", amountCentavos: pesos(10000), reason: "Bank error" });
    expect(reversed.adjustments.at(-1)?.kind).toBe("reversal");
  });

  it("prepares Spot Cash at the Full Payment price with the balance due 7 days after reservation (OD-11 released)", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    await admin.contracts.cancel("ctr-3", "Free the customer for a new contract");
    const contract = await admin.contracts.prepare({ customerId: "cust-a3", schemeId: "scheme-spot-cash", customerAccepted: true, reservationDate: "2026-11-10" });
    expect(contract).toMatchObject({ priceCentavos: pesos(312000), priceStatus: "contract_stated", paymentCode: "C01", requiredInitialCentavos: pesos(312000) });
    expect(contract.schedule.map((line) => [line.label, line.amountCentavos, line.dueDate])).toEqual([
      ["Reservation fee", pesos(10000), "2026-11-10"],
      ["Balance", pesos(302000), "2026-11-17"],
    ]);
    // Gold's installment price conflict does not hold a Spot Cash contract with its own stated price.
    expect(contract.holds.some((hold) => /price is in conflict/.test(hold))).toBe(false);
  });

  it("derives installment due dates monthly from the reservation date, clamped to month end", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    await admin.contracts.cancel("ctr-3", "Free the customer for a new contract");
    const contract = await admin.contracts.prepare({ customerId: "cust-a3", schemeId: "scheme-installment-4m", customerAccepted: true, reservationDate: "2027-01-31" });
    expect(contract.schedule.map((line) => line.dueDate)).toEqual(["2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30", "2027-05-31"]);
  });

  it("keeps a scheme without complete terms unavailable whatever an Admin edits", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    const draft = await admin.products.createScheme({ label: "Unapproved plan" });
    await admin.products.updateScheme(draft.id, { availability: "available" }, "Try to open");
    expect(store.paymentSchemes.find((s) => s.id === draft.id)!.availability).toBe("unavailable");
    expect(store.contracts.find((c) => c.id === "ctr-2")).toMatchObject({ status: "finalized", paymentCode: "T04" });
  });

  it("builds Move B with a 40% down payment and no arrangement hold (B1 T04)", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    await admin.contracts.cancel("ctr-4", "Re-prepare under Move B");
    const contract = await admin.contracts.prepare({ customerId: "cust-a4", schemeId: "scheme-move-b", customerAccepted: true, reservationDate: "2026-11-10" });
    expect(contract.schedule.map((line) => [line.label, line.amountCentavos, line.dueDate])).toEqual([
      ["Reservation fee", pesos(10000), "2026-11-10"],
      ["Down payment", pesos(18800), null],
      ["MA1", pesos(10800), "2026-12-10"],
      ["MA2", pesos(10800), "2027-01-10"],
      ["MA3", pesos(10800), "2027-02-10"],
      ["MA4", pesos(10800), "2027-03-10"],
    ]);
    expect(contract).toMatchObject({ priceCentavos: pesos(72000), paymentCode: "T04", requiredInitialCentavos: pesos(28800), arrangement: null });
    expect(contract.holds.some((hold) => /arrangement/.test(hold))).toBe(false);
    await admin.contracts.submit(contract.id);
    expect((await admin.contracts.finalize(contract.id)).status).toBe("finalized");
  });

  it("prices Move A from Spot Cash with a T04 code and no arrangement", async () => {
    const store = createMockStore();
    const superAdmin = as(store, "dev-super-admin");
    await superAdmin.contracts.cancel("ctr-3", "Re-prepare under Move A");
    const contract = await superAdmin.contracts.prepare({ customerId: "cust-a3", schemeId: "scheme-move-a", customerAccepted: true, reservationDate: "2026-11-10" });
    expect(contract).toMatchObject({ priceCentavos: pesos(312000), priceStatus: "contract_stated", paymentCode: "T04", preparedBy: "dev-super-admin", arrangement: null });
    expect(contract.schedule.slice(1).map((line) => line.amountCentavos)).toEqual([pesos(75500), pesos(75500), pesos(75500), pesos(75500)]);
    expect(contract.holds.some((hold) => /arrangement/.test(hold))).toBe(false);
  });

  it("keeps Super Admin arrangement approval for pre-resolution legacy contracts", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    const superAdmin = as(store, "dev-super-admin");
    await admin.contracts.cancel("ctr-4", "Re-prepare under Move B");
    const prepared = await admin.contracts.prepare({ customerId: "cust-a4", schemeId: "scheme-move-b", customerAccepted: true, reservationDate: "2026-11-10" });
    expect(prepared.arrangement).toBeNull();
    const legacy = JSON.parse(JSON.stringify(store.contracts.find((c) => c.id === prepared.id)!));
    legacy.id = "ctr-legacy-arr";
    legacy.paymentCode = null;
    legacy.arrangement = { schemeLabel: "Move B", status: "pending", approvedBy: null, approvedAt: null, approvalReference: null };
    await admin.contracts.cancel(prepared.id, "Superseded by legacy fixture");
    store.contracts.push(legacy);

    await expect(admin.contracts.approveArrangement(legacy.id, "Memo 12")).rejects.toThrow(/Super Administrator/);
    await expect(superAdmin.contracts.approveArrangement(legacy.id, "  ")).rejects.toThrow(/reference/);
    const approved = await superAdmin.contracts.approveArrangement(legacy.id, "Memo 12");
    expect(approved.arrangement).toMatchObject({ status: "approved", approvedBy: "dev-super-admin", approvalReference: "Memo 12" });
    expect(approved.holds.some((hold) => /arrangement/.test(hold))).toBe(false);
    expect(store.auditEvents.some((e) => e.action === "CONTRACT_ARRANGEMENT_APPROVED" && e.entityId === legacy.id)).toBe(true);

    await admin.contracts.submit(legacy.id);
    const finalized = await admin.contracts.finalize(legacy.id);
    expect(finalized.status).toBe("finalized");
    expect(finalized.paymentCode).toBeNull();
  });

  it("resolves the Card ID payment code per tier at prepare (Move A T04; Move B T04/T08/T12; Spot C01; installment T04)", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    const finance = as(store, "dev-finance");
    await admin.contracts.requestCancellation("ctr-1", "voluntary_withdrawal", "Matrix test frees S1");
    await finance.contracts.decideCancellation("ctr-1", "confirm", "Forfeiture per Reservation Agreement");
    await admin.contracts.cancel("ctr-3", "Matrix test frees G1");
    await admin.contracts.cancel("ctr-4", "Matrix test frees B1");

    const check = async (customerId: string, schemeId: string, expected: string) => {
      const prepared = await admin.contracts.prepare({ customerId, schemeId, customerAccepted: true });
      expect(prepared.paymentCode).toBe(expected);
      expect(prepared.arrangement).toBeNull();
      await admin.contracts.cancel(prepared.id, "Matrix next");
    };

    await check("cust-a4", "scheme-move-a", "T04");
    await check("cust-a4", "scheme-move-b", "T04");
    await check("cust-a4", "scheme-spot-cash", "C01");
    await check("cust-a4", "scheme-installment-4m", "T04");
    await check("cust-a1", "scheme-move-a", "T04");
    await check("cust-a1", "scheme-move-b", "T08");
    await check("cust-a3", "scheme-move-a", "T04");
    await check("cust-a3", "scheme-move-b", "T12");
  });

  it("finalizes a standard Move B Gold contract with no arrangement hold (G1 T12)", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    await admin.contracts.cancel("ctr-3", "Re-prepare Move B Gold");
    const prepared = await admin.contracts.prepare({ customerId: "cust-a3", schemeId: "scheme-move-b", customerAccepted: true });
    expect(prepared).toMatchObject({ priceCentavos: pesos(390000), paymentCode: "T12", arrangement: null });
    expect(prepared.holds.some((hold) => /arrangement/.test(hold))).toBe(false);
    await admin.contracts.submit(prepared.id);
    await admin.contracts.startReview(prepared.id);
    const finalized = await admin.contracts.finalize(prepared.id);
    expect(finalized.status).toBe("finalized");
    expect(finalized.paymentCode).toBe("T12");
  });

  it("activates a fully paid Move B Gold contract with a G1T12S Card ID", async () => {
    const store = createMockStore();
    const superAdmin = as(store, "dev-super-admin");
    const finance = as(store, "dev-finance");
    await superAdmin.contracts.cancel("ctr-3", "Re-prepare Move B Gold");
    const prepared = await superAdmin.contracts.prepare({ customerId: "cust-a3", schemeId: "scheme-move-b", customerAccepted: true });
    await superAdmin.contracts.submit(prepared.id);
    await superAdmin.contracts.finalize(prepared.id);
    const full = await superAdmin.payments.submit({ contractId: prepared.id, purpose: "full", amountCentavos: pesos(390000), method: "Bank Transfer", paidDate: manilaToday(), referenceNo: "MOVE-B-GOLD-FULL" });
    await finance.payments.verify(full.id);
    expect(store.sales.find((s) => s.contractId === prepared.id)!.status).toBe("confirmed");
    await superAdmin.contracts.recordRaNumber(prepared.id, "2026-0011");
    const membership = store.memberships.find((m) => m.contractId === prepared.id)!;
    const active = await finance.memberships.activate(membership.id);
    const today = manilaToday().replace(/-/g, "").slice(2);
    expect(active.cardId).toBe(`${today}00011G1T12S`);
    expect(active.cardId).toMatch(/^\d{6}0\d{4}G1T12S$/);
  });

  it("resolves the payment code on a finalized pre-resolution legacy contract", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    await admin.contracts.cancel("ctr-4", "Re-prepare under Move B");
    const prepared = await admin.contracts.prepare({ customerId: "cust-a4", schemeId: "scheme-move-b", customerAccepted: true });
    await admin.contracts.submit(prepared.id);
    await admin.contracts.finalize(prepared.id);
    expect(store.contracts.find((c) => c.id === prepared.id)!.paymentCode).toBe("T04");
    store.contracts.find((c) => c.id === prepared.id)!.paymentCode = null;
    const resolved = await admin.contracts.resolvePaymentCode(prepared.id, "Owner mapping 2026-11-10");
    expect(resolved.paymentCode).toBe("T04");
    expect(store.auditEvents.some((e) => e.action === "CONTRACT_PAYMENT_CODE_RESOLVED" && e.entityId === prepared.id)).toBe(true);
    await expect(admin.contracts.resolvePaymentCode(prepared.id, "Again")).rejects.toThrow(/already/);
  });

  it("guards payment code resolution (approver, reference, cancelled, issued card, resolved)", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    const owner = as(store, "dev-ost-a2");
    await admin.contracts.cancel("ctr-4", "Free B1");
    const prepared = await admin.contracts.prepare({ customerId: "cust-a4", schemeId: "scheme-move-b", customerAccepted: true });
    store.contracts.find((c) => c.id === prepared.id)!.paymentCode = null;
    await expect(admin.contracts.resolvePaymentCode(prepared.id, "   ")).rejects.toThrow(/reference|Enter/);
    await expect(owner.contracts.resolvePaymentCode(prepared.id, "Ref")).rejects.toThrow();
    await admin.contracts.cancel(prepared.id, "Cancel for guard");
    await expect(admin.contracts.resolvePaymentCode(prepared.id, "Ref")).rejects.toThrow(/cancelled/);
    await admin.contracts.cancel("ctr-3", "Free G1");
    const gold = await admin.contracts.prepare({ customerId: "cust-a3", schemeId: "scheme-move-b", customerAccepted: true });
    expect(gold.paymentCode).toBe("T12");
    await expect(admin.contracts.resolvePaymentCode(gold.id, "Ref")).rejects.toThrow(/already/);
    store.contracts.find((c) => c.id === "ctr-2")!.paymentCode = null;
    await expect(admin.contracts.resolvePaymentCode("ctr-2", "Ref")).rejects.toThrow(/already issued|Card ID/);
  });

  it("validates scheme amounts and records each configuration version", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    await expect(admin.products.updateScheme("scheme-installment-4m", { installmentCentavosByTier: { B1: pesos(15000), S1: pesos(57500), G1: pesos(95000) } }, "Typo")).rejects.toThrow(/must equal the package price/);
    await expect(admin.products.updateScheme("scheme-spot-cash", { reservationCentavos: 0 }, "Bad")).rejects.toThrow(/positive amount/);
    const updated = await admin.products.updateScheme("scheme-spot-cash", { paymentCode: "C01", applicableTiers: ["B1", "S1"] }, "Gold withdrawn by memo");
    expect(updated.configVersion).toBe(3);
    expect(updated.changes.at(-1)).toMatchObject({ version: 3, reason: "Gold withdrawn by memo", summary: "applicableTiers" });
  });

  it("releases a payout only at 40% of the contract value verified (OD-4)", async () => {
    const contract = { priceCentavos: 1_000 };
    const paid = (amountCentavos: number) => [{ status: "verified", amountCentavos, adjustments: [] }] as unknown as Payment[];
    expect(meetsPayoutRelease(contract, paid(399))).toBe(false);
    expect(meetsPayoutRelease(contract, paid(400))).toBe(true);
    expect(meetsPayoutRelease(contract, paid(401))).toBe(true);

    const store = createMockStore();
    const finance = as(store, "dev-finance");
    const [commission] = await finance.commissions.approve({ saleId: "sale-1", entries: [{ memberId: "mem-ost-a1", percentBp: 500 }] });
    await expect(finance.commissions.recordPayout(commission.id, { reference: "P1", payoutDate: manilaToday() })).rejects.toThrow(/40%.*currently 28%/);
    expect(store.commissions.find((c) => c.id === commission.id)!.payout).toBeNull();
    const ma2 = await as(store, "dev-ost-a1").payments.submit({ contractId: "ctr-1", purpose: "installment", amountCentavos: pesos(57500), method: "Cash", paidDate: manilaToday(), referenceNo: "MA2" });
    await finance.payments.verify(ma2.id);
    const view = (await finance.commissions.list()).find((c) => c.id === commission.id)!;
    expect(view.payoutReleaseDate).toBe(startOfNextMonthDate(manilaToday()));
    await expect(finance.commissions.recordPayout(commission.id, { reference: "P1", payoutDate: manilaToday() })).rejects.toThrow(/release opens on/);
    ageVerifications(store, "ctr-1");
    const releaseDate = (await finance.commissions.list()).find((item) => item.id === commission.id)!.payoutReleaseDate!;
    const earlyPayoutDate = addDaysToDate(releaseDate, -1)!;
    await expect(finance.commissions.recordPayout(commission.id, { reference: "P1", payoutDate: earlyPayoutDate })).rejects.toThrow(/payout date.*release/i);
    expect((await finance.commissions.recordPayout(commission.id, { reference: "P1", payoutDate: manilaToday() })).payout?.reference).toBe("P1");
  });

  it("requires a verifiable threshold date before recording a payout", async () => {
    const store = createMockStore();
    const finance = as(store, "dev-finance");
    const [commission] = await finance.commissions.approve({ saleId: "sale-1", entries: [{ memberId: "mem-ost-a1", percentBp: 500 }] });
    const payment = await as(store, "dev-ost-a1").payments.submit({ contractId: "ctr-1", purpose: "installment", amountCentavos: pesos(57500), method: "Cash", paidDate: manilaToday(), referenceNo: "MA2" });
    await finance.payments.verify(payment.id);
    store.payments.find((item) => item.id === payment.id)!.verifiedDate = null;

    await expect(finance.commissions.recordPayout(commission.id, { reference: "P1", payoutDate: manilaToday() })).rejects.toThrow(/verification date/i);
    expect(store.commissions.find((item) => item.id === commission.id)?.payout).toBeNull();
  });

  it("routes cancellation of a contract with verified money through an Admin request and a Finance decision (OD-2)", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    const finance = as(store, "dev-finance");
    const [commission] = await finance.commissions.approve({ saleId: "sale-1", entries: [{ memberId: "mem-ost-a1", percentBp: 500 }] });

    await expect(admin.contracts.cancel("ctr-1", "Customer withdrew")).rejects.toThrow(/Request a cancellation/);
    await expect(admin.contracts.requestCancellation("ctr-1", "other" as never, "x")).rejects.toThrow(/ground/);
    await expect(admin.contracts.requestCancellation("ctr-1", "voluntary_withdrawal", " ")).rejects.toThrow(/reason/);
    await expect(admin.contracts.requestCancellation("ctr-3", "voluntary_withdrawal", "No money yet")).rejects.toThrow(/no verified payments/);
    await expect(admin.contracts.requestCancellation("ctr-2", "voluntary_withdrawal", "Active card")).rejects.toThrow(/Active membership/);
    await expect(finance.contracts.requestCancellation("ctr-1", "voluntary_withdrawal", "Finance cannot request")).rejects.toThrow();

    await admin.contracts.requestCancellation("ctr-1", "voluntary_withdrawal", "Customer withdrew in writing");
    await expect(admin.contracts.requestCancellation("ctr-1", "non_payment", "Again")).rejects.toThrow(/already awaiting/);
    await expect(admin.contracts.decideCancellation("ctr-1", "confirm", "Admin cannot confirm")).rejects.toThrow(/Only Finance/);
    expect(store.contracts.find((c) => c.id === "ctr-1")!.status).toBe("finalized");

    const cancelled = await finance.contracts.decideCancellation("ctr-1", "confirm", "Forfeiture per Reservation Agreement");
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancellation).toMatchObject({ status: "confirmed", ground: "voluntary_withdrawal", decidedBy: "dev-finance", forfeitedCentavos: pesos(67500) });
    const sale = store.sales.find((s) => s.id === "sale-1")!;
    expect(sale.status).toBe("cancelled");
    expect(sale.adjustments.at(-1)).toMatchObject({ amountCentavos: -sale.valueCentavos, date: manilaToday() });
    expect(store.commissions.find((c) => c.id === commission.id)).toMatchObject({ status: "on_hold", holdReason: "The contract was cancelled with forfeiture." });
    expect(store.memberships.find((m) => m.contractId === "ctr-1")!.status).toBe("cancelled");
    expect(store.payments.filter((p) => p.contractId === "ctr-1").map((p) => p.status)).toEqual(["verified", "verified"]);
    const actions = store.auditEvents.filter((e) => e.relatedRecordIds?.includes("ctr-1") || e.entityId === "ctr-1").map((e) => e.action);
    const cancellationActions = ["CONTRACT_CANCELLATION_REQUESTED", "CONTRACT_CANCELLED", "PAYMENTS_FORFEITED", "SALE_CANCELLED", "MEMBERSHIP_CANCELLED"];
    expect(actions.filter((action) => cancellationActions.includes(action))).toEqual(cancellationActions);
    await expect(finance.contracts.decideCancellation("ctr-1", "confirm", "Twice")).rejects.toThrow(/No cancellation is awaiting/);
    expect(sale.adjustments.filter((entry) => entry.kind === "reversal")).toHaveLength(1);
    for (const action of ["CONTRACT_CANCELLED", "PAYMENTS_FORFEITED", "SALE_CANCELLED", "MEMBERSHIP_CANCELLED"]) {
      expect(store.auditEvents.filter((event) => event.action === action && (event.entityId === "ctr-1" || event.relatedRecordIds?.includes("ctr-1")))).toHaveLength(1);
    }
  });

  it("lets a requester with Finance authority decide their own cancellation request, flagged in the history (authority rule)", async () => {
    const store = createMockStore();
    // Admin + Finance authority: may both request and decide; the history flags the self-decision.
    const adminFinance: DevIdentity = { id: "test-admin-finance", displayName: "Admin Finance (Test)", roles: ["admin", "finance"], memberId: null, branchId: null, status: "active" };
    const both = createMockRepositories(store, () => adminFinance);
    await both.contracts.requestCancellation("ctr-1", "non_payment", "Missed MA2");
    const declined = await both.contracts.decideCancellation("ctr-1", "decline", "Customer paid MA2");
    expect(declined.cancellation).toBeNull();
    expect(store.contracts.find((c) => c.id === "ctr-1")!.history.some((h) => (h.note ?? "").includes("Self-approved"))).toBe(true);
    expect(declined.status).toBe("finalized");
    expect(store.sales.find((s) => s.id === "sale-1")!.status).toBe("confirmed");
    expect(store.auditEvents.some((e) => e.action === "CONTRACT_CANCELLATION_DECLINED" && e.entityId === "ctr-1")).toBe(true);
  });

  it("lets a Super Admin requester decide their own cancellation request", async () => {
    const store = createMockStore();
    const superAdmin = as(store, "dev-super-admin");
    await superAdmin.contracts.requestCancellation("ctr-1", "non_payment", "Missed MA2");
    // Owner decision 2026-11-10: Super Admin has full control, so the requester check does not apply.
    const confirmed = await superAdmin.contracts.decideCancellation("ctr-1", "confirm", "Forfeiture per Reservation Agreement");
    expect(confirmed.status).toBe("cancelled");
    expect(confirmed.cancellation).toMatchObject({ status: "confirmed", ground: "non_payment", decidedBy: "dev-super-admin", forfeitedCentavos: pesos(67500) });
    expect(store.sales.find((s) => s.id === "sale-1")!.status).toBe("cancelled");
  });

  it("still cancels a contract with no verified money directly", async () => {
    const store = createMockStore();
    expect((await as(store, "dev-admin").contracts.cancel("ctr-3", "Customer withdrew before paying")).status).toBe("cancelled");
  });

  it("prices Gold exactly across all four schemes", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    await admin.contracts.cancel("ctr-3", "Re-prepare Gold across schemes");

    const spotCash = await admin.contracts.prepare({ customerId: "cust-a3", schemeId: "scheme-spot-cash", customerAccepted: true, reservationDate: "2026-11-10" });
    expect(spotCash).toMatchObject({ priceCentavos: pesos(312000), priceStatus: "contract_stated" });
    expect(spotCash.holds.filter((hold) => /price is in conflict/.test(hold))).toHaveLength(0);
    expect(spotCash.schedule.map((line) => [line.label, line.amountCentavos, line.dueDate])).toEqual([
      ["Reservation fee", pesos(10000), "2026-11-10"],
      ["Balance", pesos(302000), "2026-11-17"],
    ]);
    await admin.contracts.cancel(spotCash.id, "Next scheme");

    const moveA = await admin.contracts.prepare({ customerId: "cust-a3", schemeId: "scheme-move-a", customerAccepted: true, reservationDate: "2026-11-10" });
    expect(moveA).toMatchObject({ priceCentavos: pesos(312000), priceStatus: "contract_stated" });
    expect(moveA.holds.filter((hold) => /price is in conflict/.test(hold))).toHaveLength(0);
    await admin.contracts.cancel(moveA.id, "Next scheme");

    const installment = await admin.contracts.prepare({ customerId: "cust-a3", schemeId: "scheme-installment-4m", customerAccepted: true, reservationDate: "2026-11-10" });
    expect(installment).toMatchObject({ priceCentavos: pesos(390000), priceStatus: "contract_stated" });
    expect(installment.holds.filter((hold) => /price is in conflict/.test(hold))).toHaveLength(0);
    await admin.contracts.cancel(installment.id, "Next scheme");

    const moveB = await admin.contracts.prepare({ customerId: "cust-a3", schemeId: "scheme-move-b", customerAccepted: true, reservationDate: "2026-11-10" });
    expect(moveB).toMatchObject({ priceCentavos: pesos(390000), priceStatus: "contract_stated", paymentCode: "T12", arrangement: null });
    expect(moveB.holds.filter((hold) => /price is in conflict/.test(hold))).toHaveLength(0);
    expect(moveB.holds.filter((hold) => /arrangement/.test(hold))).toHaveLength(0);
  });

  it("keeps a conflict through ordinary edits and clears it only via explicit status resolution", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");

    const flagged = await admin.products.update("S1", { priceStatus: "conflict" }, "Test: flag conflict");
    expect(flagged).toMatchObject({ priceStatus: "conflict", configVersion: 2 });

    const edited = await admin.products.update("S1", { priceCentavos: pesos(241000) }, "Test: ordinary price edit");
    expect(edited).toMatchObject({ priceStatus: "conflict", configVersion: 3 });

    const resolved = await admin.products.update("S1", { priceStatus: "contract_stated" }, "Test: resolution");
    expect(resolved).toMatchObject({ priceStatus: "contract_stated", configVersion: 4 });
    expect(resolved.changes.at(-1)).toMatchObject({ version: 4, reason: "Test: resolution" });

    expect(store.contracts.find((c) => c.id === "ctr-3")).toMatchObject({ priceStatus: "contract_stated" });
    expect(store.contracts.find((c) => c.id === "ctr-1")?.status).toBe("finalized");
    expect(store.contracts.find((c) => c.id === "ctr-2")?.status).toBe("finalized");
  });
});

describe("public accreditation verification", () => {
  it("never certifies an expired, superseded or ambiguous accreditation, for IST and OST alike", async () => {
    const store = createMockStore();
    const publicRepo = as(store, "dev-inactive").accreditations;
    const ist = store.accreditations.find((r) => r.id === "accr-seed-1")!;
    const ost = store.accreditations.find((r) => r.id === "accr-seed-4")!;
    Object.assign(ist, { adminStatus: "active", expiryDate: "2099-12-31" });
    Object.assign(ost, { adminStatus: "active", expiryDate: "2099-12-31" });
    expect(await publicRepo.verifyPublic(ist.aaNumber!)).toMatchObject({ classification: "IST", validUntil: null });
    expect(await publicRepo.verifyPublic(ost.aaNumber!)).toMatchObject({ classification: "OST", validUntil: "2099-12-31" });

    ist.expiryDate = "2020-01-01";
    ost.expiryDate = "2020-01-01";
    expect(await publicRepo.verifyPublic(ist.aaNumber!)).toBeNull();
    expect(await publicRepo.verifyPublic(ost.aaNumber!)).toBeNull();

    ist.expiryDate = "2099-12-31";
    store.accreditations.push({ ...ist, id: "accr-newer", aaNumber: "AAI99990001", effectiveDate: "2098-01-01", history: [] });
    expect(await publicRepo.verifyPublic(ist.aaNumber!)).toBeNull();
    store.accreditations.find((r) => r.id === "accr-newer")!.effectiveDate = ist.effectiveDate;
    expect(await publicRepo.verifyPublic(ist.aaNumber!)).toBeNull();
  });
});

describe("stay points reconciliation", () => {
  it("keeps points pending if excluding held and voided spend puts the cycle below its minimum", async () => {
    const store = createMockStore();
    store.resortSpends.find((spend) => spend.id === "rs-2")!.amountCentavos = pesos(500);
    const finance = as(store, "dev-finance");
    const before = (await finance.stayPoints.list()).find((record) => record.membershipId === "memb-1")!;
    expect(before.ledger.balances).toMatchObject({ pending: 900, held: 500, spendableWeekday: 0, spendableWeekend: 0 });

    const after = await finance.stayPoints.reconcileHold("rs-3", "void", "Refund confirmed");
    expect(after.ledger.cycles[0]).toMatchObject({ verifiedSpendCentavos: pesos(900), minimumReached: false });
    expect(after.ledger.balances).toMatchObject({ pending: 900, held: 0, spendableWeekday: 0, spendableWeekend: 0 });
    expect(after.ledger.entries).toContainEqual(expect.objectContaining({ spendId: "rs-3", status: "voided" }));
  });

  it("lets only Finance reconcile held points", async () => {
    const store = createMockStore();
    await expect(as(store, "dev-admin").stayPoints.reconcileHold("rs-3", "release", "ok")).rejects.toThrow();
    const result = await as(store, "dev-finance").stayPoints.reconcileHold("rs-3", "release", "Refund reversed");
    expect(result.ledger.balances.held).toBe(0);
    expect(result.ledger.balances.spendableWeekday).toBe(1050);
  });
});
