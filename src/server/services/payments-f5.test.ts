// @vitest-environment node
// F5: receipt decisions, counted dates, reversals/refunds, month close, unmatched receipts and import batches.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { configureEmulatorEnv, emulatorsUp, sessionCookieFor } from "@/server/testing/emulator";
import { manilaToday } from "@/shared/lib/dates";

configureEmulatorEnv();
const up = await emulatorsUp();
const { MOCK_ACCOUNTS } = await import("@/data/mock/mock-credentials");
const account = (identityId: string) => MOCK_ACCOUNTS.find((row) => row.identityId === identityId)!;

describe.skipIf(!up)("finance receipt decisions and closed months (emulators)", () => {
  let payments: typeof import("@/server/services/payments");
  let contracts: typeof import("@/server/services/contracts");
  let sales: typeof import("@/server/services/sales");
  let catalog: typeof import("@/server/repositories/catalog");
  let records: typeof import("@/server/repositories/records");
  let db: typeof import("@/server/db");
  let auth: typeof import("@/server/auth/actor");
  let admin: Awaited<ReturnType<typeof import("@/server/auth/actor").requireActor>>;
  let clerk: typeof admin;
  let finance: typeof admin;
  const suffix = Date.now();
  let contractId: string | null = null;
  let contractPrice = 0;
  let reservationCentavos = 0;
  let installmentCentavos = 0;
  let closedMonthCreated = false;
  const paymentIds: string[] = [];
  const unmatchedIds: string[] = [];
  const batchIds: string[] = [];

  beforeAll(async () => {
    payments = await import("@/server/services/payments");
    contracts = await import("@/server/services/contracts");
    sales = await import("@/server/services/sales");
    catalog = await import("@/server/repositories/catalog");
    records = await import("@/server/repositories/records");
    db = await import("@/server/db");
    auth = await import("@/server/auth/actor");
    const session = await import("@/app/api/v1/session/route");
    const cookie = async (identityId: string) => (await auth.resolveActorFromSessionCookie(await sessionCookieFor(session.POST, account(identityId).email, account(identityId).password)))!;
    admin = await cookie("dev-admin");
    clerk = await cookie("dev-clerk");
    finance = await cookie("dev-finance");
    // Keep the suite rerunnable: a previous run may have closed the test month.

    const [products, schemes, customerRows, contractRows] = await Promise.all([
      catalog.loadProducts(), catalog.loadPaymentSchemes(),
      db.dbRead<{ customers: Array<{ id: string; ownerMember: { id: string } | null }> }>(`query { customers(where: { status: { eq: "approved" } }, limit: 100) { id ownerMember { id } } }`),
      db.dbRead<{ contracts: Array<{ customer: { id: string } | null }> }>(`query { contracts { customer { id } } }`),
    ]);
    const used = new Set(contractRows.contracts.map((row) => row.customer?.id));
    const customer = customerRows.customers.find((row) => !used.has(row.id))!;
    const product = products.find((item) => item.code === "B1") ?? products[0];
    const scheme = schemes.find((item) => item.id === "scheme-installment-4m")
      ?? schemes.find((item) => item.category !== "cash" && item.availability === "available" && item.applicableTiers.includes(product.code))!;
    const contract = await contracts.prepareContract(clerk, { customerId: customer.id, schemeId: scheme.id, productCode: product.code, customerAccepted: true, sellerMemberId: customer.ownerMember?.id });
    contractId = contract.id;
    contractPrice = contract.priceCentavos;
    reservationCentavos = contract.schedule.find((line) => line.purpose === "reservation")?.amountCentavos ?? 0;
    installmentCentavos = contract.schedule.find((line) => line.purpose === "installment")?.amountCentavos ?? 1;
    const submitted = await contracts.submitContract(clerk, contract.id);
    if (submitted.sale) await sales.approveSale(admin, submitted.sale.id);
  }, 90_000);

  afterAll(async () => {
    for (const id of paymentIds) {
      await db.dbWrite(`mutation($id: UUID!) { paymentAdjustment_deleteMany(where: { payment: { id: { eq: $id } } }) }`, { id }).catch(() => undefined);
      await db.dbWrite(`mutation($id: UUID!) { payment_delete(id: $id) }`, { id }).catch(() => undefined);
    }
    for (const id of unmatchedIds) await db.dbWrite(`mutation($id: UUID!) { unmatchedReceipt_delete(id: $id) }`, { id }).catch(() => undefined);
    for (const id of batchIds) await db.dbWrite(`mutation($id: UUID!) { receiptImportBatch_delete(id: $id) }`, { id }).catch(() => undefined);
    if (contractId) {
      await db.dbWrite(`mutation($c: UUID!) { saleAdjustment_deleteMany(where: { sale: { contract: { id: { eq: $c } } } }) }`, { c: contractId }).catch(() => undefined);
      await db.dbWrite(`mutation($c: UUID!) { sale_deleteMany(where: { contract: { id: { eq: $c } } }) }`, { c: contractId }).catch(() => undefined);
      await db.dbWrite(`mutation($id: UUID!) { contract_delete(id: $id) }`, { id: contractId }).catch(() => undefined);
    }
    if (closedMonthCreated) await db.dbWrite(`mutation { closedMonth_deleteMany(where: { month: { eq: "2026-08" } }) }`).catch(() => undefined);
  });

  it("returns, resubmits, rejects and verifies a receipt", async () => {
    const submitted = await payments.submitPayment(clerk, { contractId: contractId!, purpose: "reservation", amountCentavos: reservationCentavos, method: "Cash", paidDate: manilaToday() });
    paymentIds.push(submitted.id);
    expect(submitted.status).toBe("submitted");
    expect(submitted.documentNo).toBeTruthy();

    const returned = await payments.returnPayment(finance, submitted.id, "The receipt image is unreadable.");
    expect(returned.status).toBe("returned");
    const resubmitted = await payments.resubmitPayment(clerk, submitted.id, { documentNo: returned.documentNo });
    expect(resubmitted.status).toBe("submitted");
    await payments.rejectPayment(finance, submitted.id, "Wrong receipt date.");
    await expect(payments.verifyPayment(finance, submitted.id)).rejects.toMatchObject({ status: 409 });

    const installment = await payments.submitPayment(clerk, { contractId: contractId!, purpose: "installment", amountCentavos: installmentCentavos, method: "Bank Transfer", paidDate: manilaToday(), bankId: "ref-bank-1" });
    paymentIds.push(installment.id);
    const verified = await payments.verifyPayment(finance, installment.id);
    expect(verified.payment.status).toBe("verified");
    expect(verified.payment.countedDate).toBe(manilaToday());
    const auditRows = await db.dbRead<{ auditEvents: Array<{ action: string }> }>(`query($id: String!) { auditEvents(where: { entityId: { eq: $id } }) { action } }`, { id: installment.id });
    expect(auditRows.auditEvents.some((row) => row.action === "PAYMENT_VERIFIED")).toBe(true);
    await expect(payments.verifyPayment(finance, installment.id)).rejects.toMatchObject({ status: 409 });
  }, 60_000);

  it("counts a receipt admitted after its month closed in the first open month", async () => {
    const month = "2026-08";
    const beforeClose = !(await payments.listClosedMonths(finance)).some((entry) => entry.month === month);
    closedMonthCreated = beforeClose;
    if (beforeClose) {
      const before = await payments.submitPayment(clerk, { contractId: contractId!, purpose: "installment", amountCentavos: 500_000, method: "Cash", paidDate: "2026-08-15" });
      paymentIds.push(before.id);
      const verified = await payments.verifyPayment(finance, before.id);
      expect(verified.payment.countedDate).toBe("2026-08-15");
    }

    const closed = await payments.closeMonth(admin, month);
    expect(closed.month).toBe(month);
    const again = await payments.closeMonth(admin, month);
    expect(again.closedAt).toBe(closed.closedAt);
    await expect(payments.closeMonth(admin, manilaToday().slice(0, 7))).rejects.toMatchObject({ status: 422 });
    const months = await payments.listClosedMonths(finance);
    expect(months.some((entry) => entry.month === month)).toBe(true);

    const late = await payments.submitPayment(clerk, { contractId: contractId!, purpose: "installment", amountCentavos: 500_000, method: "Cash", paidDate: "2026-08-20" });
    paymentIds.push(late.id);
    const lateVerified = await payments.verifyPayment(finance, late.id);
    expect(lateVerified.payment.countedDate && lateVerified.payment.countedDate.slice(0, 7) > month).toBe(true);
  }, 60_000);

  it("reverses a verified payment, drops the sale below 25% and blocks invalid adjustments", async () => {
    let sale = (await records.loadSaleForContract(contractId!))!.sale;
    if (sale.status !== "confirmed") {
      const topUp = await payments.submitPayment(clerk, { contractId: contractId!, purpose: "installment", amountCentavos: 500_000, method: "Cash", paidDate: manilaToday() });
      paymentIds.push(topUp.id);
      await payments.verifyPayment(finance, topUp.id);
      sale = (await records.loadSaleForContract(contractId!))!.sale;
    }
    expect(sale.status).toBe("confirmed");

    const verified = (await records.loadPaymentsOfContract(contractId!, sale.id)).filter((payment) => payment.status === "verified");
    const target = verified.find((payment) => payment.purpose === "installment")!;
    const adjusted = await payments.adjustPayment(finance, target.id, { kind: "reversal", amountCentavos: installmentCentavos, reason: "Returned cheque." });
    expect(adjusted.adjustments.some((item) => item.kind === "reversal")).toBe(true);
    const after = (await records.loadSaleForContract(contractId!))!.sale;
    expect(after.status).toBe("pending");
    expect(after.financialHold).toBe(true);

    const other = verified.find((payment) => payment.id !== target.id)!;
    await payments.adjustPayment(finance, other.id, { kind: "reversal", amountCentavos: 100, reason: "Keying error." });
    await expect(payments.adjustPayment(finance, other.id, { kind: "reversal", amountCentavos: 100, reason: "Keying error." })).rejects.toMatchObject({ status: 409 });
    await expect(payments.adjustPayment(finance, target.id, { kind: "reversal", amountCentavos: installmentCentavos + 1, reason: "Too much" })).rejects.toMatchObject({ status: 422 });

    const reservation = await payments.submitPayment(clerk, { contractId: contractId!, purpose: "reservation", amountCentavos: 100_000, method: "Cash", paidDate: manilaToday() });
    paymentIds.push(reservation.id);
    await payments.verifyPayment(finance, reservation.id);
    await expect(payments.adjustPayment(finance, reservation.id, { kind: "refund", amountCentavos: 100, reason: "Refund" })).rejects.toMatchObject({ status: 409 });
  }, 60_000);

  it("lets only one of two simultaneous full reversals of the same receipt through", async () => {
    const fresh = await payments.submitPayment(clerk, { contractId: contractId!, purpose: "down_payment", amountCentavos: 800_000, method: "Cash", paidDate: manilaToday() });
    paymentIds.push(fresh.id);
    await payments.verifyPayment(finance, fresh.id);
    const results = await Promise.allSettled([
      payments.adjustPayment(finance, fresh.id, { kind: "reversal", amountCentavos: 800_000, reason: "Concurrent reversal A." }),
      payments.adjustPayment(finance, fresh.id, { kind: "reversal", amountCentavos: 800_000, reason: "Concurrent reversal B." }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const latest = await records.loadPayment(fresh.id);
    expect(latest?.adjustments.filter((item) => item.amountCentavos === 800_000)).toHaveLength(1);
  }, 60_000);

  it("records matching receipts and keeps OR numbers unique", async () => {
    const orNumber = `OR-F5-${suffix}`;
    const unmatched = await payments.submitUnmatchedReceipt(clerk, { amountCentavos: 700_000, method: "Cash", paidDate: manilaToday(), orNumber, reason: "No contract was found for the payer." });
    unmatchedIds.push(unmatched.id);
    expect(unmatched.status).toBe("unmatched");
    expect((await payments.listUnmatchedReceipts(finance)).some((item) => item.id === unmatched.id)).toBe(true);
    await expect(payments.submitUnmatchedReceipt(clerk, { amountCentavos: 700_000, method: "Cash", paidDate: manilaToday(), orNumber, reason: "Duplicate" })).rejects.toMatchObject({ status: 409 });
    await expect(payments.submitUnmatchedReceipt(clerk, { amountCentavos: 700_000, method: "Cash", paidDate: manilaToday(), orNumber: orNumber.toLowerCase(), reason: "Case duplicate" })).rejects.toMatchObject({ status: 409 });
    await expect(payments.submitPayment(clerk, { contractId: contractId!, purpose: "installment", amountCentavos: 1_000, method: "Bank Transfer", paidDate: manilaToday(), documentNo: orNumber })).rejects.toMatchObject({ status: 409 });

    // A Cash receipt must skip an auto-number held by an open unmatched receipt.
    const { nextOfficialReceiptNo } = await import("@/modules/finance/payment-reference");
    const datePrefix = manilaToday().replaceAll("-", "");
    const taken = [...(await records.loadNumbersWithPrefix(`PAY-${datePrefix}`)), ...(await records.loadNumbersWithPrefix(`OR-${datePrefix}`))];
    const reserved = nextOfficialReceiptNo(taken, manilaToday());
    const reservedHold = await payments.submitUnmatchedReceipt(clerk, { amountCentavos: 10_000, method: "Cash", paidDate: manilaToday(), orNumber: reserved, reason: "Reserved number." });
    unmatchedIds.push(reservedHold.id);
    const cash = await payments.submitPayment(clerk, { contractId: contractId!, purpose: "installment", amountCentavos: 1_000, method: "Cash", paidDate: manilaToday() });
    paymentIds.push(cash.id);
    expect(cash.documentNo).toBeTruthy();
    expect(cash.documentNo).not.toBe(reserved);

    const matched = await payments.matchUnmatchedReceipt(finance, unmatched.id, { contractId: contractId!, purpose: "installment", note: "Matched to the new contract." });
    expect(matched.documentNo).toBe(orNumber);
    expect(matched.status).toBe("submitted");
    paymentIds.push(matched.id);
    await expect(payments.matchUnmatchedReceipt(finance, unmatched.id, { contractId: contractId!, purpose: "installment" })).rejects.toMatchObject({ status: 409 });

    const second = await payments.submitUnmatchedReceipt(clerk, { amountCentavos: 100_000, method: "GCash", paidDate: manilaToday(), orNumber: `OR-F5-R-${suffix}`, reason: "Unclear payer." });
    unmatchedIds.push(second.id);
    await payments.rejectUnmatchedReceipt(finance, second.id, "Not a company receipt.");
    const reused = await payments.submitUnmatchedReceipt(clerk, { amountCentavos: 100_000, method: "GCash", paidDate: manilaToday(), orNumber: `OR-F5-R-${suffix}`, reason: "Corrected intake." });
    unmatchedIds.push(reused.id);
    expect(reused.status).toBe("unmatched");
  }, 60_000);

  it("creates, signs off and rejects historical receipt batches", async () => {
    const record = { "Receipt reference": `HIST-F5-${suffix}`, "Receipt date": "2026-09-10", "Amount": "25000.00", "Payment method": "Cash", "Purpose": "Down Payment", "Customer": "History Tester", "Sale reference": `26-F5-${suffix}`, "Sale status": "Unfinished", "Remarks": "" };
    const batch = await payments.createReceiptImportBatch(admin, { fileName: "f5-history.csv", records: [record], declaration: true });
    batchIds.push(batch.id);
    expect(batch.status).toBe("pending_signoff");
    const signed = await payments.signOffReceiptImportBatch(admin, batch.id);
    expect(signed.status).toBe("signed_off");
    expect(signed.selfSignedOff).toBe(true);
    await expect(payments.createReceiptImportBatch(clerk, { fileName: "clerk.csv", records: [record], declaration: true })).rejects.toMatchObject({ status: 403 });

    const second = await payments.createReceiptImportBatch(admin, { fileName: "f5-reject.csv", records: [{ ...record, "Receipt reference": `HIST-F5-R-${suffix}` }], declaration: true });
    batchIds.push(second.id);
    const rejected = await payments.rejectReceiptImportBatch(admin, second.id, "Wrong period.");
    expect(rejected.status).toBe("rejected");
    const retry = await payments.createReceiptImportBatch(admin, { fileName: "f5-retry.csv", records: [{ ...record, "Receipt reference": `HIST-F5-R-${suffix}` }], declaration: true });
    batchIds.push(retry.id);
    expect(retry.status).toBe("pending_signoff");
  }, 60_000);

  it("refuses to mark a freshly recorded sale as stopped paying", async () => {
    const sale = (await records.loadSaleForContract(contractId!))!.sale;
    await expect(sales.markSaleDefaulted(admin, sale.id, "No payment for 90 days.")).rejects.toMatchObject({ status: 409 });
    expect(contractPrice).toBeGreaterThan(0);
  });

  it("runs the two-step cancellation and records the forfeiture", async () => {
    let sale = (await records.loadSaleForContract(contractId!))!.sale;
    if (sale.status !== "confirmed") {
      const topUp = await payments.submitPayment(clerk, { contractId: contractId!, purpose: "installment", amountCentavos: 1_500_000, method: "Cash", paidDate: manilaToday() });
      paymentIds.push(topUp.id);
      await payments.verifyPayment(finance, topUp.id);
      sale = (await records.loadSaleForContract(contractId!))!.sale;
    }
    expect(sale.status).toBe("confirmed");
    const adjustmentsBefore = sale.adjustments.length;
    const requested = await contracts.requestCancellation(admin, contractId!, "voluntary_withdrawal", "The customer withdrew in writing.");
    expect(requested.cancellation?.status).toBe("requested");
    const decided = await contracts.decideCancellation(finance, contractId!, "confirm", "Forfeiture per the Reservation Agreement.");
    expect(decided.status).toBe("cancelled");
    expect(decided.cancellation?.forfeitedCentavos ?? 0).toBeGreaterThan(0);
    const after = (await records.loadSaleForContract(contractId!))!.sale;
    expect(after.status).toBe("cancelled");
    expect(after.adjustments.length).toBe(adjustmentsBefore + 1);
    expect(after.adjustments.at(-1)).toMatchObject({ kind: "reversal", amountCentavos: -sale.valueCentavos, date: manilaToday() });
  });
});
