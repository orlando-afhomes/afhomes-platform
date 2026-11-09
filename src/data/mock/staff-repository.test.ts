import { describe, expect, it } from "vitest";
import { createMockStore } from "./seed";
import { createMockRepositories } from "./repositories";
import { AUDIT_ACTIONS } from "@/modules/audit/types";
import { getDevIdentity } from "./dev-identities";
import { STAFF_DELETE_DISABLED } from "@/modules/organization/types";
import { PROTECTED_ROLE_ERROR, PROTECTED_STAFF_ERROR, SELF_MODIFICATION_ERROR, resolveEffectiveModules } from "./authorization";

function staffSnapshot(store: ReturnType<typeof createMockStore>, id: string) {
  const staff = store.staff.find((item) => item.id === id);
  return staff ? { ...staff } : undefined;
}

describe("staff repository S3-A protections", () => {
  it("rejects HR assigning itself Admin authority without partial changes", async () => {
    const store = createMockStore();
    const hr = getDevIdentity("dev-hr");
    const repo = createMockRepositories(store, () => hr).staff;
    const before = staffSnapshot(store, "staff-1");
    const modulesBefore = [...resolveEffectiveModules(store, hr)].sort();
    const auditCount = store.auditEvents.length;
    await expect(repo.update("staff-1", { departmentId: "dept-admin", departmentRoleId: "role-admin" })).rejects.toThrow(SELF_MODIFICATION_ERROR);
    await expect(repo.update("staff-1", { departmentId: "dept-admin", departmentRoleId: "role-super-admin" })).rejects.toThrow();
    expect(staffSnapshot(store, "staff-1")).toEqual(before);
    expect([...resolveEffectiveModules(store, hr)].sort()).toEqual(modulesBefore);
    expect(store.auditEvents).toHaveLength(auditCount);
  });

  it("rejects HR assigning a role beyond its modules to another employee", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-hr")).staff;
    const before = staffSnapshot(store, "staff-3");
    // role-admin confers "roles", which HR does not hold.
    await expect(repo.update("staff-3", { displayName: "Changed", departmentId: "dept-admin", departmentRoleId: "role-admin" })).rejects.toThrow(
      'Module "roles" is outside the acting account\'s authorized scope.',
    );
    expect(staffSnapshot(store, "staff-3")).toEqual(before);
    await expect(
      repo.create({ displayName: "Esc", position: "x", departmentId: "dept-admin", departmentRoleId: "role-admin", email: "esc@afhomes.local" }),
    ).rejects.toThrow("outside the acting account");
  });

  it("lets HR assign a role within its own modules", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-hr")).staff;
    const updated = await repo.update("staff-3", { departmentId: "dept-hr", departmentRoleId: "role-hr-staff" });
    expect(updated.departmentRoleId).toBe("role-hr-staff");
  });

  it("lets admin assign the Administrator department role, whose legacy accounts grant stays inert", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const updated = await repo.update("staff-3", { departmentId: "dept-admin", departmentRoleId: "role-admin" });
    expect(updated.departmentRoleId).toBe("role-admin");
  });

  it("reserves the protected Super Admin role for super admins", async () => {
    const store = createMockStore();
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const before = staffSnapshot(store, "staff-3");
    await expect(admin.update("staff-3", { departmentId: "dept-admin", departmentRoleId: "role-super-admin" })).rejects.toThrow(PROTECTED_ROLE_ERROR);
    expect(staffSnapshot(store, "staff-3")).toEqual(before);
    const superAdmin = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).staff;
    expect((await superAdmin.update("staff-3", { departmentId: "dept-admin", departmentRoleId: "role-super-admin" })).departmentRoleId).toBe("role-super-admin");
    // Removing someone from the protected role is also reserved.
    await expect(admin.update("staff-3", { departmentRoleId: null })).rejects.toThrow(PROTECTED_ROLE_ERROR);
  });

  it("protects the Super Administrator's staff record authority fields", async () => {
    const store = createMockStore();
    const hr = createMockRepositories(store, () => getDevIdentity("dev-hr")).staff;
    const before = staffSnapshot(store, "staff-super");
    await expect(hr.update("staff-super", { departmentRoleId: "role-hr" })).rejects.toThrow(PROTECTED_STAFF_ERROR);
    await expect(hr.update("staff-super", { accountId: null })).rejects.toThrow(PROTECTED_STAFF_ERROR);
        await expect(hr.update("staff-3", { accountId: "acct-super-admin" })).rejects.toThrow(PROTECTED_STAFF_ERROR);
    expect(staffSnapshot(store, "staff-super")).toEqual(before);
    // Non-authority profile fields remain editable.
    expect((await hr.update("staff-super", { position: "HR Staff Lead" })).position).toBe("HR Staff Lead");
  });

  it("rejects self department, role, and account changes but keeps own profile edits", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const before = staffSnapshot(store, "staff-admin");
    await expect(repo.update("staff-admin", { departmentId: "dept-ops", departmentRoleId: "role-ops-staff" })).rejects.toThrow(SELF_MODIFICATION_ERROR);
    await expect(repo.update("staff-admin", { accountId: null })).rejects.toThrow(SELF_MODIFICATION_ERROR);
    expect(staffSnapshot(store, "staff-admin")).toEqual(before);
    // My Account resends the unchanged department and role with profile edits.
    const updated = await repo.update("staff-admin", { displayName: "Admin Renamed", departmentId: "dept-hr", departmentRoleId: "role-hr-staff" });
    expect(updated.displayName).toBe("Admin Renamed");
  });

  it("rejects moving staff into a deactivated department", async () => {
    const store = createMockStore();
    const repos = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    await repos.departments.update("dept-finance", { status: "deactivated" });
    const before = staffSnapshot(store, "staff-3");
    await expect(repos.staff.update("staff-3", { departmentId: "dept-finance" })).rejects.toThrow("deactivated department");
    expect(staffSnapshot(store, "staff-3")).toEqual(before);
  });

  it("does not partially apply an update rejected by role validation", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const before = staffSnapshot(store, "staff-3");
    await expect(repo.update("staff-3", { displayName: "Mutated", departmentId: "dept-finance", departmentRoleId: "role-hr-staff" })).rejects.toThrow();
    await expect(repo.update("staff-3", { displayName: "Mutated", status: "inactive" })).rejects.toThrow();
    expect(staffSnapshot(store, "staff-3")).toEqual(before);
  });
});

