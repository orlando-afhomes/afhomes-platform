import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { Account, AccountStatus } from "@/modules/accounts/types";

export interface AccountRepository {
  list(options?: MockAsyncOptions): Promise<Account[]>;
  getById(id: string, options?: MockAsyncOptions): Promise<Account | null>;
  create(input: { displayName: string; email: string; roleIds: string[]; departmentId?: string | null }, options?: MockAsyncOptions): Promise<Account>;
  update(id: string, input: { displayName?: string; email?: string; departmentId?: string | null }, options?: MockAsyncOptions): Promise<Account>;
  assignRole(id: string, role: string, options?: MockAsyncOptions): Promise<Account>;
  revokeRole(id: string, role: string, options?: MockAsyncOptions): Promise<Account>;
  updateStatus(id: string, status: AccountStatus, options?: MockAsyncOptions): Promise<Account>;
}
