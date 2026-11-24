// @vitest-environment node
// Runs against the LOCAL emulators (npm run emulators, then npm run db:seed).
// Skipped automatically when the emulators are not running.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { hasOperationPermission } from "@/modules/identity/permissions";
import type { DevIdentity } from "@/modules/identity/types";

process.env.FIREBASE_PROJECT_ID = "demo-afhomes";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.DATA_CONNECT_EMULATOR_HOST = "127.0.0.1:9399";

const AUTH = "http://127.0.0.1:9099";
const DB = "http://127.0.0.1:9399/v1/projects/demo-afhomes/locations/asia-southeast1/services/afhomes";
const ORIGIN = "http://localhost:3000";

async function up(url: string) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
}
const emulatorsUp = (await up(AUTH)) && (await up(DB));

// Sample sign-in password comes from the seed's own account list, never typed here.
const { MOCK_ACCOUNTS } = await import("@/data/mock/mock-credentials");
const account = (identityId: string) => MOCK_ACCOUNTS.find((row) => row.identityId === identityId)!;

async function idTokenFor(email: string, password: string): Promise<string> {
  const response = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  return ((await response.json()) as { idToken: string }).idToken;
}

function request(method: string, init: { body?: unknown; cookie?: string; origin?: string | null } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (init.origin !== null) headers.origin = init.origin ?? ORIGIN;
  if (init.cookie) headers.cookie = `afhomes_session=${init.cookie}`;
  return new NextRequest(`${ORIGIN}/api/v1/session`, { method, headers, body: init.body ? JSON.stringify(init.body) : undefined });
}

const cookieOf = (response: Response) => /afhomes_session=([^;]+)/.exec(response.headers.get("set-cookie") ?? "")?.[1];

