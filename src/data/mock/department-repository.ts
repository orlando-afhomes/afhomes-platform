
import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { DevIdentity } from "@/modules/identity/types";
import type { MockStore } from "./seed";
import { hasModuleAccess } from "./authorization";
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
    return { ...dept };
  }

  async update(id: string, input: { name?: string; code?: string; description?: string; headStaffId?: string | null; status?: "active" | "deactivated" }, options?: MockAsyncOptions) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageDepartments(this.store, identity)) throw new Error("Department update is not allowed.");
    const dept = this.store.departments.find((d) => d.id === id);
    if (!dept) throw new Error("Department not found.");
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new Error("Department name is required.");
      if (this.store.departments.some((d) => d.id !== id && d.name.toLowerCase() === name.toLowerCase())) throw new Error("Department already exists.");
      dept.name = name;
    }
    if (input.code !== undefined) dept.code = input.code.trim();
    if (input.description !== undefined) dept.description = input.description.trim();
    if (input.headStaffId !== undefined) throw new Error("Department Head assignment is not supported.");
    if (input.status !== undefined) dept.status = input.status === "deactivated" ? "deactivated" : "active";
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
