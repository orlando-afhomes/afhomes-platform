import { describe, expect, it } from "vitest";
import type { DevIdentity } from "@/modules/identity/types";
import { AUDIT_ACTIONS } from "@/modules/audit/types";
import { ACCOUNT_DELETE_DISABLED } from "@/modules/accounts/types";
import { createMockStore } from "./seed";
import { SEED_AUDIT_EVENT_COUNT } from "./seed-data";
import { createMockRepositories } from "./repositories";
import { getDevIdentity } from "./dev-identities";
import { LAST_SUPER_ADMIN_ERROR, SELF_MODIFICATION_ERROR } from "./authorization";

type Store = ReturnType<typeof createMockStore>;

function snapshot(store: Store, id: string) {
  const account = store.accounts.find((item) => item.id === id);
  return account ? { ...account, roleIds: [...account.roleIds] } : undefined;
}

/** Super Admin actor with no linked staff record, so self-modification rules do not apply. */
const unlinkedSuperAdmin: DevIdentity = {
  id: "test-unlinked-super",
  displayName: "Unlinked Super Admin",
  roles: ["super_admin"],
  memberId: null,
  branchId: null,
  status: "active",
};

describe("account repository", () => {
  it("lists accounts for admin", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const accounts = await repo.list();
    expect(accounts.length).toBeGreaterThan(0);
  });

  it("denies non-admin", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-hr")).accounts;
    expect(await repo.list()).toEqual([]);
  });

  it("creates pending account", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const created = await repo.create({ displayName: "New User", email: "new@afhomes.local", roleIds: ["hr"] });
    expect(created.status).toBe("pending");
    expect(created.displayName).toBe("New User");
  });

  it("rejects duplicate email", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    await expect(repo.create({ displayName: "Dup", email: "admin@afhomes.local", roleIds: ["hr"] })).rejects.toThrow();
  });

  // S3-02: Finance authority is outside Admin's delegation scope, so the
  // former Admin-assigns-Finance expectation is replaced by these two tests.
  it("lets a super admin assign and revoke the finance role", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).accounts;
    const account = await repo.create({ displayName: "Role User", email: "role@afhomes.local", roleIds: ["hr"] });
    const assigned = await repo.assignRole(account.id, "finance");
    expect(assigned.roleIds).toContain("finance");
    const revoked = await repo.revokeRole(account.id, "finance");
    expect(revoked.roleIds).not.toContain("finance");
  });

  it("rejects admin delegating finance without changing the account or auditing", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const account = await repo.create({ displayName: "Role User", email: "role@afhomes.local", roleIds: ["hr"] });
    const before = snapshot(store, account.id);
    const auditCount = store.auditEvents.length;
    await expect(repo.assignRole(account.id, "finance")).rejects.toThrow("outside the acting account's scope");
    expect(snapshot(store, account.id)).toEqual(before);
    expect(store.auditEvents).toHaveLength(auditCount);
  });

  it("lets admin assign and revoke a role within its scope", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const account = await repo.create({ displayName: "Scoped User", email: "scoped@afhomes.local", roleIds: [] });
    expect((await repo.assignRole(account.id, "hr")).roleIds).toEqual(["hr"]);
    expect((await repo.revokeRole(account.id, "hr")).roleIds).toEqual([]);
  });

  it("updates status", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const account = await repo.create({ displayName: "Status User", email: "status@afhomes.local", roleIds: ["hr"] });
    const updated = await repo.updateStatus(account.id, "active");
    expect(updated.status).toBe("active");
  });

  it("rejects invalid status transition", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const account = await repo.create({ displayName: "Bad Transition", email: "bad@afhomes.local", roleIds: ["hr"] });
    await expect(repo.updateStatus(account.id, "suspended")).rejects.toThrow();
  });

  it("protects super admin account from admin", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    await expect(repo.updateStatus("acct-super-admin", "suspended")).rejects.toThrow();
    await expect(repo.assignRole("acct-super-admin", "hr")).rejects.toThrow();
  });

  it("prevents admin from assigning super_admin role", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const account = await repo.create({ displayName: "Escalation", email: "esc@afhomes.local", roleIds: ["hr"] });
    await expect(repo.assignRole(account.id, "super_admin")).rejects.toThrow();
  });
});

