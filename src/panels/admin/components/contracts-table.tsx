"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useContracts, useOperation } from "@/data/business-queries";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import type { ContractView } from "@/data/contracts/contract-repository";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { formatDate } from "@/shared/lib/format-date";
import { useContractHref } from "./use-contract-href";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "returned", label: "Returned" },
  { value: "finalized", label: "Finalized" },
  { value: "cancelled", label: "Cancelled" },
];

/** Contract list with search and status filter, scoped by the repository to what the viewer may see. */
export function ContractsTable({ initialStatus = "all", contractHref: hrefOverride }: { initialStatus?: string; contractHref?: (id: string) => string }) {
  const router = useRouter();
  const contracts = useContracts();
  const canPrepare = useOperation("contracts.prepare");
  const defaultHref = useContractHref();
  const contractHref = hrefOverride ?? defaultHref;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(initialStatus);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (contracts.data ?? [])
      .filter((item) => (status === "all" || item.status === status) && (term === "" || item.customerName.toLowerCase().includes(term) || item.id.toLowerCase().includes(term)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [contracts.data, search, status]);

  const columns = useMemo<ColumnDef<ContractView, unknown>[]>(
    () => [
      { id: "id", header: "Contract", cell: ({ row }) => <Link href={contractHref(row.original.id)} className="tw:font-semibold tw:underline-offset-4 tw:hover:underline">{row.original.id.toUpperCase()}</Link> },
      { id: "customer", header: "Customer", cell: ({ row }) => row.original.customerName },
      { id: "plan", header: "Plan and scheme", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => `${row.original.productCode} · ${row.original.schemeLabel}` },
      { id: "price", header: "Price", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => <Money value={row.original.priceCentavos} /> },
      { id: "date", header: "Submitted", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => formatDate(row.original.submittedAt) },
      { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status} /> },
      { id: "holds", header: "Holds", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => (["submitted", "under_review"].includes(row.original.status) && row.original.holds.length > 0 ? <BizBadge status="on_hold" label={`${row.original.holds.length} hold${row.original.holds.length > 1 ? "s" : ""}`} /> : "—") },
    ],
    [contractHref],
  );

  return (
    <div className="tw:flex tw:flex-col tw:gap-3">
      <FilterBar search={search} onSearch={setSearch} searchLabel="Search contracts" filters={[{ label: "Contract status filter", value: status, onChange: setStatus, options: STATUS_OPTIONS }]} />
      <QueryState isLoading={contracts.isLoading} error={contracts.error}>
        <DataTable
          data={rows}
          columns={columns}
          getRowId={(row) => row.id}
          emptyText="No contracts match."
          caption="Contracts"
          onRowOpen={(row) => router.push(contractHref(row.id))}
          getRowLabel={(row) => `Open contract ${row.id.toUpperCase()}`}
          rowActions={(row) => (
            <RowActionsMenu
              itemName={`contract ${row.id.toUpperCase()}`}
              onView={() => router.push(contractHref(row.id))}
              onEdit={canPrepare && ["draft", "returned"].includes(row.status) ? () => router.push(contractHref(row.id)) : undefined}
            />
          )}
        />
      </QueryState>
    </div>
  );
}
