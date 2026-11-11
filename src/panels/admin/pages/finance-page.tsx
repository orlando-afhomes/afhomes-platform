"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Hourglass } from "lucide-react";
import { usePayments } from "@/data/business-queries";
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
  const payments = usePayments();
  const paymentActions = usePaymentActions();
  const columns = usePaymentColumns();
  const queue = useMemo(() => (payments.data ?? []).filter((item) => item.status === "submitted" || item.status === "under_review").sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)), [payments.data]);

  return (
    <AdminPage anyOf={["finance"]} title="Payment Verification" description="Verify, reject or return submitted payments." crumbs={[{ label: "Finance" }, { label: "Payment Verification" }]}>
      {paymentActions.dialogs}
      <AdminStatGrid>
        <AdminStatCard label="Awaiting verification" value={queue.length} icon={Hourglass} tone="warning" />
      </AdminStatGrid>
      <QueryState isLoading={payments.isLoading} error={payments.error}>
        <DataTable data={queue} columns={columns} getRowId={(row) => row.id} emptyText="Nothing is waiting for verification." caption="Verification queue" rowActions={paymentActions.rowActions} onRowOpen={paymentActions.open} getRowLabel={(row) => `Open payment from ${row.customerName}`} />
      </QueryState>
    </AdminPage>
  );
}
