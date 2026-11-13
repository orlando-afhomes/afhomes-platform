"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import type { OrgMember } from "@/modules/organization/types";
import type { AccreditationRecord } from "@/modules/accreditation/types";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMockStore } from "@/shared/providers/mock-store-provider";
import { useAccreditations, useChangeSalesNetworkMemberStatus, useIssuePendingAccreditation, useMembers, useRenewAccreditation } from "@/data/queries";
import { aaDisplay, designationLabel, resolveAccreditationDisplay, teamDisplayName } from "@/modules/sales-network/display";
import { resolveRenewTarget, buildMemberMenuProps } from "../actions/sales-network-actions";
import { ConfirmDialog } from "@/shared/components/modern/confirm-dialog";
import { formatDate } from "@/shared/lib/format-date";
import { toast } from "sonner";
import { hasOperationPermission } from "@/modules/identity/permissions";
import { resolveEffectiveModules } from "@/data/mock/authorization";
import { PageContainer } from "@/shared/components/modern/page-container";
import { PageHeader } from "@/shared/components/modern/page-header";
import { DataTable, type ColumnDef, type DataTableColumnMeta } from "@/shared/components/modern/data-table";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { AdminPage } from "@/shared/components/admin";
import { StatusBadge } from "@/shared/components/modern/status-badge";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { Button } from "@/shared/ui/button";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { AccreditationStatusAction } from "../components/accreditation-status-action";
import { DesignationBadge } from "@/shared/components/business/designation-badge";
import { AccreditedSellerDialog } from "./sales-network-accredited-seller-dialog";

const SalesNetworkMemberDialogs = dynamic(() => import("./sales-network-member-dialogs").then((mod) => mod.SalesNetworkMemberDialogs), {
  loading: () => null,
});

// Narrow screens keep member, status, and actions; the accreditation control
// moves under the member name below 768px so it stays reachable.
const FROM_SM: DataTableColumnMeta = { className: "tw:hidden tw:sm:table-cell" };
const FROM_MD: DataTableColumnMeta = { className: "tw:hidden tw:md:table-cell" };
const FROM_LG: DataTableColumnMeta = { className: "tw:hidden tw:lg:table-cell" };
const FROM_XL: DataTableColumnMeta = { className: "tw:hidden tw:xl:table-cell" };

const withAll = (label: string, items: Array<{ value: string; label: string }>) => [{ value: "all", label }, ...items];
const DESIGNATION_ITEMS = withAll("All designations", ["SVD", "SSM", "SM", "OST"].map((value) => ({ value, label: value })));
const STATUS_ITEMS = withAll("All statuses", [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
]);
const ACCREDITATION_ITEMS = withAll("All accreditation", [
  { value: "pending", label: "Pending" },
  { value: "accredited", label: "Accredited" },
  { value: "expired", label: "Expired" },
  { value: "none", label: "No record" },
]);

