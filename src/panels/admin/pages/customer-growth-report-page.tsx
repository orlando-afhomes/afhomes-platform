"use client";

import { useMemo, useState } from "react";
import { UserPlus, Users } from "lucide-react";
import { useCustomers } from "@/data/queries";
import { AdminPage, AdminStatCard, AdminStatGrid } from "@/shared/components/admin";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import type { Customer } from "@/modules/customers/types";
import { customerRecordName } from "@/modules/customers/rules";
import { formatDate } from "@/shared/lib/format-date";
import { humanize } from "@/shared/lib/humanize";
import { matchesSearch, optionsFrom } from "@/shared/lib/search";
import { ReportFrame, ReportTable, useReportRange, type ReportColumn } from "../components/report-shell";

const COLUMNS: ReportColumn<Customer>[] = [
  { header: "Customer", value: (customer) => customerRecordName(customer) },
  { header: "Customer Number", value: (customer) => customer.customerNumber ?? "" },
  { header: "Status", value: (customer) => humanize(customer.status) },
  { header: "VIP Plan", value: (customer) => customer.vipPlan ?? "" },
  { header: "Created", value: (customer) => formatDate(customer.createdAt) },
];

/** Customers created in the range (by creation date) plus every customer this role can see. */
export function useCustomerGrowthFigures(range: { inRange: (date: string | null | undefined) => boolean }) {
  const customers = useCustomers();
  const customerList = useMemo(() => customers.data ?? [], [customers.data]);
  const inPeriod = useMemo(() => customerList.filter((item) => range.inRange(item.createdAt)), [customerList, range]);
  return { customers, customerList, inPeriod, newCustomers: inPeriod.length };
}

/** Customer Growth report body without page chrome, for the Reports area tab. */
export function CustomerGrowthReportPanel() {
  const range = useReportRange();
  const { customers, customerList, inPeriod, newCustomers } = useCustomerGrowthFigures(range);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");
  const rows = useMemo(() => inPeriod.filter((item) => (status === "all" || item.status === status) && (plan === "all" || item.vipPlan === plan) && matchesSearch(search, item.displayName, item.customerNumber)), [inPeriod, status, plan, search]);
  return (
    <ReportFrame range={range}>
      <AdminStatGrid columns={2}>
        <AdminStatCard loading={customers.isLoading} error={customers.error} label="New Customers" value={newCustomers} icon={UserPlus} tone="success" />
        <AdminStatCard loading={customers.isLoading} error={customers.error} label="All Customers" value={customerList.length} icon={Users} tone="info" />
      </AdminStatGrid>
      <ReportTable report="Customer Growth" fileName="customer-growth" range={range} columns={COLUMNS} rows={rows} getRowId={(row) => row.id} loading={customers.isLoading} error={customers.error} emptyText="No customers match."
        filters={(exportButton) => <FilterBar search={search} onSearch={setSearch} searchLabel="Search customers" filters={[
          { label: "Status filter", value: status, onChange: setStatus, options: optionsFrom("All statuses", inPeriod.map((item) => item.status), humanize) },
          { label: "VIP plan filter", value: plan, onChange: setPlan, options: optionsFrom("All VIP plans", inPeriod.map((item) => item.vipPlan)) },
        ]}>{range.dateFields}{exportButton}</FilterBar>} />
    </ReportFrame>
  );
}

export function CustomerGrowthReportPage() {
  return (
    <AdminPage anyOf={["reports"]} title="Customer Growth" crumbs={[{ label: "Reports" }, { label: "Customer Growth" }]}>
      <CustomerGrowthReportPanel />
    </AdminPage>
  );
}
