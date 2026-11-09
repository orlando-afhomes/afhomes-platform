"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowDownAZ, ArrowUpAZ, Plus, Search } from "lucide-react";
import { MODULE_CATALOG } from "@/modules/identity/permissions";
import type { DepartmentRole } from "@/modules/organization/types";
import { useDeleteDepartmentRole, useDepartments, useDepartmentRoles, useEffectiveModuleIds, useRoleOptions, useStaff } from "@/data/queries";
import { PageContainer } from "@/shared/components/modern/page-container";
import { Breadcrumbs } from "@/shared/components/modern/breadcrumbs";
import { DataTable, type ColumnDef, type DataTableColumnMeta } from "@/shared/components/modern/data-table";
import { PageHeader } from "@/shared/components/modern/page-header";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { StatusBadge } from "@/shared/components/modern/status-badge";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Toaster } from "@/shared/ui/sonner";

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
      <Toaster position="top-right" />
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
      <div className="tw:mt-3 tw:flex tw:flex-col tw:gap-3 tw:rounded-lg tw:border tw:border-border tw:bg-card tw:p-4 tw:lg:flex-row tw:lg:items-center tw:lg:justify-between">
        <div className="tw:relative tw:w-full tw:lg:max-w-xs">
          <Search aria-hidden="true" className="tw:pointer-events-none tw:absolute tw:top-1/2 tw:left-2.5 tw:size-4 tw:-translate-y-1/2 tw:text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search roles"
            placeholder="Search roles"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="tw:h-11 tw:pl-8 tw:sm:h-8"
          />
        </div>
        <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
          <Select items={departmentItems} value={departmentFilter} onValueChange={(next) => setDepartmentFilter(next ?? "all")}>
            <SelectTrigger aria-label="Role department filter" className="tw:h-11 tw:min-w-44 tw:sm:h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {departmentItems.map((item) => (
                <SelectItem key={item.value} value={item.value} className="tw:min-h-11 tw:sm:min-h-8">
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select items={STATUS_FILTER_ITEMS} value={statusFilter} onValueChange={(next) => setStatusFilter(next ?? "all")}>
            <SelectTrigger aria-label="Role status filter" className="tw:h-11 tw:min-w-40 tw:sm:h-8">
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
