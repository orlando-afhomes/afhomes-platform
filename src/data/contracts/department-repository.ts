import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { Department } from "@/modules/organization/types";

export interface DepartmentRepository {
  list(options?: MockAsyncOptions): Promise<Department[]>;
  getById(id: string, options?: MockAsyncOptions): Promise<Department | null>;
  create(input: { name: string; code: string; description?: string; headStaffId?: string | null }, options?: MockAsyncOptions): Promise<Department>;
  update(id: string, input: { name?: string; code?: string; description?: string; headStaffId?: string | null; status?: "active" | "archived" }, options?: MockAsyncOptions): Promise<Department>;
}
