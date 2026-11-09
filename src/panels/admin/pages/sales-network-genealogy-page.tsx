"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import type { OrgMember } from "@/modules/organization/types";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMockStore } from "@/shared/providers/mock-store-provider";
import { useMembers } from "@/data/queries";
import { resolveEffectiveModules } from "@/data/mock/authorization";
import { getAuthorizedGenealogyMemberIds, buildAuthorizedGenealogyTree, type GenealogyTreeNode } from "@/modules/sales-network/genealogy";
import { aaDisplay, designationLabel, teamDisplayName } from "@/modules/sales-network/display";
import { PageContainer } from "@/shared/components/modern/page-container";
import { PageHeader } from "@/shared/components/modern/page-header";
import { Breadcrumbs } from "@/shared/components/modern/breadcrumbs";
import { DetailList, DetailRow } from "@/shared/components/modern/detail-list";
import { StatusBadge } from "@/shared/components/modern/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import { SalesNetworkTreeNodeTitle } from "../components/sales-network-tree-node";

export function SalesNetworkGenealogyPage() {
  const { identity } = useDevIdentity();
  const store = useMockStore();
  const granted = resolveEffectiveModules(store, identity);
  const membersQuery = useMembers();
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);

  const authorizedIds = useMemo(() => getAuthorizedGenealogyMemberIds(identity, store), [identity, store]);
  const tree = useMemo(() => buildAuthorizedGenealogyTree(members, authorizedIds), [members, authorizedIds]);

  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>(() => tree.map((node) => node.key));
  const [teamRoot, setTeamRoot] = useState<string>("all");

  const isAdmin = identity.roles.some((role) => role === "super_admin" || role === "admin");

  const visibleTree = useMemo(() => {
    if (teamRoot === "all" || !isAdmin) return tree;
    const root = tree.find((node) => node.key === teamRoot);
    return root ? [root] : tree;
  }, [tree, teamRoot, isAdmin]);

  const teamItems = useMemo(
    () => [
      { value: "all", label: "All authorized teams" },
      ...tree.map((root) => ({ value: root.key, label: `${root.member.displayName} — ${teamDisplayName(root.member, members)}` })),
    ],
    [tree, members],
  );

  const selectedNode = useMemo(() => {
    if (!selectedKey) return null;
    const find = (nodes: GenealogyTreeNode[]): GenealogyTreeNode | null => {
      for (const node of nodes) {
        if (node.key === selectedKey) return node;
        const found = find(node.children);
        if (found) return found;
      }
      return null;
    };
    return find(tree);
  }, [selectedKey, tree]);

  const searchResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return members
      .filter((member) => authorizedIds.has(member.id))
      .filter(
        (member) =>
          member.displayName.toLowerCase().includes(term) ||
          (member.aaNumber ?? "").toLowerCase().includes(term) ||
          member.designation.toLowerCase().includes(term),
      )
      .slice(0, 20);
  }, [search, members, authorizedIds]);

  const handleSelectSearch = (memberId: string) => {
    // Expand the ancestor path so the member is visible in the tree.
    const findPath = (nodes: GenealogyTreeNode[], target: string, current: string[] = []): string[] | null => {
      for (const node of nodes) {
        const next = [...current, node.key];
        if (node.key === target) return next;
        const found = findPath(node.children, target, next);
        if (found) return found;
      }
      return null;
    };
    const foundPath = findPath(tree, memberId);
    if (foundPath) setExpandedKeys((previous) => Array.from(new Set([...previous, ...foundPath])));
    setSelectedKey(memberId);
    setSearch("");
  };

  if (!granted.has("sales-network")) {
    return (
      <PageContainer>
        <PageHeader title="Access restricted" description="This account does not have access to Sales Network." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Sales Network", href: "/admin/sales-network" }, { label: "Genealogy" }]} />
      <PageHeader title="Sales Network Genealogy" description="Authorized hierarchy visualization." />
      <Card className="tw:mt-3 tw:flex-col tw:lg:flex-row tw:lg:items-start">
        <div className="tw:relative tw:w-full tw:lg:max-w-sm">
          <Search aria-hidden="true" className="tw:pointer-events-none tw:absolute tw:top-3 tw:left-2.5 tw:size-4 tw:text-muted-foreground tw:sm:top-2" />
          <Input
            type="search"
            aria-label="Search authorized members"
            placeholder="Search authorized members"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="tw:h-11 tw:pl-8 tw:sm:h-8"
          />
          {searchResults.length > 0 ? (
            <ul className="tw:absolute tw:top-full tw:right-0 tw:left-0 tw:z-10 tw:mt-1 tw:max-h-64 tw:list-none tw:overflow-y-auto tw:rounded-lg tw:border tw:border-border tw:bg-popover tw:p-1 tw:shadow-md">
              {searchResults.map((member) => (
                <li key={member.id}>
                  {/* Raw button exception: search-result option with listbox semantics. */}
                  <button
                    type="button"
                    className="tw:flex tw:min-h-11 tw:w-full tw:items-center tw:rounded-md tw:px-2 tw:text-left tw:text-sm tw:hover:bg-accent tw:focus-visible:bg-accent tw:focus-visible:outline-none tw:sm:min-h-8"
                    onClick={() => handleSelectSearch(member.id)}
                  >
                    {member.displayName} ({member.designation})
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {isAdmin ? (
          <Select items={teamItems} value={teamRoot} onValueChange={(next) => setTeamRoot(next ?? "all")}>
            <SelectTrigger aria-label="Team filter" className="tw:h-11 tw:w-full tw:sm:h-8 tw:lg:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teamItems.map((item) => (
                <SelectItem key={item.value} value={item.value} className="tw:min-h-11 tw:sm:min-h-8">
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <div className="tw:flex tw:gap-2">
          <Button type="button" variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setExpandedKeys(collectKeys(tree))}>
            Expand all
          </Button>
          <Button type="button" variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setExpandedKeys([])}>
            Collapse all
          </Button>
        </div>
      </Card>
      <div className="tw:mt-3 tw:grid tw:gap-3 tw:lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="tw:min-w-0 tw:p-3">
          <section aria-label="Genealogy tree" className="tw:min-w-0">
          {membersQuery.isLoading ? (
            <Skeleton className="tw:h-64 tw:w-full" />
          ) : tree.length === 0 ? (
            <p className="tw:p-6 tw:text-center tw:text-muted-foreground">No authorized genealogy members.</p>
          ) : (
            <GenealogyTree
              nodes={visibleTree}
              members={members}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
              expandedKeys={expandedKeys}
              onToggle={(key) => setExpandedKeys((previous) => (previous.includes(key) ? previous.filter((item) => item !== key) : [...previous, key]))}
            />
          )}
          </section>
        </Card>
        <aside aria-label="Member summary">
          {selectedNode ? <MemberSummary node={selectedNode} members={members} /> : (
            <Card className="tw:p-6 tw:text-center tw:text-muted-foreground">Select a member to view details.</Card>
          )}
        </aside>
      </div>
    </PageContainer>
  );
}

function MemberSummary({ node, members }: { node: GenealogyTreeNode; members: readonly OrgMember[] }) {
  const directNames = node.children.map((child) => child.member.displayName);
  const allNames = collectDescendantNames(node);
  const initials = node.member.displayName
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <Card className="tw:gap-4">
      <h2 className="tw:text-base tw:font-semibold">Member summary</h2>
      <div className="tw:flex tw:items-center tw:gap-3">
        <Avatar className="tw:size-12">
          {node.member.sellerProfile?.profilePhotoUrl ? <AvatarImage src={node.member.sellerProfile.profilePhotoUrl} alt="" /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1">
          <span className="tw:font-semibold">{node.member.displayName}</span>
          <span className="tw:flex tw:flex-wrap tw:items-center tw:gap-1.5 tw:text-muted-foreground">
            {designationLabel(node.member.designation)} · <StatusBadge status={node.member.status} />
          </span>
        </div>
      </div>
      <DetailList>
        <DetailRow term="AA Number">{aaDisplay(node.member)}</DetailRow>
        <DetailRow term="Team">{teamDisplayName(node.member, members)}</DetailRow>
      </DetailList>
      <NameChips title={`Direct downline (${node.directCount})`} names={directNames} empty="No direct downline" />
      <NameChips title={`Total downline (${node.totalDescendantCount})`} names={allNames} empty="No downline members" />
      {node.restrictedParent ? <p className="tw:text-sm tw:text-muted-foreground tw:italic">Restricted upline context</p> : null}
      <Link
        href={`/admin/sales-network/members/${node.member.aaNumber ?? node.member.id}`}
        className={cn(buttonVariants(), "tw:min-h-11 tw:w-full tw:sm:min-h-8")}
      >
        View profile
      </Link>
    </Card>
  );
}

function NameChips({ title, names, empty }: { title: string; names: string[]; empty: string }) {
  return (
    <section aria-label={title} className="tw:flex tw:flex-col tw:gap-1.5">
      <h3 className="tw:text-sm tw:font-medium">{title}</h3>
      {names.length > 0 ? (
        <div className="tw:flex tw:flex-wrap tw:gap-1">
          {names.map((name, index) => (
            <Badge key={`${name}-${index}`} variant="outline">
              {name}
            </Badge>
          ))}
        </div>
      ) : (
        <span className="tw:text-sm tw:text-muted-foreground">{empty}</span>
      )}
    </section>
  );
}

function collectKeys(nodes: GenealogyTreeNode[]): string[] {
  const keys: string[] = [];
  const visit = (items: GenealogyTreeNode[]) => {
    for (const item of items) {
      keys.push(item.key);
      visit(item.children);
    }
  };
  visit(nodes);
  return keys;
}

function collectDescendantNames(node: GenealogyTreeNode): string[] {
  const names: string[] = [];
  const visit = (items: GenealogyTreeNode[]) => {
    for (const item of items) {
      names.push(item.member.displayName);
      visit(item.children);
    }
  };
  visit(node.children);
  return names;
}

/**
 * Accessible expandable hierarchy for every screen size: each row has a
 * disclosure button (aria-expanded) and a selectable member button; children
 * nest in lists so the structure reads correctly to assistive technology.
 */
export function GenealogyTree({
  nodes,
  members,
  selectedKey,
  onSelect,
  expandedKeys,
  onToggle,
  nested = false,
  detailed = false,
}: {
  nodes: GenealogyTreeNode[];
  members: readonly OrgMember[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  expandedKeys: string[];
  onToggle: (key: string) => void;
  nested?: boolean;
  /** Read-only rows with the full node content (AA number, status, counts) and no selection. */
  detailed?: boolean;
}) {
  return (
    <ul className={cn("tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-0.5 tw:p-0", nested && "tw:ml-4 tw:animate-in tw:fade-in-0 tw:slide-in-from-top-1 tw:border-l tw:border-border tw:pl-2 tw:duration-200 tw:ease-out")}>
      {nodes.map((node) => {
        const expanded = expandedKeys.includes(node.key);
        const selected = selectedKey === node.key;
        return (
          <li key={node.key}>
            <div className={cn("tw:flex tw:items-start tw:gap-1 tw:rounded-md", selected && "tw:bg-secondary")}>
              {/* Raw button exception: tree expand/collapse control with tree semantics. */}
              {node.children.length > 0 ? (
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-label={`${expanded ? "Collapse" : "Expand"} ${node.member.displayName}`}
                  className="tw:flex tw:size-11 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-md tw:hover:bg-muted tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:focus-visible:outline-none tw:sm:size-8"
                  onClick={() => onToggle(node.key)}
                >
                  <ChevronRight aria-hidden="true" className={cn("tw:size-4 tw:transition-transform tw:motion-reduce:transition-none", expanded && "tw:rotate-90")} />
                </button>
              ) : (
                <span aria-hidden="true" className="tw:size-11 tw:shrink-0 tw:sm:size-8" />
              )}
              {detailed ? (
                <div className="tw:min-w-0 tw:flex-1 tw:px-1 tw:py-2">
                  <SalesNetworkTreeNodeTitle node={node} members={members} />
                </div>
              ) : (
                // Raw button exception: tree node select control with tree semantics.
                <button
                  type="button"
                  aria-pressed={selected}
                  className="tw:min-h-11 tw:min-w-0 tw:flex-1 tw:rounded-md tw:px-1 tw:py-1.5 tw:text-left tw:hover:bg-muted tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:focus-visible:outline-none tw:sm:min-h-8"
                  onClick={() => onSelect(node.key)}
                >
                  <SalesNetworkTreeNodeTitle node={node} members={members} compact />
                </button>
              )}
            </div>
            {expanded && node.children.length > 0 ? (
              <GenealogyTree nodes={node.children} members={members} selectedKey={selectedKey} onSelect={onSelect} expandedKeys={expandedKeys} onToggle={onToggle} nested detailed={detailed} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
