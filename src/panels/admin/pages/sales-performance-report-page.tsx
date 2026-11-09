"use client";

import { useSales } from "@/data/business-queries";
import { confirmedValueInPeriod, totalsFor } from "@/modules/sales/rules";
import { Money } from "@/shared/components/modern/money";
import { Section } from "@/shared/components/modern/section";
import { StatTiles } from "@/shared/components/modern/stat-tiles";
import { ReportShell, useReportRange } from "../components/report-shell";

export function SalesPerformanceReportPage() {
  const range = useReportRange();
  const sales = useSales();
  const saleList = sales.data ?? [];
  const totals = totalsFor(saleList);
  const confirmedInPeriod = confirmedValueInPeriod(saleList, range.from, range.to);
  return (
    <ReportShell range={range} title="Sales Performance" description="Role-scoped figures built from the source records." crumbs={[{ label: "Reports" }, { label: "Sales Performance" }]}>
      <Section title="Sales performance" description="Confirmed Sales Value counts each sale once at its full contract value on the Finance confirmation date.">
        <StatTiles items={[{ label: "Confirmed sales value (period)", value: <Money value={confirmedInPeriod} />, hint: "Net of reversals" }, { label: "Confirmed (all time)", value: <Money value={totals.confirmed} />, hint: `${totals.confirmedCount} sale(s)` }, { label: "Pending", value: <Money value={totals.pending} />, hint: `${totals.pendingCount} sale(s)` }, { label: "Overall recorded", value: <Money value={totals.overall} /> }]} />
      </Section>
    </ReportShell>
  );
}
