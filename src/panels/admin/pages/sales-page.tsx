"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, CalendarCheck, Clock, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOperation, useSales } from "@/data/business-queries";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import type { SaleView } from "@/data/contracts/sale-repository";
import { confirmedValueInPeriod, mySales, referredSales, teamSales, totalsFor } from "@/modules/sales/rules";
import { manilaToday } from "@/shared/lib/dates";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { StandardDateField } from "@/shared/forms/modern";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useContractHref } from "../components/use-contract-href";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { TabBar } from "@/shared/components/modern/tab-bar";
import { formatDate } from "@/shared/lib/format-date";
import { AdminPage, AdminStatCard, AdminStatGrid } from "@/shared/components/admin";
import { saleExpiryReminderText } from "@/modules/sales/accreditation-standing";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "confirmed", label: "Confirmed" },
  { value: "pending", label: "Pending" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rejected", label: "Rejected" },
];

export function SalesPage() {
  const router = useRouter();
  const sales = useSales();
  const { identity } = useDevIdentity();
  const viewTeam = useOperation("sales.viewTeam");
  const contractHref = useContractHref();
  const monthStart = `${manilaToday().slice(0, 7)}-01`;
  const [scope, setScope] = useState<"mine" | "team" | "referred" | "all">(identity.memberId ? "mine" : "all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(manilaToday());

  const scoped = useMemo(() => {
    const all = sales.data ?? [];
    if (!identity.memberId || scope === "all") return all;
    if (scope === "mine") return mySales(all, identity.memberId);
    if (scope === "referred") return referredSales(all, identity.memberId);
    return teamSales(all, identity.memberId);
  }, [sales.data, scope, identity.memberId]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return scoped.filter((sale) => (status === "all" || sale.status === status) && (term === "" || sale.customerName.toLowerCase().includes(term))).sort((a, b) => b.recordedDate.localeCompare(a.recordedDate));
  }, [scoped, status, search]);

  const totals = totalsFor(scoped);
  const inPeriod = confirmedValueInPeriod(scoped, from, to);

  // A referrer may sit outside the sale's team, so the referred list shows no contract links.
  const referredView = scope === "referred";
  const columns = useMemo<ColumnDef<SaleView, unknown>[]>(
    () => [
      { id: "customer", header: "Customer", cell: ({ row }) => (referredView ? <span className="tw:font-semibold">{row.original.customerName}</span> : <Link href={contractHref(row.original.contractId)} className="tw:font-semibold tw:underline-offset-4 tw:hover:underline">{row.original.customerName}</Link>) },
      { id: "plan", header: "Plan", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => `${row.original.productCode} · ${row.original.schemeLabel}` },
      { id: "value", header: "Contract value", cell: ({ row }) => <Money value={row.original.valueCentavos} /> },
      { id: "seller", header: "Seller", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => (
        <>
          {row.original.sellerName ?? "Company"}
          {(row.original.expiryReminders ?? []).map((reminder) => <span key={reminder.role} className="tw:block tw:text-xs tw:text-muted-foreground">{saleExpiryReminderText(reminder)}</span>)}
        </>
      ) },
      { id: "recorded", header: "Recorded", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => formatDate(row.original.recordedDate) },
      { id: "confirmed", header: "Confirmed", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => formatDate(row.original.confirmedDate) },
      { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status} /> },
    ],
    [contractHref, referredView],
  );

  const tabs = identity.memberId ? [{ value: "mine", label: "My sales" }, { value: "referred", label: "Referred by me" }, ...(viewTeam ? [{ value: "team", label: "Team sales" }] : [])] : [{ value: "all", label: "All sales" }];

  return (
    <AdminPage anyOf={["sales"]} title="Sales" description="Confirmed sales count once at the full contract value, on the date Finance confirms them." crumbs={[{ label: "Sales", href: "/admin/sales" }, { label: "Sales" }]}>
      {tabs.length > 1 ? <TabBar label="Sales view" tabs={tabs} value={scope} onChange={(value) => setScope(value as "mine" | "team" | "referred" | "all")} /> : null}
      {referredView ? <p className="tw:text-sm tw:text-muted-foreground">Sales you referred. They are not added to your own sales totals.</p> : null}
      {referredView ? null : <AdminStatGrid>
        <AdminStatCard label="Confirmed" value={<Money value={totals.confirmed} />} icon={BadgeCheck} tone="brand" description={`${totals.confirmedCount} sale(s)`} />
        <AdminStatCard label="Pending" value={<Money value={totals.pending} />} icon={Clock} tone="warning" description={`${totals.pendingCount} sale(s)`} />
        <AdminStatCard label="Overall recorded" value={<Money value={totals.overall} />} icon={Receipt} tone="info" description="Combined" />
        <AdminStatCard label="Period confirmed" value={<Money value={inPeriod} />} icon={CalendarCheck} tone="violet" description="Net reversals" />
      </AdminStatGrid>}
      <FilterBar search={search} onSearch={setSearch} searchLabel="Search sales" filters={[{ label: "Sale status filter", value: status, onChange: setStatus, options: STATUS_OPTIONS }]}>
        <StandardDateField label="Period from" value={from} onChange={setFrom} className="tw:md:min-w-0 tw:md:flex-1" />
        <StandardDateField label="Period to" value={to} onChange={setTo} className="tw:md:min-w-0 tw:md:flex-1" />
      </FilterBar>
      <QueryState isLoading={sales.isLoading} error={sales.error}>
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(row) => row.id}
          emptyText="No sales match."
          caption="Sales"
          onRowOpen={referredView ? undefined : (row) => router.push(contractHref(row.contractId))}
          getRowLabel={(row) => `Open the sale for ${row.customerName}`}
          rowActions={referredView ? undefined : (row) => <RowActionsMenu itemName={`sale for ${row.customerName}`} onView={() => router.push(contractHref(row.contractId))} />}
        />
      </QueryState>
    </AdminPage>
  );
}
