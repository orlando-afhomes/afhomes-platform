import type { DevIdentity } from "@/modules/identity/types";
import type { OrgMember } from "@/modules/organization/types";
import type { MockStore } from "./seed";
import { activeRoles } from "./dev-identities";

const BROAD_ROLES = new Set(["super_admin", "admin"]);

export function isActiveIdentity(identity: DevIdentity) {
  return identity.status === "active";
}

export function activeIdentityRoles(identity: DevIdentity): string[] {
  if (!isActiveIdentity(identity)) return [];
  return activeRoles(identity);
}

export function getDescendantIds(memberId: string, members: readonly OrgMember[], visited = new Set<string>()): Set<string> {
  const result = new Set<string>();
  const children = members.filter((member) => member.parentId === memberId);
  for (const child of children) {
    if (visited.has(child.id)) continue;
    visited.add(child.id);
    result.add(child.id);
    for (const descendant of getDescendantIds(child.id, members, visited)) {
      result.add(descendant);
    }
  }
  return result;
}

export function getVisibleMemberIds(identity: DevIdentity, store: MockStore): Set<string> {
  if (!isActiveIdentity(identity)) return new Set();
  const roles = activeIdentityRoles(identity);
  if (roles.some((role) => BROAD_ROLES.has(role))) {
    return new Set(store.members.map((member) => member.id));
  }
  const member = identity.memberId ? store.members.find((item) => item.id === identity.memberId) : null;
  if (!member) return new Set();
  const visible = new Set<string>([member.id]);
  const hasManagerRole = roles.some((role) => role === "svd" || role === "ssm" || role === "sm" || (role === "ist" && (member.designation === "SVD" || member.designation === "SSM" || member.designation === "SM")));
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

export function getVisibleCustomerIds(identity: DevIdentity, store: MockStore, visibleMembers: Set<string>): Set<string> {
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

export function getUplineSummaries(identity: DevIdentity, store: MockStore): UplineSummary[] {
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
