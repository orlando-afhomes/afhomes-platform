// @vitest-environment node
// F3: customer lifecycle, duplicate IDs, import/export and private ID images on the local emulators.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { configureEmulatorEnv, emulatorsUp, sessionCookieFor } from "@/server/testing/emulator";

configureEmulatorEnv();
const up = await emulatorsUp();
const { MOCK_ACCOUNTS } = await import("@/data/mock/mock-credentials");
const account = (identityId: string) => MOCK_ACCOUNTS.find((row) => row.identityId === identityId)!;

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

describe.skipIf(!up)("customer applications and record access (emulators)", () => {
  let customers: typeof import("@/server/services/customers");
  let network: typeof import("@/server/services/sales-network");
  let catalog: typeof import("@/server/repositories/catalog");
  let db: typeof import("@/server/db");
  let auth: typeof import("@/server/auth/actor");
  let admin: Awaited<ReturnType<typeof import("@/server/auth/actor").requireActor>>;
  let clerk: typeof admin;
  let ost: typeof admin;
  let svd: typeof admin;
  const createdCustomerIds: string[] = [];
  let importJobId: string | null = null;
  const suffix = Date.now();

  const fullInput = async () => {
    const [products, schemes] = await Promise.all([catalog.loadProducts(), catalog.loadPaymentSchemes()]);
    const product = products.find((item) => item.code === "B1") ?? products[0];
    const scheme = schemes.find((item) => item.availability === "available") ?? schemes[0];
    return { vipPlan: product.code, paymentSchemeId: scheme.id, contractClassification: "S" as const, consentDataPrivacy: true, idReceivedCertified: true };
  };

  const draftInput = (n: number, ownerMemberId: string | null, extra: Record<string, unknown> = {}) => ({
    displayName: "",
    firstName: "Test",
    middleName: "",
    lastName: `Customer${n}`,
    suffix: "",
    gender: "Male",
    civilStatus: "Single",
    dateOfBirth: "1990-01-01",
    mobileNumber: `0917111${String(n).padStart(4, "0")}`,
    email: `customer-${suffix}-${n}@example.com`,
    street: "1 Test Street",
    address: { street: "1 Test Street", province: "Laguna", city: "Calamba", barangay: "Banlic", postalCode: "4027" },
    ownerMemberId,
    ...extra,
  });

  const createAndSubmit = async (n: number) => {
    const members = await network.listMembers(admin);
    const seller = members.find((member) => member.designation === "SM")!;
    const draft = await customers.createCustomerDraft(clerk, draftInput(n, seller.id) as never);
    createdCustomerIds.push(draft.id);
    const fields = await fullInput();
    const submitted = await customers.submitCustomer(clerk, draft.id, { ...draftInput(n, seller.id), ...fields } as never);
    return { draft, submitted };
  };

  beforeAll(async () => {
    customers = await import("@/server/services/customers");
    network = await import("@/server/services/sales-network");
    catalog = await import("@/server/repositories/catalog");
    db = await import("@/server/db");
    auth = await import("@/server/auth/actor");
    const session = await import("@/app/api/v1/session/route");
    const actor = async (identityId: string) => (await auth.resolveActorFromSessionCookie(await sessionCookieFor(session.POST, account(identityId).email, account(identityId).password)))!;
    admin = await actor("dev-admin");
    clerk = await actor("dev-clerk");
    ost = await actor("dev-ost-a1");
    svd = await actor("dev-svd-a");
  }, 60_000);

  afterAll(async () => {
    const storage = await import("@/server/storage");
    for (const id of createdCustomerIds) {
      const row = await db.dbRead<{ customer: { profile: Record<string, unknown> | null } | null }>(`query($id: UUID!) { customer(id: $id) { profile } }`, { id }).catch(() => ({ customer: null }));
      if (row.customer?.profile) await storage.deleteCustomerIdentityFile(row.customer.profile);
      await db.dbWrite(`mutation($id: UUID!) { customer_delete(id: $id) }`, { id }).catch(() => undefined);
    }
    if (importJobId) {
      await db.dbWrite(`mutation($id: UUID!) { customerImportRow_deleteMany(where: { jobId: { eq: $id } }) }`, { id: importJobId }).catch(() => undefined);
      await db.dbWrite(`mutation($id: UUID!) { customerImportJob_delete(id: $id) }`, { id: importJobId }).catch(() => undefined);
    }
  });

  it("runs draft → submit → approve with an automatic Customer ID", async () => {
    const members = await network.listMembers(admin);
    const seller = members.find((member) => member.designation === "SM")!;
    const draft = await customers.createCustomerDraft(clerk, draftInput(1, seller.id) as never);
    createdCustomerIds.push(draft.id);
    const updated = await customers.updateCustomerDraft(clerk, draft.id, { occupation: "Tester" } as never);
    expect(updated.occupation).toBe("Tester");
    const fields = await fullInput();
    const submitted = await customers.submitCustomer(clerk, draft.id, { ...draftInput(1, seller.id), ...fields } as never);
    expect(submitted.status).toBe("submitted");
    expect(submitted.customerNumber).toMatch(/^\d{4}-\d{4}$/);
    const approved = await customers.approveCustomer(admin, draft.id);
    expect(approved.status).toBe("approved");
  }, 60_000);

  it("refuses a manual Customer ID already in use", async () => {
    const first = await createAndSubmit(2);
    const members = await network.listMembers(admin);
    const seller = members.find((member) => member.designation === "SM")!;
    const duplicate = await customers.createCustomerDraft(clerk, draftInput(3, seller.id, { customerNumber: first.submitted.customerNumber, customerIdMode: "manual" }) as never);
    createdCustomerIds.push(duplicate.id);
    const fields = await fullInput();
    await expect(customers.submitCustomer(clerk, duplicate.id, { ...draftInput(3, seller.id), ...fields, customerNumber: first.submitted.customerNumber, customerIdMode: "manual" } as never))
      .rejects.toMatchObject({ status: 422, fields: { customerNumber: "This Customer ID is already in use." } });
  }, 60_000);

  it("sends back, resubmits, rejects and refuses to correct a rejected record", async () => {
    const { draft } = await createAndSubmit(4);
    const sentBack = await customers.sendBackCustomer(admin, draft.id, "Correct the address.");
    expect(sentBack).toMatchObject({ status: "sent_back", reviewReason: "Correct the address." });
    const fields = await fullInput();
    const resubmitted = await customers.submitCustomer(clerk, draft.id, { ...draftInput(4, draft.ownerMemberId), ...fields } as never);
    expect(resubmitted.status).toBe("submitted");
    const rejected = await customers.rejectCustomer(admin, draft.id, "Duplicate person.");
    expect(rejected.status).toBe("rejected");
    await expect(customers.correctCustomer(clerk, draft.id, { ...draftInput(4, draft.ownerMemberId), ...fields } as never, "Fix")).rejects.toMatchObject({ status: 409 });
  }, 60_000);

  it("imports only ready rows, flags duplicates and keeps personal data out of the audit payload", async () => {
    const schemes = await catalog.loadPaymentSchemes();
    const scheme = schemes[0];
    const readyEmail = `import-ready-${suffix}@example.com`;
    const records = [
      { "Customer ID": "", "First name": "Import", "Middle name": "", "Last name": "Ready", "Suffix": "", "Birth date": "1991-03-03", "Gender": "Female", "Civil status": "Single", "Mobile number": "09172220001", "Email": readyEmail, "Address line 1": "2 Import Street", Province: "Laguna", "City / Municipality": "Calamba", Barangay: "Banlic", "Postal code": "4027", "VIP tier": "B1", "Payment scheme": scheme.label, "Contract classification": "Standard", "Acquisition channel": "Walk-In" },
      { "First name": "Import", "Last name": "Ready", "Birth date": "1991-03-03", "Email": readyEmail, "Mobile number": "09172220002", "VIP tier": "B1", "Payment scheme": scheme.label, "Contract classification": "Standard" },
      { "First name": "Bad", "Last name": "Tier", "Birth date": "1991-03-03", "Email": `import-bad-${suffix}@example.com`, "Mobile number": "09172220003", "VIP tier": "NOT-A-TIER", "Payment scheme": scheme.label, "Contract classification": "Standard" },
    ];
    const job = await customers.importCustomers(admin, { fileName: "f3-import.csv", records: records as never, declaration: true });
    importJobId = job.id;
    expect(job.createdCount).toBe(1);
    expect(job.needsReviewCount).toBe(1);
    expect(job.invalidCount).toBe(1);
    createdCustomerIds.push(...job.createdCustomerIds);
    const jobs = await customers.listCustomerImportJobs(admin);
    expect(jobs.some((item) => item.id === job.id)).toBe(true);
    const audits = await db.dbRead<{ auditEvents: Array<{ details: Record<string, unknown> }> }>(
      `query($id: String!) { auditEvents(where: { action: { eq: "CUSTOMER_IMPORT_COMPLETED" }, entityId: { eq: $id } }) { details } }`,
      { id: job.id },
    );
    expect(audits.auditEvents.length).toBe(1);
    expect(JSON.stringify(audits.auditEvents[0].details)).not.toContain(readyEmail);
  }, 60_000);

  it("exports visible rows and audits the count only", async () => {
    const rows = await customers.exportCustomers(admin, { format: "csv", count: 5000 });
    expect(rows.length).toBeGreaterThanOrEqual(40);
    const audits = await db.dbRead<{ auditEvents: Array<{ details: Record<string, unknown> }> }>(
      `query { auditEvents(where: { action: { eq: "CUSTOMERS_EXPORTED" } }) { details } }`,
    );
    expect(audits.auditEvents.some((event) => /rows:\d+/.test(JSON.stringify(event.details)))).toBe(true);
    expect(JSON.stringify(audits.auditEvents)).not.toContain("@");
  });

  it("stores the ID image privately and serves it only to someone who may see the customer", async () => {
    const members = await network.listMembers(admin);
    const seller = members.find((member) => member.designation === "SM")!;
    const draft = await customers.createCustomerDraft(clerk, draftInput(5, seller.id) as never);
    createdCustomerIds.push(draft.id);
    const uploaded = await customers.uploadCustomerIdImage(clerk, draft.id, PNG, "id.png");
    const view = await customers.downloadCustomerIdImage(clerk, draft.id, uploaded.fileId);
    expect(view.bytes.length).toBe(PNG.length);
    expect(view.meta.contentType).toBe("image/png");
    await expect(customers.downloadCustomerIdImage(ost, draft.id, uploaded.fileId)).rejects.toMatchObject({ status: 404 });
  }, 60_000);

  it("shows the downline only a restricted projection", async () => {
    const visible = await customers.listCustomers(svd, { limit: 100 });
    const restricted = visible.items.filter((customer) => customer.restricted);
    expect(restricted.length).toBeGreaterThan(0);
    for (const customer of restricted) {
      expect(customer.email).toBeUndefined();
      expect(customer.mobileNumber).toBeUndefined();
      expect(customer.address).toBeUndefined();
    }
    const own = await customers.listCustomers(ost, { limit: 100 });
    expect(own.items.every((customer) => !customer.restricted)).toBe(true);
  });
});