describe("staff repository S3-B workflows", () => {
  const newHire = { displayName: "New Hire", position: "HR Staff", departmentId: "dept-hr", departmentRoleId: "role-hr-staff", email: "newhire@afhomes.local" };

  it("lets HR create staff with an atomically linked Pending account", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-hr")).staff;
    const created = await repo.create({ ...newHire, provisionPendingAccount: true });
    const account = store.accounts.find((item) => item.id === created.accountId);
    expect(account).toMatchObject({ status: "pending", roleIds: [], email: "newhire@afhomes.local", departmentId: "dept-hr" });
    // HR still has no Accounts management.
    expect(await createMockRepositories(store, () => getDevIdentity("dev-hr")).accounts.list()).toEqual([]);
  });

  it("creates neither record when provisioning is rejected", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-hr")).staff;
    const counts = { staff: store.staff.length, accounts: store.accounts.length, audit: store.auditEvents.length };
    await expect(repo.create({ ...newHire, email: "finance@afhomes.local", provisionPendingAccount: true })).rejects.toThrow("An account with this email already exists.");
    await expect(repo.create({ ...newHire, email: "opsstaff@afhomes.local", provisionPendingAccount: true })).rejects.toThrow("An employee with this email already exists.");
    await expect(repo.create({ ...newHire, accountId: "acct-pending", provisionPendingAccount: true })).rejects.toThrow();
    expect({ staff: store.staff.length, accounts: store.accounts.length, audit: store.auditEvents.length }).toEqual(counts);
  });

  it("lets HR suspend and deactivate an eligible linked account but never reactivate it", async () => {
    const store = createMockStore();
    const hr = createMockRepositories(store, () => getDevIdentity("dev-hr"));
    const created = await hr.staff.create({ ...newHire, provisionPendingAccount: true });
    const accountId = created.accountId as string;
    // Pending accounts are activated only by Admin/Super Admin.
    await expect(hr.staff.updateLinkedAccountStatus(created.id, "active")).rejects.toThrow("Only an Administrator or Super Administrator");
    await createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts.updateStatus(accountId, "active");
    expect((await hr.staff.updateLinkedAccountStatus(created.id, "suspended")).status).toBe("suspended");
    await expect(hr.staff.updateLinkedAccountStatus(created.id, "active")).rejects.toThrow("Only an Administrator or Super Administrator");
    expect(store.accounts.find((item) => item.id === accountId)?.status).toBe("suspended");
    expect((await hr.staff.updateLinkedAccountStatus(created.id, "deactivated")).status).toBe("deactivated");
    await createMockRepositories(store, () => getDevIdentity("dev-admin")).accounts.updateStatus(accountId, "active");
    expect(store.accounts.find((item) => item.id === accountId)?.status).toBe("active");
  });

  it("rejects staff-path status changes on protected, own, or unlinked accounts without mutation", async () => {
    const store = createMockStore();
    const hr = createMockRepositories(store, () => getDevIdentity("dev-hr")).staff;
    const statuses = store.accounts.map((item) => item.status);
    await expect(hr.updateLinkedAccountStatus("staff-super", "suspended")).rejects.toThrow("Protected account");
    await expect(hr.updateLinkedAccountStatus("staff-1", "suspended")).rejects.toThrow(SELF_MODIFICATION_ERROR);
    await expect(hr.updateLinkedAccountStatus("staff-3", "suspended")).rejects.toThrow("no linked account");
    const finance = createMockRepositories(store, () => getDevIdentity("dev-finance")).staff;
    await expect(finance.updateLinkedAccountStatus("staff-admin", "suspended")).rejects.toThrow("not allowed");
    expect(store.accounts.map((item) => item.status)).toEqual(statuses);
    expect(store.auditEvents).toHaveLength(0);
  });

  it("reports per-record staff policies", async () => {
    const store = createMockStore();
    const policies = await createMockRepositories(store, () => getDevIdentity("dev-hr")).staff.listPolicies();
    expect(policies["staff-1"]).toMatchObject({ canDelete: false, assignmentRestriction: "You cannot change your own department or role." });
    expect(policies["staff-1"].linkedAccount?.allowedStatuses).toEqual([]);
    expect(policies["staff-super"].assignmentRestriction).toMatch(/Super Administrator/);
    expect(policies["staff-super"].linkedAccount).toMatchObject({ isProtected: true, allowedStatuses: [] });
    expect(policies["staff-admin"]).toMatchObject({ canDelete: false, assignmentRestriction: null });
    expect(policies["staff-admin"].linkedAccount?.allowedStatuses).toEqual(["suspended", "deactivated"]);
    expect(policies["staff-3"]).toMatchObject({ canDelete: false, deleteRestriction: STAFF_DELETE_DISABLED, linkedAccount: null });
    for (const policy of Object.values(policies)) expect(policy).toMatchObject({ canDelete: false, deleteRestriction: STAFF_DELETE_DISABLED });
    expect(await createMockRepositories(store, () => getDevIdentity("dev-finance")).staff.listPolicies()).toEqual({});
  });

  it("returns the actor's own profile without Staff module rules", async () => {
    const store = createMockStore();
    const self = await createMockRepositories(store, () => getDevIdentity("dev-admin")).staff.getSelf();
    expect(self?.staff.id).toBe("staff-admin");
    expect(self?.linkedAccount).toMatchObject({ id: "acct-admin", allowedStatuses: [] });
    expect(await createMockRepositories(store, () => getDevIdentity("dev-finance")).staff.getSelf()).toBeNull();
  });

  it("keeps the linked account name and email in step with profile edits", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    await repo.update("staff-admin", { displayName: "Admin Renamed", email: "admin.renamed@afhomes.local" });
    expect(store.accounts.find((item) => item.id === "acct-admin")).toMatchObject({ displayName: "Admin Renamed", email: "admin.renamed@afhomes.local" });
    const before = staffSnapshot(store, "staff-admin");
    await expect(repo.update("staff-admin", { email: "finance@afhomes.local" })).rejects.toThrow("An account with this email already exists.");
    await expect(repo.update("staff-admin", { email: "OPSSTAFF@afhomes.local" })).rejects.toThrow("An employee with this email already exists.");
    expect(staffSnapshot(store, "staff-admin")).toEqual(before);
  });

  it("rejects non-super-admins changing the protected account's login email through staff", async () => {
    const store = createMockStore();
    const hr = createMockRepositories(store, () => getDevIdentity("dev-hr")).staff;
    const account = { ...store.accounts.find((item) => item.id === "acct-super-admin") };
    await expect(hr.update("staff-super", { email: "takeover@afhomes.local" })).rejects.toThrow(PROTECTED_STAFF_ERROR);
    expect(store.accounts.find((item) => item.id === "acct-super-admin")?.email).toBe(account.email);
    expect(staffSnapshot(store, "staff-super")?.email).toBe("superadmin@afhomes.local");
  });
});

