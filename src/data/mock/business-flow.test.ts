import { describe, expect, it } from "vitest";
import { CustomerValidationError } from "@/data/contracts/customer-repository";
import { meetsPayoutRelease, PAYOUT_RELEASE_WAIT_DAYS } from "@/modules/commissions/rules";
import { buildScheduleState } from "@/modules/finance/rules";
import type { Payment } from "@/modules/finance/types";
import { buildCardId, extractRaSequence } from "@/modules/membership/rules";
import { computePointsLedger } from "@/modules/stay-points/engine";
import { confirmedValueInPeriod, totalsFor } from "@/modules/sales/rules";
import { addDaysToDate, manilaToday } from "@/shared/lib/dates";
import { pesos } from "@/shared/lib/money";
import { getDevIdentity } from "./dev-identities";
import { createMockRepositories } from "./repositories";
import { createMockStore } from "./seed";

function as(store: ReturnType<typeof createMockStore>, id: string) {
  return createMockRepositories(store, () => getDevIdentity(id));
}

/** Verifies ctr-1 installment MA2: Silver 240,000 moves from 67,500 (28%) to 125,000 (52%) verified, past the 40% payout release (OD-4). */
async function collectMa2(store: ReturnType<typeof createMockStore>) {
  const payment = await as(store, "dev-ost-a1").payments.submit({ contractId: "ctr-1", purpose: "installment", amountCentavos: pesos(57500), method: "Cash", paidDate: manilaToday(), referenceNo: "MA2" });
  await as(store, "dev-finance").payments.verify(payment.id);
  ageVerifications(store, "ctr-1");
  return payment.id;
}

