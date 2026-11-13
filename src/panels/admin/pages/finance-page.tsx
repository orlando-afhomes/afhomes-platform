"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Hourglass } from "lucide-react";
import { useOperation, usePayments } from "@/data/business-queries";
import type { PaymentView } from "@/data/contracts/payment-repository";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { AdminStatCard, AdminStatGrid, AdminPage } from "@/shared/components/admin";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { formatDate } from "@/shared/lib/format-date";
import { usePaymentActions } from "../components/payment-actions";
import { useContractHref } from "../components/use-contract-href";
import { humanize } from "@/shared/lib/humanize";
import { findSuggestedMatch } from "@/modules/finance/rules";
import { TabBar } from "@/shared/components/modern/tab-bar";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { matchesSearch } from "@/shared/lib/search";

/** Payment columns shared by Payment Verification and Payment History. */
export function usePaymentColumns() {
  const contractHref = useContractHref();
  return useMemo<ColumnDef<PaymentView, unknown>[]>(
    () => [
      { id: "customer", header: "Customer", cell: ({ row }) => <Link href={contractHref(row.original.contractId)} className="tw:font-semibold tw:underline-offset-4 tw:hover:underline">{row.original.customerName}</Link> },
      { id: "contract", header: "Contract", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => row.original.contractLabel },
      { id: "purpose", header: "Purpose", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => humanize(row.original.purpose) },
      { id: "amount", header: "Amount", cell: ({ row }) => <Money value={row.original.amountCentavos} /> },
      { id: "method", header: "Method", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => `${row.original.method} · ${formatDate(row.original.paidDate)}` },
      { id: "submitter", header: "Submitted by", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => row.original.submitterName },
      { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status} /> },
    ],
    [contractHref],
  );
}

export function FinancePage() {
  const canVerify = useOperation("finance.verify");
  const payments = usePayments();
  const paymentActions = usePaymentActions();
  const columns = usePaymentColumns();
  const [tab, setTab] = useState("verification");
  const queue = useMemo(() => (payments.data ?? []).filter((item) => item.status === "submitted" || item.status === "under_review").sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)), [payments.data]);
  const exceptions = useMemo(() => queue.filter((item) => item.approvalBlocked || item.referenceConflict || findSuggestedMatch(queue, item)), [queue]);

  const [search, setSearch] = useState("");
  const source = tab === "exceptions" ? exceptions : queue;
  const visible = useMemo(() => source.filter((item) => matchesSearch(search, item.customerName, item.referenceNo, item.contractLabel)), [source, search]);

  return (
    <AdminPage anyOf={["finance", "sales"]} allowed={canVerify} title="Payment Verification" description="Verify, reject or return submitted payments." crumbs={[{ label: "Finance" }, { label: "Payment Verification" }]}>
      {paymentActions.dialogs}
      <AdminStatGrid>
        <AdminStatCard label="Awaiting verification" value={queue.length} icon={Hourglass} tone="warning" />
      </AdminStatGrid>
      <TabBar label="Receipt queues" tabs={[{ value: "verification", label: "Verification" }, { value: "exceptions", label: "Exceptions" }]} value={tab} onChange={setTab} />
      <FilterBar search={search} onSearch={setSearch} searchLabel="Search receipts" />
      <QueryState isLoading={payments.isLoading} error={payments.error}>
        <DataTable data={visible} columns={columns} getRowId={(row) => row.id} emptyText={source.length > 0 ? "No receipts match the search." : tab === "exceptions" ? "No receipt exceptions need review." : "Nothing is waiting for verification."} caption={tab === "exceptions" ? "Receipt exceptions" : "Verification queue"} rowActions={paymentActions.rowActions} onRowOpen={paymentActions.open} getRowLabel={(row) => `Open payment from ${row.customerName}`} />
      </QueryState>
    </AdminPage>
  );
}
