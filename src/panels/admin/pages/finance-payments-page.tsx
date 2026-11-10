"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, Scale, Undo2 } from "lucide-react";
import { usePayments } from "@/data/business-queries";
import { periodCollections } from "@/modules/finance/rules";
import { addMonthsToDate, manilaToday } from "@/shared/lib/dates";
import { DataTable } from "@/shared/components/modern/data-table";
import { AdminStatCard, AdminStatGrid, AdminPage, AdminSection } from "@/shared/components/admin";
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
        <AdminStatCard label="Verified in period" value={<Money value={verifiedInPeriod} />} icon={BadgeCheck} tone="success" />
        <AdminStatCard label="Reversed or refunded in period" value={<Money value={adjustedInPeriod} />} icon={Undo2} tone="danger" />
        <AdminStatCard label="Net verified collections" value={<Money value={verifiedInPeriod - adjustedInPeriod} />} icon={Scale} tone="brand" description="By Finance verification date" />
      </AdminStatGrid>
      <div className="tw:grid tw:grid-cols-1 tw:gap-3 tw:sm:max-w-md tw:sm:grid-cols-2">
        <StandardDateField label="Period from" value={from} onChange={setFrom} />
        <StandardDateField label="Period to" value={to} onChange={setTo} />
      </div>
      <QueryState isLoading={payments.isLoading} error={payments.error}>
        <AdminSection title="All payments" description="Verified payments can be reversed or refunded here. The original payment is never deleted.">
          <DataTable data={history} columns={columns} getRowId={(row) => row.id} emptyText="No payments yet." caption="All payments" rowActions={paymentActions.rowActions} onRowOpen={paymentActions.open} getRowLabel={(row) => `Open payment from ${row.customerName}`} />
        </AdminSection>
      </QueryState>
    </AdminPage>
  );
}
