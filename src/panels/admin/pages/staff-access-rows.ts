import type { Account, AccountPolicies, AccountStatus, LinkedAccountSummary } from "@/modules/accounts/types";
import type { StaffActionPolicy, StaffMember } from "@/modules/organization/types";

/**
 * One row of the unified Staff & Access directory: an employee (with its
 * linked account, if any) or an account that no staff record links to.
 */
export type AccessRow =
  | {
      kind: "employee";
      id: string;
      staff: StaffMember;
      /** Full account record; only available to Accounts-module holders. */
      account: Account | null;
      /** Linked-account summary every Staff holder may see. */
      linkedAccount: LinkedAccountSummary | null;
    }
  | { kind: "account"; id: string; account: Account };

export type AccessChip = "all" | "employees" | "account" | "pending";

const ACCESS_CHIPS: readonly AccessChip[] = ["all", "employees", "account", "pending"];

/** Directory view from a URL value; anything unknown opens "all". */
export function parseAccessChip(value: string | null): AccessChip {
  return ACCESS_CHIPS.find((chip) => chip === value) ?? "all";
}

export type AccessFilters = {
  chip: AccessChip;
  search: string;
  departmentId: string;
  roleId: string;
  status: string;
};

/**
 * Joins staff to accounts. Account-only rows need the Accounts module and
 * loaded policies: before policies load, no account is known to be
 * unlinked, so linked accounts never flash as standalone rows.
 */
export function buildAccessRows(
  staff: StaffMember[],
  accounts: Account[],
  accountPolicies: AccountPolicies | undefined,
  staffPolicies: Record<string, StaffActionPolicy> | undefined,
  canManageAccounts: boolean,
): AccessRow[] {
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const rows: AccessRow[] = staff.map((member) => ({
    kind: "employee",
    id: member.id,
    staff: member,
    account: canManageAccounts && member.accountId ? (accountById.get(member.accountId) ?? null) : null,
    linkedAccount: staffPolicies?.[member.id]?.linkedAccount ?? null,
  }));
  if (canManageAccounts && accountPolicies) {
    for (const account of accounts) {
      const policy = accountPolicies.accounts[account.id];
      if (policy && !policy.linkedToStaff) rows.push({ kind: "account", id: account.id, account });
    }
  }
  return rows;
}

export function accessRowName(row: AccessRow): string {
  return row.kind === "employee" ? row.staff.displayName : row.account.displayName;
}

export function accessRowAccountStatus(row: AccessRow): AccountStatus | null {
  if (row.kind === "account") return row.account.status;
  return row.account?.status ?? row.linkedAccount?.status ?? null;
}

export function countPendingRows(rows: AccessRow[]): number {
  return rows.filter((row) => accessRowAccountStatus(row) === "pending").length;
}

export function filterAccessRows(rows: AccessRow[], filters: AccessFilters, sortAsc: boolean): AccessRow[] {
  const term = filters.search.trim().toLowerCase();
  return rows
    .filter((row) => {
      if (filters.chip === "employees" && row.kind !== "employee") return false;
      if (filters.chip === "account" && row.kind !== "account") return false;
      if (filters.chip === "pending" && accessRowAccountStatus(row) !== "pending") return false;
      if (row.kind === "employee") {
        const { staff } = row;
        if (filters.departmentId !== "all" && staff.departmentId !== filters.departmentId) return false;
        if (filters.roleId !== "all" && staff.departmentRoleId !== filters.roleId) return false;
        if (filters.status !== "all" && staff.status !== filters.status) return false;
        return (
          term === "" ||
          staff.displayName.toLowerCase().includes(term) ||
          staff.email.toLowerCase().includes(term) ||
          staff.position.toLowerCase().includes(term)
        );
      }
      // Account-only rows have no department role or employment status.
      if (filters.roleId !== "all" || filters.status !== "all") return false;
      if (filters.departmentId !== "all" && row.account.departmentId !== filters.departmentId) return false;
      return (
        term === "" ||
        row.account.displayName.toLowerCase().includes(term) ||
        row.account.email.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => (sortAsc ? 1 : -1) * accessRowName(a).localeCompare(accessRowName(b)));
}
