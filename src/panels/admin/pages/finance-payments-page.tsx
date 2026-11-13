"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, Scale, Undo2 } from "lucide-react";
import { usePayments } from "@/data/business-queries";
import { periodCollections } from "@/modules/finance/rules";
import { addMonthsToDate, manilaToday } from "@/shared/lib/dates";
import { DataTable } from "@/shared/components/modern/data-table";
import { AdminStatCard, AdminStatGrid, AdminPage } from "@/shared/components/admin";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { StandardDateField } from "@/shared/forms/modern";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { usePaymentActions } from "../components/payment-actions";
import { usePaymentColumns } from "./finance-page";

export function FinancePaymentsPage() {
  const payments = usePayments();
  const paymentActions = usePaymentActions();
  const columns = usePaymentColumns();
  const today = manilaToday();
  const [from, setFrom] = useState(addMonthsToDate(today, -1) ?? today);
  const [to, setTo] = useState(today);

  const allPayments = useMemo(() => payments.data ?? [], [payments.data]);
  const history = useMemo(() => [...allPayments].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)), [allPayments]);
  const { gross: verifiedInPeriod, adjusted: adjustedInPeriod } = periodCollections(allPayments, from, to);

  return (
    <AdminPage anyOf={["finance"]} title="Payment History" description="Every payment, with reversals and refunds of verified payments." crumbs={[{ label: "Finance" }, { label: "Payment History" }]}>
      {paymentActions.dialogs}
      <AdminStatGrid>
        <AdminStatCard label="Verified" value={<Money value={verifiedInPeriod} />} icon={BadgeCheck} tone="success" />
        <AdminStatCard label="Reversals" value={<Money value={adjustedInPeriod} />} icon={Undo2} tone="danger" />
        <AdminStatCard label="Net collections" value={<Money value={verifiedInPeriod - adjustedInPeriod} />} icon={Scale} tone="brand" description="Counted receipt date" />
      </AdminStatGrid>
      <FilterBar filters={[]}>
        <StandardDateField label="Period from" value={from} onChange={setFrom} className="tw:md:w-56" />
        <StandardDateField label="Period to" value={to} onChange={setTo} className="tw:md:w-56" />
      </FilterBar>
      <QueryState isLoading={payments.isLoading} error={payments.error}>
        <DataTable data={history} columns={columns} getRowId={(row) => row.id} emptyText="No payments yet." caption="All payments" rowActions={paymentActions.rowActions} onRowOpen={paymentActions.open} getRowLabel={(row) => `Open payment from ${row.customerName}`} />
      </QueryState>
    </AdminPage>
  );
}
