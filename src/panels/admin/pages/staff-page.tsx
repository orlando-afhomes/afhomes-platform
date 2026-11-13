"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { ArrowDownAZ, ArrowUpAZ, Plus } from "lucide-react";
import type { Account, AccountStatus } from "@/modules/accounts/types";
import {
  useAccountPolicies,
  useAccounts,
  useAssignAccountRole,
  useDepartments,
  useEffectiveModuleIds,
  useRevokeAccountRole,
  useRoleOptions,
  useSetTemporaryPassword,
  useStaff,
  useStaffPolicies,
  useUpdateAccount,
  useUpdateAccountStatus,
  useUpdateLinkedAccountStatus,
} from "@/data/queries";
import { getSystemRoleLabel } from "@/panels/admin/role-label";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { RoleBadge } from "@/shared/components/business/role-badge";
import { DataTable, type ColumnDef, type DataTableColumnMeta } from "@/shared/components/modern/data-table";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { AdminPage } from "@/shared/components/admin";
import { RowActionsMenu, type RowActionItem } from "@/shared/components/modern/row-actions-menu";
import { StatusBadge } from "@/shared/components/modern/status-badge";
import { AppAlert } from "@/shared/components/modern/app-alert";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import type { AccountDialogMode } from "./account-dialogs";
import type { ProfileAccountActions } from "./staff-dialogs";
import {
  accessRowAccountStatus,
  buildAccessRows,
  countPendingRows,
  filterAccessRows,
  parseAccessChip,
  type AccessChip,
  type AccessRow,
} from "./staff-access-rows";
import { LINKED_ACCOUNT_ACTION_LABELS, confirmLinkedAccountStatus, linkedAccountActions } from "./staff-account-actions";

const StaffDialogs = dynamic(() => import("./staff-dialogs").then((mod) => mod.StaffDialogs), {
  loading: () => null,
});

const AccountDialogs = dynamic(() => import("./account-dialogs").then((mod) => mod.AccountDialogs), {
  loading: () => null,
});

// Narrow screens keep name, account status, and actions; the rest stay in the
// employee profile and account dialogs.
const SHOW_FROM_SM: DataTableColumnMeta = { className: "tw:hidden tw:sm:table-cell" };
const SHOW_FROM_LG: DataTableColumnMeta = { className: "tw:hidden tw:lg:table-cell" };
const SHOW_FROM_XL: DataTableColumnMeta = { className: "tw:hidden tw:xl:table-cell" };
const SHOW_FROM_2XL: DataTableColumnMeta = { className: "tw:hidden tw:2xl:table-cell" };

