import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { DepartmentRoleRepository } from "@/data/contracts/role-repository";
import type { AdminModuleId } from "@/modules/identity/permissions";
import { DELEGABLE_MODULES } from "@/modules/identity/permissions";
import type { DevIdentity } from "@/modules/identity/types";
import type { DepartmentRole, DepartmentRoleStatus } from "@/modules/organization/types";
import { hasModuleAccess, resolveEffectiveModules } from "./authorization";
import type { MockStore } from "./seed";
import { simulateAsync } from "@/data/contracts/async-options";

const DELEGABLE = new Set<AdminModuleId>(DELEGABLE_MODULES);

/** Actors who may manage roles: explicit delegation right holders (admin/super-admin via "roles" module). */
function canManageRoles(store: MockStore, identity: DevIdentity): boolean {
  return hasModuleAccess(store, identity, "roles");
}

/** The acting identity may only delegate modules it effectively holds itself. */
function assertDelegable(store: MockStore, identity: DevIdentity, moduleIds: AdminModuleId[]) {
  const granted = resolveEffectiveModules(store, identity);
  for (const moduleId of moduleIds) {
    if (!DELEGABLE.has(moduleId)) {
      throw new Error(`Module "${moduleId}" cannot be delegated through a department role.`);
    }
    if (!granted.has(moduleId)) {
      throw new Error(`Module "${moduleId}" is outside the acting account's authorized scope.`);
    }
  }
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
    assertDelegable(this.store, identity, input.moduleIds);
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
      role.name = name;
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
          (item) => item.id !== id && item.departmentId === input.departmentId && item.name.toLowerCase() === role.name.toLowerCase(),
        )
      ) {
        throw new Error("A role with this name already exists in the department.");
      }
      role.departmentId = input.departmentId;
    }
    if (input.moduleIds !== undefined) {
      if (!Array.isArray(input.moduleIds) || input.moduleIds.length === 0) {
        throw new Error("At least one authorized module is required.");
      }
      // Unchanged grants are not re-validated: keeping existing modules broadens nothing.
      const current = new Set(role.moduleIds);
      const next = new Set(input.moduleIds);
      const unchanged = current.size === next.size && [...next].every((moduleId) => current.has(moduleId));
      if (!unchanged) assertDelegable(this.store, identity, input.moduleIds);
      role.moduleIds = [...new Set(input.moduleIds)];
    }
    if (input.status !== undefined) {
      role.status = normalizeRoleStatus(input.status);
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
    const assigned = this.store.staff.filter((item) => item.departmentRoleId === id);
    if (assigned.length > 0) {
      throw new Error(`Role is assigned to ${assigned.length} staff member(s) and cannot be deleted.`);
    }
    this.store.roles.splice(index, 1);
  }
}
