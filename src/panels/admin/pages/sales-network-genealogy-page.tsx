"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarClock, ChevronRight, Eye, IdCard, Network, Search, UserRound, UsersRound } from "lucide-react";
import { formatDate } from "@/shared/lib/format-date";
import type { OrgMember } from "@/modules/organization/types";
import { useDevIdentity } from "@/shared/providers/identity-provider";
import { useAccessSnapshot } from "@/data/access-snapshot";
import { useMembers, useSeatVacancies } from "@/data/queries";
import { openVacancyStartByMember } from "@/modules/sales-network/vacancy";

import { buildGenealogyIndex, genealogyPath, searchGenealogy, type GenealogyIndex, type GenealogyTreeNode } from "@/modules/sales-network/genealogy";
import { aaDisplay, designationLabel, teamDisplayName } from "@/modules/sales-network/display";
import { PageContainer } from "@/shared/components/modern/page-container";
import { PageHeader } from "@/shared/components/modern/page-header";
import { AdminPage } from "@/shared/components/admin";
import { ErrorState } from "@/shared/components/modern/error-state";
import { StatusBadge } from "@/shared/components/modern/status-badge";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { SearchSelect } from "@/shared/components/modern/search-select";
import { TextLinesSkeleton } from "@/shared/components/modern/skeletons";
import { Card } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";
import { DesignationBadge } from "@/shared/components/business/designation-badge";
import { MemberAvatar, SalesNetworkTreeNodeTitle } from "../components/sales-network-tree-node";

/** People shown under a leader before "Show more": keeps a network of 14,000 sellers light. */
export const TREE_PAGE_SIZE = 50;

const DOT_CLASS: Record<OrgMember["designation"], string> = {
  SVD: "tw:bg-(--badge-violet)",
  SSM: "tw:bg-(--badge-blue)",
  SM: "tw:bg-(--badge-teal)",
  OST: "tw:bg-(--badge-orange)",
};

const number = new Intl.NumberFormat("en-PH");

const LEGEND: Array<{ key: keyof GenealogyIndex["totals"]; label: string; position: OrgMember["designation"] }> = [
  { key: "svd", label: "Directors", position: "SVD" },
  { key: "ssm", label: "Senior Managers", position: "SSM" },
  { key: "sm", label: "Managers", position: "SM" },
  { key: "ost", label: "Sellers", position: "OST" },
];

export function SalesNetworkGenealogyPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { identity } = useDevIdentity();
  const { modules: granted, genealogyIds: authorizedIds } = useAccessSnapshot();
  const membersQuery = useMembers();
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);
  const vacanciesQuery = useSeatVacancies();
  const vacantSince = useMemo(() => openVacancyStartByMember(vacanciesQuery.data ?? []), [vacanciesQuery.data]);

  // Built once per data change: tree, counts, path and search lookups.
  const index = useMemo(() => buildGenealogyIndex(members, authorizedIds), [members, authorizedIds]);
  const tree = index.roots;

  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // Until the person opens or closes something, every top leader is open (the members load after the first render).
  const [chosenKeys, setChosenKeys] = useState<string[] | null>(null);
  const expandedKeys = useMemo(() => chosenKeys ?? tree.map((node) => node.key), [chosenKeys, tree]);
  const setExpandedKeys = (change: string[] | ((previous: string[]) => string[])) => setChosenKeys(typeof change === "function" ? change(expandedKeys) : change);
  const [limits, setLimits] = useState<Record<string, number>>({});
  const scrollTo = useRef<string | null>(null);
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
      ...tree.map((root) => ({ value: root.key, label: `${root.member.displayName} — ${root.teamName ?? teamDisplayName(root.member, members)}` })),
    ],
    [tree, members],
  );

  const selectedNode = selectedKey ? index.byKey.get(selectedKey) ?? null : null;
  const selectedPath = useMemo(() => (selectedKey ? genealogyPath(index, selectedKey) : []), [index, selectedKey]);
  const searchResults = useMemo(() => searchGenealogy(index, search, 20), [index, search]);

  // After a search pick the row exists only once its branch has opened, so scroll on the next render.
  useEffect(() => {
    if (!scrollTo.current) return;
    document.getElementById(treeRowId(scrollTo.current))?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    scrollTo.current = null;
  }, [selectedKey, expandedKeys, limits]);

  const handleSelectSearch = (memberId: string) => {
    const path = genealogyPath(index, memberId);
    // Open every leader above the person, and load enough of each list for the person to be in it.
    setExpandedKeys((previous) => Array.from(new Set([...previous, ...path.slice(0, -1)])));
    setLimits((previous) => {
      const next = { ...previous };
      path.slice(1).forEach((key, position) => {
        const parent = index.byKey.get(path[position]);
        const at = parent ? parent.children.findIndex((child) => child.key === key) : -1;
        if (parent && at >= 0) next[parent.key] = Math.max(next[parent.key] ?? TREE_PAGE_SIZE, Math.ceil((at + 1) / TREE_PAGE_SIZE) * TREE_PAGE_SIZE);
      });
      return next;
    });
    scrollTo.current = memberId;
    setSelectedKey(memberId);
    setSearch("");
  };

  // Directors and Senior Managers open, so every Manager is listed; sellers are never opened in bulk.
  const showLeaders = () => setExpandedKeys(Array.from(index.byKey.values()).filter((node) => node.member.designation === "SVD" || node.member.designation === "SSM").map((node) => node.key));

  if (!granted.has("sales-network-genealogy")) {
    return (
      <PageContainer>
        <PageHeader title="Access Restricted" description="This account does not have access to Sales Network." />
      </PageContainer>
    );
  }

  return (
    <AdminPage
      embedded={embedded}
      anyOf={["sales-network-genealogy"]}
      title="Team Tree"
      crumbs={[{ label: "Sales Network" }, { label: "Team Tree" }]}
    >
      <Card className="tw:flex-col tw:lg:flex-row tw:lg:items-center">
        <div className="tw:relative tw:w-full tw:lg:max-w-sm">
          <Search aria-hidden="true" className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:left-2.5 tw:size-4 tw:-translate-y-1/2 tw:text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search members"
            placeholder="Search members"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="tw:h-11 tw:pl-8"
          />
          {searchResults.length > 0 ? (
            <ul className="tw:absolute tw:top-full tw:right-0 tw:left-0 tw:z-10 tw:mt-1 tw:max-h-72 tw:list-none tw:overflow-y-auto tw:rounded-lg tw:border tw:border-border tw:bg-popover tw:p-1 tw:shadow-md">
              {searchResults.map(({ node, path }) => (
                <li key={node.key}>
                  {/* Raw button exception: search-result option with listbox semantics. */}
                  <button
                    type="button"
                    className="tw:flex tw:min-h-11 tw:w-full tw:flex-col tw:justify-center tw:rounded-md tw:px-2 tw:py-1.5 tw:text-left tw:text-sm tw:hover:bg-accent tw:focus-visible:bg-accent tw:focus-visible:outline-none"
                    onClick={() => handleSelectSearch(node.key)}
                  >
                    <span className="tw:flex tw:flex-wrap tw:items-baseline tw:gap-x-2">
                      <span className="tw:text-xs tw:font-semibold tw:tabular-nums">{aaDisplay(node.member)}</span>
                      <span>{node.member.displayName}</span>
                      <span className="tw:text-muted-foreground">({designationLabel(node.member.designation)})</span>
                    </span>
                    {path.length > 1 ? (
                      <span className="tw:truncate tw:text-xs tw:text-muted-foreground">{path.slice(0, -1).map((key) => index.byKey.get(key)?.member.displayName).join(" › ")}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {isAdmin ? (
          <div className="tw:w-full tw:lg:w-72">
            <SearchSelect items={teamItems} value={teamRoot} onChange={(next) => setTeamRoot(next ?? "all")} aria-label="Team filter" />
          </div>
        ) : null}
        <div className="tw:flex tw:gap-2">
          <Button type="button" variant="indigo" className="tw:h-11" onClick={showLeaders}>
            Show Leaders
          </Button>
          <Button type="button" variant="outline" className="tw:h-11" onClick={() => setExpandedKeys([])}>
            Collapse All
          </Button>
        </div>
      </Card>
      <ul aria-label="People in your tree" className="tw:m-0 tw:flex tw:list-none tw:flex-wrap tw:items-center tw:gap-x-5 tw:gap-y-1.5 tw:p-0 tw:text-sm">
        {LEGEND.map(({ key, label, position }) => (
          <li key={key} className="tw:flex tw:items-center tw:gap-2">
            {/* A filled dot in the position color; the same color rings every avatar. */}
            <span aria-hidden="true" className={cn("tw:size-3.5 tw:rounded-full", DOT_CLASS[position])} />
            <span className="tw:font-semibold tw:tabular-nums">{number.format(index.totals[key])}</span>
            <span className="tw:text-muted-foreground">{label}</span>
          </li>
        ))}
      </ul>
      <div className="tw:grid tw:grid-cols-1 tw:gap-3 tw:lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="tw:min-w-0 tw:p-3">
          <section aria-label="Team tree" className="tw:min-w-0">
            {selectedNode && selectedPath.length > 1 ? (
              <nav aria-label="Where this person sits" className="tw:mb-3 tw:flex tw:flex-wrap tw:items-center tw:gap-1 tw:rounded-lg tw:bg-muted/50 tw:px-3 tw:py-2 tw:text-xs">
                <Network aria-hidden="true" className="tw:mr-1 tw:size-3.5 tw:text-muted-foreground" />
                {selectedPath.map((key, position) => (
                  <Fragment key={key}>
                    {position > 0 ? <ChevronRight aria-hidden="true" className="tw:size-3 tw:text-muted-foreground" /> : null}
                    {/* Raw button exception: path step that selects that leader in the tree. */}
                    <button
                      type="button"
                      className={cn("tw:rounded tw:px-1 tw:hover:underline tw:focus-visible:ring-2 tw:focus-visible:ring-ring tw:focus-visible:outline-none", key === selectedKey ? "tw:font-bold" : "tw:font-medium tw:text-primary")}
                      onClick={() => {
                        scrollTo.current = key;
                        setSelectedKey(key);
                      }}
                    >
                      {index.byKey.get(key)?.member.displayName}
                    </button>
                  </Fragment>
                ))}
              </nav>
            ) : null}
            {membersQuery.isLoading ? (
              <TextLinesSkeleton lines={6} className="tw:p-3" />
            ) : membersQuery.error && membersQuery.data === undefined ? (
              <ErrorState
                text={membersQuery.error instanceof Error ? membersQuery.error.message : undefined}
                onRetry={() => void membersQuery.refetch()}
              />
            ) : tree.length === 0 ? (
              <p className="tw:p-6 tw:text-center tw:text-muted-foreground">No members to show.</p>
            ) : (
              <GenealogyTree
                nodes={visibleTree}
                members={members}
                selectedKey={selectedKey}
                onSelect={setSelectedKey}
                vacantSince={vacantSince}
                expandedKeys={expandedKeys}
                limits={limits}
                onLimit={(key, count) => setLimits((previous) => ({ ...previous, [key]: count }))}
                onToggle={(key) => setExpandedKeys((previous) => (previous.includes(key) ? previous.filter((item) => item !== key) : [...previous, key]))}
              />
            )}
          </section>
        </Card>
        <aside aria-label="Member summary" className="tw:lg:sticky tw:lg:top-20 tw:lg:self-start">
          {selectedNode ? (
            <MemberSummary
              node={selectedNode}
              members={members}
              vacantSince={vacantSince.get(selectedNode.key) ?? null}
              reportsTo={selectedNode.restrictedParent ? null : index.byKey.get(index.parentOf.get(selectedNode.key) ?? "") ?? null}
              onSelect={(key) => {
                scrollTo.current = key;
                setSelectedKey(key);
              }}
            />
          ) : (
            <Card className="tw:items-center tw:gap-2 tw:p-8 tw:text-center tw:text-muted-foreground">
              <UsersRound aria-hidden="true" className="tw:size-8 tw:text-primary/40" />
              Select a member to view details.
            </Card>
          )}
        </aside>
      </div>
    </AdminPage>
  );
}

const SUMMARY_PEOPLE = 10;

/** One count tile in a position color. A position with nobody is muted. */
function StatTile({ label, value, tone }: { label: string; value: number; tone: "blue" | "teal" | "orange" | "brand" }) {
  const color = {
    blue: "tw:bg-(--badge-blue)/10 tw:text-(--badge-blue) tw:dark:text-[color-mix(in_oklch,var(--badge-blue),white_45%)]",
    teal: "tw:bg-(--badge-teal)/10 tw:text-(--badge-teal) tw:dark:text-[color-mix(in_oklch,var(--badge-teal),white_45%)]",
    orange: "tw:bg-(--badge-orange)/10 tw:text-(--badge-orange) tw:dark:text-[color-mix(in_oklch,var(--badge-orange),white_45%)]",
    brand: "tw:bg-primary/10 tw:text-primary",
  }[tone];
  return (
    <div className={cn("tw:flex tw:flex-col tw:gap-0.5 tw:rounded-lg tw:px-3 tw:py-2", value === 0 ? "tw:bg-muted/50 tw:text-muted-foreground" : color)}>
      <span className="tw:text-lg tw:leading-none tw:font-bold tw:tabular-nums">{number.format(value)}</span>
      <span className="tw:text-xs tw:font-medium">{label}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="tw:text-xs tw:font-semibold tw:tracking-wide tw:text-muted-foreground tw:uppercase">{children}</h3>;
}

/** A person as a clickable row: ringed avatar, name, position badge. Selecting it selects them in the tree. */
function PersonRow({ node, onSelect }: { node: GenealogyTreeNode; onSelect: (key: string) => void }) {
  return (
    // Raw button exception: summary row that selects that person in the tree.
    <button
      type="button"
      className="tw:flex tw:min-h-11 tw:w-full tw:items-center tw:gap-3 tw:rounded-lg tw:px-2 tw:py-1.5 tw:text-left tw:hover:bg-muted/70 tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:focus-visible:outline-none"
      onClick={() => onSelect(node.key)}
    >
      <MemberAvatar member={node.member} />
      <span className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-0.5">
        <span className="tw:truncate tw:text-sm tw:font-semibold">{node.member.displayName}</span>
        <span className="tw:text-xs tw:tabular-nums tw:text-muted-foreground">{aaDisplay(node.member)}</span>
      </span>
      <DesignationBadge designation={node.member.designation} />
    </button>
  );
}

function MemberSummary({ node, members, reportsTo, vacantSince, onSelect }: { node: GenealogyTreeNode; members: readonly OrgMember[]; reportsTo: GenealogyTreeNode | null; vacantSince: string | null; onSelect: (key: string) => void }) {
  const direct = node.children.slice(0, SUMMARY_PEOPLE);
  const moreDirect = Math.max(0, node.directCount - direct.length);
  const total = node.totalDescendantCount;
  return (
    <Card className="tw:gap-5">
      <h2 className="tw:sr-only">Member Summary</h2>
      <div className="tw:flex tw:items-center tw:gap-4">
        <MemberAvatar member={node.member} size="lg" />
        <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1.5">
          <span className="tw:text-lg tw:leading-tight tw:font-bold">{node.member.displayName}</span>
          <span className="tw:flex tw:flex-wrap tw:items-center tw:gap-1.5">
            <DesignationBadge designation={node.member.designation} full />
            <StatusBadge status={node.member.status} />
          </span>
        </div>
      </div>
      <dl className="tw:m-0 tw:flex tw:flex-col tw:gap-3">
        <div className="tw:flex tw:flex-col tw:gap-1">
          <dt className="tw:text-xs tw:font-semibold tw:tracking-wide tw:text-muted-foreground tw:uppercase">Accreditation Number</dt>
          <dd className="tw:m-0">
            <span className="tw:inline-flex tw:items-center tw:gap-1.5 tw:rounded-md tw:bg-primary/10 tw:px-2 tw:py-0.5 tw:font-semibold tw:tabular-nums tw:text-primary">
              <IdCard aria-hidden="true" className="tw:size-4" />
              {aaDisplay(node.member)}
            </span>
          </dd>
        </div>
        <div className="tw:flex tw:flex-col tw:gap-1">
          <dt className="tw:text-xs tw:font-semibold tw:tracking-wide tw:text-muted-foreground tw:uppercase">Team</dt>
          <dd className="tw:m-0 tw:inline-flex tw:items-center tw:gap-1.5 tw:font-medium">
            <UsersRound aria-hidden="true" className="tw:size-4 tw:text-muted-foreground" />
            {node.teamName ?? teamDisplayName(node.member, members)}
          </dd>
        </div>
      </dl>
      {vacantSince ? (
        <p role="note" className="tw:m-0 tw:flex tw:items-center tw:gap-2 tw:rounded-lg tw:bg-(--badge-amber)/10 tw:px-3 tw:py-2 tw:text-sm tw:font-medium tw:text-(--badge-amber) tw:dark:text-[color-mix(in_oklch,var(--badge-amber),white_45%)]">
          <CalendarClock aria-hidden="true" className="tw:size-4 tw:shrink-0" />
          Seat vacant since {formatDate(vacantSince)}
        </p>
      ) : null}
      {reportsTo ? (
        <section aria-label="Reports to" className="tw:flex tw:flex-col tw:gap-1.5 tw:border-t tw:border-border tw:pt-4">
          <SectionTitle>Reports to</SectionTitle>
          <PersonRow node={reportsTo} onSelect={onSelect} />
        </section>
      ) : null}
      <section aria-label={`Whole team (${number.format(total)})`} className="tw:flex tw:flex-col tw:gap-2 tw:border-t tw:border-border tw:pt-4">
        <SectionTitle>{`Whole team (${number.format(total)})`}</SectionTitle>
        {total > 0 ? (
          <div className="tw:grid tw:grid-cols-2 tw:gap-2">
            <StatTile label="Senior Managers" value={node.levels.ssm} tone="blue" />
            <StatTile label="Managers" value={node.levels.sm} tone="teal" />
            <StatTile label="Sellers" value={node.levels.ost} tone="orange" />
            <StatTile label="Total people" value={total} tone="brand" />
          </div>
        ) : (
          <span className="tw:text-sm tw:text-muted-foreground">No team members below</span>
        )}
      </section>
      <section aria-label={`Direct team (${number.format(node.directCount)})`} className="tw:flex tw:flex-col tw:gap-1 tw:border-t tw:border-border tw:pt-4">
        <SectionTitle>{`Direct team (${number.format(node.directCount)})`}</SectionTitle>
        {direct.length > 0 ? (
          <>
            {direct.map((child) => (
              <PersonRow key={child.key} node={child} onSelect={onSelect} />
            ))}
            {moreDirect > 0 ? <span className="tw:px-2 tw:pt-1 tw:text-xs tw:text-muted-foreground">+{number.format(moreDirect)} more</span> : null}
          </>
        ) : (
          <span className="tw:flex tw:items-center tw:gap-2 tw:text-sm tw:text-muted-foreground">
            <UserRound aria-hidden="true" className="tw:size-4" /> No direct team
          </span>
        )}
      </section>
      {node.restrictedParent ? <p className="tw:text-sm tw:text-muted-foreground tw:italic">Leaders above not shown to you</p> : null}
      <Link
        href={`/admin/sales-network/members/${node.member.aaNumber ?? node.member.id}`}
        className={cn(buttonVariants({ variant: "info" }), "tw:min-h-11 tw:w-full tw:sm:min-h-8")}
      >
        <Eye aria-hidden="true" /> View Profile
      </Link>
    </Card>
  );
}

const treeRowId = (key: string) => `tree-row-${key}`;

/**
 * Accessible expandable hierarchy for every screen size: each row has a
 * disclosure button (aria-expanded) and a selectable member button; children
 * nest in lists so the structure reads correctly to assistive technology.
 * Branches are drawn with a vertical line and an elbow into each child. A leader
 * lists its first 50 people, then "Show more", so a huge team never floods the page.
 */
export function GenealogyTree({
  nodes,
  members,
  selectedKey,
  onSelect,
  expandedKeys,
  onToggle,
  limits,
  onLimit,
  nested = false,
  detailed = false,
  vacantSince,
}: {
  nodes: GenealogyTreeNode[];
  members: readonly OrgMember[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  expandedKeys: string[];
  onToggle: (key: string) => void;
  /** How many children each leader lists; leaders not in the map list 50. The page owns this so search can open a branch. */
  limits?: Record<string, number>;
  onLimit?: (key: string, count: number) => void;
  nested?: boolean;
  /** Read-only rows with the full node content (AA number, status, counts) and no selection. */
  detailed?: boolean;
  /** Open seat vacancies by member id (start date), shown as a read-only indicator. */
  vacantSince?: ReadonlyMap<string, string>;
}) {
  const [ownLimits, setOwnLimits] = useState<Record<string, number>>({});
  const activeLimits = limits ?? ownLimits;
  const setLimit = onLimit ?? ((key: string, count: number) => setOwnLimits((previous) => ({ ...previous, [key]: count })));
  return <TreeLevel nodes={nodes} members={members} selectedKey={selectedKey} onSelect={onSelect} expandedKeys={expandedKeys} onToggle={onToggle} limits={activeLimits} onLimit={setLimit} nested={nested} detailed={detailed} vacantSince={vacantSince} />;
}

function TreeLevel({
  nodes,
  members,
  selectedKey,
  onSelect,
  expandedKeys,
  onToggle,
  limits,
  onLimit,
  nested,
  detailed,
  vacantSince,
  limitKey,
}: {
  nodes: GenealogyTreeNode[];
  members: readonly OrgMember[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  expandedKeys: string[];
  onToggle: (key: string) => void;
  limits: Record<string, number>;
  onLimit: (key: string, count: number) => void;
  nested: boolean;
  detailed: boolean;
  vacantSince?: ReadonlyMap<string, string>;
  /** Parent whose children these are (the key its "Show more" counter is stored under). */
  limitKey?: string;
}) {
  const limit = limitKey ? limits[limitKey] ?? TREE_PAGE_SIZE : nodes.length;
  const shown = nodes.slice(0, limit);
  const remaining = nodes.length - shown.length;
  return (
    <ul className={cn("tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-0.5 tw:p-0", nested && "tw:ml-[1.35rem] tw:animate-in tw:fade-in-0 tw:slide-in-from-top-1 tw:border-l-2 tw:border-primary/45 tw:pl-4 tw:duration-200 tw:ease-out")}>
      {shown.map((node) => {
        const expanded = expandedKeys.includes(node.key);
        const selected = selectedKey === node.key;
        return (
          <li key={node.key} className="tw:relative">
            {nested ? <span aria-hidden="true" className="tw:absolute tw:top-[1.55rem] tw:-left-4 tw:h-0.5 tw:w-4 tw:bg-primary/45" /> : null}
            <div id={treeRowId(node.key)} className={cn("tw:flex tw:items-start tw:gap-1 tw:rounded-lg tw:transition-colors tw:hover:bg-primary/10 tw:hover:ring-1 tw:hover:ring-primary/30", selected && "tw:bg-primary/10 tw:ring-1 tw:ring-primary/30")}>
              {/* Raw button exception: tree expand/collapse control with tree semantics. */}
              {node.children.length > 0 ? (
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-label={`${expanded ? "Collapse" : "Expand"} ${node.member.displayName}`}
                  className="tw:flex tw:size-11 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:focus-visible:outline-none tw:sm:size-11"
                  onClick={() => onToggle(node.key)}
                >
                  <ChevronRight aria-hidden="true" className={cn("tw:size-4 tw:transition-transform tw:motion-reduce:transition-none", expanded && "tw:rotate-90")} />
                </button>
              ) : (
                <span aria-hidden="true" className="tw:size-11 tw:shrink-0" />
              )}
              {detailed ? (
                <div className="tw:min-w-0 tw:flex-1 tw:px-1 tw:py-2">
                  <SalesNetworkTreeNodeTitle node={node} members={members} vacantSince={vacantSince?.get(node.key) ?? null} />
                </div>
              ) : (
                // Raw button exception: tree node select control with tree semantics.
                <button
                  type="button"
                  aria-pressed={selected}
                  className="tw:min-h-11 tw:min-w-0 tw:flex-1 tw:rounded-lg tw:px-1 tw:py-1.5 tw:text-left tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50 tw:focus-visible:outline-none"
                  // One click on the whole row shows the details and opens or closes the branch.
                  onClick={() => {
                    onSelect(node.key);
                    if (node.children.length > 0) onToggle(node.key);
                  }}
                >
                  <SalesNetworkTreeNodeTitle node={node} members={members} compact vacantSince={vacantSince?.get(node.key) ?? null} />
                </button>
              )}
            </div>
            {expanded && node.children.length > 0 ? (
              <TreeLevel nodes={node.children} members={members} selectedKey={selectedKey} onSelect={onSelect} expandedKeys={expandedKeys} onToggle={onToggle} limits={limits} onLimit={onLimit} nested detailed={detailed} vacantSince={vacantSince} limitKey={node.key} />
            ) : null}
          </li>
        );
      })}
      {remaining > 0 && limitKey ? (
        <li className="tw:flex tw:items-center tw:gap-3 tw:py-1 tw:pl-1">
          <Button type="button" variant="outline" size="sm" className="tw:h-9" onClick={() => onLimit(limitKey, limit + TREE_PAGE_SIZE)}>
            Show more
          </Button>
          <span className="tw:text-xs tw:tabular-nums tw:text-muted-foreground">{number.format(remaining)} left</span>
        </li>
      ) : null}
    </ul>
  );
}
