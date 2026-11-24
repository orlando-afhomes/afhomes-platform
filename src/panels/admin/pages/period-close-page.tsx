"use client";

import { useState } from "react";
import { useClosedMonths, useCloseMonth, useOperation } from "@/data/business-queries";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { formatDate } from "@/shared/lib/format-date";
import { addMonthsToDate, manilaToday } from "@/shared/lib/dates";
import { Button } from "@/shared/ui/button";
import type { ClosedMonth } from "@/modules/finance/month-close";
import { formatPeso } from "@/shared/lib/money";
import { EMPTY } from "@/shared/lib/empty-value";
import { MonthField } from "../components/commission-shared";
import { ReportExport, type ReportColumn } from "../components/report-shell";

const columns: ColumnDef<ClosedMonth>[] = [
  { accessorKey: "month", header: "Month" },
  { id: "sales", header: "Sales", cell: ({ row }) => <Money value={row.original.recognizedSalesCentavos} /> },
  { id: "collections", header: "Net Collections", cell: ({ row }) => <Money value={row.original.grossCollectionsCentavos - row.original.adjustedCollectionsCentavos} /> },
  { id: "commissions", header: "Commission", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => <Money value={row.original.releasedCommissionCentavos} /> },
  { id: "closedAt", header: "Closed on", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => formatDate(row.original.closedAt) },
];

const allowanceTotal = (month: ClosedMonth) => {
  const allowance = month.allowanceReviewCentavos;
  return allowance ? formatPeso(allowance.baCentavos + allowance.paCentavos + allowance.pbCentavos) : EMPTY;
};

const EXPORT_COLUMNS: ReportColumn<ClosedMonth>[] = [
  { header: "Month", value: (month) => month.month },
  { header: "Recognized Sales", value: (month) => formatPeso(month.recognizedSalesCentavos) },
  { header: "Net Collections", value: (month) => formatPeso(month.grossCollectionsCentavos - month.adjustedCollectionsCentavos) },
  { header: "Commission Ready to Pay", value: (month) => formatPeso(month.releasedCommissionCentavos) },
  { header: "Reviewed Allowances", value: allowanceTotal },
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
        <section aria-label="Close a month" className="tw:flex tw:flex-wrap tw:items-end tw:gap-3 tw:rounded-xl tw:border tw:border-border tw:bg-card tw:p-4">
          <MonthField label="Month" value={month} onChange={setMonth} />
          <Button variant="destructive" loading={close.isPending} disabled={!month || month > latest || close.isPending || months.data?.some((item) => item.month === month)} onClick={() => confirmRun({
            title: "Close This Month?",
            description: `The totals for ${month} will be locked.`,
            confirmText: "Close Month", tone: "destructive",
            action: () => close.mutateAsync(month),
            successTitle: "Month closed.",
            errorTitle: "Could not close month",
          })}>Close Month</Button>
        </section>
      ) : null}
      <section aria-label="Closed months" className="tw:flex tw:flex-col tw:gap-2">
        <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2">
          <h2 className="tw:text-base tw:font-semibold">Closed Months</h2>
          <ReportExport report="Month-End" fileName="period-close" columns={EXPORT_COLUMNS} rows={months.data ?? []} range={null} printable={false} />
        </div>
        <QueryState isLoading={months.isLoading} error={months.error}>
          <DataTable data={months.data ?? []} columns={columns} getRowId={(row) => row.month} caption="Closed Months" emptyText="No months have been closed." onRowOpen={(row) => setDetailMonth(row.month)} getRowLabel={(row) => `View closed month ${row.month}`} />
        </QueryState>
      </section>
      <RecordDetailsSheet
        open={detail !== null}
        onClose={() => setDetailMonth(null)}
        title={detail ? `Closed Month ${detail.month}` : "Closed Month"}
        sections={
          detail
            ? [
                {
                  rows: [
                    { label: "Month", value: detail.month },
                    { label: "Recognized sales", value: <Money value={detail.recognizedSalesCentavos} /> },
                    { label: "Net collections", value: <Money value={detail.grossCollectionsCentavos - detail.adjustedCollectionsCentavos} /> },
                    { label: "Commission ready to pay", value: <Money value={detail.releasedCommissionCentavos} /> },
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
