import { humanize } from "@/shared/lib/humanize";
import { ACCOUNT_DELETE_DISABLED, ACCOUNT_STATUS_TRANSITIONS, type Account, type AccountActionPolicy, type AccountPolicies, type AccountStatus } from "@/modules/accounts/types";
import { AUDIT_ACTIONS } from "@/modules/audit/types";
import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { DevIdentity } from "@/modules/identity/types";
import { SYSTEM_ROLES } from "@/modules/identity/permissions";
import type { MockStore } from "./seed";
import { appendAuditEvent } from "./audit";
import { activeRoles } from "./dev-identities";
import {
  SELF_MODIFICATION_ERROR,
  assertCanAssignSystemRole,
  assertKeepsActiveSuperAdmin,
  canAssignSystemRole,
  hasActiveSystemRole,
  hasModuleAccess,
  resolveActorAccountId,
  resolveActorStaff,
  wouldRemoveLastActiveSuperAdmin,
} from "./authorization";
import { simulateAsync } from "@/data/contracts/async-options";

export const PROTECTED_ACCOUNT_RESTRICTION = "Protected Super Administrator account. Only a Super Administrator can change it.";
export const OWN_ACCOUNT_RESTRICTION = "This is your own account. Another administrator must change its roles or status.";
export const LINKED_ACCOUNT_RESTRICTION = "Linked to a staff record. Name and email are managed in Staff Management.";

function canManageAccounts(store: MockStore, identity: DevIdentity) {
  return hasModuleAccess(store, identity, "accounts");
}

function isSuperAdmin(store: MockStore, identity: DevIdentity) {
  return hasActiveSystemRole(store, identity, "super_admin");
}

function canActivateAccounts(store: MockStore, identity: DevIdentity) {
  return isSuperAdmin(store, identity) || hasActiveSystemRole(store, identity, "admin");
}

function isProtectedAccount(account: { roleIds: string[] }) {
  return account.roleIds.includes("super_admin");
}

/** New or changed department references must point to an existing, active department. */
function assertAssignableDepartment(store: MockStore, departmentId: string) {
  const department = store.departments.find((item) => item.id === departmentId);
  if (!department) throw new Error("Invalid department reference.");
  if (department.status !== "active") throw new Error("Accounts cannot be assigned to a deactivated department.");
}

function copy(account: Account): Account {
  return { ...account, roleIds: [...account.roleIds] };
}

export class MockAccountRepository {
  constructor(
    private readonly store: MockStore,
    private readonly getIdentity: () => DevIdentity,
    private readonly asyncOptions: MockAsyncOptions = {},
  ) {}

  private mergeOptions(options?: MockAsyncOptions) {
    return { ...this.asyncOptions, ...options };
  }

  private isSelf(identity: DevIdentity, accountId: string) {
    return resolveActorAccountId(this.store, identity) === accountId;
  }

