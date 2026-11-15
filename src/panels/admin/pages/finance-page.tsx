"use client";

import { useMemo, useState } from "react";
import { Hourglass } from "lucide-react";
import { usePayments } from "@/data/business-queries";
import type { PaymentView } from "@/data/contracts/payment-repository";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { AdminStatCard, AdminStatGrid } from "@/shared/components/admin";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { formatDate } from "@/shared/lib/format-date";
import { usePaymentActions } from "../components/payment-actions";
import { findSuggestedMatch } from "@/modules/finance/rules";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { matchesSearch } from "@/shared/lib/search";

const SHOW_OPTIONS = [
  { value: "all", label: "All receipts" },
  { value: "exceptions", label: "Exceptions only" },
];

/** Payment columns shared by Payment Verification and Payment History. */
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

/** Verification tab of the Finance area. The area page gates it on [finance, sales] + finance.verify. */
export function FinanceVerificationPanel() {
  const payments = usePayments();
  const paymentActions = usePaymentActions();
  const columns = usePaymentColumns();
  const [show, setShow] = useState("all");
  const queue = useMemo(() => (payments.data ?? []).filter((item) => item.status === "submitted" || item.status === "under_review").sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)), [payments.data]);
  const exceptions = useMemo(() => queue.filter((item) => item.approvalBlocked || item.referenceConflict || findSuggestedMatch(queue, item)), [queue]);

  const [search, setSearch] = useState("");
  const source = show === "exceptions" ? exceptions : queue;
  const visible = useMemo(() => source.filter((item) => matchesSearch(search, item.customerName, item.referenceNo, item.contractLabel)), [source, search]);

  return (
    <>
      {paymentActions.dialogs}
      <AdminStatGrid>
        <AdminStatCard label="Awaiting verification" value={queue.length} icon={Hourglass} tone="warning" />
      </AdminStatGrid>
      <FilterBar search={search} onSearch={setSearch} searchLabel="Search receipts" filters={[{ label: "Show", value: show, onChange: setShow, options: SHOW_OPTIONS }]} />
      <QueryState isLoading={payments.isLoading} error={payments.error}>
        <DataTable data={visible} columns={columns} getRowId={(row) => row.id} emptyText={source.length > 0 ? "No receipts match the search." : show === "exceptions" ? "No receipt exceptions need review." : "Nothing is waiting for verification."} caption={show === "exceptions" ? "Receipt exceptions" : "Verification queue"} rowActions={paymentActions.rowActions} onRowOpen={paymentActions.open} getRowLabel={(row) => `Open payment from ${row.customerName}`} />
      </QueryState>
    </>
  );
}
