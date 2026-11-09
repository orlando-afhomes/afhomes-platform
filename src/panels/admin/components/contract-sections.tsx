"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useContracts, useMemberships, usePayments } from "@/data/business-queries";
import type { ContractView } from "@/data/contracts/contract-repository";
import type { PaymentView } from "@/data/contracts/payment-repository";
import { deriveMilestones } from "@/modules/finance/milestones";
import { buildCollectionLedger, buildScheduleState, netVerifiedCentavos, outstandingBalanceCentavos, totalVerifiedCentavos, type LedgerEntry } from "@/modules/finance/rules";
import type { ScheduleLineState } from "@/modules/finance/types";
import type { AdminModuleId } from "@/modules/identity/permissions";
import { manilaToday } from "@/shared/lib/dates";
import { formatDate } from "@/shared/lib/format-date";
import { BizBadge } from "@/shared/components/business/biz-badge";
import type { BreadcrumbItem } from "@/shared/components/modern/breadcrumbs";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { DetailList, DetailRow, InfoNote } from "@/shared/components/modern/detail-list";
import { Money } from "@/shared/components/modern/money";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { Section } from "@/shared/components/modern/section";
import { StatTiles } from "@/shared/components/modern/stat-tiles";
import { Skeleton } from "@/shared/ui/skeleton";
import { ModulePage } from "./module-page";

/** Contract with its payments, membership, schedule, ledger and milestones, derived once for every detail page. */
export function useContractRecord(contractId: string) {
  const contracts = useContracts();
  const payments = usePayments();
  const memberships = useMemberships();
  const contract = contracts.data?.find((item) => item.id === contractId);
  const contractPayments = useMemo(() => (payments.data ?? []).filter((item) => item.contractId === contractId), [payments.data, contractId]);
  const membership = memberships.data?.find((item) => item.contractId === contractId);
  const today = manilaToday();
  const schedule = useMemo(() => (contract ? buildScheduleState(contract, contractPayments, today) : []), [contract, contractPayments, today]);
  const ledger = useMemo(() => (contract ? buildCollectionLedger(contract, contractPayments) : []), [contract, contractPayments]);
  const milestones = useMemo(
    () => (contract ? deriveMilestones({ contract, payments: contractPayments, saleConfirmedDate: contract.sale?.confirmedDate ?? null, activationDate: membership?.activationDate ?? null, cardId: membership?.cardId ?? null }) : []),
    [contract, contractPayments, membership?.activationDate, membership?.cardId],
  );
  return { isLoading: contracts.isLoading, contract, payments: contractPayments, membership, schedule, ledger, milestones };
}

export type ContractRecord = Omit<ReturnType<typeof useContractRecord>, "contract"> & { contract: ContractView };

/** Shared page frame: loading and not-found states, then the page body for a found contract. */
export function ContractPageFrame({
  contractId,
  anyOf,
  parentCrumbs,
  actions,
  children,
}: {
  contractId: string;
  anyOf: AdminModuleId[];
  parentCrumbs: BreadcrumbItem[];
  actions?: (record: ContractRecord) => ReactNode;
  children: (record: ContractRecord) => ReactNode;
}) {
  const record = useContractRecord(contractId);
  if (record.isLoading) {
    return (
      <ModulePage anyOf={anyOf} title="Contract" crumbs={parentCrumbs}>
        <Skeleton className="tw:h-48 tw:w-full" />
      </ModulePage>
    );
  }
  const { contract } = record;
  if (!contract) {
    return (
      <ModulePage anyOf={anyOf} title="Contract not found" crumbs={parentCrumbs}>
        <InfoNote>This contract does not exist or is not visible to this account.</InfoNote>
      </ModulePage>
    );
  }
  const full: ContractRecord = { ...record, contract };
  return (
    <ModulePage anyOf={anyOf} title={`Contract ${contract.id.toUpperCase()}`} description={`${contract.customerName} · ${contract.productCode} · ${contract.schemeLabel}`} crumbs={[...parentCrumbs, { label: contract.id.toUpperCase() }]} actions={actions?.(full)}>
      {children(full)}
    </ModulePage>
  );
}

