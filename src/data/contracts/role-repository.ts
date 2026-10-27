import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { AdminModuleId } from "@/modules/identity/permissions";
import type { DepartmentRole, DepartmentRoleStatus } from "@/modules/organization/types";

export interface DepartmentRoleRepository {
  list(options?: MockAsyncOptions): Promise<DepartmentRole[]>;
  getById(id: string, options?: MockAsyncOptions): Promise<DepartmentRole | null>;
  create(
    input: { name: string; departmentId: string; moduleIds: AdminModuleId[]; status?: DepartmentRoleStatus },
    options?: MockAsyncOptions,
  ): Promise<DepartmentRole>;
  update(
    id: string,
    input: { name?: string; departmentId?: string; moduleIds?: AdminModuleId[]; status?: DepartmentRoleStatus },
    options?: MockAsyncOptions,
  ): Promise<DepartmentRole>;
  delete(id: string, options?: MockAsyncOptions): Promise<void>;
}
