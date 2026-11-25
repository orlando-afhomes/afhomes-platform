import "server-only";
import { ApiError } from "@/server/api/errors";
import { activeRoles } from "@/modules/identity/active-roles";
import {
  DELEGABLE_MODULES,
  getDelegableGrants,
  getGrantedModuleIds,
  getRoleModuleGrants,
  type AdminModuleId,
} from "@/modules/identity/permissions";
import type { DevRole } from "@/modules/identity/types";
import type { Actor } from "@/server/auth/actor";

/** Organization guard messages shared with the API and the policies the screens render. */
export const SELF_MODIFICATION_ERROR = "You cannot change your own roles, department, permissions, or account status.";
export const PROTECTED_ROLE_ERROR = "The protected Super Admin role can only be managed by a Super Administrator.";
export const PROTECTED_STAFF_ERROR = "Protected Super Administrator records can only be changed by a Super Administrator.";
export const PROTECTED_ACCOUNT_ERROR = "Protected Super Administrator account. Only a Super Administrator can change it.";
export const LAST_SUPER_ADMIN_ERROR = "The last active Super Administrator cannot be removed.";
export const OWN_ACCOUNT_ERROR = "This is your own account. Another administrator must change its roles or status.";
export const LINKED_ACCOUNT_ERROR = "Linked to a staff record. Name and email are managed in Staff Management.";
export const ADMIN_ACTIVATION_ERROR = "Only an Administrator or Super Administrator can activate an Administrator account.";

const DELEGABLE = new Set<AdminModuleId>(DELEGABLE_MODULES);

export function hasActiveRole(actor: Actor, role: DevRole): boolean {
  return activeRoles(actor.identity).includes(role);
}

export function isSuperAdmin(actor: Actor): boolean {
  return hasActiveRole(actor, "super_admin");
}

/** Modules the actor effectively holds: system roles plus active department-role grants. */
export function actorModules(actor: Actor): Set<AdminModuleId> {
  return getGrantedModuleIds(actor.identity);
}

export function canManageRoleGrants(actor: Actor, role: { moduleIds: readonly string[]; isProtected?: boolean }): boolean {
  try {
    assertCanManageRoleGrants(actor, role);
    return true;
  } catch {
    return false;
  }
}

/** Assigning, changing, reactivating or deleting a role needs authority over everything it confers. */
export function assertCanManageRoleGrants(actor: Actor, role: { moduleIds: readonly string[]; isProtected?: boolean }): void {
  if (role.isProtected && !isSuperAdmin(actor)) throw new ApiError(403, "forbidden", PROTECTED_ROLE_ERROR);
  assertCanDelegate(actor, getDelegableGrants(role.moduleIds));
}

/** The actor may delegate only delegable modules it holds itself; module pages never grant operations. */
export function assertCanDelegate(actor: Actor, moduleIds: readonly string[]): void {
  const granted = actorModules(actor);
  for (const moduleId of moduleIds) {
    if (!DELEGABLE.has(moduleId as AdminModuleId)) {
      throw new ApiError(422, "module_not_delegable", `Module "${moduleId}" cannot be delegated through a department role.`);
    }
    if (!granted.has(moduleId as AdminModuleId)) {
      throw new ApiError(403, "outside_scope", `Module "${moduleId}" is outside the acting account's authorized scope.`);
    }
  }
}

/** Administrator and Super Administrator roles are reserved for a Super Administrator; others stay inside the actor's modules. */
export function assertCanAssignSystemRole(actor: Actor, role: DevRole): void {
  if (role === "super_admin" || role === "admin") {
    if (!isSuperAdmin(actor)) {
      throw new ApiError(403, "forbidden", "Only a Super Administrator can assign or revoke the Administrator or Super Administrator role.");
    }
    return;
  }
  if (isSuperAdmin(actor)) return;
  const granted = actorModules(actor);
  if (getRoleModuleGrants(role).some((moduleId) => !granted.has(moduleId))) {
    throw new ApiError(403, "outside_scope", `Role "${role}" grants authority outside the acting account's scope.`);
  }
}

export function canAssignSystemRole(actor: Actor, role: DevRole): boolean {
  try {
    assertCanAssignSystemRole(actor, role);
    return true;
  } catch {
    return false;
  }
}
