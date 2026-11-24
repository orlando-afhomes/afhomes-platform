import type { DevIdentity } from "@/modules/identity/types";
import type { OrgMember } from "@/modules/organization/types";
import type { Customer } from "@/modules/customers/types";


import { activeRoles } from "./active-roles";

export type MemberScope = { members: readonly OrgMember[] };
export type CustomerScope = { customers: readonly Pick<Customer, "id" | "ownerMemberId">[] };

/** Roles with unrestricted record scope in the mock repositories. */
export const BROAD_ROLES = new Set(["super_admin", "admin", "clerk"]);

/** Contracts, sales and payments are also visible to Finance without being in the sales team. */
export const BROAD_BUSINESS_ROLES = new Set(["super_admin", "admin", "finance", "clerk"]);

/** Admin, Super Admin, Finance and Clerk see every contract; sellers see contracts whose recorded team includes them. */
export function canSeeContractRecord(identity: DevIdentity, contract: { genealogy: ReadonlyArray<{ memberId: string }> }): boolean {
  if (!isActiveIdentity(identity)) return false;
  if (activeRoles(identity).some((role) => BROAD_BUSINESS_ROLES.has(role))) return true;
  return Boolean(identity.memberId) && contract.genealogy.some((entry) => entry.memberId === identity.memberId);
}

export function isActiveIdentity(identity: DevIdentity) {
  return identity.status === "active";
}

export function activeIdentityRoles(identity: DevIdentity): string[] {
  if (!isActiveIdentity(identity)) return [];
  return activeRoles(identity);
}

/** A Clerk can correct only the receipt they entered. Office administrators retain their override. */
export function canCorrectPayment(identity: DevIdentity, submittedBy: string): boolean {
  return isActiveIdentity(identity) && (identity.id === submittedBy ||
    activeIdentityRoles(identity).some((role) => role === "super_admin" || role === "admin"));
}

/** Everyone below `memberId`. One pass groups people by parent, then a walk collects them, so 14,000 sellers stay fast. */
export function getDescendantIds(memberId: string, members: readonly OrgMember[], visited = new Set<string>()): Set<string> {
  const childrenByParent = new Map<string, OrgMember[]>();
  for (const member of members) {
    if (!member.parentId) continue;
    const list = childrenByParent.get(member.parentId);
    if (list) list.push(member);
    else childrenByParent.set(member.parentId, [member]);
  }
  const result = new Set<string>();
  const pending = [memberId];
  while (pending.length > 0) {
    const current = pending.pop()!;
    for (const child of childrenByParent.get(current) ?? []) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      result.add(child.id);
      pending.push(child.id);
    }
  }
  return result;
}

export function getVisibleMemberIds(identity: DevIdentity, store: MemberScope): Set<string> {
  if (!isActiveIdentity(identity)) return new Set();
  const roles = activeIdentityRoles(identity);
  if (roles.some((role) => BROAD_ROLES.has(role))) {
    return new Set(store.members.map((member) => member.id));
  }
  const member = identity.memberId ? store.members.find((item) => item.id === identity.memberId) : null;
  if (!member) return new Set();
  const visible = new Set<string>([member.id]);
  // SVD/SSM/SM designations are automatically IST (doc 02 §2.1); no separate ist role.
  const hasManagerRole = roles.some((role) => role === "svd" || role === "ssm" || role === "sm");
  if (hasManagerRole) {
    for (const descendant of getDescendantIds(member.id, store.members)) {
      visible.add(descendant);
    }
  } else if (roles.includes("ost")) {
    visible.clear();
    visible.add(member.id);
  }
  return visible;
}

export function getVisibleCustomerIds(identity: DevIdentity, store: CustomerScope, visibleMembers: Set<string>): Set<string> {
  if (!isActiveIdentity(identity)) return new Set();
  const roles = activeIdentityRoles(identity);
  if (roles.some((role) => BROAD_ROLES.has(role))) {
    return new Set(store.customers.map((customer) => customer.id));
  }
  return new Set(
    store.customers
      .filter((customer) => customer.ownerMemberId !== null && visibleMembers.has(customer.ownerMemberId))
      .map((customer) => customer.id),
  );
}

export function canManageCustomers(identity: DevIdentity) {
  return isActiveIdentity(identity) && activeIdentityRoles(identity).some((role) =>
    BROAD_ROLES.has(role) || role === "svd" || role === "ssm" || role === "sm" || role === "ost",
  );
}

export type UplineSummary = {
  id: string;
  displayName: string;
  designation: string;
};

export function getUplineSummaries(identity: DevIdentity, store: MemberScope): UplineSummary[] {
  if (!isActiveIdentity(identity)) return [];
  const member = identity.memberId ? store.members.find((item) => item.id === identity.memberId) : null;
  if (!member) return [];
  const result: UplineSummary[] = [];
  const visited = new Set<string>();
  let current = member.parentId ? store.members.find((item) => item.id === member.parentId) : null;
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    result.push({ id: current.id, displayName: current.displayName, designation: current.designation });
    current = current.parentId ? store.members.find((item) => item.id === current!.parentId) : null;
  }
  return result;
}