describe("account repository S3-A protections", () => {
  it("reserves the admin system role for super admins", async () => {
    const store = createMockStore();
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const account = await admin.create({ displayName: "Target", email: "target@afhomes.local", roleIds: [] });
    const before = snapshot(store, account.id);
    await expect(admin.assignRole(account.id, "admin")).rejects.toThrow("Only a Super Administrator");
    await expect(admin.create({ displayName: "Esc", email: "esc2@afhomes.local", roleIds: ["admin"] })).rejects.toThrow("Only a Super Administrator");
    await expect(admin.revokeRole("acct-admin", "admin")).rejects.toThrow();
    expect(snapshot(store, account.id)).toEqual(before);
    expect(store.accounts.some((item) => item.email === "esc2@afhomes.local")).toBe(false);

    const superAdmin = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).accounts;
    expect((await superAdmin.assignRole(account.id, "admin")).roleIds).toContain("admin");
  });

  it("rejects self role and status changes without mutation", async () => {
    const store = createMockStore();
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const before = snapshot(store, "acct-admin");
    await expect(admin.assignRole("acct-admin", "hr")).rejects.toThrow(SELF_MODIFICATION_ERROR);
    await expect(admin.updateStatus("acct-admin", "deactivated")).rejects.toThrow(SELF_MODIFICATION_ERROR);
    // Department moves away from the actor's own staff department stay rejected (S3-A);
    // identity edits on the linked account reject with the Staff Management rule (S3-B.1 B).
    await expect(admin.update("acct-admin", { departmentId: "dept-finance" })).rejects.toThrow(SELF_MODIFICATION_ERROR);
    await expect(admin.update("acct-admin", { displayName: "Renamed" })).rejects.toThrow("Staff Management");
    expect(snapshot(store, "acct-admin")).toEqual(before);

    const superAdmin = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).accounts;
    // Owner decision 2026-11-10: Super Admin bypasses the self-modification ban, so removing its own
    // last Super Admin role is still rejected, but now by the last-Super-Admin protection.
    await expect(superAdmin.revokeRole("acct-super-admin", "super_admin")).rejects.toThrow(LAST_SUPER_ADMIN_ERROR);
    expect(snapshot(store, "acct-super-admin")?.roleIds).toEqual(["super_admin"]);
  });

  it("lets a super admin change its own roles, status, and department", async () => {
    const store = createMockStore();
    const superAdmin = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).accounts;
    // Owner decision 2026-11-10: the self-modification ban does not apply to Super Admin.
    // Role changes that keep the Super Admin role succeed on the actor's own account.
    expect((await superAdmin.assignRole("acct-super-admin", "hr")).roleIds).toContain("hr");
    expect((await superAdmin.update("acct-super-admin", { departmentId: "dept-hr" })).departmentId).toBe("dept-hr");
    expect((await superAdmin.revokeRole("acct-super-admin", "hr")).roleIds).not.toContain("hr");
    // Suspending the last active Super Admin is still blocked for everyone, including Super Admin.
    await expect(superAdmin.updateStatus("acct-super-admin", "suspended")).rejects.toThrow(LAST_SUPER_ADMIN_ERROR);
    // Once another active Super Admin exists, suspending its own account succeeds.
    const second = await superAdmin.create({ displayName: "Second", email: "second@afhomes.local", roleIds: ["super_admin"] });
    await superAdmin.updateStatus(second.id, "active");
    expect((await superAdmin.updateStatus("acct-super-admin", "suspended")).status).toBe("suspended");
  });

  it("rejects own identity edits for staff-linked accounts but keeps the department mirror", async () => {
    const store = createMockStore();
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const before = snapshot(store, "acct-admin");
    const auditCount = store.auditEvents.length;
    // acct-admin links to staff-admin: Staff is authoritative for name/email (S3-B.1 B).
    await expect(admin.update("acct-admin", { displayName: "Admin Renamed" })).rejects.toThrow("Staff Management");
    await expect(admin.update("acct-admin", { email: "renamed@afhomes.local" })).rejects.toThrow("Staff Management");
    expect(snapshot(store, "acct-admin")).toEqual(before);
    expect(store.auditEvents).toHaveLength(auditCount);
    // Resending the current values is a no-op; the department mirror still applies.
    const mirrored = await admin.update("acct-admin", { displayName: "Administrator", email: "admin@afhomes.local", departmentId: "dept-hr" });
    expect(mirrored.departmentId).toBe("dept-hr");
  });

  it("never removes the last active super admin", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => unlinkedSuperAdmin).accounts;
    const before = snapshot(store, "acct-super-admin");
    await expect(repo.revokeRole("acct-super-admin", "super_admin")).rejects.toThrow(LAST_SUPER_ADMIN_ERROR);
    await expect(repo.updateStatus("acct-super-admin", "suspended")).rejects.toThrow(LAST_SUPER_ADMIN_ERROR);
    await expect(repo.updateStatus("acct-super-admin", "deactivated")).rejects.toThrow(LAST_SUPER_ADMIN_ERROR);
    expect(snapshot(store, "acct-super-admin")).toEqual(before);

    const second = await repo.create({ displayName: "Second", email: "second@afhomes.local", roleIds: ["super_admin"] });
    await repo.updateStatus(second.id, "active");
    expect((await repo.updateStatus("acct-super-admin", "suspended")).status).toBe("suspended");
    await expect(repo.updateStatus(second.id, "suspended")).rejects.toThrow(LAST_SUPER_ADMIN_ERROR);
  });

  it("denies accounts authority delegated through a department role", async () => {
    const store = createMockStore();
    const superRepos = createMockRepositories(store, () => getDevIdentity("dev-super-admin"));
    // role-admin still stores the legacy "accounts" grant; it must stay inert.
    await superRepos.staff.update("staff-3", { departmentId: "dept-admin", departmentRoleId: "role-admin" });
    const delegated: DevIdentity = { ...unlinkedSuperAdmin, id: "test-delegated", roles: [], staffId: "staff-3" };
    const repo = createMockRepositories(store, () => delegated).accounts;
    const before = snapshot(store, "acct-pending");
    expect(await repo.list()).toEqual([]);
    await expect(repo.updateStatus("acct-pending", "active")).rejects.toThrow("Status change is not allowed.");
    expect(snapshot(store, "acct-pending")).toEqual(before);
  });

  it("derives account policies for admin from the enforced rules", async () => {
    const store = createMockStore();
    const policies = await createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts.getPolicies();
    expect(policies.creatableRoles).toEqual(["hr", "clerk", "svd", "ssm", "sm", "ost"]);
    expect(policies.accounts["acct-super-admin"]).toMatchObject({ canEdit: false, canManageRoles: false, allowedStatuses: [], linkedToStaff: true });
    expect(policies.accounts["acct-super-admin"].restriction).toMatch(/Protected/);
    expect(policies.accounts["acct-admin"]).toMatchObject({ canEdit: true, canManageRoles: false, allowedStatuses: [], linkedToStaff: true });
    expect(policies.accounts["acct-hr"]).toMatchObject({ canManageRoles: true, revocableRoles: ["hr"], allowedStatuses: ["suspended", "deactivated"], linkedToStaff: true, restriction: null });
    expect(policies.accounts["acct-hr"].assignableRoles).not.toContain("finance");
    expect(policies.accounts["acct-pending"]).toMatchObject({ canEdit: true, allowedStatuses: ["active"], linkedToStaff: false, restriction: null });
  });

  it("gives super admins every system role and hides last-super-admin removals", async () => {
    const store = createMockStore();
    const linked = await createMockRepositories(store, () => getDevIdentity("dev-super-admin")).accounts.getPolicies();
    expect(linked.creatableRoles).toEqual(["super_admin", "admin", "hr", "clerk", "finance", "svd", "ssm", "sm", "ost"]);
    expect(linked.accounts["acct-hr"].assignableRoles).toContain("finance");
    const unlinked = await createMockRepositories(store, () => unlinkedSuperAdmin).accounts.getPolicies();
    expect(unlinked.accounts["acct-super-admin"]).toMatchObject({ revocableRoles: [], allowedStatuses: [] });
  });

  it("returns no policies without accounts access", async () => {
    const store = createMockStore();
    expect(await createMockRepositories(store, () => getDevIdentity("dev-hr")).accounts.getPolicies()).toEqual({ creatableRoles: [], accounts: {} });
  });

  it("rejects inactive or unknown departments on account create", async () => {
    const store = createMockStore();
    const repos = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    await repos.departments.update("dept-ops", { status: "deactivated" });
    await expect(repos.accounts.create({ displayName: "A", email: "a@afhomes.local", roleIds: [], departmentId: "dept-ops" })).rejects.toThrow("deactivated");
    await expect(repos.accounts.create({ displayName: "B", email: "b@afhomes.local", roleIds: [], departmentId: "dept-none" })).rejects.toThrow("Invalid department");
  });
});

