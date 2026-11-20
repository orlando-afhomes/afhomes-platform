"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import type { OrgMember } from "@/modules/organization/types";
import type { TableOrder } from "@/shared/lib/table-order";
import type { AccreditationRecord } from "@/modules/accreditation/types";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMockStore } from "@/shared/providers/mock-store-provider";
import { useAccreditations, useChangeSalesNetworkMemberStatus, useIssuePendingAccreditation, useMembers, useRenewAccreditation } from "@/data/queries";
import { designationLabel, resolveAccreditationDisplay, teamDisplayName } from "@/modules/sales-network/display";
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

// Narrow screens keep name, accreditation, and actions so the accreditation
// control stays reachable; the other columns appear as the screen widens.
const FROM_SM: DataTableColumnMeta = { className: "tw:hidden tw:sm:table-cell" };
const FROM_MD: DataTableColumnMeta = { className: "tw:hidden tw:md:table-cell" };
const FROM_LG: DataTableColumnMeta = { className: "tw:hidden tw:lg:table-cell" };

const withAll = (label: string, items: Array<{ value: string; label: string }>) => [{ value: "all", label }, ...items];
const DESIGNATION_ITEMS = withAll("All positions", ["SVD", "SSM", "SM", "OST"].map((value) => ({ value, label: designationLabel(value) })));
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

/** Newest membership event first; suspended and inactive members rise ahead on the same date. */
const MEMBER_ORDER: TableOrder<OrgMember> = {
  date: (row) => row.parentHistory?.at(-1)?.changedAt ?? null,
  attention: (row) => (row.status === "suspended" ? 2 : row.status === "inactive" ? 1 : 0),
};

/** The area page owns "Add IST" and "Add OST" in the page header and passes the open dialog down. */
export function SalesNetworkMembersPage({
  embedded = false,
  accreditedMode = null,
  onAccreditedModeChange,
}: {
  embedded?: boolean;
  accreditedMode?: "IST" | "OST" | null;
  onAccreditedModeChange?: (mode: "IST" | "OST" | null) => void;
} = {}) {
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
  const [sort, setSort] = useState<"newest" | "asc" | "desc">("newest");

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
      .sort((a, b) => (sort === "asc" ? 1 : sort === "desc" ? -1 : 0) * a.displayName.localeCompare(b.displayName));
  }, [members, search, designationFilter, statusFilter, teamFilter, accreditationFilter, accreditationRecordsByMember, sort]);

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
        danger: !reactivate, tone: reactivate ? "success" : "destructive",
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
      {
        id: "displayName",
        header: "Name",
        cell: ({ row }) => (
          <span className="tw:font-semibold">{row.original.displayName}</span>
        ),
      },
      {
        id: "designation",
        header: "Position",
        meta: FROM_MD,
        cell: ({ row }) => <DesignationBadge designation={row.original.designation} full />,
      },
      { id: "team", header: "Team", meta: FROM_LG, cell: ({ row }) => teamDisplayName(row.original, members) },
      { id: "accreditationStatus", header: "Accreditation", cell: ({ row }) => accreditation(row.original) },
      { id: "status", header: "Status", meta: FROM_SM, cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const record = row.original;
          const records = accreditationRecordsByMember.get(record.id);
          const renew = resolveRenewTarget(records);
          const menu = buildMemberMenuProps(
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
              onEdit: () => setEditMember(record),
              onTransfer: () => setTransferMember(record),
              onChangeStatus: () => toggleStatus(record),
              onSetAccreditation: () => setAccreditMember(record),
              onRenew: renew.record ? () => setRenewTarget({ record: renew.record as AccreditationRecord, memberName: record.displayName }) : undefined,
            },
          );
          return <RowActionsMenu {...menu} />;
        },
      },
    ];
  }, [members, accreditationRecordsByMember, canEditAccreditation, canRenew, canManage, canTransfer, canChangeStatus, isAdmin, changeStatus, confirmRun, setEditMember, setTransferMember, setAccreditMember, setRenewTarget]);

  if (!granted.has("sales-network-members")) {
    return (
      <PageContainer>
        <PageHeader title="Access Restricted" description="This account does not have access to Sales Network." />
      </PageContainer>
    );
  }

  const sortLabel = sort === "newest" ? "Sort A-Z" : sort === "asc" ? "Sort Z-A" : "Newest first";

  return (
    <AdminPage
      embedded={embedded}
      anyOf={["sales-network-members"]}
      title="Sales Network Members"
      crumbs={[{ label: "Sales Network" }, { label: "Members" }]}
    >
      <FilterBar
        search={search}
        onSearch={setSearch}
        searchLabel="Search members"
        filters={[
          { label: "Position filter", value: designationFilter, onChange: setDesignationFilter, options: DESIGNATION_ITEMS },
          { label: "Status filter", value: statusFilter, onChange: setStatusFilter, options: STATUS_ITEMS },
          { label: "Team filter", value: teamFilter, onChange: setTeamFilter, options: teamItems },
          { label: "Accreditation status filter", value: accreditationFilter, onChange: setAccreditationFilter, options: ACCREDITATION_ITEMS },
        ]}
      >
        <Button variant="outline" className="tw:h-11 tw:md:flex-none" onClick={() => setSort(sort === "newest" ? "asc" : sort === "asc" ? "desc" : "newest")} aria-label={sortLabel}>
          {sort === "desc" ? <ArrowUpAZ aria-hidden="true" /> : <ArrowDownAZ aria-hidden="true" />}
          {sortLabel}
        </Button>
      </FilterBar>
      <DataTable<OrgMember>
        caption="Sales Network Members"
        orderBy={sort === "newest" ? MEMBER_ORDER : undefined}
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
          onClose={() => onAccreditedModeChange?.(null)}
          onCreated={(memberKey) => {
            onAccreditedModeChange?.(null);
            router.push(`/admin/sales-network/members/${memberKey}`);
          }}
        />
      ) : null}
      {confirmDialog}
      <ConfirmDialog
        open={accreditMember !== null}
        title="Create Pending Accreditation"
        description={`Create a pending accreditation with automatic accreditation number issuance for seller ${accreditMember?.displayName ?? ""}?`}
        confirmText="Create"
        pending={issuePending.isPending}
        onConfirm={() => {
          const target = accreditMember;
          if (!target) return;
          void issuePending.mutateAsync(target.id).then(
            (created) => {
              setAccreditMember(null);
              toast.success("Pending accreditation created.", {
                description: `Issued ${created.aaNumber ?? "accreditation number"}. Accreditation stays Pending until approval.`,
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
        title="Renew Accreditation?"
        description={`Renew the accreditation of ${renewTarget?.memberName ?? ""} today? A new accreditation number is issued for this month and is valid for one year from today. The current number ${renewTarget?.record.aaNumber} is kept in the Accreditation Number History, and all sales, team and referrer links carry over.`}
        confirmText="Renew" tone="success"
        pending={renewAccreditation.isPending}
        onConfirm={() => {
          const target = renewTarget;
          if (!target) return;
          void renewAccreditation.mutateAsync({ recordId: target.record.id, expectedAaNumber: target.record.aaNumber ?? undefined }).then(
            (renewed) => {
              setRenewTarget(null);
              toast.success("Accreditation renewed.", { description: `New accreditation number ${renewed.aaNumber ?? ""}, valid until ${formatDate(renewed.expiryDate)}.` });
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
