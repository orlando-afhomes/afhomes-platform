import { ALL_MODULE_IDS, getGrantedModuleIds, type AdminModuleId } from "@/modules/identity/permissions";
import type { DevIdentity } from "@/modules/identity/types";
import type { DepartmentRole } from "@/modules/organization/types";
import type { MockStore } from "./seed";

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
  if (!identity.staffId) return null;
  const staff = store.staff.find((item) => item.id === identity.staffId);
  if (!staff || staff.status !== "active" || !staff.departmentRoleId) return null;
  const role = store.roles.find((item) => item.id === staff.departmentRoleId);
  if (!role || role.status !== "active") return null;
  const department = store.departments.find((item) => item.id === role.departmentId);
  if (!department || department.status !== "active") return null;
  return role;
}

/**
 * Effective module set: system role grants plus department-role grants from
 * the linked staff record (when the full chain is active). Unknown module
 * ids stored on a role are ignored. Identities without a linked staff record
 * behave exactly as before.
 */
export function resolveEffectiveModules(
  store: Pick<MockStore, "departments" | "roles" | "staff">,
  identity: DevIdentity,
): Set<AdminModuleId> {
  const granted = getGrantedModuleIds(identity);
  const role = resolveLinkedDepartmentRole(store, identity);
  if (role) {
    for (const moduleId of role.moduleIds) {
      if (ALL_MODULE_IDS.has(moduleId as AdminModuleId)) {
        granted.add(moduleId as AdminModuleId);
      }
    }
  }
  return granted;
}

/** Single predicate for mock repository authorization. */
export function hasModuleAccess(
  store: Pick<MockStore, "departments" | "roles" | "staff">,
  identity: DevIdentity,
  moduleId: AdminModuleId,
): boolean {
  return resolveEffectiveModules(store, identity).has(moduleId);
}