describe("account repository S3-B.1 staff-authoritative identity", () => {
  it("rejects name and email changes for staff-linked accounts without mutation or audit", async () => {
    const store = createMockStore();
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const before = snapshot(store, "acct-hr");
    const auditCount = store.auditEvents.length;
    await expect(admin.update("acct-hr", { displayName: "HR Renamed" })).rejects.toThrow("Staff Management");
    await expect(admin.update("acct-hr", { email: "hr.renamed@afhomes.local" })).rejects.toThrow("Staff Management");
    expect(snapshot(store, "acct-hr")).toEqual(before);
    expect(store.auditEvents).toHaveLength(auditCount);
    // Only identity fields are blocked; department assignment still applies.
    expect((await admin.update("acct-hr", { departmentId: "dept-hr" })).departmentId).toBe("dept-hr");
  });

  it("keeps unlinked account editing fully available", async () => {
    const store = createMockStore();
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const updated = await admin.update("acct-pending", { displayName: "Pending Renamed", email: "renamed-pending@afhomes.local" });
    expect(updated).toMatchObject({ displayName: "Pending Renamed", email: "renamed-pending@afhomes.local" });
  });

  it("rejects case-insensitive duplicate emails on update", async () => {
    const store = createMockStore();
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const before = snapshot(store, "acct-pending");
    await expect(admin.update("acct-pending", { email: "ADMIN@afhomes.local" })).rejects.toThrow("already exists");
    expect(snapshot(store, "acct-pending")).toEqual(before);
  });

  it("lets admin suspend, deactivate, and reactivate another eligible admin account", async () => {
    const store = createMockStore();
    const superAdmin = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).accounts;
    const peer = await superAdmin.create({ displayName: "Peer Admin", email: "peer-admin@afhomes.local", roleIds: ["admin"] });
    await superAdmin.updateStatus(peer.id, "active");
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    expect((await admin.updateStatus(peer.id, "suspended")).status).toBe("suspended");
    expect((await admin.updateStatus(peer.id, "deactivated")).status).toBe("deactivated");
    expect((await admin.updateStatus(peer.id, "active")).status).toBe("active");
    // Self-status and protected-account changes stay rejected without mutation or audit.
    const auditCount = store.auditEvents.length;
    const selfBefore = snapshot(store, "acct-admin");
    const protectedBefore = snapshot(store, "acct-super-admin");
    await expect(admin.updateStatus("acct-admin", "suspended")).rejects.toThrow(SELF_MODIFICATION_ERROR);
    await expect(admin.updateStatus("acct-super-admin", "suspended")).rejects.toThrow();
    expect(snapshot(store, "acct-admin")).toEqual(selfBefore);
    expect(snapshot(store, "acct-super-admin")).toEqual(protectedBefore);
    expect(store.auditEvents).toHaveLength(auditCount);
  });
});

