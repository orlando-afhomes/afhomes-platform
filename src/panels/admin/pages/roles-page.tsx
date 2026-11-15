"use client";

import { EMPTY } from "@/shared/lib/empty-value";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import type { DepartmentRole } from "@/modules/organization/types";
import { useDeleteDepartmentRole, useDepartments, useDepartmentRoles, useRoleOptions, useStaff } from "@/data/queries";
import { DataTable, type ColumnDef, type DataTableColumnMeta } from "@/shared/components/modern/data-table";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { AdminPage } from "@/shared/components/admin";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { StatusBadge } from "@/shared/components/modern/status-badge";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

const STATUS_FILTER_ITEMS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "deactivated", label: "Deactivated" },
];

// The narrow table keeps name, status, and row actions on screen; department,
// modules, and staff counts stay available in the role details dialog.
const HIDE_BELOW_SM: DataTableColumnMeta = { className: "tw:hidden tw:sm:table-cell" };
const HIDE_BELOW_LG: DataTableColumnMeta = { className: "tw:hidden tw:lg:table-cell" };

const RoleDialogs = dynamic(() => import("./role-dialogs").then((mod) => mod.RoleDialogs), {
  loading: () => null,
});

/** The area page owns "Create role" in the page header and passes `creating` down. */
export function RolesPage({
  embedded = false,
  creating = false,
  onCreatingChange,
}: { embedded?: boolean; creating?: boolean; onCreatingChange?: (creating: boolean) => void } = {}) {
  const rolesQuery = useDepartmentRoles();
  const roleOptionsQuery = useRoleOptions();
  const departmentsQuery = useDepartments();
  const staffQuery = useStaff();
  const deleteRole = useDeleteDepartmentRole();

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortAsc, setSortAsc] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [editRole, setEditRole] = useState<DepartmentRole | null>(null);
  const [viewRole, setViewRole] = useState<DepartmentRole | null>(null);
  // A stale role from an earlier edit must not leak into the create form.
  if (creating && editRole !== null) setEditRole(null);

  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const departments = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data]);
  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);
  const manageable = useMemo(
    () => new Set((roleOptionsQuery.data ?? []).filter((role) => role.manageable).map((role) => role.id)),
    [roleOptionsQuery.data],
  );

  const departmentItems = useMemo(
    () => [{ value: "all", label: "All departments" }, ...departments.map((dept) => ({ value: dept.id, label: dept.name }))],
    [departments],
  );

  // Memoized so the table does not reset its page on unrelated renders.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return roles
      .filter((role) => {
        if (departmentFilter !== "all" && role.departmentId !== departmentFilter) return false;
        if (statusFilter !== "all" && role.status !== statusFilter) return false;
        return term === "" || role.name.toLowerCase().includes(term);
      })
      .sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
  }, [roles, departmentFilter, statusFilter, search, sortAsc]);

  // Memoized: TanStack renders cell functions as components, so a new columns
  // array on every render would remount every cell (and its open dialogs).
  const { mutateAsync: removeRole } = deleteRole;
  const columns = useMemo<ColumnDef<DepartmentRole, unknown>[]>(() => {
    const departmentName = (departmentId: string) =>
      departments.find((item) => item.id === departmentId)?.name ?? EMPTY;
    return [
      {
        id: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="tw:font-semibold">{row.original.name}</span>
        ),
      },
      { id: "department", header: "Department", meta: HIDE_BELOW_SM, cell: ({ row }) => departmentName(row.original.departmentId) },
      {
        id: "modules",
        header: "Modules",
        meta: HIDE_BELOW_LG,
        cell: ({ row }) => row.original.moduleIds.length,
      },
      {
        id: "assigned",
        header: "Staff",
        meta: HIDE_BELOW_LG,
        cell: ({ row }) => staff.filter((member) => member.departmentRoleId === row.original.id).length,
      },
      { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      {
        id: "actions",
        header: () => <span className="tw:sr-only">Actions</span>,
        cell: ({ row }) => {
          const record = row.original;
          // Protected or out-of-scope roles show no actions; the repository rejects them too.
          if (!manageable.has(record.id)) {
            return (
              <div className="tw:flex tw:justify-end">
                <Badge variant="outline" title="Your access does not cover this role.">
                  {record.isProtected ? "Protected" : "Restricted"}
                </Badge>
              </div>
            );
          }
          return (
            <RowActionsMenu
              itemName={record.name}
              onEdit={() => {
                setEditRole(record);
                setEditDialog(true);
              }}
              onDelete={() => removeRole(record.id)}
              deleteTitle={`Delete ${record.name}?`}
              deleteDescription="Assigned roles cannot be deleted. Reassign or remove all staff from this role first. This action cannot be undone."
            />
          );
        },
      },
    ];
  }, [departments, staff, manageable, removeRole]);

  const sortLabel = sortAsc ? "Sort A-Z" : "Sort Z-A";

  return (
    <AdminPage
      embedded={embedded}
      anyOf={["roles"]}
      title="Roles & Permissions"
      crumbs={[{ label: "Organization" }, { label: "Roles & Permissions" }]}
    >
      <FilterBar
        search={search}
        onSearch={setSearch}
        searchLabel="Search roles"
        filters={[
          { label: "Role department filter", value: departmentFilter, onChange: setDepartmentFilter, options: departmentItems },
          { label: "Role status filter", value: statusFilter, onChange: setStatusFilter, options: STATUS_FILTER_ITEMS },
        ]}
      >
        <Button variant="outline" className="tw:h-11 tw:md:flex-none" onClick={() => setSortAsc((value) => !value)} aria-label={sortLabel}>
          {sortAsc ? <ArrowDownAZ aria-hidden="true" /> : <ArrowUpAZ aria-hidden="true" />}
          {sortLabel}
        </Button>
      </FilterBar>
      <DataTable<DepartmentRole>
        caption="Roles"
        data={filtered}
        columns={columns}
        getRowId={(role) => role.id}
        emptyText="No roles found."
        loading={rolesQuery.isLoading || departmentsQuery.isLoading || staffQuery.isLoading}
        onRowOpen={(role) => setViewRole(role)}
      />
      <RoleDialogs
        open={editDialog || creating}
        editRole={editRole}
        viewRole={viewRole}
        onCloseForm={() => {
          setEditDialog(false);
          onCreatingChange?.(false);
          setEditRole(null);
        }}
        onCloseView={() => setViewRole(null)}
      />
    </AdminPage>
  );
}
