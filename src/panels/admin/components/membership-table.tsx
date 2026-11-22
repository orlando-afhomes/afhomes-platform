"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useActivateMembership, useMemberships, useOperation, useRecordCardClaim } from "@/data/business-queries";
import type { MembershipView } from "@/data/contracts/membership-repository";
import type { TableOrder } from "@/shared/lib/table-order";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { Button, buttonVariants } from "@/shared/ui/button";
import { EMPTY } from "@/shared/lib/empty-value";
import { MemberQrButton } from "./member-qr";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu, type RowActionItem } from "@/shared/components/modern/row-actions-menu";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { formatDate } from "@/shared/lib/format-date";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { humanize } from "@/shared/lib/humanize";
import { matchesSearch, optionsFrom } from "@/shared/lib/search";
import { useContractHref } from "./use-contract-href";
import { CardServiceDialog } from "./card-service-dialog";

/** Newest activation first; payment holds and pending activations rise ahead on the same date. */
const MEMBERSHIP_ORDER: TableOrder<MembershipView> = {
  date: (row) => row.activationDate ?? row.createdAt,
  attention: (row) => (row.financialHold ? 3 : row.status === "pending" ? 2 : 0),
};

/** A Financial Hold is shown as the membership's status (one badge, one filter value). */
const statusKey = (item: MembershipView) => (item.financialHold ? "financial_hold" : item.status);
const statusLabel = (key: string) => (key === "financial_hold" ? "Payment Hold" : humanize(key));
function MembershipStatusBadge({ item }: { item: MembershipView }) {
  return item.financialHold ? <BizBadge status="on_hold" label="Payment Hold" /> : <BizBadge status={item.status} />;
}