describe("account repository S3-C1 audit events", () => {
  it("records exactly one ACCOUNT_CREATED with actor, target, and timestamp", async () => {
    const store = createMockStore();
    const before = new Date().toISOString();
    const created = await createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts.create({
      displayName: "Audited User",
      email: "audited@afhomes.local",
      roleIds: ["hr", "svd"],
    });
    expect(store.auditEvents).toHaveLength(1 + SEED_AUDIT_EVENT_COUNT);
    const event = store.auditEvents.find((item) => item.entityId === created.id)!;
    expect(event).toMatchObject({
      actorId: "dev-admin",
      actorRoles: ["admin"],
      module: "organization",
      action: AUDIT_ACTIONS.ACCOUNT_CREATED,
      entityType: "account",
      entityId: created.id,
      newValue: "pending [hr,svd]",
      outcome: "success",
    });
    expect(event.id).toMatch(/^audit-\d+$/);
    expect(event.timestamp >= before).toBe(true);
  });

  it("records role assignment and revocation with the affected role", async () => {
    const store = createMockStore();
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const account = await admin.create({ displayName: "Role Audit", email: "roleaudit@afhomes.local", roleIds: [] });
    await admin.assignRole(account.id, "hr");
    await admin.revokeRole(account.id, "hr");
    const actions = store.auditEvents.slice(SEED_AUDIT_EVENT_COUNT).map((item) => item.action);
    expect(actions).toEqual([AUDIT_ACTIONS.ACCOUNT_CREATED, AUDIT_ACTIONS.ACCOUNT_ROLE_ASSIGNED, AUDIT_ACTIONS.ACCOUNT_ROLE_REVOKED]);
    expect(store.auditEvents[SEED_AUDIT_EVENT_COUNT + 1]).toMatchObject({ entityId: account.id, newValue: "hr" });
    expect(store.auditEvents[SEED_AUDIT_EVENT_COUNT + 1]).not.toHaveProperty("previousValue");
    expect(store.auditEvents[SEED_AUDIT_EVENT_COUNT + 2]).toMatchObject({ entityId: account.id, previousValue: "hr" });
    expect(store.auditEvents[SEED_AUDIT_EVENT_COUNT + 2]).not.toHaveProperty("newValue");
  });

  it("records status transitions with before and after values", async () => {
    const store = createMockStore();
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const account = await admin.create({ displayName: "Status Audit", email: "statusaudit@afhomes.local", roleIds: ["hr"] });
    await admin.updateStatus(account.id, "active");
    await admin.updateStatus(account.id, "suspended");
    const statusEvents = store.auditEvents.filter((item) => item.action === AUDIT_ACTIONS.ACCOUNT_STATUS_CHANGED);
    expect(statusEvents).toHaveLength(2);
    expect(statusEvents[0]).toMatchObject({ entityId: account.id, previousValue: "pending", newValue: "active" });
    expect(statusEvents[1]).toMatchObject({ entityId: account.id, previousValue: "active", newValue: "suspended" });
  });

  it("attributes protected-account changes to the super admin actor", async () => {
    const store = createMockStore();
    const superAdmin = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).accounts;
    const peer = await superAdmin.create({ displayName: "Peer Two", email: "peer2@afhomes.local", roleIds: ["super_admin"] });
    await superAdmin.updateStatus(peer.id, "active");
    const statusEvent = store.auditEvents.find((item) => item.action === AUDIT_ACTIONS.ACCOUNT_STATUS_CHANGED);
    expect(statusEvent).toMatchObject({ actorId: "dev-super-admin", entityId: peer.id });
    expect(statusEvent?.actorRoles).toContain("super_admin");
  });

  it("creates no success event for rejected operations", async () => {
    const store = createMockStore();
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    await expect(admin.create({ displayName: "Dup", email: "admin@afhomes.local", roleIds: ["hr"] })).rejects.toThrow();
    await expect(admin.assignRole("acct-hr", "finance")).rejects.toThrow();
    await expect(admin.updateStatus("acct-super-admin", "suspended")).rejects.toThrow();
    expect(store.auditEvents).toHaveLength(SEED_AUDIT_EVENT_COUNT);
  });

  it("starts from the seeded display history", () => {
    expect(createMockStore().auditEvents).toHaveLength(SEED_AUDIT_EVENT_COUNT);
  });
});

