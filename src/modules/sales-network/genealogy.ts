import type { Designation, OrgMember } from "@/modules/organization/types";
import type { AccreditationRecord } from "@/modules/accreditation/types";
import { isAccreditationEligibleOnDate, manilaToday } from "@/modules/accreditation/dates";
import { getCurrentAccreditationRecord } from "@/modules/accreditation/eligibility";
import type { DevIdentity } from "@/modules/identity/types";
import { getVisibleMemberIds, getUplineSummaries } from "@/data/mock/scope";
import { getDescendantIds } from "@/data/mock/scope";
import type { MockStore } from "@/data/mock/seed";

export type SalesParentValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function isEligibleReceivingManager(
  parent: OrgMember,
  accreditations: readonly AccreditationRecord[] = [],
): boolean {
  const records = accreditations.filter((record) => record.memberId === parent.id);
  if (records.length > 0) {
    const current = getCurrentAccreditationRecord(records);
    if (!current) return false;
    if (current.adminStatus !== "active") return false;
    if (!current.expiryDate) return false;
    return isAccreditationEligibleOnDate(current.expiryDate, manilaToday());
  }
  return parent.status === "active" && parent.mockAccreditationEligible === true;
}

const VALID_EDGES: Record<Designation, Designation[]> = {
  SVD: [],
  SSM: ["SVD"],
  SM: ["SSM"],
  OST: ["SVD", "SSM", "SM"],
};

/**
 * Structural edge check only (no eligibility, no cycle): whether this parent
 * designation may sponsor the child designation. Used to stop transfers that
 * would leave existing downline members with an ineligible sponsor.
 */
export function isValidParentEdge(childDesignation: Designation, parentDesignation: Designation): boolean {
  return VALID_EDGES[childDesignation].includes(parentDesignation);
}

export function validateSalesParent(
  childDesignation: Designation,
  parent: OrgMember | null,
  members: readonly OrgMember[],
  childId?: string,
  accreditations: readonly AccreditationRecord[] = [],
): SalesParentValidationResult {
  if (childDesignation === "SVD") {
    if (parent !== null) {
      return { ok: false, code: "SVD_ROOT", message: "SVD is a root designation and cannot have a Sales Network parent." };
    }
    return { ok: true };
  }

  if (!parent) {
    return { ok: false, code: "PARENT_REQUIRED", message: "A parent is required for this designation." };
  }

  if (!VALID_EDGES[childDesignation].includes(parent.designation)) {
    return {
      ok: false,
      code: "INVALID_EDGE",
      message: `${parent.designation} cannot be the parent of ${childDesignation}.`,
    };
  }

  if (!isEligibleReceivingManager(parent, accreditations)) {
    return {
      ok: false,
      code: "INELIGIBLE_PARENT",
      message: "The receiving manager must be active with approved mock accreditation eligibility.",
    };
  }

  if (childId && (childId === parent.id || getDescendantIds(childId, members).has(parent.id))) {
    return { ok: false, code: "CYCLE", message: "This assignment would create a genealogy cycle." };
  }

  return { ok: true };
}

export function getDirectChildren(memberId: string, members: readonly OrgMember[]): OrgMember[] {
  return members.filter((member) => member.parentId === memberId);
}

/** Walk to the genealogy root (topmost ancestor), guarding against cycles. */
export function getRootMember(member: OrgMember, members: readonly OrgMember[]): OrgMember {
  const byId = new Map(members.map((item) => [item.id, item]));
  const visited = new Set<string>([member.id]);
  let current = member;
  while (current.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent || visited.has(parent.id)) break;
    visited.add(parent.id);
    current = parent;
  }
  return current;
}

/**
 * Resolve the human-readable Team Name through the root member. Returns null
 * when no root Team Name exists; callers show a neutral fallback instead of
 * the internal branch identifier.
 */
export function resolveTeamName(member: OrgMember, members: readonly OrgMember[]): string | null {
  const name = getRootMember(member, members).teamName?.trim();
  return name ? name : null;
}

export function getDirectDownlineCount(memberId: string, members: readonly OrgMember[]): number {
  return getDirectChildren(memberId, members).length;
}

export function getTotalDescendantCount(memberId: string, members: readonly OrgMember[]): number {
  return getDescendantIds(memberId, members).size;
}

export type GenealogyTreeNode = {
  key: string;
  member: OrgMember;
  children: GenealogyTreeNode[];
  restrictedParent: boolean;
  directCount: number;
  totalDescendantCount: number;
};

export function getAuthorizedGenealogyMemberIds(identity: DevIdentity, store: MockStore): Set<string> {
  const visible = getVisibleMemberIds(identity, store);
  const uplines = getUplineSummaries(identity, store);
  const ids = new Set(visible);
  for (const upline of uplines) ids.add(upline.id);
  return ids;
}

export function buildAuthorizedGenealogyTree(members: readonly OrgMember[], authorizedIds: Set<string>): GenealogyTreeNode[] {
  const authorizedMembers = members.filter((member) => authorizedIds.has(member.id));
  const byId = new Map(authorizedMembers.map((member) => [member.id, member]));
  const childrenByParent = new Map<string, OrgMember[]>();

  for (const member of authorizedMembers) {
    const parentId = member.parentId && authorizedIds.has(member.parentId) ? member.parentId : null;
    if (parentId) {
      const list = childrenByParent.get(parentId) ?? [];
      list.push(member);
      childrenByParent.set(parentId, list);
    }
  }

  const build = (member: OrgMember): GenealogyTreeNode => {
    const children = (childrenByParent.get(member.id) ?? [])
      .slice()
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .map(build);
    return {
      key: member.id,
      member,
      children,
      restrictedParent: Boolean(member.parentId && !authorizedIds.has(member.parentId)),
      directCount: children.length,
      totalDescendantCount: children.reduce((sum, child) => sum + 1 + child.totalDescendantCount, 0),
    };
  };

  return authorizedMembers
    .filter((member) => !member.parentId || !authorizedIds.has(member.parentId))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .map(build);
}