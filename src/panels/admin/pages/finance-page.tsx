"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, Hourglass, Scale, Undo2 } from "lucide-react";
import { usePayments } from "@/data/business-queries";
import type { PaymentView } from "@/data/contracts/payment-repository";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { AdminStatCard, AdminStatGrid } from "@/shared/components/admin";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { formatDate } from "@/shared/lib/format-date";
import { usePaymentActions } from "../components/payment-actions";
import { findSuggestedMatch, periodCollections } from "@/modules/finance/rules";
import { addMonthsToDate, manilaToday } from "@/shared/lib/dates";
import { StandardDateField } from "@/shared/forms/modern";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { matchesSearch } from "@/shared/lib/search";

const SHOW_OPTIONS = [
  { value: "waiting", label: "Waiting" },
  { value: "exceptions", label: "Exceptions" },
  { value: "all", label: "All" },
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

/** Receipts tab of the Finance area (waiting, exceptions, or every receipt). The area page gates it on [finance, sales] + finance.verify. */
export function FinanceVerificationPanel() {
  const payments = usePayments();
  const paymentActions = usePaymentActions();
  const columns = usePaymentColumns();
  const today = manilaToday();
  const requested = useSearchParams().get("show");
  const [show, setShow] = useState(SHOW_OPTIONS.some((option) => option.value === requested) ? (requested as string) : "waiting");
  const [from, setFrom] = useState(addMonthsToDate(today, -1) ?? today);
  const [to, setTo] = useState(today);
  const allPayments = useMemo(() => payments.data ?? [], [payments.data]);
  const queue = useMemo(() => allPayments.filter((item) => item.status === "submitted" || item.status === "under_review").sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)), [allPayments]);
  const exceptions = useMemo(() => queue.filter((item) => item.approvalBlocked || item.referenceConflict || findSuggestedMatch(queue, item)), [queue]);
  const history = useMemo(() => [...allPayments].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)), [allPayments]);
  const { gross: verifiedInPeriod, adjusted: adjustedInPeriod } = periodCollections(allPayments, from, to);

  const [search, setSearch] = useState("");
  const source = show === "all" ? history : show === "exceptions" ? exceptions : queue;
  const visible = useMemo(() => source.filter((item) => matchesSearch(search, item.customerName, item.referenceNo, item.contractLabel)), [source, search]);

  return (
    <>
      {paymentActions.dialogs}
      <AdminStatGrid>
        {show === "all" ? (
          <>
            <AdminStatCard label="Verified" value={<Money value={verifiedInPeriod} />} icon={BadgeCheck} tone="success" />
            <AdminStatCard label="Reversals" value={<Money value={adjustedInPeriod} />} icon={Undo2} tone="danger" />
            <AdminStatCard label="Net collections" value={<Money value={verifiedInPeriod - adjustedInPeriod} />} icon={Scale} tone="brand" />
          </>
        ) : (
          <AdminStatCard label="Awaiting verification" value={queue.length} icon={Hourglass} tone="warning" />
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
      <QueryState isLoading={payments.isLoading} error={payments.error}>
        <DataTable data={visible} columns={columns} getRowId={(row) => row.id} emptyText={source.length > 0 ? "No receipts match the search." : show === "all" ? "No payments yet." : show === "exceptions" ? "No receipt exceptions need review." : "Nothing is waiting for verification."} caption={show === "all" ? "All payments" : show === "exceptions" ? "Receipt exceptions" : "Verification queue"} rowActions={paymentActions.rowActions} onRowOpen={paymentActions.open} getRowLabel={(row) => `Open payment from ${row.customerName}`} />
      </QueryState>
    </>
  );
}
