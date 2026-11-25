// @vitest-environment node
// Department-role module grants reach the session only while staff, role and department are active.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { call, configureEmulatorEnv, emulatorsUp, sessionCookieFor } from "@/server/testing/emulator";

configureEmulatorEnv();
const up = await emulatorsUp();
const { MOCK_ACCOUNTS } = await import("@/data/mock/mock-credentials");
const account = (identityId: string) => MOCK_ACCOUNTS.find((row) => row.identityId === identityId)!;

type SessionBody = { modules: string[]; operations: string[] };
type Key = { id: string };

describe.skipIf(!up)("department-role access (emulators)", () => {
  let session: typeof import("@/app/api/v1/session/route");
  let db: typeof import("@/server/db");
  let cookie: string;
  let userId: string;
  let departmentId: string | null = null;
  let roleId: string | null = null;
  let staffId: string | null = null;
  const suffix = Date.now();

  const modules = async () => ((await call(session.GET as never, { path: "/api/v1/session", cookie })).body as SessionBody);

  beforeAll(async () => {
    session = await import("@/app/api/v1/session/route");
    db = await import("@/server/db");
    cookie = await sessionCookieFor(session.POST, account("dev-hr").email, account("dev-hr").password);
    const user = await db.dbRead<{ userAccounts: Array<{ id: string }> }>(`query { userAccounts(where: { email: { eq: "carmela.rivera@afhomes.com.ph" } }) { id } }`);
    userId = user.userAccounts[0].id;
    // The HR baseline has no Customers module.
    expect((await modules()).modules).not.toContain("customers");
  }, 60_000);

  afterAll(async () => {
    if (userId) await db.dbWrite(`mutation($id: UUID!) { userAccount_update(id: $id, data: { staffId: null }) }`, { id: userId }).catch(() => undefined);
    if (staffId) await db.dbWrite(`mutation($id: UUID!) { staffMember_delete(id: $id) }`, { id: staffId }).catch(() => undefined);
    if (roleId) await db.dbWrite(`mutation($id: UUID!) { departmentRole_delete(id: $id) }`, { id: roleId }).catch(() => undefined);
    if (departmentId) await db.dbWrite(`mutation($id: UUID!) { department_delete(id: $id) }`, { id: departmentId }).catch(() => undefined);
  });

  it("adds a delegable module from an active department role, never operations or parent scopes", async () => {
    const department = await db.dbWrite<{ department_insert: Key }>(
      `mutation($code: String!) { department_insert(data: { name: "Test Department", code: $code, description: "Access test", status: "active" }) }`,
      { code: `test-dept-${suffix}` },
    );
    departmentId = department.department_insert.id;
    const role = await db.dbWrite<{ departmentRole_insert: Key }>(
      `mutation($department: UUID!, $mods: Any!) { departmentRole_insert(data: { name: "Customers Role", departmentId: $department, moduleIds: $mods, status: "active", isProtected: false }) }`,
      { department: departmentId, mods: ["customers", "sales-group"] },
    );
    roleId = role.departmentRole_insert.id;
    const staff = await db.dbWrite<{ staffMember_insert: Key }>(
      `mutation($department: UUID!, $role: UUID!, $email: String!) { staffMember_insert(data: { displayName: "Test HR Employee", position: "HR Staff", departmentId: $department, departmentRoleId: $role, status: "active", email: $email }) }`,
      { department: departmentId, role: roleId, email: `test-hr-${suffix}@afhomes.local` },
    );
    staffId = staff.staffMember_insert.id;
    await db.dbWrite(`mutation($id: UUID!, $staff: UUID!) { userAccount_update(id: $id, data: { staffId: $staff }) }`, { id: userId, staff: staffId });

    const body = await modules();
    expect(body.modules).toContain("customers");
    expect(body.modules).not.toContain("sales-group"); // parent navigation scopes are never granted
    expect(body.operations).not.toContain("customers.import"); // modules do not grant operations

    await db.dbWrite(`mutation($id: UUID!) { departmentRole_update(id: $id, data: { status: "deactivated" }) }`, { id: roleId });
    expect((await modules()).modules).not.toContain("customers");

    await db.dbWrite(`mutation($id: UUID!) { departmentRole_update(id: $id, data: { status: "active" }) }`, { id: roleId });
    await db.dbWrite(`mutation($id: UUID!) { department_update(id: $id, data: { status: "deactivated" }) }`, { id: departmentId });
    expect((await modules()).modules).not.toContain("customers");

    await db.dbWrite(`mutation($id: UUID!) { department_update(id: $id, data: { status: "active" }) }`, { id: departmentId });
    await db.dbWrite(`mutation($id: UUID!) { staffMember_update(id: $id, data: { status: "inactive" }) }`, { id: staffId });
    expect((await modules()).modules).not.toContain("customers");

    await db.dbWrite(`mutation($id: UUID!) { staffMember_update(id: $id, data: { status: "active" }) }`, { id: staffId });
    expect((await modules()).modules).toContain("customers");
  }, 60_000);
});
