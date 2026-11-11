"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowDownAZ, ArrowUpAZ, Plus } from "lucide-react";
import { useDepartments, useDeleteDepartment, useDepartmentRoles, useStaff } from "@/data/queries";
import { DataTable, type ColumnDef, type DataTableColumnMeta } from "@/shared/components/modern/data-table";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { AdminPage } from "@/shared/components/admin";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { StatusBadge } from "@/shared/components/modern/status-badge";
import { Button } from "@/shared/ui/button";
import type { Department } from "@/modules/organization/types";

const STATUS_FILTER_ITEMS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "deactivated", label: "Deactivated" },
];

// Counts stay available in the department details dialog; the narrow table keeps
// the name, status, and row actions on screen without horizontal scrolling.
const HIDE_ON_MOBILE: DataTableColumnMeta = { className: "tw:hidden tw:sm:table-cell" };

const DepartmentDialogs = dynamic(() => import("./department-dialogs").then((mod) => mod.DepartmentDialogs), {
  loading: () => null,
});

export function DepartmentsPage() {
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

  // Memoized so the table does not reset its page on unrelated renders.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return departments
      .filter((dept) => {
        if (statusFilter !== "all" && dept.status !== statusFilter) return false;
        return term === "" || dept.name.toLowerCase().includes(term);
      })
      .sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
  }, [departments, search, statusFilter, sortAsc]);

  const roleCountByDept = useCallback((departmentId: string) => roles.filter((role) => role.departmentId === departmentId).length, [roles]);
  const staffCountByDept = useCallback((departmentId: string) => staff.filter((member) => member.departmentId === departmentId).length, [staff]);

  // Memoized: TanStack renders cell functions as components, so a new columns
  // array on every render would remount every cell (and its open dialogs).
  const { mutateAsync: removeDepartment } = deleteDepartment;
  const columns = useMemo<ColumnDef<Department, unknown>[]>(
    () => [
    {
      id: "name",
      header: "Department Name",
      cell: ({ row }) => (
        <Button
          variant="link"
          className="tw:h-auto tw:min-h-11 tw:p-0 tw:font-semibold tw:sm:min-h-0"
          onClick={() => setViewDept(row.original)}
        >
          {row.original.name}
        </Button>
      ),
    },
    { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: "roles", header: "Roles", meta: HIDE_ON_MOBILE, cell: ({ row }) => roleCountByDept(row.original.id) },
    { id: "staff", header: "Staff", meta: HIDE_ON_MOBILE, cell: ({ row }) => staffCountByDept(row.original.id) },
    {
      id: "actions",
      header: () => <span className="tw:sr-only">Actions</span>,
      cell: ({ row }) => (
        <RowActionsMenu
          itemName={row.original.name}
          onView={() => setViewDept(row.original)}
          onEdit={() => {
            setEditDept(row.original);
            setDeptDialog(true);
          }}
          onDelete={() => removeDepartment(row.original.id)}
          deleteTitle={`Delete ${row.original.name}?`}
          deleteDescription="This will remove the department from the directory. Departments with assigned roles or staff cannot be deleted."
        />
      ),
    },
    ],
    [roleCountByDept, staffCountByDept, removeDepartment],
  );

  const sortLabel = sortAsc ? "Sort A-Z" : "Sort Z-A";

  return (
    <AdminPage
      anyOf={["departments"]}
      title="Departments"
      description="Manage departments and their roles."
      crumbs={[{ label: "Organization" }, { label: "Departments" }]}
      actions={
        <Button
          className="tw:min-h-11 tw:sm:min-h-8"
          onClick={() => {
            setEditDept(null);
            setDeptDialog(true);
          }}
        >
          <Plus aria-hidden="true" /> Create department
        </Button>
      }
    >
      <FilterBar
        search={search}
        onSearch={setSearch}
        searchLabel="Search departments"
        filters={[{ label: "Department status filter", value: statusFilter, onChange: setStatusFilter, options: STATUS_FILTER_ITEMS }]}
      >
        <Button variant="outline" className="tw:h-11 tw:md:flex-none" onClick={() => setSortAsc((value) => !value)} aria-label={sortLabel}>
          {sortAsc ? <ArrowDownAZ aria-hidden="true" /> : <ArrowUpAZ aria-hidden="true" />}
          {sortLabel}
        </Button>
      </FilterBar>
      <DataTable<Department>
        caption="Departments"
        data={filtered}
        columns={columns}
        getRowId={(dept) => dept.id}
        emptyText="No departments found."
        loading={departmentsQuery.isLoading || rolesQuery.isLoading || staffQuery.isLoading}
        onRowOpen={(dept) => setViewDept(dept)}
      />
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
    </AdminPage>
  );
}
