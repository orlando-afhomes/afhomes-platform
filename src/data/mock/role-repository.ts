import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { DepartmentRoleRepository } from "@/data/contracts/role-repository";
import type { AdminModuleId } from "@/modules/identity/permissions";
import { AUDIT_ACTIONS } from "@/modules/audit/types";
import type { DevIdentity } from "@/modules/identity/types";
import type { DepartmentRole, DepartmentRoleOption, DepartmentRoleStatus } from "@/modules/organization/types";
import { assertCanDelegate, assertCanManageRoleGrants, canManageRoleGrants, hasModuleAccess } from "./authorization";
import type { MockStore } from "./seed";
import { appendAuditEvent } from "./audit";
import { activeRoles } from "./dev-identities";
import { simulateAsync } from "@/data/contracts/async-options";

/** Actors who may manage roles: explicit delegation right holders (admin/super-admin via "roles" module). */
function canManageRoles(store: MockStore, identity: DevIdentity): boolean {
  return hasModuleAccess(store, identity, "roles");
}

function normalizeRoleStatus(status: string | undefined): DepartmentRoleStatus {
  return status === "deactivated" ? "deactivated" : "active";
}

export class MockDepartmentRoleRepository implements DepartmentRoleRepository {
  constructor(
    private readonly store: MockStore,
    private readonly getIdentity: () => DevIdentity,
    private readonly asyncOptions: MockAsyncOptions = {},
  ) {}

  private merge(options?: MockAsyncOptions) {
    return { ...this.asyncOptions, ...options };
  }

