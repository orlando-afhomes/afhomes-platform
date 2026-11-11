import { humanize } from "@/shared/lib/humanize";
import { normalizeTin } from "@/shared/utils/input-sanitizers";
import { STAFF_DELETE_DISABLED, type StaffActionPolicy, type StaffMember, type StaffStatus } from "@/modules/organization/types";
import { ACCOUNT_STATUS_TRANSITIONS, type Account, type AccountStatus, type LinkedAccountSummary } from "@/modules/accounts/types";
import { AUDIT_ACTIONS } from "@/modules/audit/types";
import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { StaffProfileInput, StaffSelfProfile } from "@/data/contracts/staff-repository";
import type { DevIdentity } from "@/modules/identity/types";
import { SYSTEM_ROLES } from "@/modules/identity/permissions";
import type { MockStore } from "./seed";
import { appendAuditEvent } from "./audit";
import { activeRoles } from "./dev-identities";
import {
  PROTECTED_STAFF_ERROR,
  SELF_MODIFICATION_ERROR,
  assertCanAssignSystemRole,
  assertCanManageRoleGrants,
  canManageRoleGrants,
  hasActiveSystemRole,
  hasModuleAccess,
  isProtectedStaff,
  resolveActorStaff,
} from "./authorization";
import { simulateAsync } from "@/data/contracts/async-options";

/** Account statuses a Staff/Employees holder may set (doc 01 §7); activation stays Admin/Super Admin only. */
const STAFF_ACCOUNT_STATUSES: readonly AccountStatus[] = ["suspended", "deactivated"];

function canManageStaff(store: MockStore, identity: DevIdentity) {
  return hasModuleAccess(store, identity, "staff");
}

function isSuperAdmin(store: MockStore, identity: DevIdentity) {
  return hasActiveSystemRole(store, identity, "super_admin");
}

function sameEmail(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Staff emails are unique across staff records (case-insensitive). */
function assertUniqueStaffEmail(store: MockStore, email: string, exceptId: string | null) {
  if (store.staff.some((item) => item.id !== exceptId && sameEmail(item.email, email))) {
    throw new Error("An employee with this email already exists.");
  }
}

/** Account emails are unique across accounts (case-insensitive). */
function assertUniqueAccountEmail(store: MockStore, email: string, exceptAccountId: string | null) {
  if (store.accounts.some((item) => item.id !== exceptAccountId && sameEmail(item.email, email))) {
    throw new Error("An account with this email already exists.");
  }
}

/** Validates a department-role assignment: role must exist, be active, and belong to the staff member's department. */
function assertCompatibleRole(store: MockStore, roleId: string, departmentId: string | null) {
  const role = store.roles.find((item) => item.id === roleId);
  if (!role) throw new Error("Assigned department role does not exist.");
  if (role.departmentId !== departmentId) throw new Error("Assigned department role does not belong to the staff member's department.");
  if (role.status !== "active") throw new Error("Assigned department role is not active.");
  return role;
}

/** New department assignments must reference an existing, active department. */
function assertAssignableDepartment(store: MockStore, departmentId: string) {
  const department = store.departments.find((item) => item.id === departmentId);
  if (!department) throw new Error("Invalid department reference.");
  if (department.status !== "active") throw new Error("Staff cannot be assigned to a deactivated department.");
}

/** Linking a staff record to a protected Super Administrator account is reserved for Super Administrators. */
function assertCanLinkAccount(store: MockStore, identity: DevIdentity, accountId: string | null) {
  if (accountId && isProtectedStaff(store, { accountId }) && !hasActiveSystemRole(store, identity, "super_admin")) {
    throw new Error(PROTECTED_STAFF_ERROR);
  }
}

/** Trim optional profile fields; blank becomes null so "no value" is explicit. */
function profileFields(input: StaffProfileInput) {
  const text = (value: string | null | undefined) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  };
  const patch: Record<string, string | null | undefined> = {
    firstName: text(input.firstName),
    middleName: text(input.middleName),
    lastName: text(input.lastName),
    suffix: text(input.suffix),
    mobileNumber: text(input.mobileNumber),
    street: text(input.street),
    province: text(input.province),
    city: text(input.city),
    barangay: text(input.barangay),
    postalCode: text(input.postalCode),
    telephone: text(input.telephone),
    facebook: text(input.facebook),
    tin: normalizeTin(input.tin),
    gender: text(input.gender),
    civilStatus: text(input.civilStatus),
    governmentIdType: text(input.governmentIdType),
    governmentIdNumber: text(input.governmentIdNumber),
  };
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
}

