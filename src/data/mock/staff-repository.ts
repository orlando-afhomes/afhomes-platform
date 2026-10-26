import type { StaffStatus } from "@/modules/organization/types";
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

export class MockStaffRepository {
  constructor(private readonly store: MockStore, private readonly getIdentity: () => DevIdentity, private readonly asyncOptions: MockAsyncOptions = {}) {}

  private merge(options?: MockAsyncOptions) { return { ...this.asyncOptions, ...options }; }

  async list(options?: MockAsyncOptions) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageOrg(identity)) return [];
    return this.store.staff.map((s) => ({ ...s }));
  }

  async getById(id: string, options?: MockAsyncOptions) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageOrg(identity)) return null;
    return this.store.staff.find((s) => s.id === id) ?? null;
  }

  async create(input: { displayName: string; position: string; departmentId?: string | null; email: string; avatarUrl?: string | null; accountId?: string | null }, options?: MockAsyncOptions) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageOrg(identity)) throw new Error("Staff creation is not allowed.");
    const displayName = input.displayName.trim();
    if (!displayName) throw new Error("Display name is required.");
    if (!input.email.trim()) throw new Error("Email is required.");
    if (input.departmentId && !this.store.departments.some((d) => d.id === input.departmentId && d.status === "active")) throw new Error("Invalid department reference.");
    const staff = { id: `staff-${this.store.staffSequence}`, displayName, position: input.position.trim(), departmentId: input.departmentId ?? null, status: "active" as StaffStatus, email: input.email.trim(), createdAt: new Date().toISOString().slice(0, 10), avatarUrl: input.avatarUrl ?? null, accountId: input.accountId ?? null };
    this.store.staffSequence += 1;
    this.store.staff.push(staff);
    return { ...staff };
  }

  async update(id: string, input: { displayName?: string; position?: string; departmentId?: string | null; status?: StaffStatus; avatarUrl?: string | null; accountId?: string | null }, options?: MockAsyncOptions) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageOrg(identity)) throw new Error("Staff update is not allowed.");
    const staff = this.store.staff.find((s) => s.id === id);
    if (!staff) throw new Error("Staff member not found.");
    if (input.displayName !== undefined) {
      const name = input.displayName.trim();
      if (!name) throw new Error("Display name is required.");
      staff.displayName = name;
    }
    if (input.position !== undefined) staff.position = input.position.trim();
    if (input.departmentId !== undefined) {
      if (input.departmentId && !this.store.departments.some((d) => d.id === input.departmentId)) throw new Error("Invalid department reference.");
      staff.departmentId = input.departmentId;
    }
    if (input.avatarUrl !== undefined) staff.avatarUrl = input.avatarUrl;
    if (input.accountId !== undefined) staff.accountId = input.accountId;
    if (input.status !== undefined) throw new Error("Employment status changes are not supported.");
    return { ...staff };
  }

  async delete(id: string, options?: MockAsyncOptions) {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageOrg(identity)) throw new Error("Staff deletion is not allowed.");
    const index = this.store.staff.findIndex((s) => s.id === id);
    if (index < 0) throw new Error("Staff member not found.");
    const staff = this.store.staff[index];
    if (staff.accountId) {
      const account = this.store.accounts.find((a) => a.id === staff.accountId);
      if (account && account.status === "active") {
        throw new Error("Linked active account must be handled before deleting this staff record.");
      }
    }
    this.store.staff.splice(index, 1);
  }
}