export function SalesNetworkMembersPage() {
  const router = useRouter();
  const { identity } = useDevIdentity();
  const store = useMockStore();
  const granted = resolveEffectiveModules(store, identity);
  const membersQuery = useMembers();
  const accreditationsQuery = useAccreditations();
  const { confirmRun, dialog: confirmDialog } = useConfirmRun();

  const [search, setSearch] = useState("");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [accreditationFilter, setAccreditationFilter] = useState("all");
  const [sortAsc, setSortAsc] = useState(true);

  const [accreditedMode, setAccreditedMode] = useState<"IST" | "OST" | null>(null);
  const [editMember, setEditMember] = useState<OrgMember | null>(null);
  const [transferMember, setTransferMember] = useState<OrgMember | null>(null);
  const [accreditMember, setAccreditMember] = useState<OrgMember | null>(null);
  const [renewTarget, setRenewTarget] = useState<{ record: AccreditationRecord; memberName: string } | null>(null);
  const { mutateAsync: changeStatus } = useChangeSalesNetworkMemberStatus();
  const issuePending = useIssuePendingAccreditation();
  const renewAccreditation = useRenewAccreditation();

  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);

  const canManage = hasOperationPermission(identity, "sales-network.manage");
  const canTransfer = hasOperationPermission(identity, "sales-network.transfer");
  const canChangeStatus = hasOperationPermission(identity, "sales-network.status");
  const canEditAccreditation = identity.status === "active" && identity.roles.includes("super_admin");
  const canRenew = identity.status === "active" && identity.roles.some((role) => role === "super_admin" || role === "admin");
  const isAdmin = identity.roles.some((role) => role === "super_admin" || role === "admin");

  const accreditationRecordsByMember = useMemo(() => {
    const map = new Map<string, AccreditationRecord[]>();
    const records = accreditationsQuery.data ?? [];
    for (const member of members) {
      map.set(
        member.id,
        records.filter((record) => record.memberId === member.id),
      );
    }
    return map;
  }, [accreditationsQuery.data, members]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return members
      .filter((member) => {
        if (designationFilter !== "all" && member.designation !== designationFilter) return false;
        if (statusFilter !== "all" && member.status !== statusFilter) return false;
        if (teamFilter !== "all" && teamDisplayName(member, members) !== teamFilter) return false;
        if (accreditationFilter !== "all") {
          const state = resolveAccreditationDisplay(accreditationRecordsByMember.get(member.id));
          if (accreditationFilter === "none" && state.kind !== "none") return false;
          if (accreditationFilter === "pending" && !(state.kind === "action" && state.value === "pending")) return false;
          if (accreditationFilter === "accredited" && !(state.kind === "action" && state.value === "active")) return false;
          if (accreditationFilter === "expired" && !(state.kind === "static" && state.label === "Expired")) return false;
        }
        // An old AA number from the AA Number History finds the member under the current number (doc 03 section 5.2.1).
        const oldNumberMatches = (accreditationRecordsByMember.get(member.id) ?? []).some((record) => record.aaNumberHistory?.some((entry) => entry.aaNumber.toLowerCase().includes(term)));
        return term === "" || member.displayName.toLowerCase().includes(term) || (member.aaNumber ?? "").toLowerCase().includes(term) || oldNumberMatches;
      })
      .sort((a, b) => (sortAsc ? a.displayName.localeCompare(b.displayName) : b.displayName.localeCompare(a.displayName)));
  }, [members, search, designationFilter, statusFilter, teamFilter, accreditationFilter, accreditationRecordsByMember, sortAsc]);

  const teamItems = useMemo(
    () => withAll("All teams", Array.from(new Set(members.map((member) => teamDisplayName(member, members)))).sort().map((team) => ({ value: team, label: team }))),
    [members],
  );

  // Memoized: TanStack renders cell functions as components, so a new columns
  // array on every render would remount every cell (and its open menus).
  const columns = useMemo<ColumnDef<OrgMember, unknown>[]>(() => {
    const toggleStatus = (record: OrgMember) => {
      const reactivate = record.status !== "active";
      confirmRun({
        title: reactivate ? `Reactivate ${record.displayName}?` : `Deactivate ${record.displayName}?`,
        description: reactivate ? "The member will regain active access." : "The member will lose active access and move to Inactive.",
        confirmText: reactivate ? "Reactivate" : "Deactivate",
        danger: !reactivate,
        action: () => changeStatus({ id: record.id, status: reactivate ? "active" : "inactive" }),
        successTitle: reactivate ? "Member reactivated." : "Member deactivated.",
        successDescription: `${record.displayName} is now ${reactivate ? "Active" : "Inactive"}.`,
        errorTitle: "Status update failed.",
      });
    };
    const accreditation = (record: OrgMember) => (
      <AccreditationStatusAction
        records={accreditationRecordsByMember.get(record.id)}
        aaNumber={record.aaNumber ?? null}
        canEdit={canEditAccreditation}
        memberId={record.id}
        memberName={record.displayName}
      />
    );
    return [
      { id: "aaNumber", header: "AA Number", meta: FROM_LG, cell: ({ row }) => <span className="tw:text-muted-foreground">{aaDisplay(row.original)}</span> },
      {
        id: "displayName",
        header: "Member",
        cell: ({ row }) => (
          <div className="tw:flex tw:flex-col tw:gap-1">
            <Link className="tw:inline-flex tw:min-h-11 tw:items-center tw:font-semibold tw:text-primary tw:underline-offset-4 tw:hover:underline tw:sm:min-h-0" href={`/admin/sales-network/members/${row.original.aaNumber ?? row.original.id}`}>
              {row.original.displayName}
            </Link>
            <div className="tw:md:hidden">{accreditation(row.original)}</div>
          </div>
        ),
      },
      {
        id: "designation",
        header: "Position",
        meta: FROM_MD,
        cell: ({ row }) => <DesignationBadge designation={row.original.designation} full />,
      },
      { id: "team", header: "Team", meta: FROM_XL, cell: ({ row }) => teamDisplayName(row.original, members) },
      {
        id: "parent",
        header: "Parent",
        meta: FROM_XL,
        cell: ({ row }) => {
          const parent = members.find((member) => member.id === row.original.parentId);
          if (!parent) return "—";
          const firstName = parent.displayName.trim().split(/\s+/)[0] ?? parent.displayName;
          return `${firstName} (${designationLabel(parent.designation)})`;
        },
      },
      { id: "status", header: "Status", meta: FROM_SM, cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { id: "accreditationStatus", header: "Accreditation Status", meta: FROM_MD, cell: ({ row }) => accreditation(row.original) },
      {
        id: "actions",
        header: () => <span className="tw:sr-only">Actions</span>,
        cell: ({ row }) => {
          const record = row.original;
          const records = accreditationRecordsByMember.get(record.id);
          const renew = resolveRenewTarget(records);
          return (
            <RowActionsMenu
              {...buildMemberMenuProps(
                record,
                {
                  canManage,
                  canTransfer,
                  canChangeStatus,
                  canReactivate: isAdmin,
                  canEditAccreditation,
                  canRenew,
                  accreditationNone: resolveAccreditationDisplay(records).kind === "none",
                  renewalAllowed: renew.open,
                },
                {
                  onView: () => router.push(`/admin/sales-network/members/${record.aaNumber ?? record.id}`),
                  onEdit: () => setEditMember(record),
                  onTransfer: () => setTransferMember(record),
                  onChangeStatus: () => toggleStatus(record),
                  onSetAccreditation: () => setAccreditMember(record),
                  onRenew: renew.record ? () => setRenewTarget({ record: renew.record as AccreditationRecord, memberName: record.displayName }) : undefined,
                },
              )}
            />
          );
        },
      },
    ];
  }, [members, accreditationRecordsByMember, canEditAccreditation, canRenew, canManage, canTransfer, canChangeStatus, isAdmin, changeStatus, confirmRun, setEditMember, setTransferMember, setAccreditMember, setRenewTarget, router]);

  if (!granted.has("sales-network")) {
    return (
      <PageContainer>
        <PageHeader title="Access restricted" description="This account does not have access to Sales Network." />
      </PageContainer>
    );
  }

  const sortLabel = sortAsc ? "Sort A-Z" : "Sort Z-A";

  return (
    <AdminPage
      anyOf={["sales-network"]}
      title="Sales Network Members"
      description="Authorized member directory, scoped by genealogy permissions."
      crumbs={[{ label: "Sales Network" }, { label: "Members" }]}
      actions={
        canManage ? (
          <>
            <Button className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setAccreditedMode("IST")}>
              Add IST
            </Button>
            <Button variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setAccreditedMode("OST")}>
              Add OST
            </Button>
          </>
        ) : null
      }
    >
      <FilterBar
        search={search}
        onSearch={setSearch}
        searchLabel="Search members"
        filters={[
          { label: "Designation filter", value: designationFilter, onChange: setDesignationFilter, options: DESIGNATION_ITEMS },
          { label: "Status filter", value: statusFilter, onChange: setStatusFilter, options: STATUS_ITEMS },
          { label: "Team filter", value: teamFilter, onChange: setTeamFilter, options: teamItems },
          { label: "Accreditation status filter", value: accreditationFilter, onChange: setAccreditationFilter, options: ACCREDITATION_ITEMS },
        ]}
      >
        <Button variant="outline" className="tw:h-11 tw:md:flex-none" onClick={() => setSortAsc((value) => !value)} aria-label={sortLabel}>
          {sortAsc ? <ArrowDownAZ aria-hidden="true" /> : <ArrowUpAZ aria-hidden="true" />}
          {sortLabel}
        </Button>
      </FilterBar>
      <DataTable<OrgMember>
        caption="Sales Network members"
        data={filtered}
        columns={columns}
        getRowId={(member) => member.id}
        emptyText="No members found."
        loading={membersQuery.isLoading}
        onRowOpen={(record) => router.push(`/admin/sales-network/members/${record.aaNumber ?? record.id}`)}
      />
      <SalesNetworkMemberDialogs
        editMember={editMember}
        transferMember={transferMember}
        onCloseEdit={() => setEditMember(null)}
        onCloseTransfer={() => setTransferMember(null)}
      />
      {accreditedMode ? (
        <AccreditedSellerDialog
          mode={accreditedMode}
          open
          onClose={() => setAccreditedMode(null)}
          onCreated={(memberKey) => {
            setAccreditedMode(null);
            router.push(`/admin/sales-network/members/${memberKey}`);
          }}
        />
      ) : null}
      {confirmDialog}
      <ConfirmDialog
        open={accreditMember !== null}
        title="Create Pending Accreditation"
        description={`Create a pending accreditation with automatic AA issuance for seller ${accreditMember?.displayName ?? ""}?`}
        confirmText="Create"
        pending={issuePending.isPending}
        onConfirm={() => {
          const target = accreditMember;
          if (!target) return;
          void issuePending.mutateAsync(target.id).then(
            (created) => {
              setAccreditMember(null);
              toast.success("Pending accreditation created.", {
                description: `Issued ${created.aaNumber ?? "AA number"}. Accreditation stays Pending until approval.`,
              });
            },
            (err: unknown) => {
              setAccreditMember(null);
              toast.error("Creation failed.", { description: err instanceof Error ? err.message : "Failed to create accreditation." });
            },
          );
        }}
        onClose={() => setAccreditMember(null)}
      />
      <ConfirmDialog
        open={renewTarget !== null}
        title="Renew accreditation?"
        description={`Renew the accreditation of ${renewTarget?.memberName ?? ""} today? A new AA number is issued for this month and is valid for one year from today. The current number ${renewTarget?.record.aaNumber} is kept in the AA Number History, and all sales, team and referrer links carry over.`}
        confirmText="Renew"
        pending={renewAccreditation.isPending}
        onConfirm={() => {
          const target = renewTarget;
          if (!target) return;
          void renewAccreditation.mutateAsync({ recordId: target.record.id, expectedAaNumber: target.record.aaNumber ?? undefined }).then(
            (renewed) => {
              setRenewTarget(null);
              toast.success("Accreditation renewed.", { description: `New AA number ${renewed.aaNumber ?? ""}, valid until ${formatDate(renewed.expiryDate)}.` });
            },
            (err: unknown) => {
              setRenewTarget(null);
              toast.error("Renewal failed.", { description: err instanceof Error ? err.message : "Failed to renew accreditation." });
            },
          );
        }}
        onClose={() => setRenewTarget(null)}
      />
    </AdminPage>
  );
}