describe("staff repository S3-B.1 provisioning and identity sync", () => {
  const newHire = { displayName: "Provisioned Hire", position: "HR Staff", departmentId: "dept-hr", departmentRoleId: "role-hr-staff", email: "provisioned@afhomes.local" };

  it("provisions exactly one linked Pending account for every new staff record", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const counts = { staff: store.staff.length, accounts: store.accounts.length };
    const created = await repo.create({ ...newHire, provisionPendingAccount: true });
    expect(store.staff).toHaveLength(counts.staff + 1);
    expect(store.accounts).toHaveLength(counts.accounts + 1);
    expect(store.accounts.find((item) => item.id === created.accountId)).toMatchObject({
      displayName: "Provisioned Hire",
      email: "provisioned@afhomes.local",
      roleIds: [],
      status: "pending",
      departmentId: "dept-hr",
    });
  });

  it("leaves existing unlinked staff records unchanged", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const updated = await repo.update("staff-2", { position: "Finance Analyst II" });
    expect(updated.accountId).toBeNull();
    expect(store.accounts.some((item) => item.email === "finstaff@afhomes.local")).toBe(false);
  });

  it("locks protected-record identity fields for non-super-admins only", async () => {
    const store = createMockStore();
    const hrPolicies = await createMockRepositories(store, () => getDevIdentity("dev-hr")).staff.listPolicies();
    const adminPolicies = await createMockRepositories(store, () => getDevIdentity("dev-admin")).staff.listPolicies();
    const superPolicies = await createMockRepositories(store, () => getDevIdentity("dev-super-admin")).staff.listPolicies();
    expect(hrPolicies["staff-super"].identityRestriction).toMatch(/Super Administrator/);
    expect(adminPolicies["staff-super"].identityRestriction).toMatch(/Super Administrator/);
    expect(superPolicies["staff-super"].identityRestriction).toBeNull();
    // Non-protected records and self edits stay unlocked.
    expect(hrPolicies["staff-3"].identityRestriction).toBeNull();
    expect(superPolicies["staff-1"].identityRestriction).toBeNull();
  });

  it("changes neither record when linked sync validation fails", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const staffBefore = staffSnapshot(store, "staff-admin");
    const accountBefore = { ...store.accounts.find((item) => item.id === "acct-admin") };
    const auditCount = store.auditEvents.length;
    await expect(repo.update("staff-admin", { email: "finance@afhomes.local" })).rejects.toThrow("already exists");
    expect(staffSnapshot(store, "staff-admin")).toEqual(staffBefore);
    expect(store.accounts.find((item) => item.id === "acct-admin")).toEqual(accountBefore);
    expect(store.auditEvents).toHaveLength(auditCount);
  });
});