  async list(options?: MockAsyncOptions) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageRoles(this.store, identity)) return [];
    return this.store.roles.map((role) => ({ ...role, moduleIds: [...role.moduleIds] }));
  }

  /**
   * Roles with the actor's authority over each, for Staff assignment and role
   * actions. Staff/Employees holders may read this to assign permitted roles
   * (doc 01 §5) without gaining Roles management.
   */
  async listForAssignment(options?: MockAsyncOptions): Promise<DepartmentRoleOption[]> {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageRoles(this.store, identity) && !hasModuleAccess(this.store, identity, "staff")) return [];
    return this.store.roles.map((role) => {
      const manageable = canManageRoleGrants(this.store, identity, role);
      const departmentActive = this.store.departments.some((dept) => dept.id === role.departmentId && dept.status === "active");
      return { ...role, moduleIds: [...role.moduleIds], manageable, assignable: manageable && role.status === "active" && departmentActive };
    });
  }

  async getById(id: string, options?: MockAsyncOptions) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageRoles(this.store, identity)) return null;
    const role = this.store.roles.find((item) => item.id === id);
    return role ? { ...role, moduleIds: [...role.moduleIds] } : null;
  }

  async create(
    input: { name: string; departmentId: string; moduleIds: AdminModuleId[]; status?: DepartmentRoleStatus },
    options?: MockAsyncOptions,
  ) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageRoles(this.store, identity)) throw new Error("Department role creation is not allowed.");
    const name = input.name.trim();
    if (!name) throw new Error("Role name is required.");
    const department = this.store.departments.find((item) => item.id === input.departmentId);
    if (!department) throw new Error("Department does not exist.");
    if (department.status !== "active") throw new Error("Roles cannot be created under a deactivated department.");
    if (!Array.isArray(input.moduleIds) || input.moduleIds.length === 0) {
      throw new Error("At least one authorized module is required.");
    }
    if (this.store.roles.some((item) => item.departmentId === input.departmentId && item.name.toLowerCase() === name.toLowerCase())) {
      throw new Error("A role with this name already exists in the department.");
    }
    assertCanDelegate(this.store, identity, input.moduleIds);
    const role: DepartmentRole = {
      id: `role-${this.store.roleSequence}`,
      name,
      departmentId: input.departmentId,
      moduleIds: [...new Set(input.moduleIds)],
      status: normalizeRoleStatus(input.status),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    this.store.roleSequence += 1;
    this.store.roles.push(role);
    appendAuditEvent(this.store, {
      actorId: identity.id,
      actorRoles: activeRoles(identity),
      module: "organization",
      action: AUDIT_ACTIONS.ROLE_CREATED,
      entityType: "department-role",
      entityId: role.id,
      newValue: `${name} [${role.moduleIds.join(",")}]`,
      outcome: "success",
      relatedRecordIds: [role.departmentId],
    });
    return { ...role, moduleIds: [...role.moduleIds] };
  }

  async update(
    id: string,
    input: { name?: string; departmentId?: string; moduleIds?: AdminModuleId[]; status?: DepartmentRoleStatus },
    options?: MockAsyncOptions,
  ) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageRoles(this.store, identity)) throw new Error("Department role update is not allowed.");
    const role = this.store.roles.find((item) => item.id === id);
    if (!role) throw new Error("Department role not found.");
    // Any modification (rename, transfer, module change, deactivation,
    // reactivation) requires authority over everything the role confers.
    assertCanManageRoleGrants(this.store, identity, role);
    // Validate everything first; mutate only after every check passes.
    const next = { name: role.name, departmentId: role.departmentId, moduleIds: role.moduleIds, status: role.status };
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new Error("Role name is required.");
      if (
        this.store.roles.some(
          (item) => item.id !== id && item.departmentId === (input.departmentId ?? role.departmentId) && item.name.toLowerCase() === name.toLowerCase(),
        )
      ) {
        throw new Error("A role with this name already exists in the department.");
      }
      next.name = name;
    }
    if (input.departmentId !== undefined && input.departmentId !== role.departmentId) {
      const assigned = this.store.staff.some((item) => item.departmentRoleId === id);
      if (assigned) {
        throw new Error("Role cannot be transferred while staff members are assigned to it.");
      }
      const department = this.store.departments.find((item) => item.id === input.departmentId);
      if (!department) throw new Error("Department does not exist.");
      if (department.status !== "active") throw new Error("Roles cannot be moved to a deactivated department.");
      if (
        this.store.roles.some(
          (item) => item.id !== id && item.departmentId === input.departmentId && item.name.toLowerCase() === next.name.toLowerCase(),
        )
      ) {
        throw new Error("A role with this name already exists in the department.");
      }
      next.departmentId = input.departmentId;
    }
    if (input.moduleIds !== undefined) {
      if (!Array.isArray(input.moduleIds) || input.moduleIds.length === 0) {
        throw new Error("At least one authorized module is required.");
      }
      // Newly added modules must be delegable and held by the actor. Retained
      // non-delegable legacy ids stay inert (see getRoleEffectiveGrants).
      const current = new Set(role.moduleIds);
      assertCanDelegate(this.store, identity, input.moduleIds.filter((moduleId) => !current.has(moduleId)));
      next.moduleIds = [...new Set(input.moduleIds)];
    }
    if (input.status !== undefined) {
      next.status = normalizeRoleStatus(input.status);
    }
    // One event per update call, limited to covered identity/grant changes.
    const changedCovered: Array<[field: string, before: string, after: string]> = [];
    if (next.name !== role.name) changedCovered.push(["name", role.name, next.name]);
    if (next.departmentId !== role.departmentId) changedCovered.push(["department", role.departmentId, next.departmentId]);
    if (next.moduleIds.join(",") !== role.moduleIds.join(",")) {
      // Order-only resends are not permission changes.
      const sameSet =
        next.moduleIds.length === role.moduleIds.length &&
        next.moduleIds.every((moduleId) => role.moduleIds.includes(moduleId));
      if (!sameSet) changedCovered.push(["modules", role.moduleIds.join(","), next.moduleIds.join(",")]);
    }
    if (next.status !== role.status) changedCovered.push(["status", role.status, next.status]);
    Object.assign(role, next);
    if (changedCovered.length > 0) {
      appendAuditEvent(this.store, {
        actorId: identity.id,
        actorRoles: activeRoles(identity),
        module: "organization",
        action: AUDIT_ACTIONS.ROLE_UPDATED,
        entityType: "department-role",
        entityId: id,
        previousValue: changedCovered.map(([field, before]) => `${field}:${before}`).join(";"),
        newValue: changedCovered.map(([field, , after]) => `${field}:${after}`).join(";"),
        outcome: "success",
        relatedRecordIds: [next.departmentId],
      });
    }
    return { ...role, moduleIds: [...role.moduleIds] };
  }

  async delete(id: string, options?: MockAsyncOptions) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageRoles(this.store, identity)) throw new Error("Department role deletion is not allowed.");
    const index = this.store.roles.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Department role not found.");
    assertCanManageRoleGrants(this.store, identity, this.store.roles[index]);
    const assigned = this.store.staff.filter((item) => item.departmentRoleId === id);
    if (assigned.length > 0) {
      throw new Error(`Role is assigned to ${assigned.length} staff member(s) and cannot be deleted.`);
    }
    const [removed] = this.store.roles.splice(index, 1);
    appendAuditEvent(this.store, {
      actorId: identity.id,
      actorRoles: activeRoles(identity),
      module: "organization",
      action: AUDIT_ACTIONS.ROLE_DELETED,
      entityType: "department-role",
      entityId: id,
      previousValue: `${removed.name} [${removed.moduleIds.join(",")}]`,
      outcome: "success",
      relatedRecordIds: [removed.departmentId],
    });
  }
}