export class MockStaffRepository {
  constructor(private readonly store: MockStore, private readonly getIdentity: () => DevIdentity, private readonly asyncOptions: MockAsyncOptions = {}) {}

  private merge(options?: MockAsyncOptions) { return { ...this.asyncOptions, ...options }; }

  private linkedAccount(staff: StaffMember): Account | null {
    return staff.accountId ? (this.store.accounts.find((item) => item.id === staff.accountId) ?? null) : null;
  }

  private summarize(identity: DevIdentity, staff: StaffMember): LinkedAccountSummary | null {
    const account = this.linkedAccount(staff);
    if (!account) return null;
    const isProtected = account.roleIds.includes("super_admin");
    const allowed =
      canManageStaff(this.store, identity) && !isProtected && identity.staffId !== staff.id
        ? ACCOUNT_STATUS_TRANSITIONS[account.status].filter((status) => STAFF_ACCOUNT_STATUSES.includes(status))
        : [];
    return { id: account.id, email: account.email, status: account.status, isProtected, allowedStatuses: [...allowed] };
  }

  private policyFor(identity: DevIdentity, staff: StaffMember): StaffActionPolicy {
    const linkedAccount = this.summarize(identity, staff);
    const isSelf = identity.staffId === staff.id;
    const lockedProtected = isProtectedStaff(this.store, staff) && !isSuperAdmin(this.store, identity);
    const currentRole = staff.departmentRoleId ? this.store.roles.find((item) => item.id === staff.departmentRoleId) : null;
    let assignmentRestriction: string | null = null;
    if (isSelf) assignmentRestriction = "You cannot change your own department or role.";
    else if (lockedProtected) assignmentRestriction = "Only a Super Administrator can change this record's department or role.";
    else if (currentRole && !canManageRoleGrants(this.store, identity, currentRole)) {
      assignmentRestriction = "Your access does not cover this employee's current role.";
    }
    // Name and email sync to the linked account, which the repository rejects
    // for protected records; other profile fields stay editable.
    const identityRestriction =
      (linkedAccount?.isProtected ?? false) && !isSelf && !isSuperAdmin(this.store, identity)
        ? "Only a Super Administrator can change this record's name or email."
        : null;
    // Deletion is disabled for every staff record pending the R8 archive policy.
    return { canDelete: false, deleteRestriction: STAFF_DELETE_DISABLED, assignmentRestriction, identityRestriction, linkedAccount };
  }

  async getSelf(options?: MockAsyncOptions): Promise<StaffSelfProfile | null> {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (identity.status !== "active") return null;
    const staff = resolveActorStaff(this.store, identity);
    if (!staff) return null;
    return { staff: { ...staff }, linkedAccount: this.summarize(identity, staff) };
  }