/** Membership table with its details sheet and the Activate action (gated by membership.activate). Shared by Memberships and Activation Queue. */
export function MembershipTable({ data, caption, emptyText }: { data: MembershipView[]; caption: string; emptyText: string }) {
  const memberships = useMemberships();
  const activate = useActivateMembership();
  const claim = useRecordCardClaim();
  const canActivate = useOperation("membership.activate");
  const canService = useOperation("contracts.approve");
  const { confirmRun, dialog } = useConfirmRun();
  const contractHref = useContractHref();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [servicing, setServicing] = useState<MembershipView | null>(null);
  const all = useMemo(() => memberships.data ?? [], [memberships.data]);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const visible = useMemo(
    () => data.filter((item) => (planFilter === "all" || item.productName === planFilter) && (statusFilter === "all" || statusKey(item) === statusFilter) && matchesSearch(search, item.customerName, item.cardId)),
    [data, search, planFilter, statusFilter],
  );
  const planOptions = useMemo(() => optionsFrom("All plans", data.map((item) => item.productName)), [data]);
  const statusOptions = useMemo(() => optionsFrom("All statuses", data.map(statusKey), statusLabel), [data]);

  const columns = useMemo<ColumnDef<MembershipView, unknown>[]>(
    () => [
      { id: "customer", header: "Customer", cell: ({ row }) => <span className="tw:font-semibold">{row.original.customerName}</span> },
      { id: "card", header: "Card Number", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => <span className="tw:font-mono">{row.original.cardId ?? EMPTY}</span> },
      { id: "plan", header: "Plan", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => row.original.productName },
      { id: "status", header: "Status", cell: ({ row }) => <MembershipStatusBadge item={row.original} /> },
      { id: "activation", header: "Activated", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => formatDate(row.original.activationDate) },
    ],
    [],
  );

  const activateItem = (item: MembershipView): RowActionItem[] => {
    const activating = activate.isPending && activate.variables === item.id;
    if (canActivate && item.status === "pending" && item.eligible) {
      return [{
        key: "activate",
        label: "Activate",
        tone: "success" as const,
        loading: activating,
        disabled: activate.isPending,
        onClick: () => {
          // One request per click, even if the row menu is reopened before the refresh settles.
          if (activate.isPending) return;
          void activate.mutateAsync(item.id).then(() => toast.success("Membership activated."), (error: unknown) => toast.error("Could not activate", { description: error instanceof Error ? error.message : "Request failed." }));
        },
      }];
    }
    if (item.status !== "active") return [];
    return [
      ...(canService && item.cardId ? [{ key: "service", label: "Service Card", tone: "default" as const, onClick: () => setServicing(item) }] : []),
      ...(canActivate && item.fullSettlementDate && !item.cardClaimDate ? [{ key: "claim", label: "Record Card Claim", tone: "success" as const, onClick: () => confirmRun({ title: "Record Card Claim?", description: "Confirm that the cardholder collected the card today.", confirmText: "Record Claim", tone: "success", action: () => claim.mutateAsync(item.id), successTitle: "Card claim recorded.", errorTitle: "Could not record claim" }) }] : []),
    ];
  };
  const detail = detailId ? all.find((item) => item.id === detailId) ?? null : null;
  const tableProps = {
    onRowOpen: (row: MembershipView) => setDetailId(row.id),
    getRowLabel: (row: MembershipView) => `Open membership of ${row.customerName}`,
    rowActions: (row: MembershipView) => <RowActionsMenu itemName={`membership of ${row.customerName}`} extraItems={activateItem(row)} />,
  };


  return (
    <>
      {dialog}
      {servicing ? <CardServiceDialog membership={servicing} onClose={() => setServicing(null)} /> : null}
      <FilterBar search={search} onSearch={setSearch} searchLabel="Search memberships" filters={[
        { label: "Plan filter", value: planFilter, onChange: setPlanFilter, options: planOptions },
        { label: "Status filter", value: statusFilter, onChange: setStatusFilter, options: statusOptions },
      ]} />
      <DataTable data={visible} columns={columns} getRowId={(row) => row.id} emptyText={data.length === 0 ? emptyText : "No memberships match the filters."} caption={caption} orderBy={MEMBERSHIP_ORDER} {...tableProps} />
      <RecordDetailsSheet
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail?.customerName ?? "Membership"}
        subtitle={detail?.productName}
        badge={detail ? <MembershipStatusBadge item={detail} /> : undefined}
        sections={
          detail
            ? [
                {
                  title: "Membership",
                  rows: [
                    ...(detail.financialHold ? [{ label: "Membership status", value: <BizBadge status={detail.status} /> }] : []),
                    { label: "Card number", value: detail.cardId ? <span className="tw:font-mono">{detail.cardId}</span> : null },
                    { label: "Activated", value: detail.activationDate ? formatDate(detail.activationDate) : null },
                    { label: "Card Claim Date", value: detail.cardClaimDate ? `${formatDate(detail.cardClaimDate)}${detail.cardClaimKind === "deemed" ? " (deemed)" : ""}` : null },
                    { label: "Valid until", value: detail.validityEndDate ? formatDate(detail.validityEndDate) : null },
                  ],
                },
                ...(detail.status === "pending"
                  ? [{ title: "Activation", rows: [{ label: "Ready", value: detail.eligible ? "Eligible to activate" : "Not yet eligible" }, ...detail.blockers.map((blocker, index) => ({ label: index === 0 ? "Blocked by" : "", value: blocker }))] }]
                  : []),
              ]
            : []
        }
        footer={
          detail ? (
            <>
              {activateItem(detail).map((item) => <Button key={item.key} type="button" variant={item.tone === "success" ? "success" : "default"} loading={item.loading} disabled={item.disabled} onClick={item.onClick}>{item.label}</Button>)}
              {detail.status === "active" && detail.cardId ? <MemberQrButton membershipId={detail.id} /> : null}
              <Link href={contractHref(detail.contractId)} className={buttonVariants({ variant: "info" })}>Open Contract</Link>
            </>
          ) : undefined
        }
      />
    </>
  );
}
