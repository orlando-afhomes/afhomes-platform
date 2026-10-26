import type { Account, AccountStatus } from "@/modules/accounts/types";
import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { DevIdentity } from "@/modules/identity/types";
import type { MockStore } from "./seed";
import { activeRoles } from "./dev-identities";
import { simulateAsync } from "@/data/contracts/async-options";

function canManageAccounts(identity: DevIdentity) {
  if (identity.status !== "active") return false;
  const roles = activeRoles(identity);
  return roles.includes("super_admin") || roles.includes("admin");
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ["active"],
  active: ["suspended", "deactivated"],
  suspended: ["active", "deactivated"],
  deactivated: ["active"],
};

function isProtectedAccount(account: { roleIds: string[] }) {
  return account.roleIds.includes("super_admin");
}

export class MockAccountRepository {
  constructor(
    private readonly store: MockStore,
    private readonly getIdentity: () => DevIdentity,
    private readonly asyncOptions: MockAsyncOptions = {},
  ) {}

  private mergeOptions(options?: MockAsyncOptions) {
    return { ...this.asyncOptions, ...options };
  }

  async list(options?: MockAsyncOptions): Promise<Account[]> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageAccounts(identity)) return [];
    return this.store.accounts.map((a) => ({ ...a, roleIds: [...a.roleIds] }));
  }

  async getById(id: string, options?: MockAsyncOptions): Promise<Account | null> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageAccounts(identity)) return null;
    const account = this.store.accounts.find((a) => a.id === id);
    return account ? { ...account, roleIds: [...account.roleIds] } : null;
  }

  async create(input: { displayName: string; email: string; roleIds: DevIdentity["roles"]; departmentId?: string | null }, options?: MockAsyncOptions): Promise<Account> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageAccounts(identity)) throw new Error("Account creation is not allowed.");
    if (input.roleIds.includes("super_admin") && !activeRoles(identity).includes("super_admin")) {
      throw new Error("Cannot create a protected Super Administrator account.");
    }
    const displayName = input.displayName.trim();
    const email = input.email.trim();
    if (!displayName) throw new Error("Display name is required.");
    if (!email) throw new Error("Email is required.");
    if (this.store.accounts.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("An account with this email already exists.");
    }
    const account: Account = {
      id: `acct-${this.store.accountSequence}`,
      displayName,
      email,
      roleIds: [...input.roleIds],
      status: "pending",
      departmentId: input.departmentId ?? null,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    this.store.accountSequence += 1;
    this.store.accounts.push(account);
    return { ...account, roleIds: [...account.roleIds] };
  }

  async update(id: string, input: { displayName?: string; email?: string; departmentId?: string | null }, options?: MockAsyncOptions): Promise<Account> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageAccounts(identity)) throw new Error("Account update is not allowed.");
    const account = this.store.accounts.find((a) => a.id === id);
    if (!account) throw new Error("Account not found.");
    if (isProtectedAccount(account) && !activeRoles(identity).includes("super_admin")) {
      throw new Error("Protected account cannot be modified by this actor.");
    }
    if (input.displayName !== undefined) {
      const name = input.displayName.trim();
      if (!name) throw new Error("Display name is required.");
      account.displayName = name;
    }
    if (input.email !== undefined) {
      const email = input.email.trim();
      if (!email) throw new Error("Email is required.");
      if (this.store.accounts.some((a) => a.id !== id && a.email.toLowerCase() === email.toLowerCase())) {
        throw new Error("An account with this email already exists.");
      }
      account.email = email;
    }
    if (input.departmentId !== undefined) account.departmentId = input.departmentId;
    return { ...account, roleIds: [...account.roleIds] };
  }

  async assignRole(id: string, role: DevIdentity["roles"][number], options?: MockAsyncOptions): Promise<Account> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageAccounts(identity)) throw new Error("Role assignment is not allowed.");
    const account = this.store.accounts.find((a) => a.id === id);
    if (!account) throw new Error("Account not found.");
    if (role === "super_admin" && !activeRoles(identity).includes("super_admin")) {
      throw new Error("Cannot assign protected Super Administrator role.");
    }
    if (isProtectedAccount(account) && !activeRoles(identity).includes("super_admin")) {
      throw new Error("Protected account roles cannot be modified by this actor.");
    }
    if (account.roleIds.includes(role)) throw new Error("Role already assigned.");
    account.roleIds.push(role);
    return { ...account, roleIds: [...account.roleIds] };
  }

  async revokeRole(id: string, role: DevIdentity["roles"][number], options?: MockAsyncOptions): Promise<Account> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageAccounts(identity)) throw new Error("Role revocation is not allowed.");
    const account = this.store.accounts.find((a) => a.id === id);
    if (!account) throw new Error("Account not found.");
    if (role === "super_admin" && !activeRoles(identity).includes("super_admin")) {
      throw new Error("Cannot revoke protected Super Administrator role.");
    }
    if (isProtectedAccount(account) && !activeRoles(identity).includes("super_admin")) {
      throw new Error("Protected account roles cannot be modified by this actor.");
    }
    const index = account.roleIds.indexOf(role);
    if (index < 0) throw new Error("Role not assigned.");
    account.roleIds.splice(index, 1);
    return { ...account, roleIds: [...account.roleIds] };
  }

  async updateStatus(id: string, status: AccountStatus, options?: MockAsyncOptions): Promise<Account> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!canManageAccounts(identity)) throw new Error("Status change is not allowed.");
    const account = this.store.accounts.find((a) => a.id === id);
    if (!account) throw new Error("Account not found.");
    if (isProtectedAccount(account) && !activeRoles(identity).includes("super_admin")) {
      throw new Error("Protected account status cannot be modified by this actor.");
    }
    const allowed = ALLOWED_TRANSITIONS[account.status] ?? [];
    if (!allowed.includes(status)) {
      throw new Error(`Invalid status transition from ${account.status} to ${status}.`);
    }
    account.status = status;
    return { ...account, roleIds: [...account.roleIds] };
  }
}
