
import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { DevIdentity } from "@/modules/identity/types";
import type { MockStore } from "./seed";
import { activeRoles } from "./dev-identities";
import { simulateAsync } from "@/data/contracts/async-options";

function canManageOrg(identity: DevIdentity) {
  if (identity.status !== "active") return false;
  const roles = activeRoles(identity);
  return roles.includes("super_admin") || roles.includes("admin") || roles.includes("hr");
}

export class MockDepartmentRepository {
  constructor(private readonly store: MockStore, private readonly getIdentity: () => DevIdentity, private readonly asyncOptions: MockAsyncOptions = {}) {}

  private merge(options?: MockAsyncOptions) { return { ...this.asyncOptions, ...options }; }

  async list(options?: MockAsyncOptions) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageOrg(identity)) return [];
    return [...this.store.departments];
  }

  async getById(id: string, options?: MockAsyncOptions) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageOrg(identity)) return null;
    return this.store.departments.find((d) => d.id === id) ?? null;
  }

  async create(input: { name: string; code: string; description?: string; headStaffId?: string | null }, options?: MockAsyncOptions) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageOrg(identity)) throw new Error("Department creation is not allowed.");
    if (input.headStaffId) throw new Error("Department Head assignment is not supported.");
    const name = input.name.trim();
    if (!name) throw new Error("Department name is required.");
    if (this.store.departments.some((d) => d.name.toLowerCase() === name.toLowerCase())) throw new Error("Department already exists.");
    const dept = { id: `dept-${this.store.departmentSequence}`, name, code: input.code.trim(), description: input.description?.trim() ?? "", headStaffId: null, status: "active" as const };
    this.store.departmentSequence += 1;
    this.store.departments.push(dept);
    return { ...dept };
  }

  async update(id: string, input: { name?: string; code?: string; description?: string; headStaffId?: string | null; status?: "active" | "archived" }, options?: MockAsyncOptions) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageOrg(identity)) throw new Error("Department update is not allowed.");
    const dept = this.store.departments.find((d) => d.id === id);
    if (!dept) throw new Error("Department not found.");
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new Error("Department name is required.");
      dept.name = name;
    }
    if (input.code !== undefined) dept.code = input.code.trim();
    if (input.description !== undefined) dept.description = input.description.trim();
    if (input.headStaffId !== undefined) throw new Error("Department Head assignment is not supported.");
    if (input.status !== undefined) dept.status = input.status;
    return { ...dept };
  }
}
