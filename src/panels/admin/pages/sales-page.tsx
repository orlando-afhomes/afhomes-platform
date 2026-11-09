"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useContracts, useOperation, useSales } from "@/data/business-queries";
import type { SaleView } from "@/data/contracts/sale-repository";
import { confirmedValueInPeriod, mySales, teamSales, totalsFor } from "@/modules/sales/rules";
import { manilaToday } from "@/shared/lib/dates";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { StandardDateField } from "@/shared/forms/modern";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { ContractsTable } from "../components/contracts-table";
import { useContractHref } from "../components/use-contract-href";
import { BizBadge, FilterBar, Money, QueryState, Section, StatTiles, TabBar, formatDate } from "../components/business-ui";
import { ModulePage } from "../components/module-page";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "confirmed", label: "Confirmed" },
  { value: "pending", label: "Pending" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rejected", label: "Rejected" },
];

export function SalesPage() {
  const sales = useSales();
  const contracts = useContracts();
  const { identity } = useDevIdentity();
  const viewTeam = useOperation("sales.viewTeam");
  const contractHref = useContractHref();
  const monthStart = `${manilaToday().slice(0, 7)}-01`;
  const [scope, setScope] = useState<"mine" | "team" | "all">(identity.memberId ? "mine" : "all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(manilaToday());

  const scoped = useMemo(() => {
    const all = sales.data ?? [];
    if (!identity.memberId || scope === "all") return all;
    return scope === "mine" ? mySales(all, identity.memberId) : teamSales(all, identity.memberId);
  }, [sales.data, scope, identity.memberId]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return scoped.filter((sale) => (status === "all" || sale.status === status) && (term === "" || sale.customerName.toLowerCase().includes(term))).sort((a, b) => b.recordedDate.localeCompare(a.recordedDate));
  }, [scoped, status, search]);

  const totals = totalsFor(scoped);
  const inPeriod = confirmedValueInPeriod(scoped, from, to);

  const columns = useMemo<ColumnDef<SaleView, unknown>[]>(
    () => [
      { id: "customer", header: "Customer", cell: ({ row }) => <Link href={contractHref(row.original.contractId)} className="tw:font-semibold tw:underline-offset-4 tw:hover:underline">{row.original.customerName}</Link> },
      { id: "plan", header: "Plan", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => `${row.original.productCode} · ${row.original.schemeLabel}` },
      { id: "value", header: "Contract value", cell: ({ row }) => <Money value={row.original.valueCentavos} /> },
      { id: "seller", header: "Seller", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => row.original.sellerName ?? "Company" },
      { id: "recorded", header: "Recorded", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => formatDate(row.original.recordedDate) },
      { id: "confirmed", header: "Confirmed", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => formatDate(row.original.confirmedDate) },
      { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status} /> },
    ],
    [contractHref],
  );

  const tabs = identity.memberId ? [{ value: "mine", label: "My sales" }, ...(viewTeam ? [{ value: "team", label: "Team sales" }] : [])] : [{ value: "all", label: "All sales" }];

  return (
    <ModulePage anyOf={["sales"]} title="Sales" description="Confirmed sales count once at the full contract value, on the date Finance confirms them." crumbs={[{ label: "Sales" }]}>
      <TabBar label="Sales view" tabs={tabs} value={scope} onChange={(value) => setScope(value as "mine" | "team" | "all")} />
      <StatTiles items={[{ label: "Confirmed", value: <Money value={totals.confirmed} />, hint: `${totals.confirmedCount} sale(s)` }, { label: "Pending", value: <Money value={totals.pending} />, hint: `${totals.pendingCount} sale(s)` }, { label: "Overall recorded", value: <Money value={totals.overall} />, hint: "Confirmed plus pending" }, { label: "Confirmed in period", value: <Money value={inPeriod} />, hint: "Net of reversals, by confirmation date" }]} />
      <div className="tw:grid tw:grid-cols-1 tw:gap-3 tw:sm:grid-cols-2 tw:sm:max-w-md">
        <StandardDateField label="Period from" value={from} onChange={setFrom} />
        <StandardDateField label="Period to" value={to} onChange={setTo} />
      </div>
      <Section title="Sales">
        <FilterBar search={search} onSearch={setSearch} searchLabel="Search sales" filters={[{ label: "Sale status filter", value: status, onChange: setStatus, options: STATUS_OPTIONS }]} />
        <QueryState isLoading={sales.isLoading} error={sales.error}>
          <DataTable data={rows} columns={columns} getRowId={(row) => row.id} emptyText="No sales match." caption="Sales" />
        </QueryState>
      </Section>
      {(contracts.data?.length ?? 0) > 0 ? (
        <Section title="Contracts" description="Open a contract to submit payments or follow its review.">
          <ContractsTable />
        </Section>
      ) : (
        <InfoNote>No contracts yet. Prepare one from a submitted customer.</InfoNote>
      )}
    </ModulePage>
  );
}