describe("staff repository", () => {
  it("lists staff for authorized user", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const staff = await repo.list();
    expect(staff.length).toBeGreaterThan(0);
  });

  it("denies unauthorized user", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-finance")).staff;
    expect(await repo.list()).toEqual([]);
  });

  it("creates staff", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await repo.create({ displayName: "New Staff", position: "Analyst", departmentId: null, email: "new@afhomes.local" });
    expect(created.displayName).toBe("New Staff");
    expect((await repo.list()).some((s) => s.displayName === "New Staff")).toBe(true);
  });

  it("rejects missing name", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    await expect(repo.create({ displayName: "", position: "Analyst", departmentId: null, email: "x@afhomes.local" })).rejects.toThrow();
  });

  it("updates staff", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await repo.create({ displayName: "Staff", position: "Analyst", departmentId: null, email: "staff@afhomes.local" });
    const updated = await repo.update(created.id, { position: "Senior Analyst" });
    expect(updated.position).toBe("Senior Analyst");
  });

  it("rejects employment status changes", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await repo.create({ displayName: "Staff", position: "Analyst", departmentId: null, email: "staff2@afhomes.local" });
    await expect(repo.update(created.id, { status: "inactive" })).rejects.toThrow();
  });

  it("rejects unauthorized staff update", async () => {
    const store = createMockStore();
    const adminRepo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await adminRepo.create({ displayName: "Staff", position: "Analyst", departmentId: null, email: "staff3@afhomes.local" });
    const financeRepo = createMockRepositories(store, () => getDevIdentity("dev-finance")).staff;
    await expect(financeRepo.update(created.id, { position: "Hacked" })).rejects.toThrow();
  });

  it("preserves account separation on staff update", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await repo.create({ displayName: "Staff", position: "Analyst", departmentId: null, email: "staff4@afhomes.local" });
    const updated = await repo.update(created.id, { displayName: "Staff Updated" });
    expect(updated.displayName).toBe("Staff Updated");
  });

  it("rejects invalid department reference on create", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    await expect(repo.create({ displayName: "Staff", position: "Analyst", departmentId: "dept-unknown", email: "staff5@afhomes.local" })).rejects.toThrow();
  });

  it("rejects invalid department reference on update", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await repo.create({ displayName: "Staff", position: "Analyst", departmentId: null, email: "staff6@afhomes.local" });
    await expect(repo.update(created.id, { departmentId: "dept-unknown" })).rejects.toThrow();
  });

  it("rejects employment status mutation", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await repo.create({ displayName: "Staff", position: "Analyst", departmentId: null, email: "staff7@afhomes.local" });
    await expect(repo.update(created.id, { status: "inactive" })).rejects.toThrow();
  });

  it("preserves data on failed update", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await repo.create({ displayName: "Staff", position: "Analyst", departmentId: null, email: "staff8@afhomes.local" });
    await expect(repo.update(created.id, { displayName: "" })).rejects.toThrow();
    const after = await repo.getById(created.id);
    expect(after?.displayName).toBe("Staff");
  });
  it("creates staff with a compatible department role", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await repo.create({
      displayName: "Role Staff",
      position: "Analyst",
      departmentId: "dept-hr",
      departmentRoleId: "role-hr-staff",
      email: "rolestaff@afhomes.local",
    });
    expect(created.departmentRoleId).toBe("role-hr-staff");
  });

  it("rejects a role from another department", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    await expect(
      repo.create({
        displayName: "Mismatch",
        position: "Analyst",
        departmentId: "dept-hr",
        departmentRoleId: "role-fin-staff",
        email: "mismatch@afhomes.local",
      }),
    ).rejects.toThrow(/department/);
  });

  it("rejects a deactivated role on assignment", async () => {
    const store = createMockStore();
    const repos = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    await repos.roles.update("role-hr-staff", { status: "deactivated" });
    await expect(
      repos.staff.create({
        displayName: "Deactivated Role",
        position: "Analyst",
        departmentId: "dept-hr",
        departmentRoleId: "role-hr-staff",
        email: "inactive-role@afhomes.local",
      }),
    ).rejects.toThrow(/active/);
  });

  it("clears an incompatible role on department transfer", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await repo.create({
      displayName: "Transfer",
      position: "Analyst",
      departmentId: "dept-hr",
      departmentRoleId: "role-hr-staff",
      email: "transfer@afhomes.local",
    });
    const updated = await repo.update(created.id, { departmentId: "dept-finance" });
    expect(updated.departmentId).toBe("dept-finance");
    expect(updated.departmentRoleId).toBeNull();
  });

  it("accepts a compatible role on department transfer", async () => {
    const store = createMockStore();
    const repos = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    const created = await repos.staff.create({
      displayName: "Transfer Two",
      position: "Analyst",
      departmentId: "dept-hr",
      departmentRoleId: "role-hr-staff",
      email: "transfer2@afhomes.local",
    });
    const finRole = await repos.roles.create({ name: "Finance Staff Two", departmentId: "dept-finance", moduleIds: ["departments"] });
    const updated = await repos.staff.update(created.id, { departmentId: "dept-finance", departmentRoleId: finRole.id });
    expect(updated.departmentId).toBe("dept-finance");
    expect(updated.departmentRoleId).toBe(finRole.id);
  });

  it("stores staff department role ids in seed data", () => {
    const store = createMockStore();
    expect(store.staff.find((item) => item.id === "staff-1")?.departmentRoleId).toBe("role-hr-staff");
  });

  it("creates staff with tin: null without throwing", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await repo.create({ displayName: "No Tin", position: "Analyst", departmentId: null, email: "notin@afhomes.local", tin: null });
    expect(created.displayName).toBe("No Tin");
  });

  it("edits staff with tin: null without throwing", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await repo.create({ displayName: "Has Tin", position: "Analyst", departmentId: null, email: "hastin@afhomes.local", tin: "123-456-789" });
    const updated = await repo.update(created.id, { tin: null, position: "Lead" });
    expect(updated.position).toBe("Lead");
  });
});

