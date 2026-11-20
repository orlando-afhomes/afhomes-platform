"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useContracts } from "@/data/business-queries";
import { useTierDisplayName } from "../components/use-tier-display-name";
import { CANCELLATION_GROUND_LABELS } from "@/modules/contracts/types";
import type { TableOrder } from "@/shared/lib/table-order";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { QueryState } from "@/shared/components/modern/query-state";
import { matchesSearch, optionsFrom } from "@/shared/lib/search";
import { humanize } from "@/shared/lib/humanize";

type CancellationRow = NonNullable<ReturnType<typeof useContracts>["data"]>[number];

/** Newest request first; every row here is awaiting confirmation, so all attention ranks are equal. */
const CANCELLATION_ORDER: TableOrder<CancellationRow> = { date: (row) => row.cancellation?.requestedAt };

/** Cancellations tab of the Finance area ([finance]). */
export function FinanceCancellationsPanel() {
  const router = useRouter();
  const contracts = useContracts();
  const tierName = useTierDisplayName();
  const [search, setSearch] = useState("");
  const [groundFilter, setGroundFilter] = useState("all");
  const requests = useMemo(() => (contracts.data ?? []).filter((item) => item.cancellation?.status === "requested"), [contracts.data]);
  const visible = useMemo(
    () => requests.filter((item) => (groundFilter === "all" || item.cancellation?.ground === groundFilter) && matchesSearch(search, item.customerName, tierName(item.productCode), item.productCode)),
    [requests, search, groundFilter, tierName],
  );
  const columns = useMemo<ColumnDef<CancellationRow, unknown>[]>(
    () => [
      { id: "customer", header: "Customer", cell: ({ row }) => <span className="tw:font-semibold">{row.original.customerName}</span> },
      { id: "product", header: "Product", cell: ({ row }) => tierName(row.original.productCode) },
      { id: "ground", header: "Ground", cell: ({ row }) => (row.original.cancellation ? CANCELLATION_GROUND_LABELS[row.original.cancellation.ground] : "") },
    ],
    [tierName],
  );

  return (
    <QueryState isLoading={contracts.isLoading} error={contracts.error}>
      <FilterBar search={search} onSearch={setSearch} searchLabel="Search cancellation requests" filters={[{ label: "Ground filter", value: groundFilter, onChange: setGroundFilter, options: optionsFrom("All grounds", requests.map((item) => item.cancellation?.ground), (value) => CANCELLATION_GROUND_LABELS[value as keyof typeof CANCELLATION_GROUND_LABELS] ?? humanize(value)) }]} />
      <DataTable data={visible} columns={columns} getRowId={(row) => row.id} caption="Cancellation Requests" orderBy={CANCELLATION_ORDER} onRowOpen={(row) => router.push(`/admin/finance/cancellations/${row.id}`)} getRowLabel={(row) => `Open cancellation request from ${row.customerName}`} emptyText={requests.length === 0 ? "No cancellation is awaiting confirmation." : "No requests match the filters."} />
    </QueryState>
  );
}
