"use client";

import { useMemo, useState } from "react";
import { Avatar, Button, Card, Empty, Input, Select, Skeleton, Space, Tag, Tree } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import Link from "next/link";
import type { OrgMember } from "@/modules/organization/types";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMockStore } from "@/shared/providers/mock-store-provider";
import { useMembers } from "@/data/queries";
import { resolveEffectiveModules } from "@/data/mock/authorization";
import {
  getAuthorizedGenealogyMemberIds,
  buildAuthorizedGenealogyTree,
  type GenealogyTreeNode,
} from "@/modules/sales-network/genealogy";
import {
  aaDisplay,
  designationLabel,
  teamDisplayName,
} from "@/modules/sales-network/display";
import { PageContainer } from "@/shared/components/layout/page-container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Breadcrumbs } from "@/shared/components/layout/breadcrumbs";
import { StatusBadge } from "@/shared/components/layout/status-badge";
import { SalesNetworkTreeNodeTitle } from "../components/sales-network-tree-node";
import "../components/sales-network-tree-node.css";

export function SalesNetworkGenealogyPage() {
  const { identity } = useDevIdentity();
  const store = useMockStore();
  const granted = resolveEffectiveModules(store, identity);
  const membersQuery = useMembers();
  const members = membersQuery.data ?? [];

  const authorizedIds = useMemo(() => getAuthorizedGenealogyMemberIds(identity, store), [identity, store]);
  const tree = useMemo(() => buildAuthorizedGenealogyTree(members, authorizedIds), [members, authorizedIds]);

  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>(() => tree.map((node) => node.key));
  const [teamRoot, setTeamRoot] = useState<string>("all");

  const isAdmin = identity.roles.some((role) => role === "super_admin" || role === "admin");
  const roots = tree;

  const visibleTree = useMemo(() => {
    if (teamRoot === "all" || !isAdmin) return tree;
    const root = tree.find((node) => node.key === teamRoot);
    return root ? [root] : tree;
  }, [tree, teamRoot, isAdmin]);

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
      .filter((member) => member.displayName.toLowerCase().includes(term) || (member.aaNumber ?? "").toLowerCase().includes(term) || member.designation.toLowerCase().includes(term))
      .slice(0, 20);
  }, [search, members, authorizedIds]);

  const handleSelectSearch = (memberId: string) => {
    // Expand ancestor path.
    const path: string[] = [];
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
    if (foundPath) {
      setExpandedKeys((previous) => Array.from(new Set([...previous, ...foundPath])));
    }
    setSelectedKey(memberId);
    setSearch("");
  };

  const antdTreeData = useMemo(() => {
    const convert = (nodes: GenealogyTreeNode[]): any[] =>
      nodes.map((node) => ({
        key: node.key,
        title: <SalesNetworkTreeNodeTitle node={node} members={members} compact />,
        children: convert(node.children),
      }));
    return convert(visibleTree);
  }, [visibleTree, members]);

  if (!granted.has("sales-network")) {
    return (
      <div className="sales-genealogy-page">
        <PageContainer>
          <PageHeader title="Access restricted" description="This account does not have access to Sales Network." />
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="sales-genealogy-page">
      <PageContainer>
        <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Sales Network", href: "/admin/sales-network" }, { label: "Genealogy" }]} />
        <PageHeader title="Sales Network Genealogy" description="Authorized hierarchy visualization." />
        <div className="sales-genealogy-page__toolbar">
          <div className="sales-genealogy-page__search">
            <Input
              allowClear
              prefix={<SearchOutlined aria-hidden />}
              placeholder="Search authorized members"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {searchResults.length > 0 ? (
              <div className="sales-genealogy-page__search-results">
                {searchResults.map((member) => (
                  <button
                    type="button"
                    key={member.id}
                    className="sales-genealogy-page__search-result"
                    onClick={() => handleSelectSearch(member.id)}
                  >
                    {member.displayName} ({member.designation})
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {isAdmin ? (
            <Select
              aria-label="Team filter"
              value={teamRoot}
              onChange={setTeamRoot}
              className="sales-genealogy-page__team-filter"
              options={[{ value: "all", label: "All authorized teams" }, ...roots.map((root) => ({ value: root.key, label: `${root.member.displayName} — ${teamDisplayName(root.member, members)}` }))]}
            />
          ) : null}
          <Space>
            <Button onClick={() => setExpandedKeys(collectKeys(tree))}>Expand all</Button>
            <Button onClick={() => setExpandedKeys([])}>Collapse all</Button>
          </Space>
        </div>
        <div className="sales-genealogy-page__layout">
          <div className="sales-genealogy-page__tree">
            {membersQuery.isLoading ? (
              <Skeleton active paragraph={{ rows: 8 }} />
            ) : tree.length === 0 ? (
              <Empty description="No authorized genealogy members." />
            ) : (
              <>
                <div className="sales-genealogy-desktop">
                  <Tree
                    showLine
                    treeData={antdTreeData}
                    expandedKeys={expandedKeys}
                    selectedKeys={selectedKey ? [selectedKey] : []}
                    onExpand={(keys) => setExpandedKeys(keys as string[])}
                    onSelect={(keys) => setSelectedKey((keys[0] as string) ?? null)}
                    className="genealogy-tree"
                  />
                </div>
                <div className="sales-genealogy-mobile">
                  <GenealogyMobileList nodes={visibleTree} members={members} selectedKey={selectedKey} onSelect={setSelectedKey} expandedKeys={expandedKeys} onToggle={(key) => setExpandedKeys((previous) => previous.includes(key) ? previous.filter((item) => item !== key) : [...previous, key])} />
                </div>
              </>
            )}
          </div>
          <div className="sales-genealogy-page__summary">
            {selectedNode ? (
              (() => {
                const directNames = selectedNode.children.map((child) => child.member.displayName);
                const allNames = collectDescendantNames(selectedNode);
                const initials = selectedNode.member.displayName
                  .split(/\s+/)
                  .map((part) => part.charAt(0))
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <Card title="Member summary" className="genealogy-summary">
                    <div className="genealogy-summary__header">
                      <Avatar
                        size={48}
                        src={selectedNode.member.sellerProfile?.profilePhotoUrl || undefined}
                        className="genealogy-summary__avatar"
                        aria-hidden
                      >
                        {initials}
                      </Avatar>
                      <div className="genealogy-summary__identity">
                        <span className="genealogy-summary__name">{selectedNode.member.displayName}</span>
                        <span className="genealogy-summary__sub">
                          {designationLabel(selectedNode.member.designation)} · <StatusBadge status={selectedNode.member.status} />
                        </span>
                      </div>
                    </div>
                    <dl className="genealogy-summary__details">
                      <div className="genealogy-summary__row">
                        <dt>AA Number</dt>
                        <dd>{aaDisplay(selectedNode.member)}</dd>
                      </div>
                      <div className="genealogy-summary__row">
                        <dt>Team</dt>
                        <dd>{teamDisplayName(selectedNode.member, members)}</dd>
                      </div>
                    </dl>
                    <div className="genealogy-summary__section">
                      <span className="genealogy-summary__section-title">Direct downline ({selectedNode.directCount})</span>
                      {directNames.length > 0 ? (
                        <div className="genealogy-summary__chips">
                          {directNames.map((name) => (
                            <Tag key={name}>{name}</Tag>
                          ))}
                        </div>
                      ) : (
                        <span className="genealogy-summary__empty">No direct downline</span>
                      )}
                    </div>
                    <div className="genealogy-summary__section">
                      <span className="genealogy-summary__section-title">Total downline ({selectedNode.totalDescendantCount})</span>
                      {allNames.length > 0 ? (
                        <div className="genealogy-summary__chips">
                          {allNames.map((name) => (
                            <Tag key={name}>{name}</Tag>
                          ))}
                        </div>
                      ) : (
                        <span className="genealogy-summary__empty">No downline members</span>
                      )}
                    </div>
                    {selectedNode.restrictedParent ? <p className="genealogy-summary__restricted">Restricted upline context</p> : null}
                    <Link href={`/admin/sales-network/members/${selectedNode.member.aaNumber ?? selectedNode.member.id}`} className="genealogy-summary__action">
                      <Button type="primary" block>View profile</Button>
                    </Link>
                  </Card>
                );
              })()
            ) : (
              <Card>
                <Empty description="Select a member to view details." />
              </Card>
            )}
          </div>
        </div>
      </PageContainer>
    </div>
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

function GenealogyMobileList({
  nodes,
  members,
  selectedKey,
  onSelect,
  expandedKeys,
  onToggle,
}: {
  nodes: GenealogyTreeNode[];
  members: readonly OrgMember[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  expandedKeys: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <ul className="genealogy-mobile__list">
      {nodes.map((node) => {
        const expanded = expandedKeys.includes(node.key);
        return (
          <li key={node.key} className="genealogy-mobile__item">
            <div className={`genealogy-mobile__row ${selectedKey === node.key ? "genealogy-mobile__row--selected" : ""}`}>
              {node.children.length > 0 ? (
                <button type="button" className="genealogy-mobile__expand" onClick={() => onToggle(node.key)} aria-expanded={expanded}>
                  {expanded ? "−" : "+"}
                </button>
              ) : (
                <span className="genealogy-mobile__spacer" />
              )}
              <button type="button" className="genealogy-mobile__node" onClick={() => onSelect(node.key)}>
                <span className="genealogy-mobile__name">{node.member.displayName}</span>
                <span className="genealogy-mobile__aa">{node.member.aaNumber ?? "Pending AA Issuance"}</span>
                <span className="genealogy-mobile__designation">{node.member.designation}</span>
                <span className="genealogy-mobile__team">{teamDisplayName(node.member, members)}</span>
                <StatusBadge status={node.member.status} className="genealogy-mobile__status" />
              </button>
            </div>
            {expanded && node.children.length > 0 ? (
              <div className="genealogy-mobile__children">
                <GenealogyMobileList nodes={node.children} members={members} selectedKey={selectedKey} onSelect={onSelect} expandedKeys={expandedKeys} onToggle={onToggle} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}