/** Moves a contract's verification dates back 8 days so the 7-day payout release has passed. */
function ageVerifications(store: ReturnType<typeof createMockStore>, contractId: string) {
  const past = addDaysToDate(manilaToday(), -8)!;
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

  it("holds Gold finalization on the price conflict and denies IST finalization", async () => {
    const store = createMockStore();
    await expect(as(store, "dev-admin").contracts.finalize("ctr-3")).rejects.toThrow(/conflict/i);
    await expect(as(store, "dev-sm-a").contracts.finalize("ctr-3")).rejects.toThrow();
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
    expect(store.commissions[0].status).toBe("approved");
    await expect(finance.commissions.recordPayout(commission.id, { reference: "PAYREF2", payoutDate: manilaToday() })).rejects.toThrow(/duplicate/i);
    await finance.commissions.confirmPayout(commission.id);
    expect(store.commissions[0].status).toBe("paid");
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

  it("does not let the person who corrected a returned payment verify it", async () => {
    const store = createMockStore();
    const finance = as(store, "dev-finance");
    const superAdmin = as(store, "dev-super-admin");
    await finance.payments.returnForCorrection("pay-4", "Wrong date");
    await superAdmin.payments.resubmit("pay-4", { paidDate: "2026-11-06" });
    expect(store.payments.find((p) => p.id === "pay-4")!.submittedBy).toBe("dev-ost-a2");
    await expect(superAdmin.payments.verify("pay-4")).rejects.toThrow(/submitted or corrected/);
    expect((await finance.payments.verify("pay-4")).status).toBe("verified");
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
    await admin.customers.correct("cust-a1", { displayName: customer.displayName, customerNumber: "CUST-9001" }, "Typo in Customer ID");
    const corrected = store.auditEvents.filter((e) => e.action === "CUSTOMER_CORRECTED").at(-1)!;
    expect(corrected.previousValue).toBe(`customerNumber:${before ?? "none"}`);
    expect(corrected.newValue).toBe("customerNumber:CUST-9001");
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

describe("owner-decided restrictions (C2)", () => {
  it("never refunds the Reservation Fee but still allows a reversal (OD-12)", async () => {
    const store = createMockStore();
    const finance = as(store, "dev-finance");
    await expect(finance.payments.adjust("pay-1", { kind: "refund", amountCentavos: pesos(10000), reason: "Customer asked" })).rejects.toThrow(/non-refundable/);
    expect(store.payments.find((p) => p.id === "pay-1")!.adjustments).toEqual([]);
    const reversed = await finance.payments.adjust("pay-1", { kind: "reversal", amountCentavos: pesos(10000), reason: "Bank error" });
    expect(reversed.adjustments.at(-1)?.kind).toBe("reversal");
  });

  it("keeps Spot Cash unavailable without touching the finalized Spot Cash contract (OD-11)", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    await admin.contracts.cancel("ctr-3", "Free the customer for a new contract");
    await expect(admin.contracts.prepare({ customerId: "cust-a3", schemeId: "scheme-spot-cash", customerAccepted: true })).rejects.toThrow(/not available/);
    expect((await admin.contracts.prepare({ customerId: "cust-a3", schemeId: "scheme-installment-4m", customerAccepted: true })).schemeId).toBe("scheme-installment-4m");
    await admin.products.updateScheme("scheme-spot-cash", { availability: "available" }, "Try to reopen");
    expect(store.paymentSchemes.find((s) => s.id === "scheme-spot-cash")!.availability).toBe("unavailable");
    expect(store.contracts.find((c) => c.id === "ctr-2")).toMatchObject({ status: "finalized", paymentCode: "C01" });
    expect(store.memberships.find((m) => m.id === "memb-1")!.cardId).toBe("26110200001B1C01S");
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
    expect(view.payoutReleaseDate).toBe(addDaysToDate(manilaToday(), PAYOUT_RELEASE_WAIT_DAYS));
    await expect(finance.commissions.recordPayout(commission.id, { reference: "P1", payoutDate: manilaToday() })).rejects.toThrow(/release opens on/);
    ageVerifications(store, "ctr-1");
    expect((await finance.commissions.recordPayout(commission.id, { reference: "P1", payoutDate: manilaToday() })).payout?.reference).toBe("P1");
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
    expect(actions).toEqual(expect.arrayContaining(["CONTRACT_CANCELLATION_REQUESTED", "CONTRACT_CANCELLED", "PAYMENTS_FORFEITED", "SALE_CANCELLED", "MEMBERSHIP_CANCELLED"]));
    await expect(finance.contracts.decideCancellation("ctr-1", "confirm", "Twice")).rejects.toThrow(/No cancellation is awaiting/);
  });

  it("lets Finance decline a request, and never lets the requester decide it", async () => {
    const store = createMockStore();
    const superAdmin = as(store, "dev-super-admin");
    await superAdmin.contracts.requestCancellation("ctr-1", "non_payment", "Missed MA2");
    await expect(superAdmin.contracts.decideCancellation("ctr-1", "confirm", "Self")).rejects.toThrow(/cannot also decide/);
    const declined = await as(store, "dev-finance").contracts.decideCancellation("ctr-1", "decline", "Customer paid MA2");
    expect(declined.cancellation).toBeNull();
    expect(declined.status).toBe("finalized");
    expect(store.sales.find((s) => s.id === "sale-1")!.status).toBe("confirmed");
    expect(store.auditEvents.some((e) => e.action === "CONTRACT_CANCELLATION_DECLINED" && e.entityId === "ctr-1")).toBe(true);
  });

  it("still cancels a contract with no verified money directly", async () => {
    const store = createMockStore();
    expect((await as(store, "dev-admin").contracts.cancel("ctr-3", "Customer withdrew before paying")).status).toBe("cancelled");
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
  it("lets only Finance reconcile held points", async () => {
    const store = createMockStore();
    await expect(as(store, "dev-admin").stayPoints.reconcileHold("rs-3", "release", "ok")).rejects.toThrow();
    const result = await as(store, "dev-finance").stayPoints.reconcileHold("rs-3", "release", "Refund reversed");
    expect(result.ledger.balances.held).toBe(0);
    expect(result.ledger.balances.spendableWeekday).toBe(1050);
  });
});
