"use client";

import { UserPlus, Users } from "lucide-react";
import { useCustomers } from "@/data/queries";
import { AdminStatCard, AdminStatGrid, AdminSection } from "@/shared/components/admin";
import { ReportShell, useReportRange } from "../components/report-shell";

export function CustomerGrowthReportPage() {
  const range = useReportRange();
  const customers = useCustomers();
  const customerList = customers.data ?? [];
  const newCustomers = customerList.filter((item) => range.inRange(item.createdAt)).length;
  return (
    <ReportShell range={range} title="Customer Growth" description="Role-scoped figures built from the source records." crumbs={[{ label: "Reports" }, { label: "Customer Growth" }]}>
      <AdminSection title="Customer growth">
        <AdminStatGrid>
          <AdminStatCard label="New customers" value={newCustomers} icon={UserPlus} tone="success" description="Creation date" />
          <AdminStatCard label="Visible customers" value={customerList.length} icon={Users} tone="info" />
        </AdminStatGrid>
      </AdminSection>
    </ReportShell>
  );
}
