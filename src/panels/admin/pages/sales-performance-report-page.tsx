"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, Clock, TrendingUp, Wallet } from "lucide-react";
import { useSales } from "@/data/business-queries";
import { useIgpRegister } from "@/data/igp-queries";
import { confirmedValueInPeriod, totalsFor } from "@/modules/sales/rules";
import { Money } from "@/shared/components/modern/money";
import { AdminStatCard, AdminStatGrid, AdminSection } from "@/shared/components/admin";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { formatDate } from "@/shared/lib/format-date";
import { humanize } from "@/shared/lib/humanize";
import { formatPeso } from "@/shared/lib/money";
import { matchesSearch, optionsFrom } from "@/shared/lib/search";
import { ReportShell, ReportTable, useReportRange, type ReportColumn } from "../components/report-shell";

type SalesRow = { id: string; kind: "VIP" | "IGP"; customer: string; product: string; seller: string; recorded: string; status: string; valueCentavos: number; periodCentavos: number };

const COLUMNS: ReportColumn<SalesRow>[] = [
  { header: "Type", value: (row) => row.kind },
  { header: "Customer", value: (row) => row.customer },
  { header: "Product", value: (row) => row.product },
  { header: "Seller", value: (row) => row.seller },
  { header: "Recorded", value: (row) => formatDate(row.recorded) },
  { header: "Status", value: (row) => humanize(row.status) },
  { header: "Value", value: (row) => formatPeso(row.valueCentavos) },
  { header: "Period confirmed", value: (row) => formatPeso(row.periodCentavos) },
];

export function SalesPerformanceReportPage() {
  const range = useReportRange();
  const sales = useSales();
  const igp = useIgpRegister(true);
  const saleList = useMemo(() => sales.data ?? [], [sales.data]);
  const totals = totalsFor(saleList);
  const igpSales = useMemo(() => igp.data?.sales ?? [], [igp.data]);
  const confirmedInPeriod = confirmedValueInPeriod([...saleList, ...igpSales], range.from, range.to);
  const confirmedIgp = igpSales.filter((item) => item.status === "approved" && item.closedDealDate);
  const pendingIgp = igpSales.filter((item) => item.status === "pending" || (item.status === "approved" && !item.closedDealDate));
  const igpConfirmedValue = confirmedIgp.reduce((sum, item) => sum + item.priceCentavos, 0);
  const igpPendingValue = pendingIgp.reduce((sum, item) => sum + item.priceCentavos, 0);
  const allRows = useMemo<SalesRow[]>(
    () => {
      const periodNet = (adjustments: { date: string; amountCentavos: number }[]) => adjustments.filter((item) => item.date >= range.from && item.date <= range.to).reduce((sum, item) => sum + item.amountCentavos, 0);
      return [
      ...saleList.map((sale) => ({ id: sale.id, kind: "VIP" as const, customer: sale.customerName, product: sale.productCode, seller: sale.sellerName ?? "Company", recorded: sale.recordedDate, status: sale.status, valueCentavos: sale.valueCentavos, periodCentavos: periodNet(sale.adjustments) })),
      ...igpSales.map((sale) => ({ id: sale.id, kind: "IGP" as const, customer: sale.buyerName, product: sale.seriesNumber, seller: sale.genealogy[0]?.displayName ?? "", recorded: sale.date, status: sale.status, valueCentavos: sale.priceCentavos, periodCentavos: periodNet(sale.adjustments) })),
      ];
    },
    [saleList, igpSales, range.from, range.to],
  );
  const inPeriod = useMemo(() => allRows.filter((row) => row.periodCentavos !== 0 || (row.recorded >= range.from && row.recorded <= range.to)), [allRows, range.from, range.to]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [kind, setKind] = useState("all");
  const [seller, setSeller] = useState("all");
  const rows = useMemo(() => inPeriod.filter((row) => (status === "all" || row.status === status) && (kind === "all" || row.kind === kind) && (seller === "all" || row.seller === seller) && matchesSearch(search, row.customer, row.product, row.seller)), [inPeriod, status, kind, seller, search]);
  const loading = sales.isLoading || igp.isLoading;
  const error = sales.error ?? igp.error;
  return (
    <ReportShell range={range} title="Sales Performance" description="Role-scoped figures built from the source records." crumbs={[{ label: "Reports" }, { label: "Sales Performance" }]}>
      <AdminSection title="Sales performance" description="VIP sales count at 25% approved collection. IGP sales use the threshold set when their series number was issued.">
        <AdminStatGrid>
          <AdminStatCard loading={loading} error={error} label="Period sales" value={<Money value={confirmedInPeriod} />} icon={TrendingUp} tone="brand" description="Net adjustments" />
          <AdminStatCard loading={loading} error={error} label="All-time confirmed" value={<Money value={totals.confirmed + igpConfirmedValue} />} icon={BadgeCheck} tone="brand" description={`${totals.confirmedCount + confirmedIgp.length} sale(s)`} />
          <AdminStatCard loading={loading} error={error} label="Pending" value={<Money value={totals.pending + igpPendingValue} />} icon={Clock} tone="warning" description={`${totals.pendingCount + pendingIgp.length} sale(s)`} />
          <AdminStatCard loading={loading} error={error} label="Overall recorded" value={<Money value={totals.overall + igpConfirmedValue + igpPendingValue} />} icon={Wallet} tone="info" />
        </AdminStatGrid>
      </AdminSection>
      <ReportTable report="Sales Performance" fileName="sales-performance" range={range} columns={COLUMNS} rows={rows} getRowId={(row) => `${row.kind}-${row.id}`} loading={loading} error={error} emptyText="No sales match."
        filters={<FilterBar search={search} onSearch={setSearch} searchLabel="Search sales" filters={[
          { label: "Sale type filter", value: kind, onChange: setKind, options: optionsFrom("All sale types", inPeriod.map((row) => row.kind)) },
          { label: "Sale status filter", value: status, onChange: setStatus, options: optionsFrom("All statuses", inPeriod.map((row) => row.status), humanize) },
          { label: "Seller filter", value: seller, onChange: setSeller, options: optionsFrom("All sellers", inPeriod.map((row) => row.seller)) },
        ]} />} />
    </ReportShell>
  );
}