describe("account repository activation audit (OC1)", () => {
  it("emits exactly one status event when activating a pending account", async () => {
    const store = createMockStore();
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const account = await admin.create({ displayName: "Activate Me", email: "activate@afhomes.local", roleIds: ["hr"] });
    store.auditEvents.length = 0;
    expect((await admin.updateStatus(account.id, "active")).status).toBe("active");
    expect(store.auditEvents).toHaveLength(1);
    expect(store.auditEvents[0]).toMatchObject({
      actorId: "dev-admin",
      action: AUDIT_ACTIONS.ACCOUNT_STATUS_CHANGED,
      entityType: "account",
      entityId: account.id,
      previousValue: "pending",
      newValue: "active",
      outcome: "success",
    });
  });

  it("rejects HR activation without data or audit changes", async () => {
    const store = createMockStore();
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const account = await admin.create({ displayName: "Stay Pending", email: "staypending@afhomes.local", roleIds: ["hr"] });
    const before = snapshot(store, account.id);
    store.auditEvents.length = 0;
    const hr = createMockRepositories(store, () => getDevIdentity("dev-hr")).accounts;
    await expect(hr.updateStatus(account.id, "active")).rejects.toThrow("Status change is not allowed.");
    expect(snapshot(store, account.id)).toEqual(before);
    expect(store.auditEvents).toHaveLength(0);
  });
});

