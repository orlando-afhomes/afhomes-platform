"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowDownAZ, ArrowUpAZ, Plus } from "lucide-react";
import { MODULE_CATALOG } from "@/modules/identity/permissions";
import type { DepartmentRole } from "@/modules/organization/types";
import { useDeleteDepartmentRole, useDepartments, useDepartmentRoles, useEffectiveModuleIds, useRoleOptions, useStaff } from "@/data/queries";
import { PageContainer } from "@/shared/components/modern/page-container";
import { Breadcrumbs } from "@/shared/components/modern/breadcrumbs";
import { DataTable, type ColumnDef, type DataTableColumnMeta } from "@/shared/components/modern/data-table";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { PageHeader } from "@/shared/components/modern/page-header";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { StatusBadge } from "@/shared/components/modern/status-badge";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";

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
  loading: () => <Skeleton className="tw:h-8 tw:w-full" />,
});

export function RolesPage() {
  const granted = useEffectiveModuleIds();
  const rolesQuery = useDepartmentRoles();
  const roleOptionsQuery = useRoleOptions();
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
      departments.find((item) => item.id === departmentId)?.name ?? "Unknown department";
    return [
      {
        id: "name",
        header: "Role Name",
        cell: ({ row }) => (
          <Button
            variant="link"
            className="tw:h-auto tw:min-h-11 tw:p-0 tw:text-left tw:font-semibold tw:sm:min-h-0"
            onClick={() => setViewRole(row.original)}
          >
            {row.original.name}
          </Button>
        ),
      },
      { id: "department", header: "Department", meta: HIDE_BELOW_SM, cell: ({ row }) => departmentName(row.original.departmentId) },
      {
        id: "modules",
        header: "Authorized Modules",
        meta: HIDE_BELOW_LG,
        cell: ({ row }) => {
          const [first, ...rest] = row.original.moduleIds;
          if (!first) return "—";
          return (
            <div className="tw:flex tw:flex-wrap tw:gap-1">
              <Badge variant="outline">{moduleLabel(first)}</Badge>
              {rest.length > 0 ? (
                <Badge variant="outline" title={rest.map(moduleLabel).join(", ")}>
                  +{rest.length}
                </Badge>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "assigned",
        header: "Assigned Staff",
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
              onView={() => setViewRole(record)}
              onEdit={() => {
                setEditRole(record);
                setRoleDialog(true);
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

  if (!granted.has("roles")) {
    return (
      <PageContainer>
        <PageHeader title="Access restricted" description="This account does not have access to Roles & Permissions." />
      </PageContainer>
    );
  }

  const sortLabel = sortAsc ? "Sort A-Z" : "Sort Z-A";

  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Organization" }, { label: "Roles & Permissions" }]} />
      <PageHeader
        title="Roles & Permissions"
        description="Manage department roles and the modules they may access."
        actions={
          <Button
            className="tw:min-h-11 tw:sm:min-h-8"
            onClick={() => {
              setEditRole(null);
              setRoleDialog(true);
            }}
          >
            <Plus aria-hidden="true" /> Create role
          </Button>
        }
      />
      <div className="tw:mt-3">
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchLabel="Search roles"
          filters={[
            { label: "Role department filter", value: departmentFilter, onChange: setDepartmentFilter, options: departmentItems },
            { label: "Role status filter", value: statusFilter, onChange: setStatusFilter, options: STATUS_FILTER_ITEMS },
          ]}
        >
          <Button variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setSortAsc((value) => !value)} aria-label={sortLabel}>
            {sortAsc ? <ArrowDownAZ aria-hidden="true" /> : <ArrowUpAZ aria-hidden="true" />}
            {sortLabel}
          </Button>
        </FilterBar>
      </div>
      <div className="tw:mt-3">
        <DataTable<DepartmentRole>
          caption="Roles"
          data={filtered}
          columns={columns}
          getRowId={(role) => role.id}
          emptyText="No roles found."
          loading={rolesQuery.isLoading || departmentsQuery.isLoading || staffQuery.isLoading}
          pageSize={10}
          onRowOpen={(role) => setViewRole(role)}
        />
      </div>
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
    </PageContainer>
  );
}

function moduleLabel(moduleId: string): string {
  return MODULE_CATALOG.find((entry) => entry.id === moduleId)?.label ?? moduleId;
}
