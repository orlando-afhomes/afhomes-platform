"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Button, Input, Select, Skeleton, Space, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OrgMember } from "@/modules/organization/types";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMockStore } from "@/shared/providers/mock-store-provider";
import { useAccreditations, useChangeSalesNetworkMemberStatus, useMembers } from "@/data/queries";
import {
  aaDisplay,
  designationLabel,
  DESIGNATION_COLORS,
  resolveAccreditationDisplay,
  teamDisplayName,
} from "@/modules/sales-network/display";
import { hasOperationPermission } from "@/modules/identity/permissions";
import { confirmAndRun } from "@/shared/utils/feedback";
import { resolveEffectiveModules } from "@/data/mock/authorization";
import { PageContainer } from "@/shared/components/layout/page-container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Breadcrumbs } from "@/shared/components/layout/breadcrumbs";
import { SortToggleButton } from "@/shared/components/layout/sort-toggle-button";
import { DirectoryTable } from "@/shared/components/layout/directory-table";
import { StatusBadge } from "@/shared/components/layout/status-badge";
import { SalesNetworkRowActions } from "../components/sales-network-row-actions";
import { AccreditationStatusAction } from "../components/accreditation-status-action";
import "../components/accreditation-status-action.css";
import { AccreditedSellerDialog } from "./sales-network-accredited-seller-dialog";
import "./sales-network-accredited-seller-dialog.css";

const SalesNetworkMemberDialogs = dynamic(() => import("./sales-network-member-dialogs").then((mod) => mod.SalesNetworkMemberDialogs), {
  loading: () => <Skeleton active />,
});

function teamLabelFor(member: OrgMember, members: readonly OrgMember[]): string {
  return teamDisplayName(member, members);
}

