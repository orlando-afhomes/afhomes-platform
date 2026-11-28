// @vitest-environment node
// Customer â†’ contract â†’ sale â†’ receipt approval â†’ collections, through the real Route Handlers.
// Runs against the LOCAL emulators (npm run emulators, then npm run db:seed:fixtures). Skipped when they are not running.
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { call, configureEmulatorEnv, emulatorsUp, sessionCookieFor } from "@/server/testing/emulator";

configureEmulatorEnv();
const up = await emulatorsUp();
const { SEED_ACCOUNTS } = await import("@/data/seed/dev-credentials");
const account = (identityId: string) => SEED_ACCOUNTS.find((row) => row.identityId === identityId)!;

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe.skipIf(!up)("pilot API: customer, contract, receipt approval, collections (emulators)", () => {
  let routes: Record<string, Record<string, any>>; // eslint-disable-line @typescript-eslint/no-explicit-any
  let db: typeof import("@/server/db");
  let common: typeof import("@/server/services/common");
  const cookies: Record<string, string> = {};
  const TODAY = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

  beforeAll(async () => {
    const session = await import("@/app/api/v1/session/route");
    routes = {
      customers: await import("@/app/api/v1/customers/route"),
      customerSubmit: await import("@/app/api/v1/customers/[id]/submit/route"),
      customerApprove: await import("@/app/api/v1/customers/[id]/approve/route"),
      contracts: await import("@/app/api/v1/contracts/route"),
      contractSubmit: await import("@/app/api/v1/contracts/[id]/submit/route"),
      contractFinalize: await import("@/app/api/v1/contracts/[id]/finalize/route"),
      saleApprove: await import("@/app/api/v1/sales/[id]/approve/route"),
      payments: await import("@/app/api/v1/payments/route"),
      paymentVerify: await import("@/app/api/v1/payments/[id]/verify/route"),
      report: await import("@/app/api/v1/reports/collections/route"),
    };
    db = await import("@/server/db");
    common = await import("@/server/services/common");
    for (const identity of ["dev-admin", "dev-finance", "dev-ost-a1", "dev-ost-b1"]) {
      cookies[identity] = await sessionCookieFor(session.POST, account(identity).email, account(identity).password);
    }
  }, 60_000);

  const as = (identity: string) => ({ cookie: cookies[identity] });
  const fullCustomer = (): Json => ({
    displayName: "Pilot Buyer", firstName: "Pilot", lastName: "Buyer", dateOfBirth: "1990-01-01", gender: "Male", civilStatus: "Single", mobileNumber: "09171234567",
    address: { street: "1 Test St", province: "Cebu", city: "Cebu City", barangay: "Lahug", postalCode: "6000" },
    vipPlan: "B1", paymentSchemeId: "scheme-spot-cash", contractClassification: "S", customerIdMode: "auto", consentDataPrivacy: true, idReceivedCertified: true,
  });

  /** Draft by a seller, submitted and approved by the office, contract prepared, submitted, finalized, and its sale approved. */
  async function approvedSale() {
    const draft = await call(routes.customers.POST, { path: "/api/v1/customers", method: "POST", ...as("dev-ost-a1"), body: { displayName: "Pilot Buyer", firstName: "Pilot", lastName: "Buyer" } });
    expect(draft.status).toBe(201);
    const customerId = draft.body.customer.id as string;
    const submitted = await call(routes.customerSubmit.POST, { path: `/api/v1/customers/${customerId}/submit`, method: "POST", params: { id: customerId }, ...as("dev-admin"), body: fullCustomer() });
    expect(submitted.status, JSON.stringify(submitted.body)).toBe(200);
    expect((await call(routes.customerApprove.POST, { path: "x", method: "POST", params: { id: customerId }, ...as("dev-admin") })).status).toBe(200);
    const prepared = await call(routes.contracts.POST, { path: "/api/v1/contracts", method: "POST", ...as("dev-admin"), body: { customerId, schemeId: "scheme-spot-cash", customerAccepted: true } });
    expect(prepared.status, JSON.stringify(prepared.body)).toBe(201);
    const contractId = prepared.body.contract.id as string;
    const contractSubmit = await call(routes.contractSubmit.POST, { path: "x", method: "POST", params: { id: contractId }, ...as("dev-admin") });
    expect(contractSubmit.status, JSON.stringify(contractSubmit.body)).toBe(200);
    const saleId = contractSubmit.body.sale.id as string;
    expect((await call(routes.contractFinalize.POST, { path: "x", method: "POST", params: { id: contractId }, ...as("dev-admin") })).status).toBe(200);
    expect((await call(routes.saleApprove.POST, { path: "x", method: "POST", params: { id: saleId }, ...as("dev-admin") })).status).toBe(200);
    return { customerId, contractId, saleId, priceCentavos: prepared.body.contract.priceCentavos as number, customerNumber: submitted.body.customer.customerNumber as string };
  }

  const submitReceipt = (contractId: string, amountCentavos: number, extra: Json = {}) =>
    call(routes.payments.POST, { path: "/api/v1/payments", method: "POST", ...as("dev-admin"), body: { contractId, purpose: "reservation", amountCentavos, method: "Cash", paidDate: TODAY, ...extra } });
  const verify = (paymentId: string, init: Json = {}) => call(routes.paymentVerify.POST, { path: "x", method: "POST", params: { id: paymentId }, ...as("dev-finance"), ...init });
  const report = (identity = "dev-finance") => call(routes.report.GET, { path: `/api/v1/reports/collections?from=${TODAY}&to=${TODAY}`, ...as(identity) });
  const saleState = async (saleId: string) => {
    const result = await db.dbRead<{ sale: { status: string; confirmedDate: string | null }; saleAdjustments: Array<{ kind: string }> }>(
      `query($s: UUID!) { sale(id: $s) { status confirmedDate } saleAdjustments(where: { sale: { id: { eq: $s } } }) { kind } }`, { s: saleId });
    return result;
  };

  it("carries one sale from customer to a confirmed sale and a counted collection", async () => {
    const before = (await report()).body as Json;
    expect(before.receiptCount).toBeGreaterThanOrEqual(0);
    const { contractId, saleId, priceCentavos, customerNumber } = await approvedSale();
    expect(customerNumber).toMatch(/^\d{4}-\d{4}$/);
    expect(priceCentavos).toBe(5_400_000);

    const first = await submitReceipt(contractId, 1_000_000);
    expect(first.status, JSON.stringify(first.body)).toBe(201);
    const payment1 = first.body.payment as Json;
    expect(payment1.referenceNo).toMatch(/^PAY-\d{8}-\d{4}$/);
    expect(payment1.documentNo).toMatch(/^OR-\d{8}-\d{4}$/);
    const v1 = await verify(payment1.id);
    expect(v1.status, JSON.stringify(v1.body)).toBe(200);
    expect(v1.body.payment.status).toBe("verified");
    expect(v1.body.saleStatus).toBe("pending"); // â‚±10,000 is under 25% of â‚±54,000

    const second = await submitReceipt(contractId, 500_000, { purpose: "down_payment" });
    const v2 = await verify(second.body.payment.id);
    expect(v2.status, JSON.stringify(v2.body)).toBe(200);
    expect(v2.body.saleStatus).toBe("confirmed"); // â‚±15,000 reaches 25% (â‚±13,500)
    const state = await saleState(saleId);
    expect(state.sale.status).toBe("confirmed");
    expect(state.saleAdjustments.map((item) => item.kind)).toEqual(["confirmation"]);

    const after = (await report()).body as Json;
    expect(after.netCentavos - before.netCentavos).toBe(1_500_000);
    expect(after.receiptCount - before.receiptCount).toBe(2);
  }, 120_000);

  it("approves a receipt once: a repeat replays the first answer and a new request changes nothing", async () => {
    const { contractId, saleId } = await approvedSale();
    const receipt = (await submitReceipt(contractId, 1_500_000)).body.payment as Json;
    const key = randomUUID();
    const first = await verify(receipt.id, { key });
    expect(first.status).toBe(200);
    const netAfterFirst = ((await report()).body as Json).netCentavos;

    const replay = await verify(receipt.id, { key });
    expect(replay.status).toBe(200);
    expect(replay.headers.get("Idempotent-Replay")).toBe("true");
    expect(replay.body.payment.id).toBe(first.body.payment.id);

    const again = await verify(receipt.id); // a different request key
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("not_verifiable");

    expect(((await report()).body as Json).netCentavos).toBe(netAfterFirst);
    const state = await saleState(saleId);
    expect(state.saleAdjustments).toHaveLength(1); // the sale is confirmed once
    const events = await db.dbRead<{ auditEvents: Array<{ id: string }> }>(`query($e: String!) { auditEvents(where: { action: { eq: "PAYMENT_VERIFIED" }, entityId: { eq: $e } }) { id } }`, { e: receipt.id });
    expect(events.auditEvents).toHaveLength(1);
  }, 120_000);

  it("rolls everything back when any part of the transaction fails", async () => {
    const { contractId } = await approvedSale();
    const receipt = (await submitReceipt(contractId, 500_000)).body.payment as Json;
    const before = await db.dbRead<{ contract: { collectionVersion: number }; payment: { status: string } }>(
      `query($c: UUID!, $p: UUID!) { contract(id: $c) { collectionVersion } payment(id: $p) { status } }`, { c: contractId, p: receipt.id });
    const actor = { userId: (await db.dbRead<{ userAccounts: Array<{ id: string }> }>(`query { userAccounts(where: { email: { eq: "rosalinda.tan@afhomes.com.ph" } }) { id } }`)).userAccounts[0].id } as never;
    await expect(common.transact(actor, {
      variableDefinitions: "$c: UUID!, $p: UUID!",
      fields: `bump: contract_updateMany(where: { id: { eq: $c } }, data: { collectionVersion_update: { inc: 1 } })
verified: payment_updateMany(where: { id: { eq: $p } }, data: { status: "verified" })
query @redact { x: contract(id: $c) @check(expr: "response.bump == 99", message: "FORCED_FAILURE") { id } }`,
      variables: { c: contractId, p: receipt.id },
      audit: [{ action: "TEST_SHOULD_NOT_EXIST", entityType: "payment", entityId: receipt.id }],
    })).rejects.toThrow(/FORCED_FAILURE/);
    const after = await db.dbRead<{ contract: { collectionVersion: number }; payment: { status: string } }>(
      `query($c: UUID!, $p: UUID!) { contract(id: $c) { collectionVersion } payment(id: $p) { status } }`, { c: contractId, p: receipt.id });
    expect(after).toEqual(before);
    const stray = await db.dbRead<{ auditEvents: Array<{ id: string }> }>(`query { auditEvents(where: { action: { eq: "TEST_SHOULD_NOT_EXIST" } }) { id } }`);
    expect(stray.auditEvents).toHaveLength(0);
  }, 120_000);

  it("confirms the sale exactly once when two receipts are approved at the same moment", async () => {
    const { contractId, saleId } = await approvedSale();
    // Each receipt alone is under 25% (â‚±13,500); together they reach it. The amounts differ so the "possible duplicate" rule stays out of the way.
    const a = (await submitReceipt(contractId, 700_000)).body.payment as Json;
    const b = (await submitReceipt(contractId, 710_000, { purpose: "down_payment" })).body.payment as Json;
    const [ra, rb] = await Promise.all([verify(a.id), verify(b.id)]);
    expect([ra.status, rb.status], JSON.stringify([ra.body, rb.body])).toEqual([200, 200]);
    const state = await saleState(saleId);
    expect(state.sale.status).toBe("confirmed");
    expect(state.saleAdjustments).toHaveLength(1);
    expect([ra.body.saleStatus, rb.body.saleStatus]).toContain("confirmed");
  }, 120_000);

  it("lets only one of two simultaneous approvals of the same receipt through", async () => {
    const { contractId } = await approvedSale();
    const receipt = (await submitReceipt(contractId, 1_500_000)).body.payment as Json;
    const results = await Promise.all([verify(receipt.id), verify(receipt.id)]);
    expect(results.map((item) => item.status).sort()).toEqual([200, 409]);
    const events = await db.dbRead<{ auditEvents: Array<{ id: string }> }>(`query($e: String!) { auditEvents(where: { action: { eq: "PAYMENT_VERIFIED" }, entityId: { eq: $e } }) { id } }`, { e: receipt.id });
    expect(events.auditEvents).toHaveLength(1);
  }, 120_000);

  it("refuses duplicates, bad input and non-pilot terms with safe errors", async () => {
    const { contractId } = await approvedSale();
    const one = (await submitReceipt(contractId, 100_000, { method: "Bank Transfer", documentNo: `BT-${randomUUID().slice(0, 8)}` })).body.payment as Json;
    const dup = await submitReceipt(contractId, 200_000, { method: "Bank Transfer", documentNo: one.documentNo });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("duplicate_number");
    expect((await submitReceipt(contractId, 0)).status).toBe(422);
    expect((await submitReceipt(contractId, 100_000, { surprise: true })).status).toBe(422);
    expect((await submitReceipt(contractId, 99_000_000)).status).toBe(409); // above the contract price
    expect((await call(routes.paymentVerify.POST, { path: "x", method: "POST", params: { id: "not-an-id" }, ...as("dev-finance") })).status).toBe(404);
    const nonStandard = await call(routes.contracts.POST, { path: "x", method: "POST", ...as("dev-admin"), body: { customerId: "ab".repeat(16), schemeId: "scheme-spot-cash", classification: "N", customerAccepted: true } });
    expect([404, 422]).toContain(nonStandard.status);
    const body = JSON.stringify(dup.body);
    expect(body).not.toMatch(/SQL|violates|constraint|stack/i);
  }, 120_000);

  it("enforces the request-key rules", async () => {
    const { contractId } = await approvedSale();
    const key = randomUUID();
    const body = { contractId, purpose: "reservation", amountCentavos: 100_000, method: "Cash", paidDate: TODAY };
    const first = await call(routes.payments.POST, { path: "x", method: "POST", ...as("dev-admin"), key, body });
    expect(first.status).toBe(201);
    const reused = await call(routes.payments.POST, { path: "x", method: "POST", ...as("dev-admin"), key, body: { contractId, purpose: "reservation", amountCentavos: 200_000, method: "Cash", paidDate: TODAY } });
    expect(reused.status).toBe(409);
    expect(reused.body.error.code).toBe("idempotency_key_reused");
    const missing = await call(routes.payments.POST, { path: "x", method: "POST", ...as("dev-admin"), key: null, body: { contractId, purpose: "reservation", amountCentavos: 100_000, method: "Cash", paidDate: TODAY } });
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("idempotency_key_required");
    const sameKeySameBody = await call(routes.payments.POST, { path: "x", method: "POST", ...as("dev-admin"), key, body });
    expect(sameKeySameBody.headers.get("Idempotent-Replay")).toBe("true");
    expect(sameKeySameBody.body.payment.id).toBe(first.body.payment.id);
  }, 120_000);

  it("blocks people without the right role or record scope, and signed-out or cross-site calls", async () => {
    const { customerId, contractId, saleId } = await approvedSale();
    const receipt = (await submitReceipt(contractId, 100_000)).body.payment as Json;
    // A seller cannot approve money, sales, customers or read collections.
    expect((await verify(receipt.id, as("dev-ost-a1"))).status).toBe(403);
    expect((await call(routes.saleApprove.POST, { path: "x", method: "POST", params: { id: saleId }, ...as("dev-ost-a1") })).status).toBe(403);
    expect((await call(routes.customerApprove.POST, { path: "x", method: "POST", params: { id: customerId }, ...as("dev-ost-a1") })).status).toBe(403);
    expect((await report("dev-ost-a1")).status).toBe(403);
    // A seller from another branch cannot see this customer's contract or receipts.
    expect((await call(routes.contracts.POST, { path: "x", method: "POST", ...as("dev-ost-b1"), body: { customerId, schemeId: "scheme-spot-cash", customerAccepted: true } })).status).toBe(403);
    expect((await call(routes.payments.POST, { path: "x", method: "POST", ...as("dev-ost-b1"), body: { contractId, purpose: "reservation", amountCentavos: 100_000, method: "Cash", paidDate: TODAY } })).status).toBe(403);
    // No session and a foreign origin.
    expect((await call(routes.paymentVerify.POST, { path: "x", method: "POST", params: { id: receipt.id } })).status).toBe(401);
    expect((await verify(receipt.id, { origin: "https://evil.example" })).status).toBe(403);
    expect((await call(routes.customers.GET, { path: "/api/v1/customers" })).status).toBe(401);
  }, 120_000);

  it("shows each person only the customers their scope allows", async () => {
    const { customerId } = await approvedSale();
    // Follow the page cursors so the result does not depend on how many customers exist.
    const ids = async (identity: string) => {
      const found: string[] = [];
      let after: string | null = null;
      do {
        const page: Json = (await call(routes.customers.GET, { path: `/api/v1/customers?limit=100${after ? `&after=${after}` : ""}`, ...as(identity) })).body;
        found.push(...(page.items as Json[]).map((item) => item.id));
        after = page.nextCursor;
      } while (after);
      return found;
    };
    expect(await ids("dev-admin")).toContain(customerId);
    expect(await ids("dev-ost-a1")).toContain(customerId);
    expect(await ids("dev-ost-b1")).not.toContain(customerId);
  }, 120_000);
});
