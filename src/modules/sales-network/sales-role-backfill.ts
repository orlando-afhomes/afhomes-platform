import type { Account } from "@/modules/accounts/types";
import type { DevRole } from "@/modules/identity/types";
import type { OrgMember } from "@/modules/organization/types";
import { salesRoleForDesignation } from "./sales-role";

export type SalesRoleBackfill = {
  accountId: string;
  role: DevRole;
  memberId: string;
  displayName: string;
};

/** Accounts linked to a sales member but missing that designation's active role. */
export function planSalesRoleBackfill(members: readonly OrgMember[], accounts: readonly Account[]): SalesRoleBackfill[] {
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const seen = new Set<string>();
  const plans: SalesRoleBackfill[] = [];
  for (const member of members) {
    if (!member.accountId) continue;
    const account = accountById.get(member.accountId);
    if (!account) continue;
    const role = salesRoleForDesignation(member.designation);
    const key = `${member.accountId}:${role}`;
    if (account.roleIds.includes(role) || seen.has(key)) continue;
    seen.add(key);
    plans.push({ accountId: member.accountId, role, memberId: member.id, displayName: member.displayName });
  }
  return plans;
}
