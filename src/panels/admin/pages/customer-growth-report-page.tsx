"use client";

import { useMemo, useState } from "react";
import { UserPlus, Users } from "lucide-react";
import { useCustomers } from "@/data/queries";
import { AdminStatCard, AdminStatGrid, AdminSection } from "@/shared/components/admin";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import type { Customer } from "@/modules/customers/types";
import { customerRecordName } from "@/modules/customers/rules";
import { formatDate } from "@/shared/lib/format-date";
import { humanize } from "@/shared/lib/humanize";
import { matchesSearch, optionsFrom } from "@/shared/lib/search";
import { ReportShell, ReportTable, useReportRange, type ReportColumn } from "../components/report-shell";

const COLUMNS: ReportColumn<Customer>[] = [
  { header: "Customer", value: (customer) => customerRecordName(customer) },
  { header: "Customer number", value: (customer) => customer.customerNumber ?? "" },
  { header: "Status", value: (customer) => humanize(customer.status) },
  { header: "VIP plan", value: (customer) => customer.vipPlan ?? "" },
  { header: "Created", value: (customer) => formatDate(customer.createdAt) },
];

export function CustomerGrowthReportPage() {
  const range = useReportRange();
  const customers = useCustomers();
  const customerList = useMemo(() => customers.data ?? [], [customers.data]);
  const inPeriod = useMemo(() => customerList.filter((item) => range.inRange(item.createdAt)), [customerList, range]);
  const newCustomers = inPeriod.length;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");
  const rows = useMemo(() => inPeriod.filter((item) => (status === "all" || item.status === status) && (plan === "all" || item.vipPlan === plan) && matchesSearch(search, item.displayName, item.customerNumber)), [inPeriod, status, plan, search]);
  return (
    <ReportShell range={range} title="Customer Growth" description="Role-scoped figures built from the source records." crumbs={[{ label: "Reports" }, { label: "Customer Growth" }]}>
      <AdminSection title="Customer growth">
        <AdminStatGrid>
          <AdminStatCard loading={customers.isLoading} error={customers.error} label="New customers" value={newCustomers} icon={UserPlus} tone="success" description="Creation date" />
          <AdminStatCard loading={customers.isLoading} error={customers.error} label="Visible customers" value={customerList.length} icon={Users} tone="info" />
        </AdminStatGrid>
      </AdminSection>
      <ReportTable report="Customer Growth" fileName="customer-growth" range={range} columns={COLUMNS} rows={rows} getRowId={(row) => row.id} loading={customers.isLoading} error={customers.error} emptyText="No customers match."
        filters={<FilterBar search={search} onSearch={setSearch} searchLabel="Search customers" filters={[
          { label: "Status filter", value: status, onChange: setStatus, options: optionsFrom("All statuses", inPeriod.map((item) => item.status), humanize) },
          { label: "VIP plan filter", value: plan, onChange: setPlan, options: optionsFrom("All VIP plans", inPeriod.map((item) => item.vipPlan)) },
        ]} />} />
    </ReportShell>
  );
}