  /** Per-record actions for the acting identity; presentation only, mutations re-check. */
  async listPolicies(options?: MockAsyncOptions): Promise<Record<string, StaffActionPolicy>> {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageStaff(this.store, identity)) return {};
    return Object.fromEntries(this.store.staff.map((staff) => [staff.id, this.policyFor(identity, staff)]));
  }

  async updateLinkedAccountStatus(staffId: string, status: AccountStatus, options?: MockAsyncOptions): Promise<LinkedAccountSummary> {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageStaff(this.store, identity)) throw new Error("Account status change is not allowed.");
    const staff = this.store.staff.find((item) => item.id === staffId);
    if (!staff) throw new Error("Staff member not found.");
    const account = this.linkedAccount(staff);
    if (!account) throw new Error("This staff record has no linked account.");
    if (!STAFF_ACCOUNT_STATUSES.includes(status)) {
      throw new Error("Only an Administrator or Super Administrator can activate or reactivate accounts.");
    }
    if (account.roleIds.includes("super_admin")) throw new Error("Protected account status cannot be modified by this actor.");
    // Owner decision 2026-11-10: Super Admin has full control; the self-modification ban does not apply to Super Admin.
    if (identity.staffId === staff.id && !isSuperAdmin(this.store, identity)) throw new Error(SELF_MODIFICATION_ERROR);
    if (!ACCOUNT_STATUS_TRANSITIONS[account.status].includes(status)) {
      throw new Error(`Invalid status transition from ${humanize(account.status)} to ${humanize(status)}.`);
    }
    const previousStatus = account.status;
    account.status = status;
    appendAuditEvent(this.store, {
      actorId: identity.id,
      actorRoles: activeRoles(identity),
      module: "organization",
      action: AUDIT_ACTIONS.ACCOUNT_STATUS_CHANGED,
      entityType: "account",
      entityId: account.id,
      previousValue: previousStatus,
      newValue: status,
      outcome: "success",
      relatedRecordIds: [staffId],
    });
    const summary = this.summarize(identity, staff);
    if (!summary) throw new Error("This staff record has no linked account.");
    return summary;
  }

  async list(options?: MockAsyncOptions) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageStaff(this.store, identity)) return [];
    return this.store.staff.map((s) => ({ ...s }));
  }

  async getById(id: string, options?: MockAsyncOptions) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageStaff(this.store, identity)) return null;
    return this.store.staff.find((s) => s.id === id) ?? null;
  }

  async create(input: { displayName: string; position: string; departmentId?: string | null; departmentRoleId?: string | null; email: string; avatarUrl?: string | null; accountId?: string | null; provisionPendingAccount?: boolean; systemRoleIds?: string[] } & StaffProfileInput, options?: MockAsyncOptions) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageStaff(this.store, identity)) throw new Error("Staff creation is not allowed.");
    const displayName = input.displayName.trim();
    if (!displayName) throw new Error("Display name is required.");
    const email = input.email.trim();
    if (!email) throw new Error("Email is required.");
    if (input.departmentId && !this.store.departments.some((d) => d.id === input.departmentId && d.status === "active")) throw new Error("Invalid department reference.");
    if (input.departmentRoleId) {
      const role = assertCompatibleRole(this.store, input.departmentRoleId, input.departmentId ?? null);
      assertCanManageRoleGrants(this.store, identity, role);
    }
    assertUniqueStaffEmail(this.store, email, null);
    const requestedRoleIds = [...new Set(input.systemRoleIds ?? [])];
    const unknownRole = requestedRoleIds.find((role) => !(SYSTEM_ROLES as readonly string[]).includes(role));
    if (unknownRole !== undefined) throw new Error("Unknown system role.");
    const systemRoleIds = requestedRoleIds as DevIdentity["roles"];
    if (systemRoleIds.length > 0) {
      // Granting system roles at creation is Accounts-module authority; each
      // role is checked exactly as an explicit role assignment would be.
      if (!input.provisionPendingAccount) throw new Error("System roles can only be granted to a newly provisioned account.");
      if (!hasModuleAccess(this.store, identity, "accounts")) throw new Error("Assigning system roles requires the Accounts module.");
      if (systemRoleIds.includes("super_admin") && !isSuperAdmin(this.store, identity)) {
        throw new Error("Cannot create a protected Super Administrator account.");
      }
      for (const role of systemRoleIds) assertCanAssignSystemRole(this.store, identity, role);
    }
    if (input.provisionPendingAccount) {
      if (input.accountId) throw new Error("A staff record cannot link an existing account and provision a new one.");
      assertUniqueAccountEmail(this.store, email, null);
    } else {
      assertCanLinkAccount(this.store, identity, input.accountId ?? null);
    }
    // Every check has passed; the account and staff record are written together.
    const today = new Date().toISOString().slice(0, 10);
    let accountId = input.accountId ?? null;
    if (input.provisionPendingAccount) {
      // Least privilege by default: no system roles unless an Accounts-module
      // holder grants them above; the account starts Pending until an
      // Administrator or Super Administrator activates it (doc 01 §6.2).
      const account: Account = { id: `acct-${this.store.accountSequence}`, displayName, email, roleIds: systemRoleIds, status: "pending", departmentId: input.departmentId ?? null, createdAt: today };
      this.store.accountSequence += 1;
      this.store.accounts.push(account);
      accountId = account.id;
    }
    const staff = { id: `staff-${this.store.staffSequence}`, displayName, position: input.position.trim(), departmentId: input.departmentId ?? null, departmentRoleId: input.departmentRoleId ?? null, status: "active" as StaffStatus, email, createdAt: today, avatarUrl: input.avatarUrl ?? null, accountId, ...profileFields(input) };
    this.store.staffSequence += 1;
    this.store.staff.push(staff);
    // One event for the logical operation: a provisioned Pending account is
    // correlated, never separately audited.
    appendAuditEvent(this.store, {
      actorId: identity.id,
      actorRoles: activeRoles(identity),
      module: "organization",
      action: AUDIT_ACTIONS.STAFF_CREATED,
      entityType: "staff",
      entityId: staff.id,
      newValue: systemRoleIds.length > 0 ? `active; system roles [${[...systemRoleIds].sort().join(",")}]` : "active",
      outcome: "success",
      relatedRecordIds: accountId ? [accountId] : [],
    });
    return { ...staff };
  }

  async update(id: string, input: { displayName?: string; position?: string; departmentId?: string | null; departmentRoleId?: string | null; status?: StaffStatus; avatarUrl?: string | null; accountId?: string | null; email?: string } & StaffProfileInput, options?: MockAsyncOptions) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageStaff(this.store, identity)) throw new Error("Staff update is not allowed.");
    const staff = this.store.staff.find((s) => s.id === id);
    if (!staff) throw new Error("Staff member not found.");
    if (input.status !== undefined) throw new Error("Employment status changes are not supported.");
    // Validate everything first; mutate only after every check passes.
    const next = {
      displayName: staff.displayName,
      position: staff.position,
      email: staff.email,
      departmentId: staff.departmentId,
      departmentRoleId: staff.departmentRoleId,
      avatarUrl: staff.avatarUrl,
      accountId: staff.accountId,
    };
    if (input.displayName !== undefined) {
      const name = input.displayName.trim();
      if (!name) throw new Error("Display name is required.");
      next.displayName = name;
    }
    if (input.position !== undefined) next.position = input.position.trim();
    if (input.email !== undefined) {
      const email = input.email.trim();
      if (!email) throw new Error("Email is required.");
      next.email = email;
    }
    if (input.departmentId !== undefined) {
      if (input.departmentId && input.departmentId !== staff.departmentId) assertAssignableDepartment(this.store, input.departmentId);
      next.departmentId = input.departmentId;
      // A department transfer invalidates an incompatible assigned role.
      const currentRole = next.departmentRoleId ? this.store.roles.find((item) => item.id === next.departmentRoleId) : null;
      if (currentRole && currentRole.departmentId !== next.departmentId) {
        next.departmentRoleId = null;
      }
    }
    if (input.departmentRoleId !== undefined) {
      if (input.departmentRoleId) assertCompatibleRole(this.store, input.departmentRoleId, next.departmentId);
      next.departmentRoleId = input.departmentRoleId;
    }
    if (input.avatarUrl !== undefined) next.avatarUrl = input.avatarUrl;
    if (input.accountId !== undefined) next.accountId = input.accountId;

    const departmentChanged = next.departmentId !== staff.departmentId;
    const roleChanged = next.departmentRoleId !== staff.departmentRoleId;
    const accountChanged = next.accountId !== staff.accountId;
    if (departmentChanged || roleChanged || accountChanged) {
      // Owner decision 2026-11-10: Super Admin has full control; the self-modification ban does not apply to Super Admin.
      if (identity.staffId === staff.id && !isSuperAdmin(this.store, identity)) throw new Error(SELF_MODIFICATION_ERROR);
      if (isProtectedStaff(this.store, staff) && !hasActiveSystemRole(this.store, identity, "super_admin")) {
        throw new Error(PROTECTED_STAFF_ERROR);
      }
    }
    if (roleChanged) {
      // Removing or granting a role both require authority over what it confers.
      const previousRole = staff.departmentRoleId ? this.store.roles.find((item) => item.id === staff.departmentRoleId) : null;
      if (previousRole) assertCanManageRoleGrants(this.store, identity, previousRole);
      const nextRole = next.departmentRoleId ? this.store.roles.find((item) => item.id === next.departmentRoleId) : null;
      if (nextRole) {
        const department = this.store.departments.find((item) => item.id === nextRole.departmentId);
        if (!department || department.status !== "active") throw new Error("Assigned department role belongs to a deactivated department.");
        assertCanManageRoleGrants(this.store, identity, nextRole);
      }
    }
    if (accountChanged) assertCanLinkAccount(this.store, identity, next.accountId);

    // Keep the linked account's identity fields in step with the staff record.
    const emailChanged = !sameEmail(next.email, staff.email);
    if (emailChanged) assertUniqueStaffEmail(this.store, next.email, staff.id);
    const linked = accountChanged ? null : this.linkedAccount(staff);
    const syncAccount = linked && (emailChanged || next.displayName !== staff.displayName);
    if (linked && syncAccount) {
      if (linked.roleIds.includes("super_admin") && identity.staffId !== staff.id && !isSuperAdmin(this.store, identity)) {
        throw new Error(PROTECTED_STAFF_ERROR);
      }
      if (emailChanged) assertUniqueAccountEmail(this.store, next.email, linked.id);
    }

    // Covered identity/assignment changes only; profile-only edits stay
    // unaudited (S3-C1). The linked-account sync rides on this one event.
    const changedCovered: Array<[field: string, before: string | null, after: string | null]> = [];
    if (next.displayName !== staff.displayName) changedCovered.push(["displayName", staff.displayName, next.displayName]);
    if (emailChanged) changedCovered.push(["email", staff.email, next.email]);
    if (next.departmentId !== staff.departmentId) changedCovered.push(["department", staff.departmentId, next.departmentId]);
    if (next.departmentRoleId !== staff.departmentRoleId) changedCovered.push(["role", staff.departmentRoleId, next.departmentRoleId]);
    if (next.accountId !== staff.accountId) changedCovered.push(["account", staff.accountId, next.accountId]);
    const previousAccountId = staff.accountId;

    Object.assign(staff, next, profileFields(input));
    if (linked && syncAccount) {
      linked.displayName = next.displayName;
      if (emailChanged) linked.email = next.email;
    }
    if (changedCovered.length > 0) {
      const describe = (value: string | null) => value ?? "none";
      const relatedAccountIds = [...new Set([previousAccountId, next.accountId].filter((value): value is string => value !== null))];
      appendAuditEvent(this.store, {
        actorId: identity.id,
        actorRoles: activeRoles(identity),
        module: "organization",
        action: AUDIT_ACTIONS.STAFF_UPDATED,
        entityType: "staff",
        entityId: id,
        previousValue: changedCovered.map(([field, before]) => `${field}:${describe(before)}`).join(";"),
        newValue: changedCovered.map(([field, , after]) => `${field}:${describe(after)}`).join(";"),
        outcome: "success",
        relatedRecordIds: relatedAccountIds,
      });
    }
    return { ...staff };
  }

  /** Hard deletion is disabled pending the R8 archive policy; nothing is changed or audited. */
  async delete(id: string, options?: MockAsyncOptions) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageStaff(this.store, identity)) throw new Error("Staff deletion is not allowed.");
    if (!this.store.staff.some((s) => s.id === id)) throw new Error("Staff member not found.");
    throw new Error(STAFF_DELETE_DISABLED);
  }
}
