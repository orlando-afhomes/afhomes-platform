"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button, Input, Select, Skeleton, Space, Tag } from "antd";
import { getSystemRoleLabel } from "@/panels/admin/role-label";
import { StatusBadge } from "@/shared/components/layout/status-badge";
import { DirectoryTable } from "@/shared/components/layout/directory-table";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useAccounts, useCreateAccount, useUpdateAccount, useAssignAccountRole, useRevokeAccountRole, useUpdateAccountStatus } from "@/data/queries";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { isModuleGranted } from "@/modules/identity/permissions";
import { PageContainer } from "@/shared/components/layout/page-container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Breadcrumbs } from "@/shared/components/layout/breadcrumbs";
import type { Account, AccountStatus } from "@/modules/accounts/types";

const AccountDialogs = dynamic(
  () => import("./account-dialogs").then((m) => m.AccountDialogs),
  { loading: () => <Skeleton active />, ssr: true },
);

export function AccountManagementPage() {
  const { identity } = useDevIdentity();
  const accountsQuery = useAccounts();
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const assignMutation = useAssignAccountRole();
  const revokeMutation = useRevokeAccountRole();
  const statusMutation = useUpdateAccountStatus();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Account | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "create" | "role" | "status" | null>(null);

  if (!isModuleGranted(identity, "accounts")) {
    return (
      <PageContainer>
        <div className="account-page">
          <PageHeader title="Access restricted" description="This account does not have access to Account Management." />
        </div>
      </PageContainer>
    );
  }

  const accounts = accountsQuery.data ?? [];
  const filtered = accounts
    .filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      const q = search.toLowerCase();
      if (!q) return true;
      return a.displayName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const openCreate = () => { setSelected(null); setMode("create"); };
  const openView = (a: Account) => { setSelected(a); setMode("view"); };
  const openEdit = (a: Account) => { setSelected(a); setMode("edit"); };
  const openRole = (a: Account) => { setSelected(a); setMode("role"); };
  const openStatus = (a: Account) => { setSelected(a); setMode("status"); };
  const close = () => { setMode(null); setSelected(null); };

  const columns: ColumnsType<Account> = [
    {
      title: "Name",
      dataIndex: "displayName",
      key: "displayName",
      render: (name: string, record) => (
        <Button type="link" className="account-table__name-link" onClick={() => openView(record)}>{name}</Button>
      ),
    },
    { title: "Email", dataIndex: "email", key: "email" },
    {
      title: "Roles",
      key: "roles",
      render: (_, record) => (
        <Space size={4} wrap>
          {record.roleIds.map((r: string) => (
            <Tag key={r}>{getSystemRoleLabel(r)}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: AccountStatus) => (
        <StatusBadge status={status} />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => openEdit(record)}>Edit</Button>
          <Button type="link" size="small" onClick={() => openRole(record)}>Roles</Button>
          <Button type="link" size="small" onClick={() => openStatus(record)}>Status</Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <div className="account-page">
        <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Accounts and Permissions" }]} />
        <PageHeader title="Accounts and Permissions" description="Manage system accounts, roles, and account status." />

        <div className="account-page__toolbar">
          <div className="account-page__filters">
            <Input prefix={<SearchOutlined aria-hidden />} placeholder="Search accounts" value={search} onChange={(e) => setSearch(e.target.value)} className="account-page__search" />
            <Select virtual={false}
              aria-label="Status filter"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              options={[
                { value: "all", label: "All statuses" },
                { value: "pending", label: "Pending" },
                { value: "active", label: "Active" },
                { value: "suspended", label: "Suspended" },
                { value: "deactivated", label: "Deactivated" },
              ]}
            />
          </div>
          <Button type="primary" onClick={openCreate}>Create account</Button>
        </div>

        <DirectoryTable<Account>
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          loading={accountsQuery.isLoading}
          emptyText="No accounts found."
          onRowOpen={(record) => openView(record)}
        />

        <AccountDialogs
          mode={mode}
          selected={selected}
          close={close}
          onCreate={(data) => createMutation.mutateAsync(data)}
          onUpdate={(id, data) => updateMutation.mutateAsync({ id, ...data })}
          onAssign={(id, role) => assignMutation.mutateAsync({ id, role })}
          onRevoke={(id, role) => revokeMutation.mutateAsync({ id, role })}
          onUpdateStatus={(id, status) => statusMutation.mutateAsync({ id, status })}
        />
      </div>
    </PageContainer>
  );
}
