// @vitest-environment node
// The read endpoints the screens use. Runs against the LOCAL emulators (npm run emulators, then npm run db:seed).
import { beforeAll, describe, expect, it } from "vitest";
import { call, configureEmulatorEnv, emulatorsUp, sessionCookieFor } from "@/server/testing/emulator";

configureEmulatorEnv();
const up = await emulatorsUp();
const { MOCK_ACCOUNTS } = await import("@/data/mock/mock-credentials");
const account = (identityId: string) => MOCK_ACCOUNTS.find((row) => row.identityId === identityId)!;

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe.skipIf(!up)("read endpoints for the screens (emulators)", () => {
  let routes: Record<string, Record<string, any>>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const cookies: Record<string, string> = {};
  const OST_IDENTITIES = ["dev-ost-a1", "dev-ost-a2", "dev-ost-b1", "dev-ost-c1"] as const;
  let scope: { identity: string; contracts: Json[]; outsider: string };

  beforeAll(async () => {
    const session = await import("@/app/api/v1/session/route");
    routes = {
      contracts: await import("@/app/api/v1/contracts/route"),
      contract: await import("@/app/api/v1/contracts/[id]/route"),
      payments: await import("@/app/api/v1/payments/route"),
      payment: await import("@/app/api/v1/payments/[id]/route"),
      sales: await import("@/app/api/v1/sales/route"),
      sale: await import("@/app/api/v1/sales/[id]/route"),
      customers: await import("@/app/api/v1/customers/route"),
      customer: await import("@/app/api/v1/customers/[id]/route"),
      members: await import("@/app/api/v1/members/route"),
      products: await import("@/app/api/v1/products/route"),
      schemes: await import("@/app/api/v1/payment-schemes/route"),
      tierLevels: await import("@/app/api/v1/tier-levels/route"),
      experiences: await import("@/app/api/v1/experiences/route"),
      referenceLists: await import("@/app/api/v1/reference-lists/route"),
      outlets: await import("@/app/api/v1/outlets/route"),
      printTemplates: await import("@/app/api/v1/print-templates/route"),
    };
    for (const identity of ["dev-admin", "dev-finance", "dev-svd-a", ...OST_IDENTITIES]) {
      cookies[identity] = await sessionCookieFor(session.POST, account(identity).email, account(identity).password);
    }
    // The seed does not give every seller a contract. Pick one who has them and an outsider whose list is disjoint.
    const lists = new Map<string, Json[]>();
    for (const identity of OST_IDENTITIES) lists.set(identity, (await all(routes.contracts.GET, identity, "/api/v1/contracts")) as Json[]);
    const identity = OST_IDENTITIES.find((candidate) => (lists.get(candidate) ?? []).length > 0);
    if (!identity) throw new Error("Run npm run db:seed: no seeded seller has a visible contract.");
    const contractIds = new Set((lists.get(identity) ?? []).map((item) => item.id as string));
    const outsider = OST_IDENTITIES.find((candidate) => candidate !== identity && (lists.get(candidate) ?? []).every((item) => !contractIds.has(item.id as string)));
    if (!outsider) throw new Error("No seeded seller is outside the chosen contract's scope.");
    scope = { identity, contracts: lists.get(identity)!, outsider };
  }, 60_000);

  const get = (handler: unknown, identity: string, path: string, params?: Record<string, string>) =>
    call(handler as never, { path, params, cookie: cookies[identity] });
  const all = async (handler: unknown, identity: string, path: string, size = 500): Promise<Json[]> => {
    const items: Json[] = [];
    let after: string | null = null;
    do {
      const page: Json = (await get(handler, identity, `${path}?limit=${size}${after ? `&after=${after}` : ""}`)).body;
      items.push(...page.items);
      after = page.nextCursor;
    } while (after);
    return items;
  };

  it("lists contracts with the names and holds the screens show, limited to the person's scope", async () => {
    const admin = await all(routes.contracts.GET, "dev-admin", "/api/v1/contracts");
    expect(admin.length).toBeGreaterThanOrEqual(28);
    for (const contract of admin) {
      expect(typeof contract.customerName).toBe("string");
      expect(Array.isArray(contract.holds)).toBe(true);
      expect(contract.missingCommissionRates).toEqual([]);
    }
    expect(scope.contracts.length).toBeLessThan(admin.length);
    const ostMember = (await get(routes.members.GET, scope.identity, "/api/v1/members")).body.items[0].id as string;
    for (const contract of scope.contracts) expect(contract.genealogy.some((entry: Json) => entry.memberId === ostMember)).toBe(true);
    const outsider = await all(routes.contracts.GET, scope.outsider, "/api/v1/contracts");
    expect(outsider.map((item) => item.id)).not.toEqual(expect.arrayContaining(scope.contracts.map((item) => item.id)));
  }, 60_000);

  it("opens one contract, and hides it from someone outside its team", async () => {
    const id = scope.contracts[0].id as string;
    const one = await get(routes.contract.GET, scope.identity, `/api/v1/contracts/${id}`, { id });
    expect(one.status).toBe(200);
    expect(one.body.contract.id).toBe(id);
    expect((await get(routes.contract.GET, scope.outsider, `/api/v1/contracts/${id}`, { id })).status).toBe(404);
    expect((await get(routes.contract.GET, scope.identity, "/api/v1/contracts/nope", { id: "nope" })).status).toBe(404);
  }, 60_000);

  it("lists receipts with the label, submitter and approval-blocked flag", async () => {
    const finance = await all(routes.payments.GET, "dev-finance", "/api/v1/payments");
    expect(finance.length).toBeGreaterThanOrEqual(84);
    for (const payment of finance) {
      expect(payment.contractLabel).toMatch(/·/);
      expect(typeof payment.submitterName).toBe("string");
      expect(typeof payment.approvalBlocked).toBe("boolean");
      expect(payment.genealogy).toBeUndefined(); // scope data never leaves the server
    }
    const ost = await all(routes.payments.GET, "dev-ost-a1", "/api/v1/payments");
    expect(ost.length).toBeLessThan(finance.length);
    const id = finance[0].id as string;
    expect((await get(routes.payment.GET, "dev-finance", `/api/v1/payments/${id}`, { id })).status).toBe(200);
  }, 60_000);

  it("lists sales by recorded team and opens one", async () => {
    const admin = await all(routes.sales.GET, "dev-admin", "/api/v1/sales");
    expect(admin.length).toBeGreaterThanOrEqual(28);
    for (const sale of admin.slice(0, 5)) {
      expect(typeof sale.customerName).toBe("string");
      expect(typeof sale.schemeLabel).toBe("string");
      expect(Array.isArray(sale.adjustments)).toBe(true);
    }
    const ost = await all(routes.sales.GET, "dev-ost-a1", "/api/v1/sales");
    expect(ost.length).toBeLessThan(admin.length);
    const id = admin[0].id as string;
    expect((await get(routes.sale.GET, "dev-admin", `/api/v1/sales/${id}`, { id })).status).toBe(200);
  }, 60_000);

  it("pages every list without repeating or dropping a row", async () => {
    const full = await all(routes.contracts.GET, "dev-admin", "/api/v1/contracts");
    const seen: string[] = [];
    let after: string | null = null;
    do {
      const page: Json = (await get(routes.contracts.GET, "dev-admin", `/api/v1/contracts?limit=5${after ? `&after=${after}` : ""}`)).body;
      expect(page.items.length).toBeLessThanOrEqual(5);
      seen.push(...page.items.map((item: Json) => item.id));
      after = page.nextCursor;
    } while (after);
    // Other test files add contracts at the same time, so compare as "nothing dropped, nothing repeated".
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen).toEqual(expect.arrayContaining(full.map((item) => item.id)));
  }, 60_000);

  it("shows members by scope and the confirmed catalog to any signed-in person", async () => {
    const admin = (await get(routes.members.GET, "dev-admin", "/api/v1/members")).body.items as Json[];
    expect(admin.length).toBeGreaterThanOrEqual(15);
    expect(admin.every((member) => typeof member.displayName === "string" && "parentId" in member)).toBe(true);
    expect(((await get(routes.members.GET, "dev-ost-a1", "/api/v1/members")).body.items as Json[]).length).toBe(1);
    const products = (await get(routes.products.GET, "dev-ost-b1", "/api/v1/products")).body.items as Json[];
    expect(products.map((item) => item.code)).toEqual(["B1", "S1", "G1"]);
    expect(products.map((item) => item.tier)).toEqual(["Bronze", "Silver", "Gold"]);
    expect(products[0]).toMatchObject({ priceCentavos: 7_200_000, status: "active", approvalStatus: "approved" });
    const levels = (await get(routes.tierLevels.GET, "dev-ost-b1", "/api/v1/tier-levels")).body.items as Json[];
    expect(levels.map((item) => item.name)).toEqual(["Bronze", "Silver", "Gold"]);
    expect(((await get(routes.schemes.GET, "dev-ost-b1", "/api/v1/payment-schemes")).body.items as Json[]).map((item) => item.id)).toContain("scheme-spot-cash");
    expect((await call(routes.products.GET as never, { path: "/api/v1/products" })).status).toBe(401);

    const experiences = (await get(routes.experiences.GET, "dev-admin", "/api/v1/experiences")).body.items as Json[];
    expect(experiences.map((item) => item.slug)).toEqual(expect.arrayContaining(["hotspring-ecofarm-resort", "smart-wellness-hotel"]));
    const references = (await get(routes.referenceLists.GET, "dev-ost-b1", "/api/v1/reference-lists")).body.items as Json[];
    expect(references.some((item) => item.list === "bank" && item.label === "BDO Unibank")).toBe(true);
    expect((await get(routes.outlets.GET, "dev-ost-b1", "/api/v1/outlets")).body.items as Json[]).toHaveLength(5);
    const templates = (await get(routes.printTemplates.GET, "dev-admin", "/api/v1/print-templates")).body.items as Json[];
    expect(templates.map((item) => item.key)).toEqual(expect.arrayContaining(["application", "reservation-gold", "grant-gold", "vip-card"]));
    expect(templates).toHaveLength(8);
  }, 60_000);

  it("gives the owner the full customer and a seller above them only the restricted view", async () => {
    const mine = await all(routes.customers.GET, "dev-ost-a1", "/api/v1/customers", 100);
    const id = mine.find((item) => !item.restricted)!.id as string;
    const owner = await get(routes.customer.GET, "dev-ost-a1", `/api/v1/customers/${id}`, { id });
    expect(owner.status).toBe(200);
    expect(owner.body.customer.restricted).toBeUndefined();
    const upline = await get(routes.customer.GET, "dev-svd-a", `/api/v1/customers/${id}`, { id });
    expect(upline.status).toBe(200);
    expect(upline.body.customer.restricted).toBe(true);
    expect(upline.body.customer.mobileNumber).toBeUndefined();
    expect((await get(routes.customer.GET, "dev-ost-b1", `/api/v1/customers/${id}`, { id })).status).toBe(404);
  }, 60_000);
});