export function SalesNetworkMembersPage() {
  const router = useRouter();
  const { identity } = useDevIdentity();
  const store = useMockStore();
  const granted = resolveEffectiveModules(store, identity);
  const membersQuery = useMembers();
  const accreditationsQuery = useAccreditations();

  const [search, setSearch] = useState("");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [accreditationFilter, setAccreditationFilter] = useState("all");
  const [sortAsc, setSortAsc] = useState(true);

  const [accreditedMode, setAccreditedMode] = useState<"IST" | "OST" | null>(null);
  const [editMember, setEditMember] = useState<any>(null);
  const [transferMember, setTransferMember] = useState<any>(null);
  const changeStatus = useChangeSalesNetworkMemberStatus();

  const handleToggleStatus = async (record: any) => {
    const reactivate = record.status !== "active";
    await confirmAndRun({
      title: reactivate ? `Reactivate ${record.displayName}?` : `Deactivate ${record.displayName}?`,
      text: reactivate
        ? "The member will regain active access."
        : "The member will lose active access and move to Inactive.",
      confirmText: reactivate ? "Reactivate" : "Deactivate",
      danger: !reactivate,
      action: () => changeStatus.mutateAsync({ id: record.id, status: reactivate ? "active" : "inactive" }),
      successTitle: reactivate ? "Member reactivated." : "Member deactivated.",
      successText: `${record.displayName} is now ${reactivate ? "active" : "inactive"}.`,
      errorTitle: "Status update failed.",
    });
  };

  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);
  const visibleMembers = members;

  const canManage = hasOperationPermission(identity, "sales-network.manage");
  const canTransfer = hasOperationPermission(identity, "sales-network.transfer");
  const canChangeStatus = hasOperationPermission(identity, "sales-network.status");
  const canEditAccreditation = identity.status === "active" && identity.roles.includes("super_admin");
  const isAdmin = identity.roles.some((role) => role === "super_admin" || role === "admin");

  const accreditationRecordsByMember = useMemo(() => {
    const map = new Map<string, AccreditationRecord[]>();
    const records = accreditationsQuery.data ?? [];
    for (const member of members) {
      map.set(member.id, records.filter((record) => record.memberId === member.id));
    }
    return map;
  }, [accreditationsQuery.data, members]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return visibleMembers
      .filter((member) => {
        if (designationFilter !== "all" && member.designation !== designationFilter) return false;
        if (statusFilter !== "all" && member.status !== statusFilter) return false;
        if (teamFilter !== "all" && teamLabelFor(member, members) !== teamFilter) return false;
        if (accreditationFilter !== "all") {
          const state = resolveAccreditationDisplay(accreditationRecordsByMember.get(member.id));
          if (accreditationFilter === "none" && state.kind !== "none") return false;
          if (accreditationFilter === "pending" && !(state.kind === "action" && state.value === "pending")) return false;
          if (accreditationFilter === "accredited" && !(state.kind === "action" && state.value === "active")) return false;
          if (accreditationFilter === "expired" && !(state.kind === "static" && state.label === "Expired")) return false;
        }
        return (
          term === "" ||
          member.displayName.toLowerCase().includes(term) ||
          (member.aaNumber ?? "").toLowerCase().includes(term)
        );
      })
      .sort((a, b) => (sortAsc ? a.displayName.localeCompare(b.displayName) : b.displayName.localeCompare(a.displayName)));
  }, [visibleMembers, search, designationFilter, statusFilter, teamFilter, accreditationFilter, accreditationRecordsByMember, sortAsc, members]);

  const teams = useMemo(() => Array.from(new Set(members.map((member) => teamLabelFor(member, members)))).sort(), [members]);

  if (!granted.has("sales-network")) {
    return (
      <div className="sales-members-page">
        <PageContainer>
          <PageHeader title="Access restricted" description="This account does not have access to Sales Network." />
        </PageContainer>
      </div>
    );
  }

  const columns: ColumnsType<any> = [
    {
      title: "AA Number",
      dataIndex: "aaNumber",
      key: "aaNumber",
      render: (_: string | null, record: any) => (
        <span className="sales-members-table__aa">{aaDisplay(record)}</span>
      ),
    },
    {
      title: "Member",
      dataIndex: "displayName",
      key: "displayName",
      render: (name: string, record: any) => (
        <Link className="sales-members-table__name-link" href={`/admin/sales-network/members/${record.aaNumber ?? record.id}`}>{name}</Link>
      ),
    },
    {
      title: "Position",
      dataIndex: "designation",
      key: "designation",
      render: (designation: string) => <Tag color={DESIGNATION_COLORS[designation]} className="sales-members-table__designation">{designationLabel(designation)}</Tag>,
    },
    {
      title: "Team",
      dataIndex: "teamName",
      key: "team",
      render: (_: unknown, record: any) => <span className="sales-members-table__team">{teamLabelFor(record, members)}</span>,
    },
    {
      title: "Parent",
      key: "parent",
      render: (_, record: any) => {
        const parent = members.find((member) => member.id === record.parentId);
        if (!parent) return <span className="sales-members-table__parent">—</span>;
        const firstName = parent.displayName.trim().split(/\s+/)[0] ?? parent.displayName;
        return <span className="sales-members-table__parent">{`${firstName} (${designationLabel(parent.designation)})`}</span>;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      title: "Accreditation Status",
      key: "accreditationStatus",
      render: (_, record: any) => (
        <AccreditationStatusAction records={accreditationRecordsByMember.get(record.id)} aaNumber={record.aaNumber ?? null} canEdit={canEditAccreditation} memberId={record.id} memberName={record.displayName} />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record: any) => (
        <SalesNetworkRowActions
          itemName={record.displayName}
          onEdit={() => {
            setEditMember(record);
          }}
          onTransfer={() => setTransferMember(record)}
          transferLabel={record.designation === "OST" ? "Transfer to IST" : "Transfer to OST"}
          onChangeStatus={() => void handleToggleStatus(record)}
          canEdit={canManage}
          canTransfer={canTransfer && record.designation !== "SVD"}
          canChangeStatus={canChangeStatus}
          canReactivate={isAdmin}
          status={record.status}
        />
      ),
    },
  ];

  return (
    <div className="sales-members-page">
      <PageContainer>
        <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Sales Network", href: "/admin/sales-network" }, { label: "Members" }]} />
        <PageHeader
          title="Sales Network Members"
          description="Authorized member directory, scoped by genealogy permissions."
          actions={
            canManage ? (
              <Space wrap>
                <Button type="primary" onClick={() => setAccreditedMode("IST")}>Add IST</Button>
                <Button onClick={() => setAccreditedMode("OST")}>Add OST</Button>
              </Space>
            ) : null
          }
        />
        <div className="sales-members-page__toolbar">
          <div className="sales-members-page__search">
            <Input
              allowClear
              prefix={<SearchOutlined aria-hidden />}
              placeholder="Search members"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="sales-members-page__filters">
            <Select
              aria-label="Designation filter"
              value={designationFilter}
              onChange={setDesignationFilter}
              className="sales-members-page__filter"
              options={[
                { value: "all", label: "All designations" },
                { value: "SVD", label: "SVD" },
                { value: "SSM", label: "SSM" },
                { value: "SM", label: "SM" },
                { value: "OST", label: "OST" },
              ]}
            />
            <Select
              aria-label="Status filter"
              value={statusFilter}
              onChange={setStatusFilter}
              className="sales-members-page__filter"
              options={[
                { value: "all", label: "All statuses" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "suspended", label: "Suspended" },
              ]}
            />
            <Select
              aria-label="Team filter"
              value={teamFilter}
              onChange={setTeamFilter}
              className="sales-members-page__filter"
              options={[{ value: "all", label: "All teams" }, ...teams.map((team) => ({ value: team, label: team }))]}
            />
            <Select
              aria-label="Accreditation status filter"
              value={accreditationFilter}
              onChange={setAccreditationFilter}
              className="sales-members-page__filter"
              options={[
                { value: "all", label: "All accreditation" },
                { value: "pending", label: "Pending" },
                { value: "accredited", label: "Accredited" },
                { value: "expired", label: "Expired" },
                { value: "none", label: "No record" },
              ]}
            />
            <SortToggleButton ascending={sortAsc} onToggle={() => setSortAsc((value) => !value)} />
          </div>
        </div>
        <div className="sales-members-page__table">
          {membersQuery.isLoading ? (
            <div className="sales-members-page__loading">
              <Skeleton active paragraph={{ rows: 6 }} />
            </div>
          ) : (
            <DirectoryTable<any>
              rowKey="id"
              columns={columns}
              dataSource={filtered}
              emptyText="No members found."
              pageSize={10}
              onRowOpen={(record: any) => router.push(`/admin/sales-network/members/${record.aaNumber ?? record.id}`)}
            />
          )}
        </div>
      </PageContainer>
      <SalesNetworkMemberDialogs
        editMember={editMember}
        transferMember={transferMember}
        onCloseEdit={() => setEditMember(null)}
        onCloseTransfer={() => setTransferMember(null)}
      />
      {accreditedMode ? (
        <AccreditedSellerDialog
          mode={accreditedMode}
          open
          onClose={() => setAccreditedMode(null)}
          onCreated={(memberKey) => {
            setAccreditedMode(null);
            router.push(`/admin/sales-network/members/${memberKey}`);
          }}
        />
      ) : null}
    </div>
  );
}
