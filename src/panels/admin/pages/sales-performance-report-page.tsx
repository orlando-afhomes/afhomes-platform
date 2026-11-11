"use client";

import { BadgeCheck, Clock, TrendingUp, Wallet } from "lucide-react";
import { useSales } from "@/data/business-queries";
import { confirmedValueInPeriod, totalsFor } from "@/modules/sales/rules";
import { Money } from "@/shared/components/modern/money";
import { AdminStatCard, AdminStatGrid, AdminSection } from "@/shared/components/admin";
import { ReportShell, useReportRange } from "../components/report-shell";

export function SalesPerformanceReportPage() {
  const range = useReportRange();
  const sales = useSales();
  const saleList = sales.data ?? [];
  const totals = totalsFor(saleList);
  const confirmedInPeriod = confirmedValueInPeriod(saleList, range.from, range.to);
  return (
    <ReportShell range={range} title="Sales Performance" description="Role-scoped figures built from the source records." crumbs={[{ label: "Reports" }, { label: "Sales Performance" }]}>
      <AdminSection title="Sales performance" description="Confirmed Sales Value counts each sale once at its full contract value on the Finance confirmation date.">
        <AdminStatGrid>
          <AdminStatCard label="Period sales" value={<Money value={confirmedInPeriod} />} icon={TrendingUp} tone="brand" description="Net reversals" />
          <AdminStatCard label="All-time confirmed" value={<Money value={totals.confirmed} />} icon={BadgeCheck} tone="brand" description={`${totals.confirmedCount} sale(s)`} />
          <AdminStatCard label="Pending" value={<Money value={totals.pending} />} icon={Clock} tone="warning" description={`${totals.pendingCount} sale(s)`} />
          <AdminStatCard label="Overall recorded" value={<Money value={totals.overall} />} icon={Wallet} tone="info" />
        </AdminStatGrid>
      </AdminSection>
    </ReportShell>
  );
}
