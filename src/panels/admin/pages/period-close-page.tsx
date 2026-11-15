"use client";

import { useState } from "react";
import { useClosedMonths, useCloseMonth, useOperation } from "@/data/business-queries";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { formatDate } from "@/shared/lib/format-date";
import { addMonthsToDate, manilaToday } from "@/shared/lib/dates";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import type { ClosedMonth } from "@/modules/finance/month-close";
import { formatPeso } from "@/shared/lib/money";
import { ReportExport, type ReportColumn } from "../components/report-shell";

const columns: ColumnDef<ClosedMonth>[] = [
  { accessorKey: "month", header: "Month" },
  { id: "sales", header: "Sales", cell: ({ row }) => <Money value={row.original.recognizedSalesCentavos} /> },
  { id: "collections", header: "Net collections", cell: ({ row }) => <Money value={row.original.grossCollectionsCentavos - row.original.adjustedCollectionsCentavos} /> },
  { id: "commissions", header: "Commission", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => <Money value={row.original.releasedCommissionCentavos} /> },
  { id: "closedAt", header: "Closed on", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => formatDate(row.original.closedAt) },
];

const allowanceTotal = (month: ClosedMonth) => {
  const allowance = month.allowanceReviewCentavos;
  return allowance ? formatPeso(allowance.baCentavos + allowance.paCentavos + allowance.pbCentavos) : "No reviews";
};

const EXPORT_COLUMNS: ReportColumn<ClosedMonth>[] = [
  { header: "Month", value: (month) => month.month },
  { header: "Recognized sales", value: (month) => formatPeso(month.recognizedSalesCentavos) },
  { header: "Net collections", value: (month) => formatPeso(month.grossCollectionsCentavos - month.adjustedCollectionsCentavos) },
  { header: "Released commission", value: (month) => formatPeso(month.releasedCommissionCentavos) },
  { header: "Reviewed allowances", value: allowanceTotal },
  { header: "Closed on", value: (month) => formatDate(month.closedAt) },
];

/** Month-end close tab of the Finance area. The area page gates it on [reports] + finance.verify; closing needs contracts.approve. */
export function PeriodClosePanel() {
  const canClose = useOperation("contracts.approve");
  const months = useClosedMonths();
  const close = useCloseMonth();
  const { confirmRun, dialog } = useConfirmRun();
  const latest = addMonthsToDate(manilaToday(), -1)?.slice(0, 7) ?? "";
  const [month, setMonth] = useState(latest);
  const [detailMonth, setDetailMonth] = useState<string | null>(null);
  const detail = detailMonth ? months.data?.find((item) => item.month === detailMonth) ?? null : null;
  return (
    <>
      {dialog}
      {canClose ? (
        <div className="tw:flex tw:flex-wrap tw:items-end tw:gap-3">
          <div className="tw:grid tw:gap-2">
            <Label htmlFor="close-month">Month</Label>
            <Input id="close-month" type="month" max={latest} value={month} onChange={(event) => setMonth(event.target.value)} />
          </div>
          <Button disabled={!month || month > latest || close.isPending || months.data?.some((item) => item.month === month)} onClick={() => confirmRun({
            title: "Close this month?",
            description: `The totals for ${month} will be locked.`,
            confirmText: "Close month",
            action: () => close.mutateAsync(month),
            successTitle: "Month closed.",
            errorTitle: "Could not close month",
          })}>Close month</Button>
        </div>
      ) : null}
      <ReportExport report="Period Close" fileName="period-close" columns={EXPORT_COLUMNS} rows={months.data ?? []} range={null} printable={false} />
      <QueryState isLoading={months.isLoading} error={months.error}>
        <DataTable data={months.data ?? []} columns={columns} getRowId={(row) => row.month} caption="Closed months" emptyText="No months have been closed." onRowOpen={(row) => setDetailMonth(row.month)} getRowLabel={(row) => `View closed month ${row.month}`} rowActions={(row) => <RowActionsMenu itemName={`closed month ${row.month}`} onView={() => setDetailMonth(row.month)} />} />
      </QueryState>
      <RecordDetailsSheet
        open={detail !== null}
        onClose={() => setDetailMonth(null)}
        title={detail ? `Closed month ${detail.month}` : "Closed month"}
        sections={
          detail
            ? [
                {
                  rows: [
                    { label: "Recognized sales", value: <Money value={detail.recognizedSalesCentavos} /> },
                    { label: "Net collections", value: <Money value={detail.grossCollectionsCentavos - detail.adjustedCollectionsCentavos} /> },
                    { label: "Released commission", value: <Money value={detail.releasedCommissionCentavos} /> },
                    { label: "Reviewed allowances", value: allowanceTotal(detail) },
                    { label: "Closed on", value: formatDate(detail.closedAt) },
                  ],
                },
              ]
            : []
        }
      />
    </>
  );
}
