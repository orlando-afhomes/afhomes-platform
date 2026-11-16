"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, RotateCcw, Wallet } from "lucide-react";
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
import { AdminPage, AdminStatCard, AdminStatGrid } from "@/shared/components/admin";
import { ReportFrame, ReportTable, useReportRange, type ReportColumn } from "../components/report-shell";

const collectionColumns = (from: string, to: string): ReportColumn<PaymentView>[] => [
  { header: "Counted Date", value: (payment) => formatDate(paymentCountedDate(payment)) },
  { header: "Receipt Date", value: (payment) => formatDate(payment.paidDate), screen: false },
  { header: "Customer", value: (payment) => payment.customerName },
  { header: "Contract", value: (payment) => payment.contractLabel },
  { header: "Purpose", value: (payment) => humanize(payment.purpose), screen: false },
  { header: "Method", value: (payment) => payment.method },
  { header: "Reference", value: (payment) => payment.referenceNo ?? "", screen: false },
  { header: "Amount", value: (payment) => formatPeso(paymentCountedDate(payment) ? payment.amountCentavos : 0) },
  { header: "Undone or Refunded", value: (payment) => formatPeso(adjustmentTotalCentavos(payment.adjustments.filter((item) => item.date >= from && item.date <= to))), screen: false },
];

/**
 * Verified collections in the range. Collections use the receipt date; receipts from closed months count in
 * the first open month (doc 07). Only roles with `finance.reports.view` may see these figures (`allowed`).
 */
export function useCollectionsFigures(range: { from: string; to: string }) {
  const payments = usePayments();
  const allowed = useOperation("finance.reports.view");
  const paymentList = useMemo(() => payments.data ?? [], [payments.data]);
  const { gross: collected, adjusted } = periodCollections(paymentList, range.from, range.to);
  return { payments, paymentList, allowed, collected, adjusted, net: collected - adjusted };
}

/** Collections report body without page chrome, for the Reports area tab. Needs `finance.reports.view`. */
export function CollectionsReportPanel() {
  const range = useReportRange();
  const { payments, paymentList, allowed, collected, adjusted, net } = useCollectionsFigures(range);
  const inPeriod = useMemo(() => paymentList.filter((payment) => {
    const counted = paymentCountedDate(payment);
    return (counted !== null && counted >= range.from && counted <= range.to) || payment.adjustments.some((item) => item.date >= range.from && item.date <= range.to);
  }), [paymentList, range.from, range.to]);
  const columns = useMemo(() => collectionColumns(range.from, range.to), [range.from, range.to]);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("all");
  const [purpose, setPurpose] = useState("all");
  const rows = useMemo(() => inPeriod.filter((payment) => (method === "all" || payment.method === method) && (purpose === "all" || payment.purpose === purpose) && matchesSearch(search, payment.customerName, payment.contractLabel, payment.referenceNo)), [inPeriod, method, purpose, search]);
  if (!allowed) return <InfoNote>Access restricted. Your role may not view Finance collections reports.</InfoNote>;
  return (
    <ReportFrame range={range}>
      <AdminStatGrid columns={3}>
        <AdminStatCard loading={payments.isLoading} error={payments.error} label="Verified Collections" value={<Money value={collected} />} icon={BadgeCheck} tone="success" />
        <AdminStatCard loading={payments.isLoading} error={payments.error} label="Undone payments" value={<Money value={adjusted} />} icon={RotateCcw} tone="danger" />
        <AdminStatCard loading={payments.isLoading} error={payments.error} label="Net Collections" value={<Money value={net} />} icon={Wallet} tone="brand" />
      </AdminStatGrid>
      <ReportTable report="Collections Report" fileName="collections" range={range} columns={columns} rows={rows} getRowId={(row) => row.id} getRowTitle={(row) => row.customerName} loading={payments.isLoading} error={payments.error} emptyText="No collections match."
        filters={(exportButton) => <FilterBar search={search} onSearch={setSearch} searchLabel="Search collections" filters={[
          { label: "Payment method filter", value: method, onChange: setMethod, options: optionsFrom("All methods", inPeriod.map((payment) => payment.method)) },
          { label: "Payment purpose filter", value: purpose, onChange: setPurpose, options: optionsFrom("All purposes", inPeriod.map((payment) => payment.purpose), humanize) },
        ]}>{range.dateFields}{exportButton}</FilterBar>} />
    </ReportFrame>
  );
}

export function CollectionsReportPage() {
  return (
    <AdminPage anyOf={["reports"]} title="Collections Report" crumbs={[{ label: "Reports" }, { label: "Collections Report" }]}>
      <CollectionsReportPanel />
    </AdminPage>
  );
}