describe("staff repository S3-C1 audit events", () => {
  const provisionedHire = {
    displayName: "Audit Hire",
    position: "HR Staff",
    departmentId: "dept-hr",
    departmentRoleId: "role-hr-staff",
    email: "audithire@afhomes.local",
    governmentIdType: "Passport",
    governmentIdNumber: "P9999999A",
    tin: "111-222-333",
    street: "123 Audit Street",
  };

  it("records exactly one STAFF_CREATED correlated to the provisioned account, without a duplicate account event", async () => {
    const store = createMockStore();
    const created = await createMockRepositories(store, () => getDevIdentity("dev-admin")).staff.create({
      ...provisionedHire,
      provisionPendingAccount: true,
    });
    expect(store.auditEvents).toHaveLength(1);
    expect(store.auditEvents[0]).toMatchObject({
      actorId: "dev-admin",
      module: "organization",
      action: AUDIT_ACTIONS.STAFF_CREATED,
      entityType: "staff",
      entityId: created.id,
      newValue: "active",
      outcome: "success",
      relatedRecordIds: [created.accountId],
    });
  });

  it("never records credentials, government IDs, TIN, or addresses in audit payloads", async () => {
    const store = createMockStore();
    await createMockRepositories(store, () => getDevIdentity("dev-admin")).staff.create({
      ...provisionedHire,
      email: "privatehire@afhomes.local",
      provisionPendingAccount: true,
    });
    const payload = JSON.stringify(store.auditEvents);
    for (const secret of ["P9999999A", "111222333", "111-222-333", "123 Audit Street", "password"]) {
      expect(payload).not.toContain(secret);
    }
  });

  it("records identity and assignment changes once, with the synced account correlated", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await repo.create({ ...provisionedHire, email: "synchire@afhomes.local", provisionPendingAccount: true });
    store.auditEvents.length = 0;
    await repo.update(created.id, { displayName: "Audit Hire Renamed", departmentId: "dept-ops", departmentRoleId: "role-ops-staff" });
    expect(store.auditEvents).toHaveLength(1);
    expect(store.auditEvents[0]).toMatchObject({
      action: AUDIT_ACTIONS.STAFF_UPDATED,
      entityType: "staff",
      entityId: created.id,
      previousValue: "displayName:Audit Hire;department:dept-hr;role:role-hr-staff",
      newValue: "displayName:Audit Hire Renamed;department:dept-ops;role:role-ops-staff",
      outcome: "success",
      relatedRecordIds: [created.accountId],
    });
    // The linked account carries the synced name through the same single event.
    expect(store.accounts.find((item) => item.id === created.accountId)?.displayName).toBe("Audit Hire Renamed");
  });

  it("records no event for profile-only or unchanged updates", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const created = await repo.create({ ...provisionedHire, email: "quiet@afhomes.local", provisionPendingAccount: true });
    store.auditEvents.length = 0;
    await repo.update(created.id, { position: "Senior HR Staff", telephone: "028123456" });
    await repo.update(created.id, { displayName: "Audit Hire" });
    expect(store.auditEvents).toHaveLength(0);
  });

  it("records staff-path status changes as account events correlated to the staff record", async () => {
    const store = createMockStore();
    const repos = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    const created = await repos.staff.create({ ...provisionedHire, email: "statushire@afhomes.local", provisionPendingAccount: true });
    const accountId = created.accountId as string;
    store.auditEvents.length = 0;
    await repos.accounts.updateStatus(accountId, "active");
    const hr = createMockRepositories(store, () => getDevIdentity("dev-hr")).staff;
    await hr.updateLinkedAccountStatus(created.id, "suspended");
    const statusEvents = store.auditEvents.filter((item) => item.action === AUDIT_ACTIONS.ACCOUNT_STATUS_CHANGED);
    expect(statusEvents).toHaveLength(2);
    expect(statusEvents[1]).toMatchObject({
      actorId: "dev-hr",
      entityType: "account",
      entityId: accountId,
      previousValue: "active",
      newValue: "suspended",
      relatedRecordIds: [created.id],
    });
  });

  it("records no event for staff-path rejections", async () => {
    const store = createMockStore();
    const hr = createMockRepositories(store, () => getDevIdentity("dev-hr")).staff;
    await expect(hr.updateLinkedAccountStatus("staff-super", "suspended")).rejects.toThrow();
    await expect(hr.update("staff-super", { email: "takeover@afhomes.local" })).rejects.toThrow();
    expect(store.auditEvents).toHaveLength(0);
  });

  it("rejects every staff deletion without changing records, accounts, or audit history", async () => {
    const store = createMockStore();
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const hr = createMockRepositories(store, () => getDevIdentity("dev-hr")).staff;
    const created = await admin.create({ ...provisionedHire, email: "gone@afhomes.local", provisionPendingAccount: true });
    const dump = () => JSON.stringify({ staff: store.staff, accounts: store.accounts, members: store.members, audit: store.auditEvents });
    const before = dump();
    // Unlinked, linked Pending, linked Active, own, and protected records reject alike.
    for (const id of ["staff-3", created.id, "staff-1", "staff-admin", "staff-super"]) {
      await expect(admin.delete(id)).rejects.toThrow(STAFF_DELETE_DISABLED);
    }
    await expect(hr.delete("staff-3")).rejects.toThrow(STAFF_DELETE_DISABLED);
    await expect(admin.delete("staff-missing")).rejects.toThrow("Staff member not found.");
    expect(dump()).toBe(before);
  });
});

