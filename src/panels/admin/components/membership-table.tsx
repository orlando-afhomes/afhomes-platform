"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useActivateMembership, useMemberships, useOperation } from "@/data/business-queries";
import type { MembershipView } from "@/data/contracts/membership-repository";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { Button, buttonVariants } from "@/shared/ui/button";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { formatDate } from "@/shared/lib/format-date";
import { useContractHref } from "./use-contract-href";

/** Membership table with its details sheet and the Activate action (gated by membership.activate). Shared by Memberships and Activation Queue. */
export function MembershipTable({ data, caption, emptyText }: { data: MembershipView[]; caption: string; emptyText: string }) {
  const memberships = useMemberships();
  const activate = useActivateMembership();
  const canActivate = useOperation("membership.activate");
  const { confirmRun, dialog } = useConfirmRun();
  const contractHref = useContractHref();
  const [detailId, setDetailId] = useState<string | null>(null);
  const all = useMemo(() => memberships.data ?? [], [memberships.data]);

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

  const activateItem = (item: MembershipView) =>
    canActivate && item.status === "pending" && item.eligible
      ? [{ key: "activate", label: "Activate", onClick: () => confirmRun({ title: "Activate this membership?", description: `${item.customerName}'s membership becomes Active today and a VIP Card ID is issued. A Card ID is never regenerated.`, confirmText: "Activate", action: () => activate.mutateAsync(item.id), successTitle: "Membership activated and Card ID issued.", errorTitle: "Could not activate" }) }]
      : [];
  const detail = detailId ? all.find((item) => item.id === detailId) ?? null : null;
  const tableProps = {
    onRowOpen: (row: MembershipView) => setDetailId(row.id),
    getRowLabel: (row: MembershipView) => `Open membership of ${row.customerName}`,
    rowActions: (row: MembershipView) => <RowActionsMenu itemName={`membership of ${row.customerName}`} onView={() => setDetailId(row.id)} extraItems={activateItem(row)} />,
  };


  return (
    <>
      {dialog}
      <DataTable data={data} columns={columns} getRowId={(row) => row.id} emptyText={emptyText} caption={caption} {...tableProps} />
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
