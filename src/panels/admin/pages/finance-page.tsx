"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, Hourglass, Scale, Undo2 } from "lucide-react";
import { usePayments, useUnmatchedReceipts } from "@/data/business-queries";
import type { PaymentView, UnmatchedReceiptView } from "@/data/contracts/payment-repository";
import type { TableOrder } from "@/shared/lib/table-order";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { AdminStatCard, AdminStatGrid } from "@/shared/components/admin";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { formatDate } from "@/shared/lib/format-date";
import { usePaymentActions, useUnmatchedReceiptActions } from "../components/payment-actions";
import { findSuggestedMatch, periodCollections } from "@/modules/finance/rules";
import { addMonthsToDate, manilaToday } from "@/shared/lib/dates";
import { StandardDateField } from "@/shared/forms/modern";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { Button } from "@/shared/ui/button";
import { matchesSearch } from "@/shared/lib/search";

const SHOW_OPTIONS = [
  { value: "all", label: "All" },
  { value: "waiting", label: "Waiting" },
  { value: "exceptions", label: "Exceptions" },
];

/** Payment columns for the Receipts tab. */
export function usePaymentColumns() {
  return useMemo<ColumnDef<PaymentView, unknown>[]>(
    () => [
      { id: "customer", header: "Customer", cell: ({ row }) => <span className="tw:font-semibold">{row.original.customerName}</span> },
      { id: "amount", header: "Amount", cell: ({ row }) => <Money value={row.original.amountCentavos} /> },
      { id: "method", header: "Method", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => row.original.method },
      { id: "date", header: "Date", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => formatDate(row.original.paidDate) },
      { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status} /> },
    ],
    [],
  );
}

/** Unmatched-receipt columns for the Exceptions tab (F6.5). The reason is the intake note, not a decision. */
function useUnmatchedColumns() {
  return useMemo<ColumnDef<UnmatchedReceiptView, unknown>[]>(
    () => [
      { id: "reference", header: "OR / Reference", cell: ({ row }) => <span className="tw:font-semibold">{row.original.orNumber}</span> },
      { id: "amount", header: "Amount", cell: ({ row }) => <Money value={row.original.amountCentavos} /> },
      { id: "method", header: "Method", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => row.original.method },
      { id: "date", header: "Date", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => formatDate(row.original.paidDate) },
      { id: "reason", header: "Why No Match", cell: ({ row }) => row.original.reason },
    ],
    [],
  );
}
/** Newest receipt date first; unreviewed and blocked receipts rise ahead on the same date. */
const PAYMENT_ORDER: TableOrder<PaymentView> = {
  date: (row) => row.paidDate,
  attention: (row) => (row.approvalBlocked || row.referenceConflict ? 3 : row.status === "submitted" || row.status === "under_review" ? 2 : 0),
};

export function FinanceVerificationPanel() {
  const requested = useSearchParams().get("show");
  const initialShow = SHOW_OPTIONS.find((option) => option.value === requested)?.value ?? "all";
  return <ReceiptsPanel key={initialShow} initialShow={initialShow} />;
}

