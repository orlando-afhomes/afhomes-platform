"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, Clock, RotateCcw, Wallet } from "lucide-react";
import { useOperation, usePayments } from "@/data/business-queries";
import type { PaymentView } from "@/data/contracts/payment-repository";
import { adjustmentTotalCentavos, paymentCountedDate, periodCollections } from "@/modules/finance/rules";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { formatDate } from "@/shared/lib/format-date";
import { humanize } from "@/shared/lib/humanize";
import { formatPeso } from "@/shared/lib/money";
import { matchesSearch, optionsFrom } from "@/shared/lib/search";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { Money } from "@/shared/components/modern/money";
import { AdminStatCard, AdminStatGrid, AdminSection } from "@/shared/components/admin";
import { ReportShell, ReportTable, useReportRange, type ReportColumn } from "../components/report-shell";

const collectionColumns = (from: string, to: string): ReportColumn<PaymentView>[] => [
  { header: "Counted date", value: (payment) => formatDate(paymentCountedDate(payment)) },
  { header: "Receipt date", value: (payment) => formatDate(payment.paidDate) },
  { header: "Customer", value: (payment) => payment.customerName },
  { header: "Contract", value: (payment) => payment.contractLabel },
  { header: "Purpose", value: (payment) => humanize(payment.purpose) },
  { header: "Method", value: (payment) => payment.method },
  { header: "Reference", value: (payment) => payment.referenceNo ?? "" },
  { header: "Amount", value: (payment) => formatPeso(paymentCountedDate(payment) ? payment.amountCentavos : 0) },
  { header: "Reversed or refunded", value: (payment) => formatPeso(adjustmentTotalCentavos(payment.adjustments.filter((item) => item.date >= from && item.date <= to))) },
];

export function CollectionsReportPage() {
  const range = useReportRange();
  const payments = usePayments();
  const finance = useOperation("finance.reports.view");
  const paymentList = useMemo(() => payments.data ?? [], [payments.data]);
  const { gross: collected, adjusted } = periodCollections(paymentList, range.from, range.to);
  const inPeriod = useMemo(() => paymentList.filter((payment) => {
    const counted = paymentCountedDate(payment);
    return (counted !== null && counted >= range.from && counted <= range.to) || payment.adjustments.some((item) => item.date >= range.from && item.date <= range.to);
  }), [paymentList, range.from, range.to]);
  const columns = useMemo(() => collectionColumns(range.from, range.to), [range.from, range.to]);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("all");
  const [purpose, setPurpose] = useState("all");
  const rows = useMemo(() => inPeriod.filter((payment) => (method === "all" || payment.method === method) && (purpose === "all" || payment.purpose === purpose) && matchesSearch(search, payment.customerName, payment.contractLabel, payment.referenceNo)), [inPeriod, method, purpose, search]);
  return (
    <ReportShell range={range} title="Collections Report" description="Verified collections from the Finance source records." crumbs={[{ label: "Reports" }, { label: "Collections Report" }]}>
      {finance ? (
        <AdminSection title="Finance and collections" description="Collections use the receipt date. Receipts from closed months count in the first open month.">
          <AdminStatGrid>
            <AdminStatCard loading={payments.isLoading} error={payments.error} label="Verified collections" value={<Money value={collected} />} icon={BadgeCheck} tone="success" />
            <AdminStatCard loading={payments.isLoading} error={payments.error} label="Reversals" value={<Money value={adjusted} />} icon={RotateCcw} tone="danger" />
            <AdminStatCard loading={payments.isLoading} error={payments.error} label="Net collections" value={<Money value={collected - adjusted} />} icon={Wallet} tone="brand" />
            <AdminStatCard loading={payments.isLoading} error={payments.error} label="Awaiting verification" value={paymentList.filter((item) => item.status === "submitted" || item.status === "under_review").length} icon={Clock} tone="warning" />
          </AdminStatGrid>
          <ReportTable report="Collections Report" fileName="collections" range={range} columns={columns} rows={rows} getRowId={(row) => row.id} loading={payments.isLoading} error={payments.error} emptyText="No collections match."
            filters={<FilterBar search={search} onSearch={setSearch} searchLabel="Search collections" filters={[
              { label: "Payment method filter", value: method, onChange: setMethod, options: optionsFrom("All methods", inPeriod.map((payment) => payment.method)) },
              { label: "Payment purpose filter", value: purpose, onChange: setPurpose, options: optionsFrom("All purposes", inPeriod.map((payment) => payment.purpose), humanize) },
            ]} />} />
        </AdminSection>
      ) : (
        <InfoNote>Access restricted. Your role may not view Finance collections reports.</InfoNote>
      )}
    </ReportShell>
  );
}
