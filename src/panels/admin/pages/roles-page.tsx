"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Button, Empty, Input, Select, Skeleton, Space, Table, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { MODULE_CATALOG } from "@/modules/identity/permissions";
import type { DepartmentRole } from "@/modules/organization/types";
import { useDeleteDepartmentRole, useDepartments, useDepartmentRoles, useEffectiveModuleIds, useStaff } from "@/data/queries";
import { cleanTitleInput, formatStatusLabel, isValidName } from "@/shared/utils/input-sanitizers";
import { PageContainer } from "@/shared/components/layout/page-container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Breadcrumbs } from "@/shared/components/layout/breadcrumbs";
import { RowActionsMenu } from "@/shared/components/layout/row-actions-menu";
import { SortToggleButton } from "@/shared/components/layout/sort-toggle-button";

const RoleDialogs = dynamic(() => import("./role-dialogs").then((mod) => mod.RoleDialogs), {
  loading: () => <Skeleton active />,
});

export function RolesPage() {
  const granted = useEffectiveModuleIds();
  const rolesQuery = useDepartmentRoles();
  const departmentsQuery = useDepartments();
  const staffQuery = useStaff();
  const deleteRole = useDeleteDepartmentRole();

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortAsc, setSortAsc] = useState(true);
  const [roleDialog, setRoleDialog] = useState(false);
  const [editRole, setEditRole] = useState<DepartmentRole | null>(null);
  const [viewRole, setViewRole] = useState<DepartmentRole | null>(null);

  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const departments = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data]);
  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);

  if (!granted.has("roles")) {
    return (
      <div className="roles-page">
        <PageContainer>
          <PageHeader title="Access restricted" description="This account does not have access to Roles." />
        </PageContainer>
      </div>
    );
  }

  const departmentName = (departmentId: string) =>
    departments.find((item) => item.id === departmentId)?.name ?? "Unknown department";
  const assignedCount = (roleId: string) => staff.filter((member) => member.departmentRoleId === roleId).length;

  const filtered = roles
    .filter((role) => {
      if (departmentFilter !== "all" && role.departmentId !== departmentFilter) return false;
      if (statusFilter !== "all" && role.status !== statusFilter) return false;
      const term = search.trim().toLowerCase();
      return term === "" || role.name.toLowerCase().includes(term);
    })
    .sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));

  const columns: ColumnsType<DepartmentRole> = [
    {
      title: "Role Name",
      dataIndex: "name",
      key: "name",
      render: (name: string) => <span className="roles-table__name">{name}</span>,
    },
    {
      title: "Department",
      key: "department",
      render: (_, record) => departmentName(record.departmentId),
    },
    {
      title: "Authorized Modules",
      key: "modules",
      render: (_, record) => {
        const [first, ...rest] = record.moduleIds;
        if (!first) return "—";
        return (
          <Space size={[4, 4]} wrap>
            <Tag>{moduleLabel(first)}</Tag>
            {rest.length > 0 ? (
              <Tag className="roles-table__more-modules" title={rest.map(moduleLabel).join(", ")}>
                +{rest.length}
              </Tag>
            ) : null}
          </Space>
        );
      },
    },
    {
      title: "Assigned Staff",
      key: "assigned",
      render: (_, record) => assignedCount(record.id),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: DepartmentRole["status"]) => <Tag color={status === "active" ? "green" : undefined}>{formatStatusLabel(status)}</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <RowActionsMenu
          itemName={record.name}
          onView={() => setViewRole(record)}
          onEdit={() => {
            setEditRole(record);
            setRoleDialog(true);
          }}
          onDelete={() => deleteRole.mutateAsync(record.id)}
          deleteTitle={`Delete ${record.name}?`}
          deleteDescription="Assigned roles cannot be deleted. Reassign or remove all staff from this role first. This action cannot be undone."
        />
      ),
    },
  ];

  return (
    <div className="roles-page">
      <PageContainer>
        <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Organization" }, { label: "Roles" }]} />
        <PageHeader title="Roles" description="Manage department roles and the modules they may access." />
        <div className="roles-page__actions">
          <Button
            type="primary"
            onClick={() => {
              setEditRole(null);
              setRoleDialog(true);
            }}
          >
            Create role
          </Button>
        </div>
        <div className="roles-page__toolbar">
          <div className="roles-page__search">
            <Input
              allowClear
              prefix={<SearchOutlined aria-hidden />}
              placeholder="Search roles"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="roles-page__filters">
            <Select
              aria-label="Role department filter"
              value={departmentFilter}
              onChange={setDepartmentFilter}
              className="roles-page__filter"
              options={[
                { value: "all", label: "All departments" },
                ...departments.map((dept) => ({ value: dept.id, label: dept.name })),
              ]}
            />
            <Select
              aria-label="Role status filter"
              value={statusFilter}
              onChange={setStatusFilter}
              className="roles-page__filter"
              options={[
                { value: "all", label: "All statuses" },
                { value: "active", label: "Active" },
                { value: "deactivated", label: "Deactivated" },
              ]}
            />
            <SortToggleButton ascending={sortAsc} onToggle={() => setSortAsc((value) => !value)} />
          </div>
        </div>
        <div className="roles-page__table">
          {rolesQuery.isLoading || departmentsQuery.isLoading || staffQuery.isLoading ? (
            <div className="roles-page__loading">
              <Skeleton active paragraph={{ rows: 4 }} />
            </div>
          ) : (
            <Table<DepartmentRole>
              rowKey="id"
              columns={columns}
              dataSource={filtered}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              scroll={{ x: true }}
              locale={{ emptyText: <Empty description="No roles found." /> }}
            />
          )}
        </div>
      </PageContainer>
      <RoleDialogs
        open={roleDialog}
        editRole={editRole}
        viewRole={viewRole}
        onCloseForm={() => {
          setRoleDialog(false);
          setEditRole(null);
        }}
        onCloseView={() => setViewRole(null)}
      />
    </div>
  );
}

function moduleLabel(moduleId: string): string {
  return MODULE_CATALOG.find((entry) => entry.id === moduleId)?.label ?? moduleId;
}
