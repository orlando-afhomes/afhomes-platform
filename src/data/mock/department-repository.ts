
import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { DevIdentity } from "@/modules/identity/types";
import { AUDIT_ACTIONS } from "@/modules/audit/types";
import type { MockStore } from "./seed";
import { appendAuditEvent } from "./audit";
import { activeRoles } from "./dev-identities";
import { PROTECTED_ROLE_ERROR, assertCanDelegate, getRoleEffectiveGrants, hasActiveSystemRole, hasModuleAccess } from "./authorization";
import { simulateAsync } from "@/data/contracts/async-options";

function canManageDepartments(store: MockStore, identity: DevIdentity) {
  return hasModuleAccess(store, identity, "departments");
}

function normalizeDepartmentStatus(status: string): "active" | "deactivated" {
  if (status === "archived" || status === "deactivated") return "deactivated";
  return "active";
}

export class MockDepartmentRepository {
  constructor(private readonly store: MockStore, private readonly getIdentity: () => DevIdentity, private readonly asyncOptions: MockAsyncOptions = {}) {}

  private merge(options?: MockAsyncOptions) { return { ...this.asyncOptions, ...options }; }

  async list(options?: MockAsyncOptions) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageDepartments(this.store, identity)) return [];
    return this.store.departments.map((d) => ({ ...d, status: normalizeDepartmentStatus(d.status) }));
  }

  async getById(id: string, options?: MockAsyncOptions) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageDepartments(this.store, identity)) return null;
    const dept = this.store.departments.find((d) => d.id === id);
    return dept ? { ...dept, status: normalizeDepartmentStatus(dept.status) } : null;
  }

  async create(input: { name: string; code?: string; description?: string; headStaffId?: string | null; status?: "active" | "deactivated" }, options?: MockAsyncOptions) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageDepartments(this.store, identity)) throw new Error("Department creation is not allowed.");
    if (input.headStaffId) throw new Error("Department Head assignment is not supported.");
    const name = input.name.trim();
    if (!name) throw new Error("Department name is required.");
    if (this.store.departments.some((d) => d.name.toLowerCase() === name.toLowerCase())) throw new Error("Department already exists.");
    const status: "active" | "deactivated" = input.status === "deactivated" ? "deactivated" : "active";
    const dept = { id: `dept-${this.store.departmentSequence}`, name, code: (input.code ?? "").trim(), description: input.description?.trim() ?? "", headStaffId: null, status };
    this.store.departmentSequence += 1;
    this.store.departments.push(dept);
    appendAuditEvent(this.store, {
      actorId: identity.id,
      actorRoles: activeRoles(identity),
      module: "organization",
      action: AUDIT_ACTIONS.DEPARTMENT_CREATED,
      entityType: "department",
      entityId: dept.id,
      newValue: name,
      outcome: "success",
    });
    return { ...dept };
  }

  async update(id: string, input: { name?: string; code?: string; description?: string; headStaffId?: string | null; status?: "active" | "deactivated" }, options?: MockAsyncOptions) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageDepartments(this.store, identity)) throw new Error("Department update is not allowed.");
    const dept = this.store.departments.find((d) => d.id === id);
    if (!dept) throw new Error("Department not found.");
    if (input.headStaffId !== undefined) throw new Error("Department Head assignment is not supported.");
    // Validate everything first; mutate only after every check passes.
    const next = { name: dept.name, code: dept.code, description: dept.description, status: dept.status };
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new Error("Department name is required.");
      if (this.store.departments.some((d) => d.id !== id && d.name.toLowerCase() === name.toLowerCase())) throw new Error("Department already exists.");
      next.name = name;
    }
    if (input.code !== undefined) next.code = input.code.trim();
    if (input.description !== undefined) next.description = input.description.trim();
    if (input.status !== undefined) {
      const currentStatus = normalizeDepartmentStatus(dept.status);
      const nextStatus = input.status === "deactivated" ? "deactivated" : "active";
      if (nextStatus !== currentStatus) {
        const departmentRoles = this.store.roles.filter((role) => role.departmentId === id);
        // Department status gates its roles' grants, so it gates the protected role too.
        if (departmentRoles.some((role) => role.isProtected) && !hasActiveSystemRole(this.store, identity, "super_admin")) {
          throw new Error(PROTECTED_ROLE_ERROR);
        }
        // Reactivation restores the grants of the department's active roles.
        if (nextStatus === "active") {
          for (const role of departmentRoles.filter((item) => item.status === "active")) {
            assertCanDelegate(this.store, identity, getRoleEffectiveGrants(role));
          }
        }
      }
      next.status = nextStatus;
    }
    const previousStatus = normalizeDepartmentStatus(dept.status);
    const statusChanged = next.status !== previousStatus;
    // Descriptions are free text, so only the fact that one changed is recorded.
    const changedDetails: Array<[field: string, before: string, after: string]> = [];
    if (next.name !== dept.name) changedDetails.push(["name", dept.name, next.name]);
    if (next.code !== dept.code) changedDetails.push(["code", dept.code, next.code]);
    if (next.description !== dept.description) changedDetails.push(["description", "changed", "changed"]);
    Object.assign(dept, next);
    if (changedDetails.length > 0) {
      appendAuditEvent(this.store, {
        actorId: identity.id,
        actorRoles: activeRoles(identity),
        module: "organization",
        action: AUDIT_ACTIONS.DEPARTMENT_UPDATED,
        entityType: "department",
        entityId: id,
        previousValue: changedDetails.map(([field, before]) => `${field}:${before}`).join(";"),
        newValue: changedDetails.map(([field, , after]) => `${field}:${after}`).join(";"),
        outcome: "success",
      });
    }
    if (statusChanged) {
      appendAuditEvent(this.store, {
        actorId: identity.id,
        actorRoles: activeRoles(identity),
        module: "organization",
        action: AUDIT_ACTIONS.DEPARTMENT_STATUS_CHANGED,
        entityType: "department",
        entityId: id,
        previousValue: previousStatus,
        newValue: next.status,
        outcome: "success",
      });
    }
    return { ...dept, status: normalizeDepartmentStatus(dept.status) };
  }

  async delete(id: string, options?: MockAsyncOptions) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageDepartments(this.store, identity)) throw new Error("Department deletion is not allowed.");
    const index = this.store.departments.findIndex((d) => d.id === id);
    if (index < 0) throw new Error("Department not found.");
    if (this.store.roles.some((r) => r.departmentId === id)) {
      throw new Error("Department has assigned roles and cannot be deleted.");
    }
    if (this.store.staff.some((s) => s.departmentId === id)) {
      throw new Error("Department has assigned employees and cannot be deleted.");
    }
    this.store.departments.splice(index, 1);
  }
}
