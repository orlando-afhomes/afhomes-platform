// @vitest-environment node
// Organization slice (F1): departments, delegable roles, staff provisioning and accounts on the local emulators.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { configureEmulatorEnv, emulatorsUp, sessionCookieFor } from "@/server/testing/emulator";

configureEmulatorEnv();
const up = await emulatorsUp();
const { SEED_ACCOUNTS } = await import("@/data/seed/dev-credentials");
const account = (identityId: string) => SEED_ACCOUNTS.find((row) => row.identityId === identityId)!;

describe.skipIf(!up)("organization services (emulators)", () => {
  let org: typeof import("@/server/services/organization");
  let db: typeof import("@/server/db");
  let auth: typeof import("@/server/auth/actor");
  let sessionRoute: typeof import("@/app/api/v1/session/route");
  let superAdmin: Awaited<ReturnType<typeof import("@/server/auth/actor").requireActor>>;
  let admin: typeof superAdmin;
  let hr: typeof superAdmin;
  let departmentId: string | null = null;
  let roleId: string | null = null;
  let staffId: string | null = null;
  let accountId: string | null = null;
  const email = `f1-test-${Date.now()}@afhomes.local`;
  const suffix = Date.now();

  beforeAll(async () => {
    org = await import("@/server/services/organization");
    db = await import("@/server/db");
    auth = await import("@/server/auth/actor");
    sessionRoute = await import("@/app/api/v1/session/route");
    const superCookie = await sessionCookieFor(sessionRoute.POST, account("dev-super-admin").email, account("dev-super-admin").password);
    const adminCookie = await sessionCookieFor(sessionRoute.POST, account("dev-admin").email, account("dev-admin").password);
    const hrCookie = await sessionCookieFor(sessionRoute.POST, account("dev-hr").email, account("dev-hr").password);
    superAdmin = (await auth.resolveActorFromSessionCookie(superCookie))!;
    admin = (await auth.resolveActorFromSessionCookie(adminCookie))!;
    hr = (await auth.resolveActorFromSessionCookie(hrCookie))!;
  }, 60_000);

  afterAll(async () => {
    if (accountId) {
      await db.dbWrite(`mutation($id: UUID!) { accountStatusEvent_deleteMany(where: { accountId: { eq: $id } }) }`, { id: accountId }).catch(() => undefined);
      await db.dbWrite(`mutation($id: UUID!) { roleAssignment_deleteMany(where: { userId: { eq: $id } }) }`, { id: accountId }).catch(() => undefined);
      await db.dbWrite(`mutation($id: UUID!) { userAccount_delete(id: $id) }`, { id: accountId }).catch(() => undefined);
    }
    if (staffId) await db.dbWrite(`mutation($id: UUID!) { staffMember_delete(id: $id) }`, { id: staffId }).catch(() => undefined);
    if (roleId) await db.dbWrite(`mutation($id: UUID!) { departmentRole_delete(id: $id) }`, { id: roleId }).catch(() => undefined);
    if (departmentId) await db.dbWrite(`mutation($id: UUID!) { department_delete(id: $id) }`, { id: departmentId }).catch(() => undefined);
    const { getAuth } = await import("firebase-admin/auth");
    const { getAdminApp } = await import("@/server/firebase-admin");
    await getAuth(getAdminApp()).getUserByEmail(email).then((user) => getAuth(getAdminApp()).deleteUser(user.uid)).catch(() => undefined);
  });

  it("lets the Super Admin create a department, role, staff member and pending account, then activate it", async () => {
    const department = await org.createDepartment(superAdmin, { name: `F1 Test Department ${suffix}`, description: "Created by the F1 test." });
    departmentId = department.id;
    expect(department.code).toMatch(/^[A-Z0-9-]+$/);

    const role = await org.createDepartmentRole(superAdmin, { name: `F1 Test Role ${suffix}`, departmentId: department.id, moduleIds: ["dashboard", "experiences"] });
    roleId = role.id;
    expect(role.moduleIds).toEqual(["dashboard", "experiences"]);

    const options = await org.listRoleOptions(superAdmin);
    expect(options.find((item) => item.id === role.id)).toMatchObject({ manageable: true, assignable: true });

    const staff = await org.createStaff(superAdmin, {
      displayName: "F1 Test Employee",
      position: "Tester",
      departmentId: department.id,
      departmentRoleId: role.id,
      email,
      provisionPendingAccount: true,
      systemRoleIds: ["clerk"],
    });
    staffId = staff.id;
    accountId = staff.accountId;
    expect(accountId).toBeTruthy();

    const accounts = await org.listAccounts(superAdmin);
    const pending = accounts.find((item) => item.id === staff.accountId)!;
    expect(pending).toMatchObject({ status: "pending", roleIds: ["clerk"] });

    const activated = await org.updateAccountStatus(superAdmin, pending.id, "active");
    expect(activated.status).toBe("active");

    // Exit scenario: the new account signs in and receives the department-role module it
    // lacks from its system role. The Admin SDK password stands in for the reset email.
    const { getAuth } = await import("firebase-admin/auth");
    const { getAdminApp } = await import("@/server/firebase-admin");
    const firebaseUser = await getAuth(getAdminApp()).getUserByEmail(email);
    await getAuth(getAdminApp()).updateUser(firebaseUser.uid, { password: "Reset@12345" });
    const cookie = await sessionCookieFor(sessionRoute.POST, email, "Reset@12345");
    const signedIn = (await auth.resolveActorFromSessionCookie(cookie))!;
    expect(signedIn.identity.status).toBe("active");
    const modules = (await import("@/modules/identity/permissions")).getGrantedModuleIds(signedIn.identity);
    expect(modules.has("experiences")).toBe(true);
  }, 60_000);

  it("records the activation in account status history and audit", async () => {
    expect(accountId).toBeTruthy();
    const events = await db.dbRead<{ accountStatusEvents: Array<{ previousStatus: string; newStatus: string }> }>(
      `query($id: UUID!) { accountStatusEvents(where: { accountId: { eq: $id } }) { previousStatus newStatus } }`,
      { id: accountId },
    );
    expect(events.accountStatusEvents).toContainEqual({ previousStatus: "pending", newStatus: "active" });
    const audits = await db.dbRead<{ auditEvents: Array<{ action: string; entityId: string }> }>(
      `query($id: String!) { auditEvents(where: { action: { eq: "ACCOUNT_STATUS_CHANGED" }, entityId: { eq: $id } }) { action entityId } }`,
      { id: accountId },
    );
    expect(audits.auditEvents.length).toBeGreaterThan(0);
  });

  it("denies HR role creation and password reset while allowing staff reads", async () => {
    const staff = await org.listStaff(hr);
    expect(staff.length).toBeGreaterThan(0);
    expect(departmentId).toBeTruthy();
    await expect(org.createDepartmentRole(hr, { name: `HR Attempt ${suffix}`, departmentId: departmentId!, moduleIds: ["dashboard"] })).rejects.toMatchObject({ status: 403 });
    await expect(org.requestPasswordReset(hr, hr.userId)).rejects.toMatchObject({ status: 403 });
  });

  it("keeps the protected Super Administrator account out of an Administrator's reach", async () => {
    const accounts = await org.listAccounts(admin);
    const protectedAccount = accounts.find((item) => item.roleIds.includes("super_admin") && item.status === "active")!;
    expect(protectedAccount).toBeTruthy();
    await expect(org.updateAccountStatus(admin, protectedAccount.id, "suspended")).rejects.toMatchObject({ status: 403 });
    await expect(org.requestPasswordReset(admin, protectedAccount.id)).rejects.toMatchObject({ status: 403 });
    await expect(org.assignAccountRole(admin, protectedAccount.id, "super_admin")).rejects.toMatchObject({ status: 403 });
  });

  it("refuses to delegate parent navigation scopes", async () => {
    expect(departmentId).toBeTruthy();
    await expect(org.createDepartmentRole(admin, { name: `Parent Scope ${suffix}`, departmentId: departmentId!, moduleIds: ["sales-group"] })).rejects.toMatchObject({ status: 422 });
  });

  it("protects the last active Super Administrator from deactivation", async () => {
    const accounts = await org.listAccounts(superAdmin);
    const last = accounts.filter((item) => item.roleIds.includes("super_admin") && item.status === "active");
    expect(last).toHaveLength(1);
    await expect(org.updateAccountStatus(superAdmin, last[0].id, "deactivated")).rejects.toMatchObject({ status: 409 });
  });

  it("requests a password reset without storing or auditing credential material", async () => {
    const hrId = hr.userId;
    const result = await org.requestPasswordReset(admin, hrId);
    expect(result.email).toBe(account("dev-hr").email);
    const audits = await db.dbRead<{ auditEvents: Array<{ details: Record<string, unknown> | null }> }>(
      `query($id: String!) { auditEvents(where: { action: { eq: "ACCOUNT_PASSWORD_RESET" }, entityId: { eq: $id } }) { details } }`,
      { id: hrId },
    );
    expect(audits.auditEvents.length).toBeGreaterThan(0);
    for (const event of audits.auditEvents) {
      const text = JSON.stringify(event.details ?? {});
      expect(text).not.toMatch(/resetLink|password|oobCode/i);
    }
  });
});
