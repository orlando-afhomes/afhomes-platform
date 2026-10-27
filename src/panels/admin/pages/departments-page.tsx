"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Button, Empty, Input, Select, Skeleton, Table, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useDepartments, useDeleteDepartment, useDepartmentRoles, useEffectiveModuleIds, useStaff } from "@/data/queries";
import { cleanTitleInput, formatStatusLabel, isValidName } from "@/shared/utils/input-sanitizers";
import { PageContainer } from "@/shared/components/layout/page-container";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Breadcrumbs } from "@/shared/components/layout/breadcrumbs";
import { RowActionsMenu } from "@/shared/components/layout/row-actions-menu";
import { SortToggleButton } from "@/shared/components/layout/sort-toggle-button";
import type { Department } from "@/modules/organization/types";

const DepartmentDialogs = dynamic(() => import("./department-dialogs").then((mod) => mod.DepartmentDialogs), {
  loading: () => <Skeleton active />,
});

export function DepartmentsPage() {
  const granted = useEffectiveModuleIds();
  const departmentsQuery = useDepartments();
  const rolesQuery = useDepartmentRoles();
  const staffQuery = useStaff();
  const deleteDepartment = useDeleteDepartment();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortAsc, setSortAsc] = useState(true);
  const [deptDialog, setDeptDialog] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [viewDept, setViewDept] = useState<Department | null>(null);

  const departments = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data]);
  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);

  if (!granted.has("departments")) {
    return (
      <div className="departments-page">
        <PageContainer>
          <PageHeader title="Access restricted" description="This account does not have access to Departments." />
        </PageContainer>
      </div>
    );
  }

  const roleCountByDept = (departmentId: string) => roles.filter((role) => role.departmentId === departmentId).length;
  const staffCountByDept = (departmentId: string) => staff.filter((member) => member.departmentId === departmentId).length;

  const filtered = departments
    .filter((dept) => {
      if (statusFilter !== "all" && dept.status !== statusFilter) return false;
      const term = search.trim().toLowerCase();
      return term === "" || dept.name.toLowerCase().includes(term);
    })
    .sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));

  const columns: ColumnsType<Department> = [
    {
      title: "Department Name",
      dataIndex: "name",
      key: "name",
      render: (name: string) => <span className="department-table__name">{name}</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: Department["status"]) => <Tag color={status === "active" ? "green" : "default"}>{formatStatusLabel(status)}</Tag>,
    },
    {
      title: "Roles",
      key: "roles",
      render: (_, record) => roleCountByDept(record.id),
    },
    {
      title: "Staff",
      key: "staff",
      render: (_, record) => staffCountByDept(record.id),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <RowActionsMenu
          itemName={record.name}
          onView={() => setViewDept(record)}
          onEdit={() => {
            setEditDept(record);
            setDeptDialog(true);
          }}
          onDelete={() => deleteDepartment.mutateAsync(record.id)}
          deleteTitle={`Delete ${record.name}?`}
          deleteDescription="This will remove the department from the directory. Departments with assigned roles or staff cannot be deleted."
        />
      ),
    },
  ];

  return (
    <div className="departments-page">
      <PageContainer>
        <Breadcrumbs
          items={[{ label: "Dashboard", href: "/admin" }, { label: "Organization" }, { label: "Departments" }]}
        />
        <PageHeader title="Departments" description="Manage departments and their roles." />
        <div className="departments-page__actions">
          <Button
            type="primary"
            onClick={() => {
              setEditDept(null);
              setDeptDialog(true);
            }}
          >
            Create department
          </Button>
        </div>
        <div className="departments-page__toolbar">
          <div className="departments-page__search">
            <Input
              allowClear
              prefix={<SearchOutlined aria-hidden />}
              placeholder="Search departments"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="departments-page__filters">
            <Select
              aria-label="Department status filter"
              value={statusFilter}
              onChange={setStatusFilter}
              className="departments-page__filter"
              options={[
                { value: "all", label: "All statuses" },
                { value: "active", label: "Active" },
                { value: "deactivated", label: "Deactivated" },
              ]}
            />
            <SortToggleButton ascending={sortAsc} onToggle={() => setSortAsc((value) => !value)} />
          </div>
        </div>
        <div className="departments-page__table">
          {departmentsQuery.isLoading || rolesQuery.isLoading || staffQuery.isLoading ? (
            <div className="departments-page__loading">
              <Skeleton active paragraph={{ rows: 4 }} />
            </div>
          ) : (
            <Table<Department>
              rowKey="id"
              columns={columns}
              dataSource={filtered}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              scroll={{ x: true }}
              locale={{ emptyText: <Empty description="No departments found." /> }}
            />
          )}
        </div>
      </PageContainer>
      <DepartmentDialogs
        open={deptDialog}
        editDept={editDept}
        viewDept={viewDept}
        roleCount={viewDept ? roleCountByDept(viewDept.id) : 0}
        staffCount={viewDept ? staffCountByDept(viewDept.id) : 0}
        onCloseForm={() => {
          setDeptDialog(false);
          setEditDept(null);
        }}
        onCloseView={() => setViewDept(null)}
      />
    </div>
  );
}
