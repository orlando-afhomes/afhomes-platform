// @vitest-environment node
// F4: property sales (IGP) entry, approval, document signing, catalog and register.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { configureEmulatorEnv, emulatorsUp, sessionCookieFor } from "@/server/testing/emulator";
import { manilaToday } from "@/shared/lib/dates";

configureEmulatorEnv();
const up = await emulatorsUp();
const { MOCK_ACCOUNTS } = await import("@/data/mock/mock-credentials");
const account = (identityId: string) => MOCK_ACCOUNTS.find((row) => row.identityId === identityId)!;

describe.skipIf(!up)("property sales (IGP) on the emulators", () => {
  let igp: typeof import("@/server/services/igp");
  let igpCatalogService: typeof import("@/server/services/igp-catalog");
  let db: typeof import("@/server/db");
  let auth: typeof import("@/server/auth/actor");
  let admin: Awaited<ReturnType<typeof import("@/server/auth/actor").requireActor>>;
  let clerk: typeof admin;
  const suffix = Date.now();
  let projectId: string | null = null;
  let unitId: string | null = null;
  let saleId: string | null = null;
  let jadNumber: string | null = null;

  beforeAll(async () => {
    igp = await import("@/server/services/igp");
    igpCatalogService = await import("@/server/services/igp-catalog");
    db = await import("@/server/db");
    auth = await import("@/server/auth/actor");
    const session = await import("@/app/api/v1/session/route");
    const cookie = async (identityId: string) => (await auth.resolveActorFromSessionCookie(await sessionCookieFor(session.POST, account(identityId).email, account(identityId).password)))!;
    admin = await cookie("dev-admin");
    clerk = await cookie("dev-clerk");
  }, 60_000);

  afterAll(async () => {
    if (saleId) await db.dbWrite(`mutation($id: UUID!) { igpSale_delete(id: $id) }`, { id: saleId }).catch(() => undefined);
    if (jadNumber) await db.dbWrite(`mutation($n: String!) { igpAccreditation_deleteMany(where: { number: { eq: $n } }) }`, { n: jadNumber }).catch(() => undefined);
    if (unitId) await db.dbWrite(`mutation($id: UUID!) { igpUnit_delete(id: $id) }`, { id: unitId }).catch(() => undefined);
    if (projectId) await db.dbWrite(`mutation($id: UUID!) { igpProject_delete(id: $id) }`, { id: projectId }).catch(() => undefined);
  });

  it("enters, approves and signs a property sale with a unique Series Number", async () => {
    const project = await igpCatalogService.createIgpProject(admin, { name: `IGP Test Project ${suffix}`, location: "Test City" });
    projectId = project.id;
    const unit = await igpCatalogService.createIgpUnit(admin, { projectId: project.id, unitOrLot: `Unit T-${suffix}`, propertyOwner: "Test Owner Corporation" });
    unitId = unit.id;
    const categories = await igp.listIgpCatalogFor(admin);
    expect(categories.projects.some((item) => item.id === project.id)).toBe(true);

    const { loadScopeMembers } = await import("@/server/auth/authorize");
    const members = await loadScopeMembers();
    const seller = members.find((member) => member.designation === "SM")!;
    const today = manilaToday();
    const yymm = `${today.slice(2, 4)}${today.slice(5, 7)}`;
    const sequence = String(suffix).slice(-4);
    jadNumber = `JAI${yymm}${sequence}`;
    await igp.actIgp(admin, { type: "accredit", memberId: seller.id, number: jadNumber, approvedDate: today });

    const buyers = await db.dbRead<{ customers: Array<{ id: string }> }>(`query { customers(where: { status: { eq: "approved" } }, limit: 1) { id } }`);
    const buyer = buyers.customers[0];
    expect(buyer?.id).toBeTruthy();

    const sale = await igp.actIgp(clerk, {
      type: "record",
      input: {
        customerId: buyer.id, projectId: project.id, unitId: unit.id, priceCentavos: 200_000_000, scheme: "T", termMonths: 12,
        clauses: "S", sellerMemberId: seller.id, referrerMemberId: null, entry: "reservation", date: today,
        payment: { amountCentavos: 5_000_000, method: "Cash", paidDate: today, documentNo: null },
      },
    });
    expect(sale?.seriesNumber).toMatch(/^A\d{6}\d{4}\d[CT]\d{2}[SN]$/);
    expect(sale?.status).toBe("pending");
    expect(sale?.documents.map((document) => document.key)).toContain("cts");
    saleId = sale!.id;

    const approved = await igp.actIgp(admin, { type: "approve", id: sale!.id });
    expect(approved?.status).toBe("approved");

    const register = await igp.igpRegister(admin);
    expect(register.sales.some((item) => item.id === sale!.id)).toBe(true);
    expect(register.accreditations.some((item) => item.number === jadNumber)).toBe(true);

    const signed = await igp.actIgp(clerk, { type: "document", id: sale!.id, key: "reservation", signedDate: today, signers: "Buyer, JA&D" });
    expect(signed?.documents.find((document) => document.key === "reservation")?.status).toBe("signed");
  }, 60_000);

  it("refuses a corrected referrer without a JA&D accreditation", async () => {
    const { loadScopeMembers } = await import("@/server/auth/authorize");
    const members = await loadScopeMembers();
    const ostWithoutJad = members.find((member) => member.designation === "OST")!;
    await expect(igp.actIgp(admin, { type: "correct", id: saleId!, input: { priceCentavos: 200_000_000, referrerMemberId: ostWithoutJad.id, reason: "Test referrer" } })).rejects.toMatchObject({ status: 422 });
  }, 60_000);

  it("persists a TCP and referrer correction", async () => {
    const register = await igp.igpRegister(admin);
    const sale = register.sales.find((item) => item.id === saleId)!;
    const referrer = register.accreditations.find((record) => record.memberId !== sale.sellerMemberId)!;
    expect(referrer).toBeTruthy();
    const corrected = await igp.actIgp(admin, { type: "correct", id: saleId!, input: { priceCentavos: 199_000_000, referrerMemberId: referrer.memberId, reason: "Corrected within the same band." } });
    expect(corrected?.priceCentavos).toBe(199_000_000);
    const reloaded = (await igp.igpRegister(admin)).sales.find((item) => item.id === saleId)!;
    expect(reloaded.priceCentavos).toBe(199_000_000);
    expect(reloaded.referrerMemberId).toBe(referrer.memberId);
    await igp.actIgp(admin, { type: "correct", id: saleId!, input: { priceCentavos: 199_000_000, referrerMemberId: null, reason: "Remove the referrer." } });
    const cleared = (await igp.igpRegister(admin)).sales.find((item) => item.id === saleId)!;
    expect(cleared.referrerMemberId).toBeNull();
  }, 60_000);

  it("keeps another seller's property sale out of an OST seller's register", async () => {
    const ost = await auth.resolveActorFromSessionCookie(
      await sessionCookieFor((await import("@/app/api/v1/session/route")).POST, account("dev-ost-a1").email, account("dev-ost-a1").password),
    );
    const register = await igp.igpRegister(ost!);
    expect(register.sales.some((item) => item.id === saleId)).toBe(false);
  }, 60_000);
});