/** Receipts tab of the Finance area (waiting, exceptions, or every receipt). The area page gates it on [finance, sales] + finance.verify. */
function ReceiptsPanel({ initialShow }: { initialShow: string }) {
  const payments = usePayments();
  const paymentActions = usePaymentActions();
  const unmatched = useUnmatchedReceipts();
  const unmatchedActions = useUnmatchedReceiptActions();
  const columns = usePaymentColumns();
  const unmatchedColumns = useUnmatchedColumns();
  const today = manilaToday();
  const [show, setShow] = useState(initialShow);
  const [from, setFrom] = useState(addMonthsToDate(today, -1) ?? today);
  const [to, setTo] = useState(today);
  const allPayments = useMemo(() => payments.data ?? [], [payments.data]);
  const queue = useMemo(() => allPayments.filter((item) => item.status === "submitted" || item.status === "under_review").sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)), [allPayments]);
  const exceptions = useMemo(() => queue.filter((item) => item.approvalBlocked || item.referenceConflict || findSuggestedMatch(queue, item)), [queue]);
  const history = useMemo(() => [...allPayments].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)), [allPayments]);
  const openUnmatched = useMemo(() => (unmatched.data ?? []).filter((item) => item.status === "unmatched"), [unmatched.data]);
  const { gross: verifiedInPeriod, adjusted: adjustedInPeriod } = periodCollections(allPayments, from, to);

  const [search, setSearch] = useState("");
  const source = show === "all" ? history : show === "exceptions" ? exceptions : queue;
  const visible = useMemo(() => source.filter((item) => matchesSearch(search, item.customerName, item.referenceNo, item.contractLabel)), [source, search]);
  const visibleUnmatched = useMemo(() => openUnmatched.filter((item) => matchesSearch(search, item.orNumber, item.reason, item.submitterName)), [openUnmatched, search]);

  return (
    <>
      {paymentActions.dialogs}
      {unmatchedActions.dialogs}
      <AdminStatGrid>
        {show === "all" ? (
          <>
            <AdminStatCard label="Verified" value={<Money value={verifiedInPeriod} />} icon={BadgeCheck} tone="success" />
            <AdminStatCard label="Reversals and Refunds" value={<Money value={adjustedInPeriod} />} icon={Undo2} tone="danger" />
            <AdminStatCard label="Net Collections" value={<Money value={verifiedInPeriod - adjustedInPeriod} />} icon={Scale} tone="brand" />
          </>
        ) : (
          <AdminStatCard label="Awaiting Verification" value={queue.length} icon={Hourglass} tone="warning" />
        )}
      </AdminStatGrid>
      <FilterBar search={search} onSearch={setSearch} searchLabel="Search receipts" filters={[{ label: "Show", value: show, onChange: setShow, options: SHOW_OPTIONS }]}>
        {show === "all" ? (
          <>
            <StandardDateField label="Period from" value={from} onChange={setFrom} className="tw:md:w-56" />
            <StandardDateField label="Period to" value={to} onChange={setTo} className="tw:md:w-56" />
          </>
        ) : null}
      </FilterBar>
      <QueryState
        isLoading={payments.isLoading || unmatched.isLoading}
        error={payments.error ?? unmatched.error}
        onRetry={() => {
          void payments.refetch();
          void unmatched.refetch();
        }}
      >
        <DataTable data={visible} columns={columns} getRowId={(row) => row.id} emptyText={source.length > 0 ? "No receipts match the search." : show === "all" ? "No payments yet." : show === "exceptions" ? "No receipt exceptions need review." : "Nothing is waiting for verification."} caption={show === "all" ? "All payments" : show === "exceptions" ? "Receipt exceptions" : "Verification queue"} orderBy={PAYMENT_ORDER} rowActions={paymentActions.rowActions} onRowOpen={paymentActions.open} getRowLabel={(row) => `Open payment from ${row.customerName}`} />
        {show === "exceptions" ? (
          <section aria-label="Unmatched receipts" className="tw:mt-6">
            <div className="tw:mb-3 tw:flex tw:items-center tw:justify-between tw:gap-3">
              <h2 className="tw:text-lg tw:font-semibold">Unmatched Receipts</h2>
              {unmatchedActions.canRecord ? <Button type="button" variant="outline" onClick={unmatchedActions.openIntake}>Record unmatched receipt</Button> : null}
            </div>
            <DataTable data={visibleUnmatched} columns={unmatchedColumns} getRowId={(row) => row.id} emptyText={openUnmatched.length > 0 ? "No unmatched receipts match the search." : "No unmatched receipts waiting for Finance review."} caption="Unmatched receipts" rowActions={unmatchedActions.rowActions} getRowLabel={(row) => `Unmatched receipt ${row.orNumber}`} />
          </section>
        ) : null}
      </QueryState>
    </>
  );
}