const STATUS_FILTER_ITEMS = [
  { value: "all", label: "All employment statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
];

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

const MUTED = "tw:text-muted-foreground";

/**
 * Staff & Access: one directory for employees and their account access, plus
 * accounts no staff record links to. Account columns, chips, and actions
 * need the Accounts module (Admin/Super Admin); every action is filtered by
 * the actor's policy and re-checked by the repository.
 */
export function StaffPage() {
  const { identity } = useDevIdentity();
  const granted = useEffectiveModuleIds();
  const canManageAccounts = granted.has("accounts");
  const departmentsQuery = useDepartments();
  // Role names for display and filtering; Staff holders see them without Roles management.
  const rolesQuery = useRoleOptions();
  const staffQuery = useStaff();
  const staffPoliciesQuery = useStaffPolicies();
  const accountsQuery = useAccounts();
  const accountPoliciesQuery = useAccountPolicies();
  const updateLinkedStatus = useUpdateLinkedAccountStatus();
  const updateAccount = useUpdateAccount();
  const assignRole = useAssignAccountRole();
  const revokeRole = useRevokeAccountRole();
  const updateAccountStatus = useUpdateAccountStatus();
  const setTemporaryPassword = useSetTemporaryPassword();
  const [issuedPassword, setIssuedPassword] = useState<{ name: string; value: string } | null>(null);
  const { confirmRun, dialog: confirmDialog } = useConfirmRun();

  // The directory view is addressable: ?view=account opens the Account-only view
  // (used by the /admin/accounts compatibility route). Unknown values mean "all".
  const view = useSearchParams()?.get("view") ?? null;
  const [chip, setChip] = useState<AccessChip>(() => parseAccessChip(view));
  // The router can keep this page mounted (preserved state) while the URL changes,
  // so follow the URL whenever it changes, not just on first render.
  const [seenView, setSeenView] = useState(view);
  if (seenView !== view) {
    setSeenView(view);
    setChip(parseAccessChip(view));
  }
  const selectChip = (value: AccessChip) => {
    setChip(value);
    // Keep refresh and history consistent with the visible view without adding history entries.
    const url = new URL(window.location.href);
    if (value === "all") url.searchParams.delete("view");
    else url.searchParams.set("view", value);
    window.history.replaceState(window.history.state, "", url);
  };
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortAsc, setSortAsc] = useState(true);
  const [staffDialog, setStaffDialog] = useState(false);
  const [editStaffId, setEditStaffId] = useState<string | null>(null);
  const [profileStaffId, setProfileStaffId] = useState<string | null>(null);
  const [accountMode, setAccountMode] = useState<AccountDialogMode>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);
  const departments = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data]);
  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const accounts = useMemo(() => (canManageAccounts ? (accountsQuery.data ?? []) : []), [canManageAccounts, accountsQuery.data]);
  const accountPolicies = canManageAccounts ? accountPoliciesQuery.data : undefined;
  const staffPolicies = staffPoliciesQuery.data;

  const rows = useMemo(
    () => buildAccessRows(staff, accounts, accountPolicies, staffPolicies, canManageAccounts),
    [staff, accounts, accountPolicies, staffPolicies, canManageAccounts],
  );

  const departmentItems = useMemo(
    () => [{ value: "all", label: "All departments" }, ...departments.map((dept) => ({ value: dept.id, label: dept.name }))],
    [departments],
  );
  const roleItems = useMemo(() => {
    const pool = deptFilter === "all" ? roles : roles.filter((role) => role.departmentId === deptFilter);
    return [{ value: "all", label: "All roles" }, ...pool.map((role) => ({ value: role.id, label: role.name }))];
  }, [roles, deptFilter]);

  const openAccount = (mode: AccountDialogMode, id: string | null) => {
    setProfileStaffId(null);
    setAccountId(id);
    setAccountMode(mode);
  };
  const closeAccount = () => {
    setAccountMode(null);
    setAccountId(null);
  };

  const { mutateAsync: setAccountStatus } = updateAccountStatus;
  const { mutateAsync: setLinkedStatus } = updateLinkedStatus;

  // Memoized: TanStack renders cell functions as components, so a new columns
  // array on every render would remount every cell (and its open dialogs/menus).
  const columns = useMemo<ColumnDef<AccessRow, unknown>[]>(() => {
    const accountPolicyFor = (id: string) => accountPolicies?.accounts[id] ?? null;
    const roleById = (id: string | null) => (id ? (roles.find((role) => role.id === id) ?? null) : null);
    const departmentName = (id: string | null) => departments.find((dept) => dept.id === id)?.name ?? "No department";
    const openRow = (row: AccessRow) =>
      row.kind === "employee" ? setProfileStaffId(row.staff.id) : openAccount("view", row.account.id);

    /** Role and status actions on a full account record, per the actor's account policy. */
    const accountItems = (account: Account | null): RowActionItem[] => {
      const policy = account ? accountPolicyFor(account.id) : null;
      if (!account || !policy) return [];
      const items: RowActionItem[] = [];
      if (policy.canManageRoles) items.push({ key: "roles", label: "System roles", onClick: () => openAccount("role", account.id) });
      if (policy.allowedStatuses.length > 0) items.push({ key: "status", label: "Change status", onClick: () => openAccount("status", account.id) });
      if (policy.canResetPassword) items.push({ key: "password", label: "Set temporary password", onClick: () => resetPassword(account) });
      return items;
    };

    const resetPassword = (account: Account) =>
      confirmRun({
        title: `Set a temporary password for ${account.displayName}?`,
        description: "The current password stops working. The new password is shown once, so give it to the user in person or by phone.",
        confirmText: "Set password",
        action: async () => {
          const { temporaryPassword } = await setTemporaryPassword.mutateAsync(account.id);
          setIssuedPassword({ name: account.displayName, value: temporaryPassword });
        },
        successTitle: "Temporary password set.",
        errorTitle: "Password was not changed.",
      });

    const activate = (account: Account) =>
      confirmRun({
        title: `Activate ${account.displayName}?`,
        description: "The account gains access to its authorized modules immediately.",
        confirmText: "Activate",
        action: async () => {
          await setAccountStatus({ id: account.id, status: "active" });
        },
        successTitle: "Account activated.",
        errorTitle: "Activation failed.",
      });

    const renderActions = (row: AccessRow) => {
      const account = row.account;
      const policy = account ? accountPolicyFor(account.id) : null;
      const activateItems: RowActionItem[] =
        account && account.status === "pending" && (policy?.allowedStatuses.includes("active") ?? false)
          ? [{ key: "activate", label: "Activate", onClick: () => activate(account) }]
          : [];
      let menu = null;
      if (row.kind === "employee") {
        const { staff: member, linkedAccount } = row;
        const staffPolicy = staffPolicies?.[member.id];
        const items = [...activateItems, ...accountItems(account)];
        // Without a full status dialog, Staff holders keep the suspend/deactivate shortcut.
        if (!items.some((item) => item.key === "status") && linkedAccount) {
          for (const status of linkedAccountActions(linkedAccount.allowedStatuses)) {
            items.push({
              key: status,
              label: LINKED_ACCOUNT_ACTION_LABELS[status],
              danger: status !== "active",
              onClick: () => confirmLinkedAccountStatus(confirmRun, member.displayName, status, () => setLinkedStatus({ staffId: member.id, status })),
            });
          }
        }
        menu = (
          <RowActionsMenu
            itemName={member.displayName}
            onView={() => setProfileStaffId(member.id)}
            onEdit={() => {
              setEditStaffId(member.id);
              setStaffDialog(true);
            }}
            extraItems={items}
            deleteDisabledReason={staffPolicy?.deleteRestriction}
          />
        );
      } else if (policy) {
        menu = (
          <RowActionsMenu
            itemName={row.account.displayName}
            onView={() => openAccount("view", row.account.id)}
            onEdit={policy.canEdit ? () => openAccount("edit", row.account.id) : undefined}
            extraItems={[...activateItems, ...accountItems(row.account)]}
            deleteDisabledReason={policy.deleteRestriction}
          />
        );
      }
      return (
        <div className="tw:flex tw:items-center tw:justify-end tw:gap-1">
          {policy?.restriction && !policy.canEdit ? (
            <Badge variant="outline" title={policy.restriction}>
              Protected
            </Badge>
          ) : null}
          {menu}
        </div>
      );
    };

    const cols: ColumnDef<AccessRow, unknown>[] = [
      {
        id: "name",
        header: "Name",
        cell: ({ row: tableRow }) => {
          const row = tableRow.original;
          const name = row.kind === "employee" ? row.staff.displayName : row.account.displayName;
          const avatarUrl = row.kind === "employee" ? row.staff.avatarUrl : null;
          const accountPolicy = row.account ? accountPolicyFor(row.account.id) : null;
          const isYou = row.kind === "employee" ? identity.staffId === row.staff.id : Boolean(accountPolicy?.canEdit && accountPolicy.restriction);
          return (
            <div className="tw:flex tw:items-center tw:gap-2.5">
              <Avatar className="tw:size-8 tw:text-xs">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                <AvatarFallback>{initials(name)}</AvatarFallback>
              </Avatar>
              <div className="tw:flex tw:min-w-0 tw:flex-col">
                <Button variant="link" className="tw:h-auto tw:min-h-11 tw:justify-start tw:p-0 tw:text-left tw:font-semibold tw:sm:min-h-0" onClick={() => openRow(row)}>
                  {name}
                  {isYou ? <span className="tw:font-normal tw:text-muted-foreground"> (You)</span> : null}
                </Button>
                <span className={`tw:truncate tw:text-xs ${MUTED}`}>{row.kind === "employee" ? row.staff.position : row.account.email}</span>
              </div>
            </div>
          );
        },
      },
    ];
    if (canManageAccounts) {
      cols.push({
        id: "type",
        header: "Type",
        meta: SHOW_FROM_2XL,
        cell: ({ row }) => <Badge variant="outline">{row.original.kind === "employee" ? "Employee" : "Account only"}</Badge>,
      });
    }
    cols.push(
      {
        id: "department",
        header: "Department",
        meta: SHOW_FROM_LG,
        cell: ({ row }) => departmentName(row.original.kind === "employee" ? row.original.staff.departmentId : row.original.account.departmentId),
      },
      {
        id: "role",
        header: "Assigned Role",
        meta: SHOW_FROM_LG,
        cell: ({ row }) => {
          const record = row.original;
          if (record.kind === "account") return <span className={MUTED}>No department role</span>;
          const role = roleById(record.staff.departmentRoleId);
          return role ? (
            <RoleBadge roleId={role.id} label={role.name} />
          ) : (
            <span className="tw:text-warning">Unassigned</span>
          );
        },
      },
    );
    if (canManageAccounts) {
      cols.push({
        id: "system-roles",
        header: "System Roles",
        meta: SHOW_FROM_XL,
        cell: ({ row }) => {
          const roleIds = row.original.account?.roleIds ?? [];
          return roleIds.length === 0 ? (
            <span className={MUTED}>No system roles</span>
          ) : (
            <div className="tw:flex tw:flex-wrap tw:gap-1">
              {roleIds.map((role) => (
                <Badge key={role} variant="outline">
                  {getSystemRoleLabel(role)}
                </Badge>
              ))}
            </div>
          );
        },
      });
    }
    cols.push(
      {
        id: "account",
        header: "Account",
        meta: SHOW_FROM_SM,
        cell: ({ row }) => {
          const status: AccountStatus | null = accessRowAccountStatus(row.original);
          return status ? <StatusBadge status={status} /> : <span className={MUTED}>No account</span>;
        },
      },
      {
        id: "employment",
        header: "Employment",
        meta: SHOW_FROM_LG,
        cell: ({ row }) =>
          row.original.kind === "employee" ? <StatusBadge status={row.original.staff.status} /> : <span className={MUTED}>No employment record</span>,
      },
      {
        id: "actions",
        header: () => <span className="tw:sr-only">Actions</span>,
        cell: ({ row }) => renderActions(row.original),
      },
    );
    return cols;
    // openAccount and the state setters are stable enough: they only call setState.
  }, [accountPolicies, roles, departments, staffPolicies, canManageAccounts, identity.staffId, confirmRun, setAccountStatus, setTemporaryPassword, setLinkedStatus]);

  const filtered = useMemo(
    () =>
      filterAccessRows(
        rows,
        { chip: canManageAccounts ? chip : "all", search, departmentId: deptFilter, roleId: roleFilter, status: statusFilter },
        sortAsc,
      ),
    [rows, canManageAccounts, chip, search, deptFilter, roleFilter, statusFilter, sortAsc],
  );

  // Dialogs read current records, so they reflect each successful mutation.
  const editStaff = editStaffId ? (staff.find((member) => member.id === editStaffId) ?? null) : null;
  const profileStaff = profileStaffId ? (staff.find((member) => member.id === profileStaffId) ?? null) : null;
  const selectedAccount = accountId ? (accounts.find((account) => account.id === accountId) ?? null) : null;
  const accountPolicyFor = (id: string) => accountPolicies?.accounts[id] ?? null;

  const loading =
    staffQuery.isLoading ||
    departmentsQuery.isLoading ||
    rolesQuery.isLoading ||
    (canManageAccounts && (accountsQuery.isLoading || accountPoliciesQuery.isLoading));
  const chips: Array<{ value: AccessChip; label: string }> = [
    { value: "all", label: "All" },
    { value: "employees", label: "Employees" },
    { value: "account", label: "Account only" },
    // No count until accounts load, so the chip never shows a false zero.
    { value: "pending", label: loading ? "Pending Approvals" : `Pending Approvals (${countPendingRows(rows)})` },
  ];

  let profileAccountActions: ProfileAccountActions | undefined;
  const profileAccount = profileStaff?.accountId ? (accounts.find((account) => account.id === profileStaff.accountId) ?? null) : null;
  if (profileAccount) {
    const policy = accountPolicyFor(profileAccount.id);
    profileAccountActions = {
      onManageRoles: policy?.canManageRoles ? () => openAccount("role", profileAccount.id) : undefined,
      onChangeStatus: policy && policy.allowedStatuses.length > 0 ? () => openAccount("status", profileAccount.id) : undefined,
    };
  }

  const sortLabel = sortAsc ? "Sort A-Z" : "Sort Z-A";

  return (
    <AdminPage
      anyOf={["staff"]}
      title="Staff & Access"
      description="Manage employees, their system access, and pending account approvals in one place."
      crumbs={[{ label: "Organization" }, { label: "Staff & Access" }]}
      actions={
        <Button
          className="tw:min-h-11 tw:sm:min-h-8"
          onClick={() => {
            setEditStaffId(null);
            setStaffDialog(true);
          }}
        >
          <Plus aria-hidden="true" /> Add staff
        </Button>
      }
    >
        <FilterBar
          header={
            canManageAccounts ? (
              <div className="tw:flex tw:flex-wrap tw:gap-2" role="group" aria-label="Directory view">
                {chips.map((item) => (
                  <Button
                    key={item.value}
                    type="button"
                    size="sm"
                    variant={chip === item.value ? "default" : "outline"}
                    aria-pressed={chip === item.value}
                    className="tw:min-h-11 tw:rounded-full tw:sm:min-h-7"
                    onClick={() => selectChip(item.value)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            ) : undefined
          }
          search={search}
          onSearch={setSearch}
          searchLabel={canManageAccounts ? "Search staff and accounts" : "Search staff"}
          filters={[
            {
              label: "Staff department filter",
              value: deptFilter,
              onChange: (next) => {
                setDeptFilter(next);
                setRoleFilter("all");
              },
              options: departmentItems,
            },
            { label: "Staff role filter", value: roleFilter, onChange: setRoleFilter, options: roleItems },
            { label: "Staff status filter", value: statusFilter, onChange: setStatusFilter, options: STATUS_FILTER_ITEMS },
          ]}
        >
          <Button variant="outline" className="tw:h-11 tw:md:flex-none" onClick={() => setSortAsc((value) => !value)} aria-label={sortLabel}>
            {sortAsc ? <ArrowDownAZ aria-hidden="true" /> : <ArrowUpAZ aria-hidden="true" />}
            {sortLabel}
          </Button>
        </FilterBar>
      <DataTable<AccessRow>
        caption="Staff and access"
        data={filtered}
        columns={columns}
        getRowId={(row) => row.id}
        emptyText={chip === "pending" && canManageAccounts ? "No pending accounts." : "No staff or accounts found."}
        loading={loading}
        onRowOpen={(row) => (row.kind === "employee" ? setProfileStaffId(row.staff.id) : openAccount("view", row.account.id))}
      />
      <StaffDialogs
        open={staffDialog}
        editStaff={editStaff}
        profileStaff={profileStaff}
        profileAccountActions={profileAccountActions}
        profileAccount={profileAccount}
        profileAccountPolicy={profileAccount ? accountPolicyFor(profileAccount.id) : null}
        onOpenEdit={(member) => {
          setProfileStaffId(null);
          setEditStaffId(member.id);
          setStaffDialog(true);
        }}
        onCloseForm={() => setStaffDialog(false)}
        onCloseProfile={() => setProfileStaffId(null)}
      />
      {canManageAccounts ? (
        <AccountDialogs
          mode={accountMode}
          selected={selectedAccount}
          policy={selectedAccount ? accountPolicyFor(selectedAccount.id) : null}
          close={closeAccount}
          onUpdate={(id, data) => updateAccount.mutateAsync({ id, ...data })}
          onAssign={(id, role) => assignRole.mutateAsync({ id, role })}
          onRevoke={(id, role) => revokeRole.mutateAsync({ id, role })}
          onUpdateStatus={(id, status) => updateAccountStatus.mutateAsync({ id, status })}
        />
      ) : null}
      {confirmDialog}
      <AppAlert
        open={issuedPassword !== null}
        title="Temporary password"
        description={issuedPassword ? `Password for ${issuedPassword.name}: ${issuedPassword.value}. It is shown only once and is not recorded in the audit history.` : ""}
        confirmText="Done"
        onConfirm={() => setIssuedPassword(null)}
        onClose={() => setIssuedPassword(null)}
      />
    </AdminPage>
  );
}
