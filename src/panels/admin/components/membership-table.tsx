"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useActivateMembership, useMemberships, useOperation, useRecordCardClaim } from "@/data/business-queries";
import type { MembershipView } from "@/data/contracts/membership-repository";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { Button, buttonVariants } from "@/shared/ui/button";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { formatDate } from "@/shared/lib/format-date";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { humanize } from "@/shared/lib/humanize";
import { matchesSearch, optionsFrom } from "@/shared/lib/search";
import { useContractHref } from "./use-contract-href";
import { CardServiceDialog } from "./card-service-dialog";

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
    () => data.filter((item) => (planFilter === "all" || item.productName === planFilter) && (statusFilter === "all" || item.status === statusFilter) && matchesSearch(search, item.customerName, item.cardId)),
    [data, search, planFilter, statusFilter],
  );
  const planOptions = useMemo(() => optionsFrom("All plans", data.map((item) => item.productName)), [data]);
  const statusOptions = useMemo(() => optionsFrom("All statuses", data.map((item) => item.status), humanize), [data]);

  const columns = useMemo<ColumnDef<MembershipView, unknown>[]>(
    () => [
      { id: "customer", header: "Customer", cell: ({ row }) => <Link href={contractHref(row.original.contractId)} className="tw:font-semibold tw:underline-offset-4 tw:hover:underline">{row.original.customerName}</Link> },
      { id: "plan", header: "Plan", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => `${row.original.productName}` },
      { id: "card", header: "Card ID", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => <span className="tw:font-mono">{row.original.cardId ?? "Not issued"}</span> },
      { id: "activation", header: "Activated", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => formatDate(row.original.activationDate) },
      { id: "valid", header: "Valid until", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => formatDate(row.original.validityEndDate) },
      { id: "status", header: "Status", cell: ({ row }) => <div className="tw:flex tw:flex-col tw:gap-1"><BizBadge status={row.original.status} />{row.original.financialHold ? <BizBadge status="on_hold" label="Financial Hold" /> : null}</div> },
    ],
    [contractHref],
  );

  const activateItem = (item: MembershipView) => {
    if (canActivate && item.status === "pending" && item.eligible) {
      return [{ key: "activate", label: "Activate", onClick: () => confirmRun({ title: "Activate this membership?", description: `${item.customerName}'s membership becomes Active using the issued VIP Number.`, confirmText: "Activate", action: () => activate.mutateAsync(item.id), successTitle: "Membership activated.", errorTitle: "Could not activate" }) }];
    }
    if (item.status !== "active") return [];
    return [
      ...(canActivate && item.fullSettlementDate && !item.cardClaimDate ? [{ key: "claim", label: "Record card claim", onClick: () => confirmRun({ title: "Record card claim?", description: "Confirm that the cardholder collected the card today.", confirmText: "Record claim", action: () => claim.mutateAsync(item.id), successTitle: "Card claim recorded.", errorTitle: "Could not record claim" }) }] : []),
      ...(canService && item.cardId ? [{ key: "service", label: "Service card", onClick: () => setServicing(item) }] : []),
    ];
  };
  const detail = detailId ? all.find((item) => item.id === detailId) ?? null : null;
  const tableProps = {
    onRowOpen: (row: MembershipView) => setDetailId(row.id),
    getRowLabel: (row: MembershipView) => `Open membership of ${row.customerName}`,
    rowActions: (row: MembershipView) => <RowActionsMenu itemName={`membership of ${row.customerName}`} onView={() => setDetailId(row.id)} extraItems={activateItem(row)} />,
  };


  return (
    <>
      {dialog}
      {servicing ? <CardServiceDialog membership={servicing} onClose={() => setServicing(null)} /> : null}
      <FilterBar search={search} onSearch={setSearch} searchLabel="Search memberships" filters={[
        { label: "Plan filter", value: planFilter, onChange: setPlanFilter, options: planOptions },
        { label: "Status filter", value: statusFilter, onChange: setStatusFilter, options: statusOptions },
      ]} />
      <DataTable data={visible} columns={columns} getRowId={(row) => row.id} emptyText={data.length === 0 ? emptyText : "No memberships match the filters."} caption={caption} {...tableProps} />
      <RecordDetailsSheet
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail?.customerName ?? "Membership"}
        subtitle={detail?.productName}
        badge={detail ? <div className="tw:flex tw:flex-wrap tw:gap-1"><BizBadge status={detail.status} />{detail.financialHold ? <BizBadge status="on_hold" label="Financial Hold" /> : null}</div> : undefined}
        sections={
          detail
            ? [
                {
                  title: "Membership",
                  rows: [
                    { label: "Card ID", value: detail.cardId ? <span className="tw:font-mono">{detail.cardId}</span> : "Not issued" },
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
              {activateItem(detail).map((item) => <Button key={item.key} type="button" onClick={item.onClick}>{item.label}</Button>)}
              <Link href={contractHref(detail.contractId)} className={buttonVariants({ variant: "outline" })}>Open contract</Link>
            </>
          ) : undefined
        }
      />
    </>
  );
}
