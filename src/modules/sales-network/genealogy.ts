import type { Designation, OrgMember } from "@/modules/organization/types";
import type { AccreditationRecord } from "@/modules/accreditation/types";
import { manilaToday } from "@/modules/accreditation/dates";
import { getCurrentAccreditationRecord, getSellerStanding } from "@/modules/accreditation/eligibility";
import type { DevIdentity } from "@/modules/identity/types";
import { getVisibleMemberIds, getUplineSummaries } from "@/modules/identity/record-scope";
import { getDescendantIds } from "@/modules/identity/record-scope";
import type { MemberScope } from "@/modules/identity/record-scope";

/** Plain position names for messages (display.ts imports this file, so it cannot be imported here). */
const POSITION_NAME: Record<Designation, string> = { SVD: "Sales Vice Director", SSM: "Senior Sales Manager", SM: "Sales Manager", OST: "Outsourced Seller (OST)" };

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
    // An expired accreditation does not make a receiving manager ineligible (doc 02 section 5.2, R3).
    return getSellerStanding(current, manilaToday()).state !== "blocked";
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
      return { ok: false, code: "SVD_ROOT", message: "A Sales Vice Director is at the top of a team and cannot have a parent." };
    }
    return { ok: true };
  }

  if (!parent) {
    return { ok: false, code: "PARENT_REQUIRED", message: "A parent is required for this position." };
  }

  if (!VALID_EDGES[childDesignation].includes(parent.designation)) {
    return {
      ok: false,
      code: "INVALID_EDGE",
      message: `${POSITION_NAME[parent.designation]} cannot be the parent of ${POSITION_NAME[childDesignation]}.`,
    };
  }

  if (!isEligibleReceivingManager(parent, accreditations)) {
    return {
      ok: false,
      code: "INELIGIBLE_PARENT",
      message: "The receiving manager must be active and eligible: accredited, and not suspended, resigned or terminated.",
    };
  }

  if (childId && (childId === parent.id || getDescendantIds(childId, members).has(parent.id))) {
    return { ok: false, code: "CYCLE", message: "This assignment would put a leader under their own team." };
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

/** People below a node, by position. */
export type LevelCounts = { ssm: number; sm: number; ost: number };

export type GenealogyTreeNode = {
  key: string;
  member: OrgMember;
  children: GenealogyTreeNode[];
  restrictedParent: boolean;
  directCount: number;
  totalDescendantCount: number;
  /** Team Name inherited from the root, looked up once for the whole network (null when none is set). */
  teamName: string | null;
  /** Everyone below this node, split by position. */
  levels: LevelCounts;
};

export function getAuthorizedGenealogyMemberIds(identity: DevIdentity, store: MemberScope): Set<string> {
  const visible = getVisibleMemberIds(identity, store);
  const uplines = getUplineSummaries(identity, store);
  const ids = new Set(visible);
  for (const upline of uplines) ids.add(upline.id);
  return ids;
}

export function buildAuthorizedGenealogyTree(members: readonly OrgMember[], authorizedIds: Set<string>): GenealogyTreeNode[] {
  const authorizedMembers = members.filter((member) => authorizedIds.has(member.id));
  const childrenByParent = new Map<string, OrgMember[]>();

  for (const member of authorizedMembers) {
    const parentId = member.parentId && authorizedIds.has(member.parentId) ? member.parentId : null;
    if (parentId) {
      const list = childrenByParent.get(parentId) ?? [];
      list.push(member);
      childrenByParent.set(parentId, list);
    }
  }

  // Team Name of each person's real root, found once per person and remembered (the root may sit above what this user may see).
  const byId = new Map(members.map((member) => [member.id, member]));
  const rootTeam = new Map<string, string | null>();
  const teamOf = (member: OrgMember): string | null => {
    const trail: OrgMember[] = [];
    const seen = new Set<string>();
    let current: OrgMember | undefined = member;
    let found: string | null | undefined;
    while (current && found === undefined) {
      if (rootTeam.has(current.id)) {
        found = rootTeam.get(current.id);
      } else if (seen.has(current.id)) {
        found = null;
      } else {
        seen.add(current.id);
        trail.push(current);
        const parent: OrgMember | undefined = current.parentId ? byId.get(current.parentId) : undefined;
        if (parent) {
          current = parent;
        } else {
          found = current.teamName?.trim() || null;
          current = undefined;
        }
      }
    }
    for (const item of trail) rootTeam.set(item.id, found ?? null);
    return found ?? null;
  };
  const build = (member: OrgMember): GenealogyTreeNode => {
    const children = (childrenByParent.get(member.id) ?? [])
      .slice()
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .map(build);
    const levels: LevelCounts = { ssm: 0, sm: 0, ost: 0 };
    for (const child of children) {
      if (child.member.designation === "SSM") levels.ssm += 1;
      else if (child.member.designation === "SM") levels.sm += 1;
      else if (child.member.designation === "OST") levels.ost += 1;
      levels.ssm += child.levels.ssm;
      levels.sm += child.levels.sm;
      levels.ost += child.levels.ost;
    }
    return {
      key: member.id,
      member,
      children,
      restrictedParent: Boolean(member.parentId && !authorizedIds.has(member.parentId)),
      directCount: children.length,
      totalDescendantCount: children.reduce((sum, child) => sum + 1 + child.totalDescendantCount, 0),
      teamName: teamOf(member),
      levels,
    };
  };

  return authorizedMembers
    .filter((member) => !member.parentId || !authorizedIds.has(member.parentId))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .map(build);
}

/** The tree plus lookups, built once, so rows, paths and search never walk the whole network again. */
export type GenealogyIndex = {
  roots: GenealogyTreeNode[];
  byKey: Map<string, GenealogyTreeNode>;
  parentOf: Map<string, string | null>;
  /** Everyone in the tree, by position. */
  totals: { svd: number; ssm: number; sm: number; ost: number };
};

export function buildGenealogyIndex(members: readonly OrgMember[], authorizedIds: Set<string>): GenealogyIndex {
  const roots = buildAuthorizedGenealogyTree(members, authorizedIds);
  const byKey = new Map<string, GenealogyTreeNode>();
  const parentOf = new Map<string, string | null>();
  const totals = { svd: 0, ssm: 0, sm: 0, ost: 0 };
  const stack: Array<{ node: GenealogyTreeNode; parent: string | null }> = roots.map((node) => ({ node, parent: null }));
  while (stack.length > 0) {
    const { node, parent } = stack.pop()!;
    byKey.set(node.key, node);
    parentOf.set(node.key, parent);
    const position = node.member.designation;
    if (position === "SVD") totals.svd += 1;
    else if (position === "SSM") totals.ssm += 1;
    else if (position === "SM") totals.sm += 1;
    else totals.ost += 1;
    for (const child of node.children) stack.push({ node: child, parent: node.key });
  }
  return { roots, byKey, parentOf, totals };
}

/** Keys from the top of the tree down to `key` (inclusive); empty when the person is not in the tree. */
export function genealogyPath(index: GenealogyIndex, key: string): string[] {
  const path: string[] = [];
  let current: string | null | undefined = key;
  while (current && index.byKey.has(current) && path.length < 50) {
    path.unshift(current);
    current = index.parentOf.get(current);
  }
  return path;
}

export type GenealogySearchResult = { node: GenealogyTreeNode; path: string[] };

/** AA number first (exact, then starts with, then contains), then name. A person never appears twice. */
export function searchGenealogy(index: GenealogyIndex, term: string, limit = 20): GenealogySearchResult[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return [];
  const exact: GenealogyTreeNode[] = [];
  const starts: GenealogyTreeNode[] = [];
  const contains: GenealogyTreeNode[] = [];
  const byName: GenealogyTreeNode[] = [];
  for (const node of index.byKey.values()) {
    const aa = (node.member.aaNumber ?? "").toLowerCase();
    if (aa && aa === needle) exact.push(node);
    else if (aa && aa.startsWith(needle)) starts.push(node);
    else if (aa && aa.includes(needle)) contains.push(node);
    else if (node.member.displayName.toLowerCase().includes(needle)) byName.push(node);
  }
  byName.sort((a, b) => a.member.displayName.localeCompare(b.member.displayName));
  return [...exact, ...starts, ...contains, ...byName].slice(0, limit).map((node) => ({ node, path: genealogyPath(index, node.key) }));
}

export type AttributionPerson = {
  id: string;
  displayName: string;
  aaNumber: string | null;
  designation: Designation;
};

export type AttributionChain = {
  recommender: AttributionPerson | null;
  referrer: AttributionPerson | null;
  sm: AttributionPerson | null;
  ssm: AttributionPerson | null;
  svd: AttributionPerson | null;
};

/** Upper bound on genealogy hops; protects against malformed or very deep data. */
const ATTRIBUTION_MAX_DEPTH = 32;

function toAttributionPerson(member: OrgMember): AttributionPerson {
  const aaNumber = member.aaNumber?.trim();
  return {
    id: member.id,
    displayName: member.displayName,
    aaNumber: aaNumber ? aaNumber : null,
    designation: member.designation,
  };
}

/** Direct attribution parties must be active OSTs; anything else resolves to null. */
function isActiveOst(member: OrgMember | undefined): member is OrgMember {
  return Boolean(member && member.designation === "OST" && member.status === "active");
}

/**
 * Derive the sales attribution chain from the genealogy only. The referrer (or,
 * failing that, the recommender) anchors the walk; the upline is then walked
 * upwards and the first SM, SSM, and SVD found are reported. Inactive or
 * suspended uplines are skipped rather than treated as chain breakers, so a
 * temporarily deactivated manager does not erase genuine ancestors above them;
 * no placeholder person is ever invented. Missing parents, cycles, and the
 * depth cap stop the walk.
 */
export function resolveAttributionChain(
  members: readonly OrgMember[],
  referrerId: string | null | undefined,
  recommenderId?: string | null,
): AttributionChain {
  const byId = new Map(members.map((member) => [member.id, member]));

  const referrerMember = referrerId ? byId.get(referrerId) : undefined;
  const referrer = isActiveOst(referrerMember) ? referrerMember : null;

  const recommenderMember = recommenderId ? byId.get(recommenderId) : undefined;
  const recommender = isActiveOst(recommenderMember) ? recommenderMember : null;

  const chain: AttributionChain = {
    recommender: recommender ? toAttributionPerson(recommender) : null,
    referrer: referrer ? toAttributionPerson(referrer) : null,
    sm: null,
    ssm: null,
    svd: null,
  };

  /**
   * Walks one OST's upline and returns the first active SM, SSM, and SVD.
   * Stops at the SVD root, a missing parent, a cycle, or the depth cap.
   */
  const walkUpline = (start: OrgMember): Pick<AttributionChain, "sm" | "ssm" | "svd"> => {
    const found: Pick<AttributionChain, "sm" | "ssm" | "svd"> = { sm: null, ssm: null, svd: null };
    const visited = new Set<string>([start.id]);
    let current: OrgMember | null = start;
    let depth = 0;

    while (current.parentId && depth < ATTRIBUTION_MAX_DEPTH) {
      const parentId = current.parentId;
      if (visited.has(parentId)) break;
      visited.add(parentId);

      const parent = byId.get(parentId);
      if (!parent) break;
      depth += 1;

      if (parent.status === "active") {
        if (parent.designation === "SM" && !found.sm) found.sm = toAttributionPerson(parent);
        else if (parent.designation === "SSM" && !found.ssm) found.ssm = toAttributionPerson(parent);
        else if (parent.designation === "SVD" && !found.svd) found.svd = toAttributionPerson(parent);
      }

      if (found.svd) break;
      current = parent;
    }

    return found;
  };

  // The referrer anchors the chain. An OST may report straight to the SVD (no SM
  // or SSM of their own), so any missing rung is filled from the recommender's
  // chain — both parties are the same genealogy team, so this shows the team's
  // actual managers rather than blanks.
  const anchor = referrer ?? recommender;
  if (!anchor) return chain;

  const fromReferrer = referrer ? walkUpline(referrer) : { sm: null, ssm: null, svd: null };
  const fromRecommender = recommender ? walkUpline(recommender) : { sm: null, ssm: null, svd: null };

  chain.sm = fromReferrer.sm ?? fromRecommender.sm;
  chain.ssm = fromReferrer.ssm ?? fromRecommender.ssm;
  chain.svd = fromReferrer.svd ?? fromRecommender.svd;

  return chain;
}

/**
 * IDs of every active OST that shares the anchor member's team in genealogy —
 * the same SVD root. Returns an empty set when the anchor is unknown or the
 * team cannot be resolved, so callers can fall back to the full roster.
 */
export function genealogyTeamOstIds(members: readonly OrgMember[], anchorId: string | null | undefined): Set<string> {
  const byId = new Map(members.map((member) => [member.id, member]));
  const anchor = anchorId ? byId.get(anchorId) : undefined;
  if (!anchor) return new Set();

  // Walk to the SVD root; the team is everything below it.
  let root: OrgMember = anchor;
  const visited = new Set<string>([anchor.id]);
  let depth = 0;
  while (root.parentId && depth < ATTRIBUTION_MAX_DEPTH) {
    const parent = byId.get(root.parentId);
    if (!parent || visited.has(parent.id)) break;
    visited.add(parent.id);
    root = parent;
    depth += 1;
  }

  if (root.designation !== "SVD") return new Set();

  const teamIds = new Set<string>([root.id]);
  let added = true;
  while (added) {
    added = false;
    for (const member of members) {
      if (member.parentId && teamIds.has(member.parentId) && !teamIds.has(member.id)) {
        teamIds.add(member.id);
        added = true;
      }
    }
  }

  const ostIds = new Set<string>();
  for (const id of teamIds) {
    const member = byId.get(id);
    if (isActiveOst(member)) ostIds.add(id);
  }
  return ostIds;
}