"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useContracts, useMemberships, usePayments } from "@/data/business-queries";
import type { ContractView } from "@/data/contracts/contract-repository";
import type { PaymentView } from "@/data/contracts/payment-repository";
import { CANCELLATION_GROUND_LABELS } from "@/modules/contracts/types";
import { buildScheduleState, outstandingBalanceCentavos, totalVerifiedCentavos } from "@/modules/finance/rules";
import { addMonthsToDate, manilaToday } from "@/shared/lib/dates";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { StandardDateField } from "@/shared/forms/modern";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { Section } from "@/shared/components/modern/section";
import { StatTiles } from "@/shared/components/modern/stat-tiles";
import { TabBar } from "@/shared/components/modern/tab-bar";
import { formatDate } from "@/shared/lib/format-date";
import { ModulePage } from "../components/module-page";
import { usePaymentActions } from "../components/payment-actions";
import { useContractHref } from "../components/use-contract-href";

type CollectionRow = {
  contract: ContractView;
  verified: number;
  balance: number;
  overdue: number;
  nextDue: string | null;
  state: "overdue" | "outstanding" | "settled";
};

const COLLECTION_FILTERS = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "outstanding", label: "Outstanding" },
  { value: "settled", label: "Fully settled" },
];

export function FinancePage() {
  const payments = usePayments();
  const contracts = useContracts();
  const memberships = useMemberships();
  const paymentActions = usePaymentActions();
  const contractHref = useContractHref();
  const today = manilaToday();
  const [tab, setTab] = useState("queue");
  const [search, setSearch] = useState("");
  const [collectionState, setCollectionState] = useState("all");
  const [from, setFrom] = useState(addMonthsToDate(today, -1) ?? today);
  const [to, setTo] = useState(today);

  const allPayments = useMemo(() => payments.data ?? [], [payments.data]);
  const queue = useMemo(() => allPayments.filter((item) => item.status === "submitted" || item.status === "under_review").sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)), [allPayments]);

  const collections = useMemo<CollectionRow[]>(() => {
    const term = search.trim().toLowerCase();
    return (contracts.data ?? [])
      .filter((contract) => contract.status === "finalized" && (term === "" || contract.customerName.toLowerCase().includes(term)))
      .map((contract) => {
        const own = allPayments.filter((item) => item.contractId === contract.id);
        const schedule = buildScheduleState(contract, own, today);
        const overdue = schedule.filter((line) => line.status === "overdue").reduce((sum, line) => sum + (line.amountCentavos - line.allocatedCentavos), 0);
        const next = schedule.find((line) => line.status !== "paid" && line.dueDate);
        const balance = outstandingBalanceCentavos(contract, own);
        return { contract, verified: totalVerifiedCentavos(own), balance, overdue, nextDue: next?.dueDate ?? null, state: overdue > 0 ? ("overdue" as const) : balance === 0 ? ("settled" as const) : ("outstanding" as const) };
      })
      .filter((row) => collectionState === "all" || row.state === collectionState);
  }, [contracts.data, allPayments, today, search, collectionState]);

  const verifiedInPeriod = allPayments.filter((item) => item.verifiedDate && item.verifiedDate >= from && item.verifiedDate <= to).reduce((sum, item) => sum + item.amountCentavos, 0);
  const adjustedInPeriod = allPayments.flatMap((item) => item.adjustments).filter((item) => item.date >= from && item.date <= to).reduce((sum, item) => sum + item.amountCentavos, 0);
  const holds = (memberships.data ?? []).filter((item) => item.financialHold);
  const cancellationRequests = (contracts.data ?? []).filter((item) => item.cancellation?.status === "requested");

  const queueColumns = useMemo<ColumnDef<PaymentView, unknown>[]>(
    () => [
      { id: "customer", header: "Customer", cell: ({ row }) => <Link href={contractHref(row.original.contractId)} className="tw:font-semibold tw:underline-offset-4 tw:hover:underline">{row.original.customerName}</Link> },
      { id: "contract", header: "Contract", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => row.original.contractLabel },
      { id: "purpose", header: "Purpose", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => row.original.purpose.replace(/_/g, " ") },
      { id: "amount", header: "Amount", cell: ({ row }) => <Money value={row.original.amountCentavos} /> },
      { id: "method", header: "Method", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => `${row.original.method} · ${formatDate(row.original.paidDate)}` },
      { id: "submitter", header: "Submitted by", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => row.original.submitterName },
      { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status} /> },
      { id: "actions", header: () => <span className="tw:sr-only">Actions</span>, cell: ({ row }) => paymentActions.actions(row.original) },
    ],
    [paymentActions, contractHref],
  );

  const collectionColumns = useMemo<ColumnDef<CollectionRow, unknown>[]>(
    () => [
      { id: "customer", header: "Customer", cell: ({ row }) => <Link href={contractHref(row.original.contract.id)} className="tw:font-semibold tw:underline-offset-4 tw:hover:underline">{row.original.contract.customerName}</Link> },
      { id: "plan", header: "Plan", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => `${row.original.contract.productCode} · ${row.original.contract.schemeLabel}` },
      { id: "verified", header: "Verified", cell: ({ row }) => <Money value={row.original.verified} /> },
      { id: "balance", header: "Balance", cell: ({ row }) => <Money value={row.original.balance} /> },
      { id: "overdue", header: "Overdue", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => (row.original.overdue > 0 ? <Money value={row.original.overdue} /> : "—") },
      { id: "next", header: "Next due", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => formatDate(row.original.nextDue) },
      { id: "state", header: "State", cell: ({ row }) => <BizBadge status={row.original.state === "settled" ? "paid" : row.original.state === "overdue" ? "overdue" : "partial"} label={row.original.state === "settled" ? "Fully settled" : row.original.state} /> },
    ],
    [contractHref],
  );

  const history = useMemo(() => [...allPayments].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)), [allPayments]);

  return (
    <ModulePage anyOf={["finance"]} title="Finance" description="Verify payments, monitor collections, and manage reversals and refunds." crumbs={[{ label: "Finance" }]}>
      {paymentActions.dialogs}
      <StatTiles items={[{ label: "Awaiting verification", value: queue.length }, { label: "Verified in period", value: <Money value={verifiedInPeriod} /> }, { label: "Reversed or refunded in period", value: <Money value={adjustedInPeriod} /> }, { label: "Net verified collections", value: <Money value={verifiedInPeriod - adjustedInPeriod} />, hint: "By Finance verification date" }]} />
      <div className="tw:grid tw:grid-cols-1 tw:gap-3 tw:sm:max-w-md tw:sm:grid-cols-2">
        <StandardDateField label="Period from" value={from} onChange={setFrom} />
        <StandardDateField label="Period to" value={to} onChange={setTo} />
      </div>
      <TabBar label="Finance views" value={tab} onChange={setTab} tabs={[{ value: "queue", label: "Verification queue", count: queue.length }, { value: "collections", label: "Collections", count: collections.length }, { value: "payments", label: "All payments" }, { value: "holds", label: "Financial holds", count: holds.length }, { value: "cancellations", label: "Cancellation requests", count: cancellationRequests.length }]} />
      <QueryState isLoading={payments.isLoading || contracts.isLoading} error={payments.error ?? contracts.error}>
        {tab === "queue" ? (
          <Section title="Verification queue" description="Only Finance verifies, rejects or returns a payment. Nobody verifies their own submission.">
            <DataTable data={queue} columns={queueColumns} getRowId={(row) => row.id} emptyText="Nothing is waiting for verification." caption="Verification queue" />
          </Section>
        ) : null}
        {tab === "collections" ? (
          <Section title="Collections monitor" description="Finalized contracts, their verified balances and overdue installments.">
            <FilterBar search={search} onSearch={setSearch} searchLabel="Search customers" filters={[{ label: "Collection state filter", value: collectionState, onChange: setCollectionState, options: COLLECTION_FILTERS }]} />
            <DataTable data={collections} columns={collectionColumns} getRowId={(row) => row.contract.id} emptyText="No contracts match." caption="Collections" />
          </Section>
        ) : null}
        {tab === "payments" ? (
          <Section title="All payments" description="Verified payments can be reversed or refunded here. The original payment is never deleted.">
            <DataTable data={history} columns={queueColumns} getRowId={(row) => row.id} emptyText="No payments yet." caption="All payments" />
          </Section>
        ) : null}
        {tab === "holds" ? (
          <Section title="Financial holds" description="A membership is held automatically when a verified payment reversal leaves a balance. It is released when Finance verifies settlement.">
            {holds.length === 0 ? <p className="tw:text-sm tw:text-muted-foreground">No memberships are on Financial Hold.</p> : <ul className="tw:flex tw:flex-col tw:gap-2">{holds.map((item) => <li key={item.id} className="tw:rounded-md tw:border tw:border-border tw:p-3 tw:text-sm">{item.customerName} · {item.productName} · <Link className="tw:underline" href={contractHref(item.contractId)}>Open contract</Link></li>)}</ul>}
          </Section>
        ) : null}
        {tab === "cancellations" ? (
          <Section title="Cancellation requests" description="Admin requested these cancellations with forfeiture. Finance confirms or declines each one on the contract page; the requester cannot decide it.">
            {cancellationRequests.length === 0 ? <p className="tw:text-sm tw:text-muted-foreground">No cancellation is awaiting confirmation.</p> : <ul className="tw:flex tw:flex-col tw:gap-2">{cancellationRequests.map((item) => <li key={item.id} className="tw:rounded-md tw:border tw:border-border tw:p-3 tw:text-sm">{item.customerName} · {item.productCode} · {item.cancellation ? CANCELLATION_GROUND_LABELS[item.cancellation.ground] : ""} · <Link className="tw:underline" href={contractHref(item.id)}>Open contract</Link></li>)}</ul>}
          </Section>
        ) : null}
      </QueryState>
    </ModulePage>
  );
}
