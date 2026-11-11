"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { useContracts, usePayments } from "@/data/business-queries";
import type { ContractView } from "@/data/contracts/contract-repository";
import { collectionStateFor, type CollectionState } from "@/modules/finance/rules";
import { manilaToday } from "@/shared/lib/dates";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { AdminStatCard, AdminStatGrid, AdminPage, AdminSection } from "@/shared/components/admin";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { formatDate } from "@/shared/lib/format-date";
import { useContractHref } from "../components/use-contract-href";

type CollectionRow = CollectionState & { contract: ContractView };

const COLLECTION_FILTERS = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "outstanding", label: "Outstanding" },
  { value: "settled", label: "Fully settled" },
];

export function FinanceCollectionsPage() {
  const router = useRouter();
  const payments = usePayments();
  const contracts = useContracts();
  const contractHref = useContractHref();
  const today = manilaToday();
  const [search, setSearch] = useState("");
  const [collectionState, setCollectionState] = useState("all");

  const allPayments = useMemo(() => payments.data ?? [], [payments.data]);
  const allCollections = useMemo<CollectionRow[]>(
    () => (contracts.data ?? []).filter((contract) => contract.status === "finalized").map((contract) => ({ contract, ...collectionStateFor(contract, allPayments.filter((item) => item.contractId === contract.id), today) })),
    [contracts.data, allPayments, today],
  );
  const receivables = allCollections.reduce((sum, row) => sum + row.balance, 0);
  const collections = useMemo<CollectionRow[]>(() => {
    const term = search.trim().toLowerCase();
    return allCollections.filter((row) => (term === "" || row.contract.customerName.toLowerCase().includes(term)) && (collectionState === "all" || row.state === collectionState));
  }, [allCollections, search, collectionState]);

  const columns = useMemo<ColumnDef<CollectionRow, unknown>[]>(
    () => [
      { id: "customer", header: "Customer", cell: ({ row }) => <Link href={contractHref(row.original.contract.id)} className="tw:font-semibold tw:underline-offset-4 tw:hover:underline">{row.original.contract.customerName}</Link> },
      { id: "plan", header: "Plan", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => `${row.original.contract.productCode} · ${row.original.contract.schemeLabel}` },
      { id: "verified", header: "Verified", cell: ({ row }) => <Money value={row.original.verified} /> },
      { id: "balance", header: "Balance", cell: ({ row }) => <Money value={row.original.balance} /> },
      { id: "percent", header: "Collected", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => `${row.original.percent}%` },
      { id: "overdue", header: "Overdue", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => (row.original.overdue > 0 ? <span><Money value={row.original.overdue} /> · {row.original.daysPastDue} {row.original.daysPastDue === 1 ? "day" : "days"}</span> : "—") },
      { id: "next", header: "Next due", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => formatDate(row.original.nextDue) },
      { id: "state", header: "State", cell: ({ row }) => <BizBadge status={row.original.state === "settled" ? "paid" : row.original.state === "overdue" ? "overdue" : "partial"} label={row.original.state === "settled" ? "Fully settled" : row.original.state} /> },
    ],
    [contractHref],
  );

  return (
    <AdminPage anyOf={["finance"]} title="Collections" description="Monitor verified balances and overdue installments of finalized contracts." crumbs={[{ label: "Finance" }, { label: "Collections" }]}>
      <AdminStatGrid>
        <AdminStatCard label="Receivables" value={<Money value={receivables} />} icon={Wallet} tone="accent" description="Open balance" />
      </AdminStatGrid>
      <QueryState isLoading={payments.isLoading || contracts.isLoading} error={payments.error ?? contracts.error}>
        <AdminSection title="Collections monitor" description="Finalized contracts, their verified balances and overdue installments.">
          <FilterBar search={search} onSearch={setSearch} searchLabel="Search customers" filters={[{ label: "Collection state filter", value: collectionState, onChange: setCollectionState, options: COLLECTION_FILTERS }]} />
          <DataTable data={collections} columns={columns} getRowId={(row) => row.contract.id} emptyText="No contracts match." caption="Collections" onRowOpen={(row) => router.push(contractHref(row.contract.id))} getRowLabel={(row) => `Open contract for ${row.contract.customerName}`} rowActions={(row) => <RowActionsMenu itemName={`collection for ${row.contract.customerName}`} onView={() => router.push(contractHref(row.contract.id))} />} />
        </AdminSection>
      </QueryState>
    </AdminPage>
  );
}
