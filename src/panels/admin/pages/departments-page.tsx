"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowDownAZ, ArrowUpAZ, Plus, Search } from "lucide-react";
import { useDepartments, useDeleteDepartment, useDepartmentRoles, useEffectiveModuleIds, useStaff } from "@/data/queries";
import { PageContainer } from "@/shared/components/modern/page-container";
import { Breadcrumbs } from "@/shared/components/modern/breadcrumbs";
import { DataTable, type ColumnDef, type DataTableColumnMeta } from "@/shared/components/modern/data-table";
import { PageHeader } from "@/shared/components/modern/page-header";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { StatusBadge } from "@/shared/components/modern/status-badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Toaster } from "@/shared/ui/sonner";
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
  loading: () => <Skeleton className="tw:h-8 tw:w-full" />,
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

  if (!granted.has("departments")) {
    return (
      <PageContainer>
        <PageHeader title="Access restricted" description="This account does not have access to Departments." />
      </PageContainer>
    );
  }

  const sortLabel = sortAsc ? "Sort A-Z" : "Sort Z-A";

  return (
    <PageContainer>
      <Toaster position="top-right" />
      <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Organization" }, { label: "Departments" }]} />
      <PageHeader
        title="Departments"
        description="Manage departments and their roles."
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
      />
      <div className="tw:mt-3 tw:flex tw:flex-col tw:gap-3 tw:rounded-lg tw:border tw:border-border tw:bg-card tw:p-4 tw:sm:flex-row tw:sm:items-center tw:sm:justify-between">
        <div className="tw:relative tw:w-full tw:sm:max-w-xs">
          <Search aria-hidden="true" className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:left-2.5 tw:size-4 tw:-translate-y-1/2 tw:text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search departments"
            placeholder="Search departments"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="tw:h-11 tw:pl-8 tw:sm:h-8"
          />
        </div>
        <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
          <Select items={STATUS_FILTER_ITEMS} value={statusFilter} onValueChange={(next) => setStatusFilter(next ?? "all")}>
            <SelectTrigger aria-label="Department status filter" className="tw:h-11 tw:min-w-40 tw:sm:h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value} className="tw:min-h-11 tw:sm:min-h-8">
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setSortAsc((value) => !value)} aria-label={sortLabel}>
            {sortAsc ? <ArrowDownAZ aria-hidden="true" /> : <ArrowUpAZ aria-hidden="true" />}
            {sortLabel}
          </Button>
        </div>
      </div>
      <div className="tw:mt-3">
        <DataTable<Department>
          caption="Departments"
          data={filtered}
          columns={columns}
          getRowId={(dept) => dept.id}
          emptyText="No departments found."
          loading={departmentsQuery.isLoading || rolesQuery.isLoading || staffQuery.isLoading}
          pageSize={10}
          onRowOpen={(dept) => setViewDept(dept)}
        />
      </div>
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
    </PageContainer>
  );
}
