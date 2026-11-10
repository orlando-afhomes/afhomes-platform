import {
  DELEGABLE_MODULES,
  departmentRoleConfersAccess,
  getDelegableGrants,
  getGrantedModuleIds,
  getRoleModuleGrants,
  type AdminModuleId,
} from "@/modules/identity/permissions";
import type { DevIdentity, DevRole } from "@/modules/identity/types";
import type { DepartmentRole, StaffMember } from "@/modules/organization/types";
import { activeRoles } from "./dev-identities";
import type { MockStore } from "./seed";

/**
 * Mock authorization helpers. These simulate the contract a future backend
 * must enforce; they are not production security.
 */
export type AuthorizationStore = Pick<MockStore, "accounts" | "departments" | "roles" | "staff">;

const DELEGABLE = new Set<AdminModuleId>(DELEGABLE_MODULES);

export const SELF_MODIFICATION_ERROR = "You cannot change your own roles, department, permissions, or account status.";
export const PROTECTED_ROLE_ERROR = "The protected Super Admin role can only be managed by a Super Administrator.";
export const PROTECTED_STAFF_ERROR = "Protected Super Administrator records can only be changed by a Super Administrator.";
export const LAST_SUPER_ADMIN_ERROR = "The last active Super Administrator cannot be removed.";

function isDelegableModule(moduleId: string): moduleId is AdminModuleId {
  return DELEGABLE.has(moduleId as AdminModuleId);
}

/**
 * Grants a department role can actually confer: delegable modules only.
 * Non-delegable ids stored on a role (legacy "accounts", "finance", unknown
 * ids) are inert and never become effective access.
 */
export function getRoleEffectiveGrants(role: Pick<DepartmentRole, "moduleIds">): AdminModuleId[] {
  return getDelegableGrants(role.moduleIds);
}

/** The staff record linked to the acting identity, if any. */
export function resolveActorStaff(store: Pick<MockStore, "staff">, identity: DevIdentity): StaffMember | null {
  if (!identity.staffId) return null;
  return store.staff.find((item) => item.id === identity.staffId) ?? null;
}

/** The account linked to the acting identity through its staff record (identity -> staff -> account). */
export function resolveActorAccountId(store: Pick<MockStore, "staff">, identity: DevIdentity): string | null {
  return resolveActorStaff(store, identity)?.accountId ?? null;
}

/**
 * True when the identity has a linked account that is missing or not active
 * (pending, suspended, deactivated). Such identities hold no protected access.
 * shortcut: identities without a staff-linked account (e.g. dev-finance, sales
 * network identities) cannot establish account status in the mock identity
 * model and keep identity-status gating only; upgrade when real auth links
 * every session to an account.
 */
export function hasBlockedLinkedAccount(store: Pick<MockStore, "accounts" | "staff">, identity: DevIdentity): boolean {
  const accountId = resolveActorAccountId(store, identity);
  if (!accountId) return false;
  const account = store.accounts.find((item) => item.id === accountId);
  return !account || account.status !== "active";
}

/** Active system roles, honouring identity status and linked account status. */
export function resolveActiveSystemRoles(store: Pick<MockStore, "accounts" | "staff">, identity: DevIdentity): DevRole[] {
  if (hasBlockedLinkedAccount(store, identity)) return [];
  return activeRoles(identity);
}

export function hasActiveSystemRole(store: Pick<MockStore, "accounts" | "staff">, identity: DevIdentity, role: DevRole): boolean {
  return resolveActiveSystemRoles(store, identity).includes(role);
}

/**
 * Resolves the department role linked to an identity through its staff
 * record. Returns null unless every link in the chain is intact and active:
 * active identity, linked staff record, active role, active department.
 */
export function resolveLinkedDepartmentRole(
  store: Pick<MockStore, "departments" | "roles" | "staff">,
  identity: DevIdentity,
): DepartmentRole | null {
  if (identity.status !== "active") return null;
  const staff = resolveActorStaff(store, identity);
  if (!staff || !staff.departmentRoleId) return null;
  const role = store.roles.find((item) => item.id === staff.departmentRoleId);
  if (!role) return null;
  const department = store.departments.find((item) => item.id === role.departmentId);
  const confers = departmentRoleConfersAccess({
    staffStatus: staff.status,
    roleStatus: role.status,
    departmentStatus: department?.status,
  });
  return confers ? role : null;
}

/**
 * Effective module set: system role grants plus the delegable grants of the
 * linked department role (when the full chain is active). A linked account
 * that is not active removes all protected access.
 */
export function resolveEffectiveModules(store: AuthorizationStore, identity: DevIdentity): Set<AdminModuleId> {
  if (hasBlockedLinkedAccount(store, identity)) return new Set();
  const granted = getGrantedModuleIds(identity);
  const role = resolveLinkedDepartmentRole(store, identity);
  if (role) {
    for (const moduleId of getRoleEffectiveGrants(role)) granted.add(moduleId);
  }
  return granted;
}

