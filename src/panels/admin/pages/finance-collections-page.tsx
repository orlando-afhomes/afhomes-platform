"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Wallet } from "lucide-react";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { useContracts, useMemberships, usePayments } from "@/data/business-queries";
import { useTierDisplayName } from "../components/use-tier-display-name";
import type { ContractView } from "@/data/contracts/contract-repository";
import { collectionStateFor, type CollectionState } from "@/modules/finance/rules";
import { nonStandardStage } from "@/modules/contracts/rules";
import { manilaToday } from "@/shared/lib/dates";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { AdminStatCard, AdminStatGrid } from "@/shared/components/admin";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { formatDate } from "@/shared/lib/format-date";
import { useContractHref } from "../components/use-contract-href";
import { humanize } from "@/shared/lib/humanize";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { Button } from "@/shared/ui/button";

type CollectionRow = CollectionState & { contract: ContractView };

const COLLECTION_FILTERS = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "outstanding", label: "Outstanding" },
  { value: "settled", label: "Fully Settled" },
  { value: "on-hold", label: "On payment hold" },
  // Doc 05 §10.2: Non-Standard contracts the Administrator approved, waiting for Finance to confirm.
  { value: "nonstandard", label: "Non-Standard terms to confirm" },
];

/** Collections tab of the Finance area ([finance]). */
export function FinanceCollectionsPanel() {
  const router = useRouter();
  const payments = usePayments();
  const contracts = useContracts();
  const tierName = useTierDisplayName();
  const memberships = useMemberships();
  const contractHref = useContractHref();
  const today = manilaToday();
  const [search, setSearch] = useState("");
  const requestedState = useSearchParams()?.get("state");
  const [collectionState, setCollectionState] = useState(() => COLLECTION_FILTERS.find((option) => option.value === requestedState)?.value ?? "all");
  const [detailId, setDetailId] = useState<string | null>(null);

  const allPayments = useMemo(() => payments.data ?? [], [payments.data]);
  const allCollections = useMemo<CollectionRow[]>(
    () => (contracts.data ?? []).filter((contract) => contract.status === "finalized").map((contract) => ({ contract, ...collectionStateFor(contract, allPayments.filter((item) => item.contractId === contract.id), today) })),
    [contracts.data, allPayments, today],
  );
  const nonStandardRows = useMemo<CollectionRow[]>(
    () => (contracts.data ?? []).filter((contract) => (contract.status === "submitted" || contract.status === "under_review") && nonStandardStage(contract) === "finance").map((contract) => ({ contract, ...collectionStateFor(contract, allPayments.filter((item) => item.contractId === contract.id), today) })),
    [contracts.data, allPayments, today],
  );
  const receivables = allCollections.reduce((sum, row) => sum + row.balance, 0);
  const heldContractIds = useMemo(() => new Set((memberships.data ?? []).filter((item) => item.financialHold).map((item) => item.contractId)), [memberships.data]);
  const collections = useMemo<CollectionRow[]>(() => {
    const term = search.trim().toLowerCase();
    if (collectionState === "nonstandard") return nonStandardRows.filter((row) => term === "" || row.contract.customerName.toLowerCase().includes(term));
    const matchesState = (row: CollectionRow) => collectionState === "all" || (collectionState === "on-hold" ? heldContractIds.has(row.contract.id) : row.state === collectionState);
    return allCollections.filter((row) => (term === "" || row.contract.customerName.toLowerCase().includes(term)) && matchesState(row));
  }, [allCollections, nonStandardRows, search, collectionState, heldContractIds]);

  const columns = useMemo<ColumnDef<CollectionRow, unknown>[]>(
    () => [
      { id: "customer", header: "Customer", cell: ({ row }) => <span className="tw:font-semibold">{row.original.contract.customerName}</span> },
      { id: "balance", header: "Balance", cell: ({ row }) => <Money value={row.original.balance} /> },
      { id: "overdue", header: "Overdue", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => (row.original.overdue > 0 ? <Money value={row.original.overdue} /> : "—") },
      { id: "state", header: "Status", cell: ({ row }) => <CollectionBadge state={row.original.state} /> },
      { id: "next", header: "Next Due", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => formatDate(row.original.nextDue) },
    ],
    [],
  );
  const detail = detailId ? [...allCollections, ...nonStandardRows].find((row) => row.contract.id === detailId) ?? null : null;
  const openContract = (row: CollectionRow) => router.push(contractHref(row.contract.id));

  return (
    <>
      <AdminStatGrid>
        <AdminStatCard label="Receivables" value={<Money value={receivables} />} icon={Wallet} tone="accent" />
      </AdminStatGrid>
      <FilterBar search={search} onSearch={setSearch} searchLabel="Search customers" filters={[{ label: "Status filter", value: collectionState, onChange: setCollectionState, options: COLLECTION_FILTERS }]} />
      <QueryState isLoading={payments.isLoading || contracts.isLoading} error={payments.error ?? contracts.error}>
        <DataTable data={collections} columns={columns} getRowId={(row) => row.contract.id} emptyText="No contracts match." caption="Payment Status" onRowOpen={(row) => setDetailId(row.contract.id)} getRowLabel={(row) => `View collection for ${row.contract.customerName}`} rowActions={(row) => <RowActionsMenu itemName={`collection for ${row.contract.customerName}`} extraItems={[{ key: "contract", label: "Open Contract", variant: "indigo", icon: FileText, onClick: () => openContract(row) }]} />} />
      </QueryState>
      <RecordDetailsSheet
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail?.contract.customerName ?? "Collection"}
        badge={detail ? <CollectionBadge state={detail.state} /> : undefined}
        sections={
          detail
            ? [
                { title: "Plan", rows: [{ label: "VIP Number", value: detail.contract.vipNumber }, { label: "Product", value: tierName(detail.contract.productCode) }, { label: "Payment plan", value: detail.contract.schemeLabel }] },
                {
                  title: "Collection",
                  rows: [
                    { label: "Verified", value: <Money value={detail.verified} /> },
                    { label: "Balance", value: <Money value={detail.balance} /> },
                    { label: "Collected", value: `${detail.percent}%` },
                    { label: "Overdue", value: detail.overdue > 0 ? <Money value={detail.overdue} /> : null },
                    { label: "Days past due", value: detail.daysPastDue > 0 ? `${detail.daysPastDue} ${detail.daysPastDue === 1 ? "day" : "days"}` : null },
                    { label: "Next due", value: formatDate(detail.nextDue) },
                  ],
                },
              ]
            : []
        }
        footer={detail ? <Button type="button" variant="indigo" onClick={() => openContract(detail)}>Open Contract</Button> : undefined}
      />
    </>
  );
}

function CollectionBadge({ state }: { state: CollectionState["state"] }) {
  return <BizBadge status={state === "settled" ? "paid" : state === "overdue" ? "overdue" : "due"} label={state === "settled" ? "Fully Settled" : humanize(state)} />;
}
