"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Avatar, Button, Empty, Input, Select, Skeleton, Table, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { StaffMember } from "@/modules/organization/types";
import {
  useDeleteStaff,
  useDepartments,
  useDepartmentRoles,
  useEffectiveModuleIds,
  useStaff,
} from "@/data/queries";
import { cleanTitleInput, formatStatusLabel, isValidName } from "@/shared/utils/input-sanitizers";
import { getRoleBadgeStyle } from "@/shared/utils/role-badge";
import { PageContainer } from "@/shared/components/layout/page-container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Breadcrumbs } from "@/shared/components/layout/breadcrumbs";
import { RowActionsMenu } from "@/shared/components/layout/row-actions-menu";
import { SortToggleButton } from "@/shared/components/layout/sort-toggle-button";

const StaffDialogs = dynamic(() => import("./staff-dialogs").then((mod) => mod.StaffDialogs), {
  loading: () => <Skeleton active />,
});

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

export function StaffPage() {
  const granted = useEffectiveModuleIds();
  const departmentsQuery = useDepartments();
  const rolesQuery = useDepartmentRoles();
  const staffQuery = useStaff();
  const deleteStaff = useDeleteStaff();

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortAsc, setSortAsc] = useState(true);
  const [staffDialog, setStaffDialog] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [profileStaff, setProfileStaff] = useState<StaffMember | null>(null);

  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);
  const departments = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data]);
  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);

  const roleOptions = useMemo(() => {
    const pool = deptFilter === "all" ? roles : roles.filter((role) => role.departmentId === deptFilter);
    return pool.map((role) => ({ value: role.id, label: role.name }));
  }, [roles, deptFilter]);

  if (!granted.has("staff")) {
    return (
      <div className="staff-page">
        <PageContainer>
          <PageHeader title="Access restricted" description="This account does not have access to Staff." />
        </PageContainer>
      </div>
    );
  }

  const roleById = (id: string | null) => (id ? roles.find((role) => role.id === id) ?? null : null);

  const filtered = staff
    .filter((member) => {
      if (deptFilter !== "all" && member.departmentId !== deptFilter) return false;
      if (roleFilter !== "all" && member.departmentRoleId !== roleFilter) return false;
      if (statusFilter !== "all" && member.status !== statusFilter) return false;
      const term = search.trim().toLowerCase();
      return (
        term === "" ||
        member.displayName.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term) ||
        member.position.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => (sortAsc ? a.displayName.localeCompare(b.displayName) : b.displayName.localeCompare(a.displayName)));

  const columns: ColumnsType<StaffMember> = [
    {
      title: "Name",
      dataIndex: "displayName",
      key: "displayName",
      render: (name: string, record) => (
        <span className="staff-table__name-cell">
          <Avatar size="small" src={record.avatarUrl ?? undefined}>
            {record.avatarUrl ? null : initials(name)}
          </Avatar>
          <span className="staff-table__name">{name}</span>
        </span>
      ),
    },
    { title: "Position", dataIndex: "position", key: "position" },
    {
      title: "Department",
      key: "department",
      render: (_, record) => departments.find((dept) => dept.id === record.departmentId)?.name ?? "—",
    },
    {
      title: "Assigned Role",
      key: "role",
      render: (_, record) => {
        const role = roleById(record.departmentRoleId);
        return role ? (
          <Tag className="staff-table__role-badge" style={getRoleBadgeStyle(role.id)}>
            {role.name}
          </Tag>
        ) : (
          <span className="staff-table__unassigned">Unassigned</span>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: StaffMember["status"]) => <Tag color={status === "active" ? "green" : undefined}>{formatStatusLabel(status)}</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <RowActionsMenu
          itemName={record.displayName}
          onView={() => setProfileStaff(record)}
          onEdit={() => {
            setEditStaff(record);
            setStaffDialog(true);
          }}
          onDelete={() => deleteStaff.mutateAsync(record.id)}
          deleteTitle={`Delete ${record.displayName}?`}
          deleteDescription="This removes the staff record. Linked active accounts must be handled separately. This action cannot be undone."
        />
      ),
    },
  ];

  return (
    <div className="staff-page">
      <PageContainer>
        <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Organization" }, { label: "Staff" }]} />
        <PageHeader title="Staff" description="Manage staff members and their department roles." />
        <div className="staff-page__actions">
          <Button
            type="primary"
            onClick={() => {
              setEditStaff(null);
              setStaffDialog(true);
            }}
          >
            Add staff
          </Button>
        </div>
        <div className="staff-page__toolbar">
          <div className="staff-page__search">
            <Input
              allowClear
              prefix={<SearchOutlined aria-hidden />}
              placeholder="Search staff"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="staff-page__filters">
            <Select
              aria-label="Staff department filter"
              value={deptFilter}
              onChange={(value) => {
                setDeptFilter(value);
                setRoleFilter("all");
              }}
              className="staff-page__filter"
              options={[
                { value: "all", label: "All departments" },
                ...departments.map((dept) => ({ value: dept.id, label: dept.name })),
              ]}
            />
            <Select
              aria-label="Staff role filter"
              value={roleFilter}
              onChange={setRoleFilter}
              className="staff-page__filter"
              options={[{ value: "all", label: "All roles" }, ...roleOptions]}
            />
            <Select
              aria-label="Staff status filter"
              value={statusFilter}
              onChange={setStatusFilter}
              className="staff-page__filter"
              options={[
                { value: "all", label: "All statuses" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "suspended", label: "Suspended" },
              ]}
            />
            <SortToggleButton ascending={sortAsc} onToggle={() => setSortAsc((value) => !value)} />
          </div>
        </div>
        <div className="staff-page__table">
          {staffQuery.isLoading || departmentsQuery.isLoading || rolesQuery.isLoading ? (
            <div className="staff-page__loading">
              <Skeleton active paragraph={{ rows: 4 }} />
            </div>
          ) : (
            <Table<StaffMember>
              rowKey="id"
              columns={columns}
              dataSource={filtered}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              scroll={{ x: true }}
              locale={{ emptyText: <Empty description="No staff found." /> }}
            />
          )}
        </div>
      </PageContainer>
      <StaffDialogs
        open={staffDialog}
        editStaff={editStaff}
        profileStaff={profileStaff}
        onOpenEdit={(member) => {
          setProfileStaff(null);
          setEditStaff(member);
          setStaffDialog(true);
        }}
        onCloseForm={() => setStaffDialog(false)}
        onCloseProfile={() => setProfileStaff(null)}
      />
    </div>
  );
}
