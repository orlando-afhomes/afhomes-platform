"use client";

import { useCustomers } from "@/data/queries";
import { Section } from "@/shared/components/modern/section";
import { StatTiles } from "@/shared/components/modern/stat-tiles";
import { ReportShell, useReportRange } from "../components/report-shell";

export function CustomerGrowthReportPage() {
  const range = useReportRange();
  const customers = useCustomers();
  const customerList = customers.data ?? [];
  const newCustomers = customerList.filter((item) => range.inRange(item.createdAt)).length;
  return (
    <ReportShell range={range} title="Customer Growth" description="Role-scoped figures built from the source records." crumbs={[{ label: "Reports" }, { label: "Customer Growth" }]}>
      <Section title="Customer growth">
        <StatTiles items={[{ label: "New customers in period", value: newCustomers, hint: "By record creation date" }, { label: "Visible customers", value: customerList.length }]} />
      </Section>
    </ReportShell>
  );
}
