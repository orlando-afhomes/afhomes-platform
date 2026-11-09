import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { Account, AccountPolicies, AccountStatus } from "@/modules/accounts/types";

export interface AccountRepository {
  list(options?: MockAsyncOptions): Promise<Account[]>;
  getPolicies(options?: MockAsyncOptions): Promise<AccountPolicies>;
  getById(id: string, options?: MockAsyncOptions): Promise<Account | null>;
  create(input: { displayName: string; email: string; roleIds: string[]; departmentId?: string | null }, options?: MockAsyncOptions): Promise<Account>;
  update(id: string, input: { displayName?: string; email?: string; departmentId?: string | null }, options?: MockAsyncOptions): Promise<Account>;
  assignRole(id: string, role: string, options?: MockAsyncOptions): Promise<Account>;
  revokeRole(id: string, role: string, options?: MockAsyncOptions): Promise<Account>;
  updateStatus(id: string, status: AccountStatus, options?: MockAsyncOptions): Promise<Account>;
  /** Removes an inactive, unlinked, non-protected account the actor has authority over. */
  delete(id: string, options?: MockAsyncOptions): Promise<void>;
}
