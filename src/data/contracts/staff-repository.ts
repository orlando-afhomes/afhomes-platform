import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { StaffMember, StaffStatus } from "@/modules/organization/types";

export interface StaffRepository {
  list(options?: MockAsyncOptions): Promise<StaffMember[]>;
  getById(id: string, options?: MockAsyncOptions): Promise<StaffMember | null>;
  create(input: { displayName: string; position: string; departmentId?: string | null; email: string }, options?: MockAsyncOptions): Promise<StaffMember>;
  update(id: string, input: { displayName?: string; position?: string; departmentId?: string | null; status?: StaffStatus }, options?: MockAsyncOptions): Promise<StaffMember>;
}