  async list(options?: MockAsyncOptions): Promise<Account[]> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageAccounts(this.store, identity)) return [];
    return this.store.accounts.map(copy);
  }

  /**
   * Actions the acting identity may take in Account Management, derived from
   * the same rules the mutations enforce. Presentation only: every mutation
   * re-checks authorization.
   */
  async getPolicies(options?: MockAsyncOptions): Promise<AccountPolicies> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageAccounts(this.store, identity)) return { creatableRoles: [], accounts: {} };
    const accounts: Record<string, AccountActionPolicy> = {};
    for (const account of this.store.accounts) accounts[account.id] = this.policyFor(identity, account);
    return { creatableRoles: SYSTEM_ROLES.filter((role) => canAssignSystemRole(this.store, identity, role)), accounts };
  }

  private policyFor(identity: DevIdentity, account: Account): AccountActionPolicy {
    const linkedToStaff = this.store.staff.some((item) => item.accountId === account.id);
    // Deletion is disabled for every account pending the R8 archive policy.
    const deletion = { canDelete: false, deleteRestriction: ACCOUNT_DELETE_DISABLED };
    const none = { canManageRoles: false, assignableRoles: [], revocableRoles: [], allowedStatuses: [], linkedToStaff, ...deletion };
    if (isProtectedAccount(account) && !isSuperAdmin(this.store, identity)) {
      return { ...none, canEdit: false, restriction: PROTECTED_ACCOUNT_RESTRICTION };
    }
    if (this.isSelf(identity, account.id)) {
      return { ...none, canEdit: true, restriction: OWN_ACCOUNT_RESTRICTION };
    }
    const assignable = (role: (typeof SYSTEM_ROLES)[number]) => canAssignSystemRole(this.store, identity, role);
    return {
      canEdit: true,
      canManageRoles: true,
      assignableRoles: SYSTEM_ROLES.filter((role) => !account.roleIds.includes(role) && assignable(role)),
      revocableRoles: account.roleIds.filter(
        (role) =>
          assignable(role) &&
          !wouldRemoveLastActiveSuperAdmin(this.store, account.id, { roleIds: account.roleIds.filter((item) => item !== role), status: account.status }),
      ),
      allowedStatuses: ACCOUNT_STATUS_TRANSITIONS[account.status].filter(
        (status) =>
          (status !== "active" || canActivateAccounts(this.store, identity)) &&
          !wouldRemoveLastActiveSuperAdmin(this.store, account.id, { roleIds: account.roleIds, status }),
      ),
      // Staff linkage gates only identity edits (see update and the edit
      // dialog); roles and status stay manageable here, so no restriction tag.
      restriction: null,
      linkedToStaff,
      ...deletion,
    };
  }

  async getById(id: string, options?: MockAsyncOptions): Promise<Account | null> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageAccounts(this.store, identity)) return null;
    const account = this.store.accounts.find((a) => a.id === id);
    return account ? copy(account) : null;
  }

  async create(input: { displayName: string; email: string; roleIds: DevIdentity["roles"]; departmentId?: string | null }, options?: MockAsyncOptions): Promise<Account> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageAccounts(this.store, identity)) throw new Error("Account creation is not allowed.");
    if (input.roleIds.includes("super_admin") && !isSuperAdmin(this.store, identity)) {
      throw new Error("Cannot create a protected Super Administrator account.");
    }
    const roleIds = [...new Set(input.roleIds)];
    for (const role of roleIds) assertCanAssignSystemRole(this.store, identity, role);
    const displayName = input.displayName.trim();
    const email = input.email.trim();
    if (!displayName) throw new Error("Display name is required.");
    if (!email) throw new Error("Email is required.");
    if (this.store.accounts.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("An account with this email already exists.");
    }
    if (input.departmentId) assertAssignableDepartment(this.store, input.departmentId);
    const account: Account = {
      id: `acct-${this.store.accountSequence}`,
      displayName,
      email,
      roleIds,
      status: "pending",
      departmentId: input.departmentId ?? null,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    this.store.accountSequence += 1;
    this.store.accounts.push(account);
    appendAuditEvent(this.store, {
      actorId: identity.id,
      actorRoles: activeRoles(identity),
      module: "organization",
      action: AUDIT_ACTIONS.ACCOUNT_CREATED,
      entityType: "account",
      entityId: account.id,
      newValue: roleIds.length > 0 ? `pending [${[...roleIds].sort().join(",")}]` : "pending",
      outcome: "success",
    });
    return copy(account);
  }

  async update(id: string, input: { displayName?: string; email?: string; departmentId?: string | null }, options?: MockAsyncOptions): Promise<Account> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageAccounts(this.store, identity)) throw new Error("Account update is not allowed.");
    const account = this.store.accounts.find((a) => a.id === id);
    if (!account) throw new Error("Account not found.");
    if (isProtectedAccount(account) && !isSuperAdmin(this.store, identity)) {
      throw new Error("Protected account cannot be modified by this actor.");
    }
    // Validate everything first; mutate only after every check passes.
    // Staff is authoritative for linked identity fields: only resends of the
    // current values are accepted here; real changes belong in Staff Management.
    const linkedToStaff = this.store.staff.some((item) => item.accountId === id);
    const next = { displayName: account.displayName, email: account.email, departmentId: account.departmentId };
    if (input.displayName !== undefined) {
      const name = input.displayName.trim();
      if (!name) throw new Error("Display name is required.");
      if (linkedToStaff && name !== account.displayName) throw new Error(LINKED_ACCOUNT_RESTRICTION);
      next.displayName = name;
    }
    if (input.email !== undefined) {
      const email = input.email.trim();
      if (!email) throw new Error("Email is required.");
      if (linkedToStaff && email.toLowerCase() !== account.email.toLowerCase()) throw new Error(LINKED_ACCOUNT_RESTRICTION);
      if (this.store.accounts.some((a) => a.id !== id && a.email.toLowerCase() === email.toLowerCase())) {
        throw new Error("An account with this email already exists.");
      }
      next.email = email;
    }
    if (input.departmentId !== undefined && input.departmentId !== account.departmentId) {
      // Own account: the department may only mirror the actor's own staff
      // department (profile sync), never move to another department.
      // Owner decision 2026-11-10: Super Admin has full control; the self-modification ban does not apply to Super Admin.
      if (this.isSelf(identity, id) && !isSuperAdmin(this.store, identity) && input.departmentId !== (resolveActorStaff(this.store, identity)?.departmentId ?? null)) {
        throw new Error(SELF_MODIFICATION_ERROR);
      }
      if (input.departmentId) assertAssignableDepartment(this.store, input.departmentId);
      next.departmentId = input.departmentId;
    }
    Object.assign(account, next);
    return copy(account);
  }

  async assignRole(id: string, role: DevIdentity["roles"][number], options?: MockAsyncOptions): Promise<Account> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageAccounts(this.store, identity)) throw new Error("Role assignment is not allowed.");
    const account = this.store.accounts.find((a) => a.id === id);
    if (!account) throw new Error("Account not found.");
    if (role === "super_admin" && !isSuperAdmin(this.store, identity)) {
      throw new Error("Cannot assign protected Super Administrator role.");
    }
    if (isProtectedAccount(account) && !isSuperAdmin(this.store, identity)) {
      throw new Error("Protected account roles cannot be modified by this actor.");
    }
    // Owner decision 2026-11-10: Super Admin has full control; the self-modification ban does not apply to Super Admin.
    if (this.isSelf(identity, id) && !isSuperAdmin(this.store, identity)) throw new Error(SELF_MODIFICATION_ERROR);
    assertCanAssignSystemRole(this.store, identity, role);
    if (account.roleIds.includes(role)) throw new Error("Role already assigned.");
    account.roleIds.push(role);
    appendAuditEvent(this.store, {
      actorId: identity.id,
      actorRoles: activeRoles(identity),
      module: "organization",
      action: AUDIT_ACTIONS.ACCOUNT_ROLE_ASSIGNED,
      entityType: "account",
      entityId: id,
      newValue: role,
      outcome: "success",
    });
    return copy(account);
  }

  async revokeRole(id: string, role: DevIdentity["roles"][number], options?: MockAsyncOptions): Promise<Account> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageAccounts(this.store, identity)) throw new Error("Role revocation is not allowed.");
    const account = this.store.accounts.find((a) => a.id === id);
    if (!account) throw new Error("Account not found.");
    if (role === "super_admin" && !isSuperAdmin(this.store, identity)) {
      throw new Error("Cannot revoke protected Super Administrator role.");
    }
    if (isProtectedAccount(account) && !isSuperAdmin(this.store, identity)) {
      throw new Error("Protected account roles cannot be modified by this actor.");
    }
    // Owner decision 2026-11-10: Super Admin has full control; the self-modification ban does not apply to Super Admin.
    if (this.isSelf(identity, id) && !isSuperAdmin(this.store, identity)) throw new Error(SELF_MODIFICATION_ERROR);
    assertCanAssignSystemRole(this.store, identity, role);
    const index = account.roleIds.indexOf(role);
    if (index < 0) throw new Error("Role not assigned.");
    assertKeepsActiveSuperAdmin(this.store, id, { roleIds: account.roleIds.filter((item) => item !== role), status: account.status });
    account.roleIds.splice(index, 1);
    appendAuditEvent(this.store, {
      actorId: identity.id,
      actorRoles: activeRoles(identity),
      module: "organization",
      action: AUDIT_ACTIONS.ACCOUNT_ROLE_REVOKED,
      entityType: "account",
      entityId: id,
      previousValue: role,
      outcome: "success",
    });
    return copy(account);
  }

  async updateStatus(id: string, status: AccountStatus, options?: MockAsyncOptions): Promise<Account> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageAccounts(this.store, identity)) throw new Error("Status change is not allowed.");
    const account = this.store.accounts.find((a) => a.id === id);
    if (!account) throw new Error("Account not found.");
    if (isProtectedAccount(account) && !isSuperAdmin(this.store, identity)) {
      throw new Error("Protected account status cannot be modified by this actor.");
    }
    // Owner decision 2026-11-10: Super Admin has full control; the self-modification ban does not apply to Super Admin.
    if (this.isSelf(identity, id) && !isSuperAdmin(this.store, identity)) throw new Error(SELF_MODIFICATION_ERROR);
    if (!ACCOUNT_STATUS_TRANSITIONS[account.status].includes(status)) {
      throw new Error(`Invalid status transition from ${humanize(account.status)} to ${humanize(status)}.`);
    }
    // Activation and reactivation are Admin/Super Admin only (doc 01 §6.2, §7).
    if (status === "active" && !canActivateAccounts(this.store, identity)) {
      throw new Error("Only an Administrator or Super Administrator can activate or reactivate accounts.");
    }
    assertKeepsActiveSuperAdmin(this.store, id, { roleIds: account.roleIds, status });
    const previousStatus = account.status;
    account.status = status;
    appendAuditEvent(this.store, {
      actorId: identity.id,
      actorRoles: activeRoles(identity),
      module: "organization",
      action: AUDIT_ACTIONS.ACCOUNT_STATUS_CHANGED,
      entityType: "account",
      entityId: id,
      previousValue: previousStatus,
      newValue: status,
      outcome: "success",
    });
    return copy(account);
  }

  /**
   * Hard deletion is disabled pending the R8 archive policy. Authorization and
   * existence are checked first so callers get the right error; the record,
   * its references, and the audit history are never touched.
   */
  async delete(id: string, options?: MockAsyncOptions): Promise<void> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageAccounts(this.store, identity)) throw new Error("Account deletion is not allowed.");
    if (!this.store.accounts.some((a) => a.id === id)) throw new Error("Account not found.");
    throw new Error(ACCOUNT_DELETE_DISABLED);
  }
}
