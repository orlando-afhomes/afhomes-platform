"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMemberships } from "@/data/business-queries";
import type { MembershipView } from "@/data/contracts/membership-repository";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { QueryState } from "@/shared/components/modern/query-state";
import { AdminPage } from "@/shared/components/admin";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { humanize } from "@/shared/lib/humanize";
import { matchesSearch, optionsFrom } from "@/shared/lib/search";
import { useContractHref } from "../components/use-contract-href";

export function FinanceHoldsPage() {
  const memberships = useMemberships();
  const contractHref = useContractHref();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const holds = useMemo(() => (memberships.data ?? []).filter((item) => item.financialHold), [memberships.data]);
  const visible = useMemo(
    () => holds.filter((item) => (statusFilter === "all" || item.status === statusFilter) && matchesSearch(search, item.customerName, item.productName)),
    [holds, search, statusFilter],
  );
  const columns = useMemo<ColumnDef<MembershipView, unknown>[]>(
    () => [
      { id: "customer", header: "Customer", cell: ({ row }) => <span className="tw:font-semibold">{row.original.customerName}</span> },
      { id: "plan", header: "Plan", cell: ({ row }) => row.original.productName },
      { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status} /> },
      { id: "contract", header: "Contract", cell: ({ row }) => <Link className="tw:underline" href={contractHref(row.original.contractId)}>Open contract</Link> },
    ],
    [contractHref],
  );

  return (
    <AdminPage anyOf={["finance"]} title="Financial Holds" description="Memberships currently on Financial Hold." crumbs={[{ label: "Finance" }, { label: "Financial Holds" }]}>
      <QueryState isLoading={memberships.isLoading} error={memberships.error}>
        <FilterBar search={search} onSearch={setSearch} searchLabel="Search financial holds" filters={[{ label: "Status filter", value: statusFilter, onChange: setStatusFilter, options: optionsFrom("All statuses", holds.map((item) => item.status), humanize) }]} />
        <DataTable data={visible} columns={columns} getRowId={(row) => row.id} caption="Financial holds" emptyText={holds.length === 0 ? "No memberships are on Financial Hold." : "No holds match the filters."} />
      </QueryState>
    </AdminPage>
  );
}
