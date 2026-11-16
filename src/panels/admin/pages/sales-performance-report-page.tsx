"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, Clock, TrendingUp } from "lucide-react";
import { useSales } from "@/data/business-queries";
import { useIgpRegister } from "@/data/igp-queries";
import { igpSalesReportRows } from "@/modules/igp/rules";
import { confirmedCountInPeriod, confirmedValueInPeriod, totalsFor } from "@/modules/sales/rules";
import { Money } from "@/shared/components/modern/money";
import { AdminPage, AdminStatCard, AdminStatGrid } from "@/shared/components/admin";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { formatDate } from "@/shared/lib/format-date";
import { humanize } from "@/shared/lib/humanize";
import { formatPeso } from "@/shared/lib/money";
import { matchesSearch, optionsFrom } from "@/shared/lib/search";
import { ReportFrame, ReportTable, useReportRange, type ReportColumn } from "../components/report-shell";
import { useTierDisplayName } from "../components/use-tier-display-name";

type SalesRow = { id: string; kind: "VIP" | "IGP"; customer: string; product: string; seller: string; recorded: string; status: string; valueCentavos: number; periodCentavos: number };

const COLUMNS: ReportColumn<SalesRow>[] = [
  { header: "Type", value: (row) => row.kind, screen: false },
  { header: "Customer", value: (row) => row.customer },
  { header: "Product", value: (row) => row.product, screen: false },
  { header: "Seller", value: (row) => row.seller },
  { header: "Recorded", value: (row) => formatDate(row.recorded) },
  { header: "Status", value: (row) => humanize(row.status) },
  { header: "Value", value: (row) => formatPeso(row.valueCentavos) },
  { header: "Period Confirmed", value: (row) => formatPeso(row.periodCentavos), screen: false },
];

/**
 * VIP and IGP sales figures. VIP sales count at 25% approved collection; IGP sales use the threshold set
 * when their series number was issued (docs 07, 13, 14). The period figure nets adjustments in the range.
 */
export function useSalesFigures(range: { from: string; to: string }) {
  const sales = useSales();
  const igp = useIgpRegister(true);
  const saleList = useMemo(() => sales.data ?? [], [sales.data]);
  const igpSales = useMemo(() => igp.data?.sales ?? [], [igp.data]);
  const totals = totalsFor(saleList);
  const confirmedInPeriod = confirmedValueInPeriod([...saleList, ...igpSales], range.from, range.to);
  const confirmedIgp = igpSales.filter((item) => item.status === "approved" && item.closedDealDate);
  const pendingIgp = igpSales.filter((item) => item.status === "pending" || (item.status === "approved" && !item.closedDealDate));
  return {
    saleList,
    igpSales,
    confirmedInPeriod,
    periodCount: confirmedCountInPeriod([...saleList, ...igpSalesReportRows(igpSales)], range.from, range.to),
    confirmedValue: totals.confirmed + confirmedIgp.reduce((sum, item) => sum + item.priceCentavos, 0),
    confirmedCount: totals.confirmedCount + confirmedIgp.length,
    pendingValue: totals.pending + pendingIgp.reduce((sum, item) => sum + item.priceCentavos, 0),
    pendingCount: totals.pendingCount + pendingIgp.length,
    loading: sales.isLoading || igp.isLoading,
    error: sales.error ?? igp.error,
  };
}

/** Sales Performance report body without page chrome, for the Reports area tab. */
export function SalesReportPanel() {
  const range = useReportRange();
  const tierName = useTierDisplayName();
  const figures = useSalesFigures(range);
  const { saleList, igpSales, loading, error } = figures;
  const allRows = useMemo<SalesRow[]>(
    () => {
      const periodNet = (adjustments: { date: string; amountCentavos: number }[]) => adjustments.filter((item) => item.date >= range.from && item.date <= range.to).reduce((sum, item) => sum + item.amountCentavos, 0);
      return [
      ...saleList.map((sale) => ({ id: sale.id, kind: "VIP" as const, customer: sale.customerName, product: tierName(sale.productCode) ?? "", seller: sale.sellerName ?? "Company", recorded: sale.recordedDate, status: sale.status, valueCentavos: sale.valueCentavos, periodCentavos: periodNet(sale.adjustments) })),
      ...igpSales.map((sale) => ({ id: sale.id, kind: "IGP" as const, customer: sale.buyerName, product: sale.seriesNumber, seller: sale.genealogy[0]?.displayName ?? "", recorded: sale.date, status: sale.status, valueCentavos: sale.priceCentavos, periodCentavos: periodNet(sale.adjustments) })),
      ];
    },
    [saleList, igpSales, range.from, range.to, tierName],
  );
  const inPeriod = useMemo(() => allRows.filter((row) => row.periodCentavos !== 0 || (row.recorded >= range.from && row.recorded <= range.to)), [allRows, range.from, range.to]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [kind, setKind] = useState("all");
  const [seller, setSeller] = useState("all");
  const rows = useMemo(() => inPeriod.filter((row) => (status === "all" || row.status === status) && (kind === "all" || row.kind === kind) && (seller === "all" || row.seller === seller) && matchesSearch(search, row.customer, row.product, row.seller)), [inPeriod, status, kind, seller, search]);
  return (
    <ReportFrame range={range}>
      <AdminStatGrid columns={3}>
        <AdminStatCard loading={loading} error={error} label="Period Sales" value={<Money value={figures.confirmedInPeriod} />} icon={TrendingUp} tone="brand" description={`${figures.periodCount} closed deal(s) in period`} />
        <AdminStatCard loading={loading} error={error} label="All-Time Confirmed" value={<Money value={figures.confirmedValue} />} icon={BadgeCheck} tone="brand" description={`${figures.confirmedCount} sale(s)`} />
        <AdminStatCard loading={loading} error={error} label="Pending" value={<Money value={figures.pendingValue} />} icon={Clock} tone="warning" description={`${figures.pendingCount} sale(s)`} />
      </AdminStatGrid>
      <ReportTable report="Sales Performance" fileName="sales-performance" range={range} columns={COLUMNS} rows={rows} getRowId={(row) => `${row.kind}-${row.id}`} getRowTitle={(row) => row.customer} loading={loading} error={error} emptyText="No sales match."
        filters={(exportButton) => <FilterBar search={search} onSearch={setSearch} searchLabel="Search sales" filters={[
          { label: "Sale type filter", value: kind, onChange: setKind, options: optionsFrom("All sale types", inPeriod.map((row) => row.kind)) },
          { label: "Sale status filter", value: status, onChange: setStatus, options: optionsFrom("All statuses", inPeriod.map((row) => row.status), humanize) },
          { label: "Seller filter", value: seller, onChange: setSeller, options: optionsFrom("All sellers", inPeriod.map((row) => row.seller)) },
        ]}>{range.dateFields}{exportButton}</FilterBar>} />
    </ReportFrame>
  );
}

export function SalesPerformanceReportPage() {
  return (
    <AdminPage anyOf={["reports"]} title="Sales Performance" crumbs={[{ label: "Reports" }, { label: "Sales Performance" }]}>
      <SalesReportPanel />
    </AdminPage>
  );
}