export function ContractTiles({ contract, payments }: { contract: ContractView; payments: PaymentView[] }) {
  return (
    <StatTiles items={[{ label: "Contract price", value: <Money value={contract.priceCentavos} />, hint: contract.priceStatus === "conflict" ? "Source conflict" : "Snapshot at preparation" }, { label: "Verified payments", value: <Money value={totalVerifiedCentavos(payments)} /> }, { label: "Outstanding balance", value: <Money value={outstandingBalanceCentavos(contract, payments)} /> }, { label: "Status", value: <BizBadge status={contract.status} /> }]} />
  );
}

export function ContractTermsSection({ record }: { record: ContractRecord }) {
  const { contract, membership } = record;
  return (
    <Section title="Contract terms" description="Fixed snapshot. Later catalog changes never alter this contract.">
      <DetailList>
        <DetailRow term="Customer">{contract.customerName}</DetailRow>
        <DetailRow term="Seller">{contract.sellerName ?? "Company"}</DetailRow>
        <DetailRow term="Plan">{contract.productCode} · version {contract.productConfigVersion} · {contract.validityYears} years</DetailRow>
        <DetailRow term="Scheme">{contract.schemeLabel}{contract.paymentCode ? ` (${contract.paymentCode})` : ""}</DetailRow>
        {contract.arrangement ? (
          <DetailRow term="Special arrangement">
            {contract.arrangement.status === "approved" ? `Approved ${formatDate(contract.arrangement.approvedAt)} · ${contract.arrangement.approvalReference}` : "Awaiting Super Admin written approval"}
          </DetailRow>
        ) : null}
        <DetailRow term="Classification">{contract.classification === "S" ? "Standard (S)" : "Non-Standard (N)"}</DetailRow>
        <DetailRow term="Benefits">{contract.benefits.vipDiscountPercent}% VIP discount · {contract.benefits.lifetimePoints.toLocaleString("en-PH")} lifetime points · {contract.benefits.pointsPerCycle.toLocaleString("en-PH")} per cycle</DetailRow>
        <DetailRow term="RA number">{contract.raNumber ?? "Not recorded"}</DetailRow>
        <DetailRow term="Customer accepted">{contract.customerAccepted ? "Yes" : "No"}</DetailRow>
        <DetailRow term="Finalized">{formatDate(contract.finalizedAt)}</DetailRow>
        <DetailRow term="Sale">{contract.sale ? <BizBadge status={contract.sale.status} /> : "Not recorded yet"}</DetailRow>
        <DetailRow term="Membership">{membership ? <span>{membership.status}{membership.cardId ? ` · Card ${membership.cardId}` : ""}{membership.financialHold ? " · Financial Hold" : ""}</span> : "Not created yet"}</DetailRow>
      </DetailList>
    </Section>
  );
}

export function ContractScheduleSection({ record }: { record: ContractRecord }) {
  const { contract, schedule } = record;
  const [line, setLine] = useState<ScheduleLineState | null>(null);
  const columns = useMemo<ColumnDef<ScheduleLineState, unknown>[]>(
    () => [
      { id: "label", header: "Installment", cell: ({ row }) => row.original.label },
      { id: "due", header: "Due", cell: ({ row }) => (row.original.dueDate ? formatDate(row.original.dueDate) : "Date not set") },
      { id: "amount", header: "Amount", cell: ({ row }) => <Money value={row.original.amountCentavos} /> },
      { id: "paid", header: "Paid", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => <Money value={row.original.allocatedCentavos} /> },
      { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status} /> },
    ],
    [],
  );
  return (
    <>
      <RecordDetailsSheet
        open={line !== null}
        onClose={() => setLine(null)}
        title={line?.label ?? "Installment"}
        subtitle={`${contract.customerName} · ${contract.productCode}`}
        badge={line ? <BizBadge status={line.status} /> : undefined}
        sections={
          line
            ? [{ title: "Installment", rows: [{ label: "Due", value: line.dueDate ? formatDate(line.dueDate) : "Date not set" }, { label: "Amount", value: <Money value={line.amountCentavos} /> }, { label: "Paid", value: <Money value={line.allocatedCentavos} /> }, { label: "Remaining", value: <Money value={line.amountCentavos - line.allocatedCentavos} /> }] }]
            : []
        }
      />
      <Section title="Payment schedule" description="Verified money is applied to the schedule in order. No penalty or interest is ever added.">
        <DataTable data={schedule} columns={columns} getRowId={(row) => String(row.seq)} emptyText="No schedule." caption="Payment schedule" pageSize={10} onRowOpen={setLine} getRowLabel={(row) => `Open ${row.label}`} rowActions={(row) => <RowActionsMenu itemName={row.label} onView={() => setLine(row)} />} />
      </Section>
    </>
  );
}