/** Single predicate for mock repository authorization. */
export function hasModuleAccess(store: AuthorizationStore, identity: DevIdentity, moduleId: AdminModuleId): boolean {
  return resolveEffectiveModules(store, identity).has(moduleId);
}

/** The acting identity may only delegate delegable modules it effectively holds itself. */
export function assertCanDelegate(store: AuthorizationStore, identity: DevIdentity, moduleIds: readonly string[]) {
  const granted = resolveEffectiveModules(store, identity);
  for (const moduleId of moduleIds) {
    if (!isDelegableModule(moduleId)) {
      throw new Error(`Module "${moduleId}" cannot be delegated through a department role.`);
    }
    if (!granted.has(moduleId)) {
      throw new Error(`Module "${moduleId}" is outside the acting account's authorized scope.`);
    }
  }
}

/**
 * Assigning, modifying, reactivating, or deleting a department role requires
 * the actor to be able to delegate everything the role confers. The protected
 * Super Admin role is reserved for Super Administrators.
 */
export function assertCanManageRoleGrants(store: AuthorizationStore, identity: DevIdentity, role: DepartmentRole) {
  if (role.isProtected && !hasActiveSystemRole(store, identity, "super_admin")) {
    throw new Error(PROTECTED_ROLE_ERROR);
  }
  assertCanDelegate(store, identity, getRoleEffectiveGrants(role));
}

/** Non-throwing form of assertCanManageRoleGrants, for UI policies. */
export function canManageRoleGrants(store: AuthorizationStore, identity: DevIdentity, role: DepartmentRole): boolean {
  if (role.isProtected && !hasActiveSystemRole(store, identity, "super_admin")) return false;
  const granted = resolveEffectiveModules(store, identity);
  return getRoleEffectiveGrants(role).every((moduleId) => granted.has(moduleId));
}

/** Non-throwing form of assertCanAssignSystemRole, for UI policies. */
export function canAssignSystemRole(store: AuthorizationStore, identity: DevIdentity, role: DevRole): boolean {
  try {
    assertCanAssignSystemRole(store, identity, role);
    return true;
  } catch {
    return false;
  }
}

/** True when the change would leave no active Super Administrator account. */
export function wouldRemoveLastActiveSuperAdmin(
  store: Pick<MockStore, "accounts">,
  accountId: string,
  next: { roleIds: readonly string[]; status: string },
): boolean {
  try {
    assertKeepsActiveSuperAdmin(store, accountId, next);
    return false;
  } catch {
    return true;
  }
}

/**
 * System-role assignment and revocation: Administrator and Super Administrator
 * are reserved for Super Administrators; any other role must grant only
 * modules the actor effectively holds (module-level model, no operation matrix).
 */
export function assertCanAssignSystemRole(store: AuthorizationStore, identity: DevIdentity, role: DevRole) {
  const isSuperAdmin = hasActiveSystemRole(store, identity, "super_admin");
  if (role === "super_admin" || role === "admin") {
    if (!isSuperAdmin) {
      throw new Error("Only a Super Administrator can assign or revoke the Administrator or Super Administrator role.");
    }
    return;
  }
  // The protected Super Administrator is the root of system-role delegation
  // (doc 01 §1, §3.4). A Super Administrator holds the union of every role's
  // grants (owner rule 2026-11-10), so no baseline omission can block it from
  // assigning those roles. Self-modification and last-Super-Admin rules still
  // apply in the repository.
  if (isSuperAdmin) return;
  const granted = resolveEffectiveModules(store, identity);
  if (getRoleModuleGrants(role).some((moduleId) => !granted.has(moduleId))) {
    throw new Error(`Role "${role}" grants authority outside the acting account's scope.`);
  }
}

/** A staff record is protected when it is linked to a Super Administrator account. */
export function isProtectedStaff(store: Pick<MockStore, "accounts">, staff: Pick<StaffMember, "accountId">): boolean {
  if (!staff.accountId) return false;
  return store.accounts.some((item) => item.id === staff.accountId && item.roleIds.includes("super_admin"));
}

/**
 * Rejects a change that would leave no active Super Administrator account.
 * `next` describes the target account after the proposed change.
 */
export function assertKeepsActiveSuperAdmin(
  store: Pick<MockStore, "accounts">,
  accountId: string,
  next: { roleIds: readonly string[]; status: string },
) {
  const isActiveSuperAdmin = (account: { roleIds: readonly string[]; status: string }) =>
    account.status === "active" && account.roleIds.includes("super_admin");
  const current = store.accounts.find((item) => item.id === accountId);
  if (!current || !isActiveSuperAdmin(current) || isActiveSuperAdmin(next)) return;
  if (!store.accounts.some((item) => item.id !== accountId && isActiveSuperAdmin(item))) {
    throw new Error(LAST_SUPER_ADMIN_ERROR);
  }
}
