"use client";

import { useMemo, useState } from "react";
import { usePayments } from "@/data/business-queries";
import { periodCollections } from "@/modules/finance/rules";
import { addMonthsToDate, manilaToday } from "@/shared/lib/dates";
import { DataTable } from "@/shared/components/modern/data-table";
import { StandardDateField } from "@/shared/forms/modern";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { Section } from "@/shared/components/modern/section";
import { StatTiles } from "@/shared/components/modern/stat-tiles";
import { ModulePage } from "../components/module-page";
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
    <ModulePage anyOf={["finance"]} title="Payment History" description="Every payment, with reversals and refunds of verified payments." crumbs={[{ label: "Finance" }, { label: "Payment History" }]}>
      {paymentActions.dialogs}
      <StatTiles items={[{ label: "Verified in period", value: <Money value={verifiedInPeriod} /> }, { label: "Reversed or refunded in period", value: <Money value={adjustedInPeriod} /> }, { label: "Net verified collections", value: <Money value={verifiedInPeriod - adjustedInPeriod} />, hint: "By Finance verification date" }]} />
      <div className="tw:grid tw:grid-cols-1 tw:gap-3 tw:sm:max-w-md tw:sm:grid-cols-2">
        <StandardDateField label="Period from" value={from} onChange={setFrom} />
        <StandardDateField label="Period to" value={to} onChange={setTo} />
      </div>
      <QueryState isLoading={payments.isLoading} error={payments.error}>
        <Section title="All payments" description="Verified payments can be reversed or refunded here. The original payment is never deleted.">
          <DataTable data={history} columns={columns} getRowId={(row) => row.id} emptyText="No payments yet." caption="All payments" rowActions={paymentActions.rowActions} onRowOpen={paymentActions.open} getRowLabel={(row) => `Open payment from ${row.customerName}`} />
        </Section>
      </QueryState>
    </ModulePage>
  );
}