export function ContractMilestonesSection({ record }: { record: ContractRecord }) {
  return (
    <Section title="Collection milestones" description="Each step is separate: a verified payment never activates a membership.">
      <DetailList>
        {record.milestones.map((milestone) => (
          <DetailRow key={milestone.key} term={milestone.label}>
            {milestone.date ? formatDate(milestone.date) : "Not yet"}
            {milestone.note ? <span className="tw:text-muted-foreground"> · {milestone.note.replace(/\d{4}-\d{2}-\d{2}/, (date) => formatDate(date))}</span> : null}
          </DetailRow>
        ))}
      </DetailList>
    </Section>
  );
}

export function ContractLedgerSection({ record }: { record: ContractRecord }) {
  const columns = useMemo<ColumnDef<LedgerEntry, unknown>[]>(
    () => [
      { id: "date", header: "Date", cell: ({ row }) => formatDate(row.original.date) },
      { id: "event", header: "Entry", cell: ({ row }) => `${row.original.kind === "payment" ? "Payment" : row.original.kind === "reversal" ? "Reversal" : "Refund"} · ${row.original.label}` },
      { id: "amount", header: "Amount", cell: ({ row }) => <Money value={row.original.amountCentavos} /> },
      { id: "net", header: "Net verified", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => <Money value={row.original.netCentavos} /> },
      { id: "balance", header: "Balance", cell: ({ row }) => <Money value={row.original.balanceCentavos} /> },
    ],
    [],
  );
  return (
    <Section title="Payment ledger" description="Verified payments, reversals and refunds in date order. Original payments are never changed.">
      <DataTable data={record.ledger} columns={columns} getRowId={(row) => `${row.paymentId}-${row.kind}-${row.date}-${row.netCentavos}`} emptyText="No verified payments yet." caption="Payment ledger" pageSize={10} />
    </Section>
  );
}

/** Payments list. Pass `actions` (from usePaymentActions) to make rows actionable; omitted, the list is read-only. */
export function ContractPaymentsSection({ record, actions }: { record: ContractRecord; actions?: { rowActions: (payment: PaymentView) => ReactNode; open: (payment: PaymentView) => void } }) {
  const columns = useMemo<ColumnDef<PaymentView, unknown>[]>(
    () => [
      { id: "date", header: "Receipt date", cell: ({ row }) => formatDate(row.original.paidDate) },
      { id: "purpose", header: "Purpose", cell: ({ row }) => row.original.purpose.replace(/_/g, " ") },
      { id: "amount", header: "Amount", cell: ({ row }) => <Money value={row.original.amountCentavos} /> },
      { id: "net", header: "Counted", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => <Money value={netVerifiedCentavos(row.original)} /> },
      { id: "status", header: "Status", cell: ({ row }) => <div className="tw:flex tw:flex-col tw:gap-1"><BizBadge status={row.original.status} />{row.original.adjustments.length > 0 ? <span className="tw:text-xs tw:text-muted-foreground">{row.original.adjustments.length} adjustment(s)</span> : null}</div> },
    ],
    [],
  );
  return (
    <Section title="Payments">
      <DataTable data={record.payments} columns={columns} getRowId={(row) => row.id} emptyText="No payments submitted yet." caption="Payments" rowActions={actions?.rowActions} onRowOpen={actions?.open} getRowLabel={(row) => `Open payment of ${formatDate(row.paidDate)}`} />
    </Section>
  );
}

export function ContractHistorySection({ contract }: { contract: ContractView }) {
  return (
    <Section title="History">
      <ol className="tw:flex tw:flex-col tw:gap-1 tw:text-sm">
        {contract.history.map((event, index) => (
          <li key={`${event.at}-${index}`}>{formatDate(event.at)} · {event.event.replace(/_/g, " ").toLowerCase()}{event.note ? ` — ${event.note}` : ""}</li>
        ))}
        {contract.history.length === 0 ? <li className="tw:text-muted-foreground">No events yet.</li> : null}
      </ol>
    </Section>
  );
}