describe("account repository delete (disabled pending R8)", () => {
  const dump = (store: Store) => JSON.stringify({ accounts: store.accounts, staff: store.staff, members: store.members, audit: store.auditEvents });

  it("rejects every deletion without changing records, references, or audit history", async () => {
    const store = createMockStore();
    const superAdmin = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).accounts;
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const financeHolder = await superAdmin.create({ displayName: "Finance Holder", email: "fin2@afhomes.local", roleIds: ["finance"] });
    const before = dump(store);
    // Pending unlinked, Active, protected, own, staff-linked, and out-of-authority accounts all reject alike.
    for (const id of ["acct-pending", "acct-finance", "acct-super-admin", "acct-admin", "acct-hr", financeHolder.id]) {
      await expect(admin.delete(id)).rejects.toThrow(ACCOUNT_DELETE_DISABLED);
    }
    await expect(superAdmin.delete("acct-super-admin")).rejects.toThrow(ACCOUNT_DELETE_DISABLED);
    await expect(admin.delete("acct-missing")).rejects.toThrow("Account not found.");
    expect(dump(store)).toBe(before);
    expect(store.auditEvents.some((event) => event.action === AUDIT_ACTIONS.ACCOUNT_DELETED)).toBe(false);
  });

  it("keeps member and staff references to accounts intact", async () => {
    const store = createMockStore();
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
    const linkedMemberAccountIds = store.members.map((member) => member.accountId).filter((id): id is string => id !== null);
    const linkedStaffAccountIds = store.staff.map((member) => member.accountId).filter((id): id is string => id !== null);
    for (const id of [...linkedMemberAccountIds, ...linkedStaffAccountIds]) {
      await expect(admin.delete(id)).rejects.toThrow(ACCOUNT_DELETE_DISABLED);
    }
    for (const id of [...linkedMemberAccountIds, ...linkedStaffAccountIds]) expect(snapshot(store, id)).toBeDefined();
  });

  it("denies deletion to identities without the Accounts module", async () => {
    const store = createMockStore();
    const hr = createMockRepositories(store, () => getDevIdentity("dev-hr")).accounts;
    await expect(hr.delete("acct-pending")).rejects.toThrow("Account deletion is not allowed.");
    expect(snapshot(store, "acct-pending")).toBeDefined();
  });

  it("exposes the same restriction in every delete policy", async () => {
    const store = createMockStore();
    const policies = (await createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts.getPolicies()).accounts;
    for (const policy of Object.values(policies)) {
      expect(policy).toMatchObject({ canDelete: false, deleteRestriction: ACCOUNT_DELETE_DISABLED });
    }
  });

  describe("temporary password and audit flags", () => {
    it("lets an Administrator set a temporary password, audited without the value", async () => {
      const store = createMockStore();
      const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
      const { temporaryPassword } = await repo.setTemporaryPassword("acct-hr");
      expect(temporaryPassword).toMatch(/^Tmp-/);
      expect(store.temporaryPasswords["acct-hr"]).toBe(temporaryPassword);
      const event = store.auditEvents.at(-1)!;
      expect(event.action).toBe(AUDIT_ACTIONS.ACCOUNT_PASSWORD_RESET);
      expect(event.entityId).toBe("acct-hr");
      expect(JSON.stringify(event)).not.toContain(temporaryPassword);
    });

    it("denies HR, Finance and a non-Super-Administrator on a protected account", async () => {
      const store = createMockStore();
      for (const id of ["dev-hr", "dev-finance"]) {
        const repo = createMockRepositories(store, () => getDevIdentity(id)).accounts;
        await expect(repo.setTemporaryPassword("acct-pending")).rejects.toThrow();
      }
      const admin = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
      await expect(admin.setTemporaryPassword("acct-super-admin")).rejects.toThrow();
      expect(store.temporaryPasswords).toEqual({});
    });

    it("flags a self-approved account activation in the audit entry", async () => {
      const store = createMockStore();
      const admin = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
      const mine = await admin.create({ displayName: "Mine", email: "mine@afhomes.local", roleIds: ["hr"] });
      await admin.updateStatus(mine.id, "active");
      expect(store.auditEvents.at(-1)?.reason).toMatch(/^Self-approved/);
      const other = await createMockRepositories(store, () => getDevIdentity("dev-super-admin")).accounts.create({ displayName: "Other", email: "other@afhomes.local", roleIds: ["hr"] });
      await admin.updateStatus(other.id, "active");
      expect(store.auditEvents.at(-1)?.reason).toBeUndefined();
    });

    it("audits a department change made through account update", async () => {
      const store = createMockStore();
      const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts;
      await repo.update("acct-pending", { departmentId: "dept-ops" });
      const event = store.auditEvents.at(-1)!;
      expect(event.action).toBe(AUDIT_ACTIONS.ACCOUNT_UPDATED);
      expect(event.previousValue).toBe("department:none");
      expect(event.newValue).toBe("department:dept-ops");
    });
  });
});
