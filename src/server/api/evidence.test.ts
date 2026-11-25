// @vitest-environment node
// Receipt evidence upload and private download. Runs against the LOCAL Auth, SQL Connect and Storage emulators.
import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { call, configureEmulatorEnv, emulatorsUp, sessionCookieFor, storageEmulatorUp, ORIGIN } from "@/server/testing/emulator";

configureEmulatorEnv();
const up = await emulatorsUp();
const storageUp = await storageEmulatorUp();
const { MOCK_ACCOUNTS } = await import("@/data/mock/mock-credentials");
const account = (identityId: string) => MOCK_ACCOUNTS.find((row) => row.identityId === identityId)!;

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=", "base64");
const PDF = Buffer.from("%PDF-1.7\n%test\n", "latin1");
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe.skipIf(!up || !storageUp)("receipt evidence (emulators)", () => {
  let session: typeof import("@/app/api/v1/session/route");
  let customers: typeof import("@/app/api/v1/customers/route");
  let customerSubmit: typeof import("@/app/api/v1/customers/[id]/submit/route");
  let customerApprove: typeof import("@/app/api/v1/customers/[id]/approve/route");
  let contracts: typeof import("@/app/api/v1/contracts/route");
  let contractSubmit: typeof import("@/app/api/v1/contracts/[id]/submit/route");
  let contractFinalize: typeof import("@/app/api/v1/contracts/[id]/finalize/route");
  let saleApprove: typeof import("@/app/api/v1/sales/[id]/approve/route");
  let payments: typeof import("@/app/api/v1/payments/route");
  let payment: typeof import("@/app/api/v1/payments/[id]/route");
  let evidence: typeof import("@/app/api/v1/payments/[id]/evidence/route");
  let fileRoute: typeof import("@/app/api/v1/payments/[id]/evidence/[fileId]/route");
  let verify: typeof import("@/app/api/v1/payments/[id]/verify/route");
  let db: typeof import("@/server/db");
  const cookies: Record<string, string> = {};
  let target: Json;

  const auditCount = async (paymentId: string) =>
    (await db.dbRead<{ auditEvents: Array<{ action: string }> }>(`query($id: String!) { auditEvents(where: { entityId: { eq: $id } }) { action } }`, { id: paymentId })).auditEvents
      .filter((row) => row.action === "PAYMENT_EVIDENCE_UPLOADED").length;

  const upload = async (cookie: string | null, id: string, bytes: Buffer, key: string | null, name = "receipt.png") => {
    const form = new FormData();
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    form.append("file", new Blob([copy], { type: "image/png" }), name);
    const headers: Record<string, string> = { origin: ORIGIN };
    if (cookie) headers.cookie = `afhomes_session=${cookie}`;
    if (key) headers["idempotency-key"] = key;
    const response = await evidence.POST(new NextRequest(`${ORIGIN}/api/v1/payments/${id}/evidence`, { method: "POST", headers, body: form }), { params: Promise.resolve({ id }) });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null, headers: response.headers };
  };

  const fetchFile = async (cookie: string | null, id: string, fileId: string) => {
    const headers: Record<string, string> = {};
    if (cookie) headers.cookie = `afhomes_session=${cookie}`;
    const response = await fileRoute.GET(new NextRequest(`${ORIGIN}/api/v1/payments/${id}/evidence/${fileId}`, { headers }), { params: Promise.resolve({ id, fileId }) });
    return { status: response.status, type: response.headers.get("content-type"), bytes: Buffer.from(await response.arrayBuffer()) };
  };

  beforeAll(async () => {
    session = await import("@/app/api/v1/session/route");
    customers = await import("@/app/api/v1/customers/route");
    customerSubmit = await import("@/app/api/v1/customers/[id]/submit/route");
    customerApprove = await import("@/app/api/v1/customers/[id]/approve/route");
    contracts = await import("@/app/api/v1/contracts/route");
    contractSubmit = await import("@/app/api/v1/contracts/[id]/submit/route");
    contractFinalize = await import("@/app/api/v1/contracts/[id]/finalize/route");
    saleApprove = await import("@/app/api/v1/sales/[id]/approve/route");
    payments = await import("@/app/api/v1/payments/route");
    payment = await import("@/app/api/v1/payments/[id]/route");
    evidence = await import("@/app/api/v1/payments/[id]/evidence/route");
    fileRoute = await import("@/app/api/v1/payments/[id]/evidence/[fileId]/route");
    verify = await import("@/app/api/v1/payments/[id]/verify/route");
    db = await import("@/server/db");
    for (const identity of ["dev-admin", "dev-ost-a1", "dev-ost-b1"]) {
      cookies[identity] = await sessionCookieFor(session.POST, account(identity).email, account(identity).password);
    }
    const all = await call(payments.GET as never, { path: "/api/v1/payments?limit=100", cookie: cookies["dev-admin"] });
    // Choose a receipt the outsider seller cannot see, so the scope check has a definite answer.
    for (const candidate of all.body.items as Json[]) {
      const seen = await call(payment.GET as never, { path: `/api/v1/payments/${candidate.id}`, params: { id: candidate.id as string }, cookie: cookies["dev-ost-b1"] });
      if (seen.status === 404) {
        target = candidate;
        break;
      }
    }
    if (!target) throw new Error("No seeded payment is outside dev-ost-b1's scope.");
  }, 60_000);

  it("stores a receipt privately, records one audit entry and serves it only to someone who may see the payment", async () => {
    const before = await auditCount(target.id as string);
    const saved = await upload(cookies["dev-admin"], target.id as string, PNG, `evidence-${Date.now()}`);
    expect(saved.status).toBe(201);
    const fileId = (saved.body as { fileId: string }).fileId;
    expect(fileId).toBeTruthy();

    const file = await fetchFile(cookies["dev-admin"], target.id as string, fileId);
    expect(file.status).toBe(200);
    expect(file.type).toBe("image/png");
    expect(file.bytes.equals(PNG)).toBe(true);

    const detail = await call(payment.GET as never, { path: `/api/v1/payments/${target.id}`, params: { id: target.id as string }, cookie: cookies["dev-admin"] });
    expect((detail.body.payment as Json).evidenceFileDataUrl).toBe(`/api/v1/payments/${target.id}/evidence/${fileId}`);
    expect(await auditCount(target.id as string)).toBe(before + 1);

    // A seller outside the team sees neither the receipt nor its file.
    expect((await fetchFile(cookies["dev-ost-b1"], target.id as string, fileId)).status).toBe(404);
    expect((await fetchFile(null, target.id as string, fileId)).status).toBe(401);
    expect((await upload(cookies["dev-ost-b1"], target.id as string, PNG, `denied-${Date.now()}`)).status).toBe(404);

    const text = await upload(cookies["dev-admin"], target.id as string, Buffer.from("not a receipt"), `text-${Date.now()}`, "receipt.txt");
    expect(text.status).toBe(422);
    expect((await upload(cookies["dev-admin"], target.id as string, PNG, null)).status).toBe(400);
  }, 60_000);

  it("keeps the receipt file when Finance verifies the payment", async () => {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
    const admin = { cookie: cookies["dev-admin"] };
    const draft = await call(customers.POST as never, { path: "/api/v1/customers", method: "POST", cookie: cookies["dev-ost-a1"], body: { displayName: "Evidence Buyer", firstName: "Evidence", lastName: "Buyer" } });
    expect(draft.status).toBe(201);
    const customerId = (draft.body.customer as Json).id as string;
    const fullCustomer = {
      displayName: "Evidence Buyer", firstName: "Evidence", lastName: "Buyer", dateOfBirth: "1990-01-01", gender: "Male", civilStatus: "Single", mobileNumber: "09171234567",
      address: { street: "1 Test St", province: "Cebu", city: "Cebu City", barangay: "Lahug", postalCode: "6000" },
      vipPlan: "B1", paymentSchemeId: "scheme-spot-cash", contractClassification: "S", customerIdMode: "auto", consentDataPrivacy: true, idReceivedCertified: true,
    };
    expect((await call(customerSubmit.POST as never, { path: "x", method: "POST", params: { id: customerId }, ...admin, body: fullCustomer })).status).toBe(200);
    expect((await call(customerApprove.POST as never, { path: "x", method: "POST", params: { id: customerId }, ...admin })).status).toBe(200);
    const prepared = await call(contracts.POST as never, { path: "/api/v1/contracts", method: "POST", ...admin, body: { customerId, schemeId: "scheme-spot-cash", customerAccepted: true } });
    expect(prepared.status).toBe(201);
    const contractId = (prepared.body.contract as Json).id as string;
    const contractSubmitted = await call(contractSubmit.POST as never, { path: "x", method: "POST", params: { id: contractId }, ...admin });
    expect(contractSubmitted.status).toBe(200);
    const saleId = (contractSubmitted.body.sale as Json).id as string;
    expect((await call(contractFinalize.POST as never, { path: "x", method: "POST", params: { id: contractId }, ...admin })).status).toBe(200);
    expect((await call(saleApprove.POST as never, { path: "x", method: "POST", params: { id: saleId }, ...admin })).status).toBe(200);

    const receipt = await call(payments.POST as never, { path: "/api/v1/payments", method: "POST", ...admin, body: { contractId, purpose: "reservation", amountCentavos: 1_000_000, method: "Cash", paidDate: today, evidenceFileName: "receipt.png" } });
    expect(receipt.status, JSON.stringify(receipt.body)).toBe(201);
    const paymentId = (receipt.body.payment as Json).id as string;
    const saved = await upload(cookies["dev-admin"], paymentId, PNG, `verify-${Date.now()}`);
    expect(saved.status).toBe(201);
    const fileId = (saved.body as { fileId: string }).fileId;

    const decision = await call(verify.POST as never, { method: "POST", path: `/api/v1/payments/${paymentId}/verify`, params: { id: paymentId }, ...admin, body: {} });
    expect(decision.status, JSON.stringify(decision.body)).toBe(200);
    const detail = await call(payment.GET as never, { path: `/api/v1/payments/${paymentId}`, params: { id: paymentId }, ...admin });
    expect((detail.body.payment as Json).status).toBe("verified");
    expect((detail.body.payment as Json).evidenceFileDataUrl).toBe(`/api/v1/payments/${paymentId}/evidence/${fileId}`);
    expect((await fetchFile(cookies["dev-admin"], paymentId, fileId)).status).toBe(200);
  }, 90_000);

  it("replays the same key once and refuses the same key with a different file", async () => {
    const id = target.id as string;
    const key = `replay-${Date.now()}`;
    const before = await auditCount(id);
    expect((await upload(cookies["dev-admin"], id, PNG, key)).status).toBe(201);
    const replay = await upload(cookies["dev-admin"], id, PNG, key);
    expect(replay.status).toBe(201);
    expect(replay.headers.get("idempotent-replay")).toBe("true");
    expect(await auditCount(id)).toBe(before + 1);

    const different = await upload(cookies["dev-admin"], id, PDF, key, "receipt.pdf");
    expect(different.status).toBe(409);
    expect((different.body as { error: { code: string } }).error.code).toBe("idempotency_key_reused");
  }, 60_000);
});