describe.skipIf(!emulatorsUp)("server sign-in, session and permissions (emulators)", () => {
  let route: typeof import("@/app/api/v1/session/route");
  let actors: typeof import("@/server/auth/actor");
  let authorize: typeof import("@/server/auth/authorize");
  let db: typeof import("@/server/db");

  beforeAll(async () => {
    route = await import("@/app/api/v1/session/route");
    actors = await import("@/server/auth/actor");
    authorize = await import("@/server/auth/authorize");
    db = await import("@/server/db");
    const seeded = await db.dbRead<{ userAccounts: Array<{ id: string }> }>(`query { userAccounts { id } }`);
    if (!seeded.userAccounts.length) throw new Error("Run npm run db:seed first.");
  }, 30_000);

  async function signIn(identityId: string, portal?: "admin" | "staff" | "sales") {
    const row = account(identityId);
    const idToken = await idTokenFor(row.email, row.password);
    const response = await route.POST(request("POST", { body: { idToken, portal } }));
    return { response, cookie: cookieOf(response) };
  }

  // Restore anything a test changed.
  const undo: Array<() => Promise<unknown>> = [];
  afterEach(async () => {
    while (undo.length) await undo.pop()!();
  });

  it("signs an allowed user in with a secure cookie and returns their identity", async () => {
    const { response, cookie } = await signIn("dev-admin", "admin");
    expect(response.status).toBe(200);
    const header = response.headers.get("set-cookie") ?? "";
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/Secure/i);
    expect(header).toMatch(/SameSite=strict/i);
    const me = await route.GET(request("GET", { cookie }));
    expect(me.status).toBe(200);
    expect(((await me.json()) as { identity: { roles: string[] } }).identity.roles).toEqual(["admin"]);
  }, 30_000);

  it("rejects a sign-in that does not come from this site", async () => {
    const row = account("dev-admin");
    const idToken = await idTokenFor(row.email, row.password);
    const response = await route.POST(request("POST", { body: { idToken }, origin: "https://evil.example" }));
    expect(response.status).toBe(403);
    expect(cookieOf(response)).toBeUndefined();
    expect((await route.POST(request("POST", { body: { idToken }, origin: null }))).status).toBe(403);
  }, 30_000);

  it("rejects the wrong sign-in page and a deactivated account, with no cookie", async () => {
    const wrongPortal = await signIn("dev-admin", "sales");
    expect(wrongPortal.response.status).toBe(403);
    expect(wrongPortal.cookie).toBeUndefined();
    const deactivated = await signIn("dev-inactive");
    expect(deactivated.response.status).toBe(403);
    expect(deactivated.cookie).toBeUndefined();
  }, 30_000);

  it("gives a Firebase user with no linked staff account no session", async () => {
    const { getAuth } = await import("firebase-admin/auth");
    const { getAdminApp } = await import("@/server/firebase-admin");
    const auth = getAuth(getAdminApp());
    const created = await auth.createUser({ email: "unlinked.test@afhomes.com.ph", password: "Unlinked#2026" });
    undo.push(() => auth.deleteUser(created.uid));
    const idToken = await idTokenFor("unlinked.test@afhomes.com.ph", "Unlinked#2026");
    const response = await route.POST(request("POST", { body: { idToken } }));
    expect(response.status).toBe(403);
    expect(cookieOf(response)).toBeUndefined();
  }, 30_000);

  it("treats garbage and missing cookies as signed out", async () => {
    expect((await route.GET(request("GET", { cookie: "not-a-real-session" }))).status).toBe(401);
    expect((await route.GET(request("GET"))).status).toBe(401);
  }, 30_000);

  it("applies a status change on the very next request", async () => {
    const { cookie } = await signIn("dev-hr");
    expect((await route.GET(request("GET", { cookie }))).status).toBe(200);
    const set = (status: string) =>
      db.dbWrite(`mutation($s: String!) { userAccount_updateMany(where: { email: { eq: "carmela.rivera@afhomes.com.ph" } }, data: { status: $s }) }`, { s: status });
    undo.push(() => set("active"));
    await set("suspended");
    expect((await route.GET(request("GET", { cookie }))).status).toBe(403);
  }, 30_000);

  it("applies a role change made during a session", async () => {
    const { cookie } = await signIn("dev-clerk");
    const before = await actors.resolveActorFromSessionCookie(cookie);
    expect(hasFinanceVerify(before!)).toBe(false);
    const user = await db.dbRead<{ userAccounts: Array<{ id: string }> }>(`query { userAccounts(where: { email: { eq: "marites.gonzales@afhomes.com.ph" } }) { id } }`);
    const userId = user.userAccounts[0].id;
    undo.push(() => db.dbWrite(`mutation($u: UUID!) { roleAssignment_delete(key: { userId: $u, role: "finance" }) }`, { u: userId }));
    await db.dbWrite(`mutation($u: UUID!) { roleAssignment_insert(data: { userId: $u, role: "finance", status: "active" }) }`, { u: userId });
    const after = await actors.resolveActorFromSessionCookie(cookie);
    expect(hasFinanceVerify(after!)).toBe(true);
  }, 30_000);

  it("rejects a session after sign-out revokes it", async () => {
    const { cookie } = await signIn("dev-ost-a2");
    expect((await route.GET(request("GET", { cookie }))).status).toBe(200);
    // Firebase stamps revocation in whole seconds, so sign out at least a second after sign-in.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const out = await route.DELETE(request("DELETE", { cookie }));
    expect(out.status).toBe(200);
    expect((await route.GET(request("GET", { cookie }))).status).toBe(401);
  }, 30_000);

  it("limits record scope by role and blocks operations a role lacks", async () => {
    const actorFor = async (identityId: string) => {
      const { cookie } = await signIn(identityId);
      return (await actors.resolveActorFromSessionCookie(cookie))!;
    };
    const members = await authorize.loadScopeMembers();
    const admin = await actorFor("dev-admin");
    expect((await authorize.visibleMemberIdsFor(admin)).size).toBe(members.length);
    const ost = await actorFor("dev-ost-a1");
    expect([...(await authorize.visibleMemberIdsFor(ost))]).toEqual([ost.identity.memberId]);
    const svd = await actorFor("dev-svd-a");
    expect((await authorize.visibleMemberIdsFor(svd)).size).toBeGreaterThan(1);
    expect(() => authorize.requireOperation(ost, "finance.verify")).toThrow(/permission/);
    const finance = await actorFor("dev-finance");
    expect(() => authorize.requireOperation(finance, "finance.verify")).not.toThrow();
  }, 60_000);

  it("keeps privileged database operations closed to direct callers", async () => {
    const response = await fetch(`${DB}/connectors/server:executeQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operationName: "ListUserAccounts" }),
    });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(JSON.stringify(await response.json())).toMatch(/PERMISSION_DENIED|not authorized/);
  }, 30_000);

  it("writes audit events that hold no tokens or credentials", async () => {
    await signIn("dev-admin");
    const events = await db.dbRead<{ auditEvents: Array<{ action: string; details: unknown }> }>(`query { auditEvents(orderBy: [{ occurredAt: DESC }], limit: 20) { action details } }`);
    expect(events.auditEvents.some((event) => event.action === "session.sign_in")).toBe(true);
    const text = JSON.stringify(events.auditEvents);
    expect(text).not.toMatch(/eyJ|idToken|password|Bearer/i);
  }, 30_000);
});

function hasFinanceVerify(actor: { identity: DevIdentity }) {
  return hasOperationPermission(actor.identity, "finance.verify");
}
