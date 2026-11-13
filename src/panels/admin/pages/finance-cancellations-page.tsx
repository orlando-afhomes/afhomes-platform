"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useContracts } from "@/data/business-queries";
import { CANCELLATION_GROUND_LABELS } from "@/modules/contracts/types";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { QueryState } from "@/shared/components/modern/query-state";
import { AdminPage } from "@/shared/components/admin";
import { matchesSearch, optionsFrom } from "@/shared/lib/search";

type CancellationRow = NonNullable<ReturnType<typeof useContracts>["data"]>[number];

export function FinanceCancellationsPage() {
  const contracts = useContracts();
  const [search, setSearch] = useState("");
  const [groundFilter, setGroundFilter] = useState("all");
  const requests = useMemo(() => (contracts.data ?? []).filter((item) => item.cancellation?.status === "requested"), [contracts.data]);
  const visible = useMemo(
    () => requests.filter((item) => (groundFilter === "all" || item.cancellation?.ground === groundFilter) && matchesSearch(search, item.customerName, item.productCode)),
    [requests, search, groundFilter],
  );
  const columns = useMemo<ColumnDef<CancellationRow, unknown>[]>(
    () => [
      { id: "customer", header: "Customer", cell: ({ row }) => <span className="tw:font-semibold">{row.original.customerName}</span> },
      { id: "product", header: "Product", cell: ({ row }) => row.original.productCode },
      { id: "ground", header: "Ground", cell: ({ row }) => (row.original.cancellation ? CANCELLATION_GROUND_LABELS[row.original.cancellation.ground] : "") },
      { id: "request", header: "Request", cell: ({ row }) => <Link className="tw:underline" href={`/admin/finance/cancellations/${row.original.id}`}>Open request</Link> },
    ],
    [],
  );

  return (
    <AdminPage anyOf={["finance"]} title="Cancellation Requests" description="Cancellations with forfeiture awaiting Finance confirmation." crumbs={[{ label: "Finance" }, { label: "Cancellation Requests" }]}>
      <QueryState isLoading={contracts.isLoading} error={contracts.error}>
        <FilterBar search={search} onSearch={setSearch} searchLabel="Search cancellation requests" filters={[{ label: "Ground filter", value: groundFilter, onChange: setGroundFilter, options: optionsFrom("All grounds", requests.map((item) => item.cancellation?.ground), (value) => CANCELLATION_GROUND_LABELS[value as keyof typeof CANCELLATION_GROUND_LABELS] ?? value) }]} />
        <DataTable data={visible} columns={columns} getRowId={(row) => row.id} caption="Cancellation requests" emptyText={requests.length === 0 ? "No cancellation is awaiting confirmation." : "No requests match the filters."} />
      </QueryState>
    </AdminPage>
  );
}