describe("staff repository system roles at creation", () => {
  const hire = { displayName: "Roles Hire", position: "HR Staff", departmentId: "dept-hr", departmentRoleId: "role-hr-staff", email: "roleshire@afhomes.local" };

  it("lets Admin grant in-scope system roles to the new Pending account and audits them once", async () => {
    const store = createMockStore();
    const created = await createMockRepositories(store, () => getDevIdentity("dev-admin")).staff.create({
      ...hire,
      provisionPendingAccount: true,
      systemRoleIds: ["hr", "hr"],
    });
    expect(store.accounts.find((item) => item.id === created.accountId)).toMatchObject({ status: "pending", roleIds: ["hr"] });
    expect(store.auditEvents).toHaveLength(1);
    expect(store.auditEvents[0]).toMatchObject({
      action: AUDIT_ACTIONS.STAFF_CREATED,
      newValue: "active; system roles [hr]",
      relatedRecordIds: [created.accountId],
    });
  });

  it("lets Super Admin grant Finance and Administrator", async () => {
    const store = createMockStore();
    const created = await createMockRepositories(store, () => getDevIdentity("dev-super-admin")).staff.create({
      ...hire,
      provisionPendingAccount: true,
      systemRoleIds: ["finance", "admin"],
    });
    expect(store.accounts.find((item) => item.id === created.accountId)?.roleIds).toEqual(["finance", "admin"]);
  });

  it("rejects out-of-authority, missing-module, and unprovisioned role grants without writing anything", async () => {
    const store = createMockStore();
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const hr = createMockRepositories(store, () => getDevIdentity("dev-hr")).staff;
    const counts = { staff: store.staff.length, accounts: store.accounts.length, audit: store.auditEvents.length };
    await expect(hr.create({ ...hire, provisionPendingAccount: true, systemRoleIds: ["hr"] })).rejects.toThrow("Assigning system roles requires the Accounts module.");
    await expect(admin.create({ ...hire, provisionPendingAccount: true, systemRoleIds: ["finance"] })).rejects.toThrow("outside the acting account's scope");
    await expect(admin.create({ ...hire, provisionPendingAccount: true, systemRoleIds: ["admin"] })).rejects.toThrow("Only a Super Administrator");
    await expect(admin.create({ ...hire, provisionPendingAccount: true, systemRoleIds: ["super_admin"] })).rejects.toThrow("Cannot create a protected Super Administrator account.");
    await expect(admin.create({ ...hire, systemRoleIds: ["hr"] })).rejects.toThrow("System roles can only be granted to a newly provisioned account.");
    expect({ staff: store.staff.length, accounts: store.accounts.length, audit: store.auditEvents.length }).toEqual(counts);
  });

  it("rejects unknown system role ids atomically, even alongside valid ones", async () => {
    const store = createMockStore();
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin")).staff;
    const superAdmin = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).staff;
    const counts = { staff: store.staff.length, accounts: store.accounts.length, audit: store.auditEvents.length };
    await expect(admin.create({ ...hire, provisionPendingAccount: true, systemRoleIds: ["bogus"] })).rejects.toThrow("Unknown system role.");
    await expect(superAdmin.create({ ...hire, provisionPendingAccount: true, systemRoleIds: ["hr", "bogus"] })).rejects.toThrow("Unknown system role.");
    expect({ staff: store.staff.length, accounts: store.accounts.length, audit: store.auditEvents.length }).toEqual(counts);
  });
});
