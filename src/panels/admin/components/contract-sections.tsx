"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { Award, Calendar, CalendarCheck, CalendarDays, Check, Clock, CreditCard, Diamond, FileText, IdCard, Layers, Receipt, Star, Tag, User, UserCheck, type LucideIcon } from "lucide-react";
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
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { DetailSkeleton } from "@/shared/components/modern/skeletons";
import { AdminPage, AdminSection, AdminSectionHeading, AdminStatCard, AdminStatGrid } from "@/shared/components/admin";
import { humanize } from "@/shared/lib/humanize";
import { recordLabel } from "@/shared/lib/record-label";

/** Contract with its payments, membership, schedule, ledger and milestones, derived once for every detail page. */
export function useContractRecord(contractId: string, includePaymentReference = false) {
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
    () => (contract ? deriveMilestones({ contract, payments: contractPayments, saleConfirmedDate: contract.sale?.confirmedDate ?? null, activationDate: membership?.activationDate ?? null, cardId: membership?.cardId ?? null, vipNumber: contract.vipNumber, signedAgreementRecordedDate: contract.signedAgreementRecordedDate, includePaymentReference }) : []),
    [contract, contractPayments, membership?.activationDate, membership?.cardId, includePaymentReference],
  );
  return { isLoading: contracts.isLoading, contract, payments: contractPayments, membership, schedule, ledger, milestones };
}

export type ContractRecord = Omit<ReturnType<typeof useContractRecord>, "contract"> & { contract: ContractView };

/** Shared page frame: loading and not-found states, then the page body for a found contract. */
export function ContractPageFrame({
  contractId,
  anyOf,
  parentCrumbs,
  includePaymentReference = false,
  actions,
  children,
}: {
  contractId: string;
  anyOf: AdminModuleId[];
  parentCrumbs: BreadcrumbItem[];
  includePaymentReference?: boolean;
  actions?: (record: ContractRecord) => ReactNode;
  children: (record: ContractRecord) => ReactNode;
}) {
  const record = useContractRecord(contractId, includePaymentReference);
  if (record.isLoading) {
    return (
      <AdminPage anyOf={anyOf} title="Contract" crumbs={parentCrumbs}>
        <DetailSkeleton />
      </AdminPage>
    );
  }
  const { contract } = record;
  if (!contract) {
    return (
      <AdminPage anyOf={anyOf} title="Contract not found" crumbs={parentCrumbs}>
        <InfoNote>This contract does not exist or is not visible to this account.</InfoNote>
      </AdminPage>
    );
  }
  const full: ContractRecord = { ...record, contract };
  return (
    <AdminPage anyOf={anyOf} title={recordLabel("Contract", contract.customerName, contract.productCode)} description={`${contract.customerName} · ${contract.productCode} · ${contract.schemeLabel}`} crumbs={[...parentCrumbs, { label: recordLabel("Contract", contract.customerName, contract.productCode) }]} actions={actions?.(full)}>
      {children(full)}
    </AdminPage>
  );
}

/** White feature card with an icon-led heading, local to the contract detail pages. */
function ContractCard({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description?: string; children: ReactNode }) {
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  return (
    // Named by its visible heading and described by its subtitle, so the region's accessible name never drifts from the screen.
    <section
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className="contract-detail__card tw:flex tw:h-full tw:min-w-0 tw:flex-col tw:rounded-2xl tw:border tw:border-border tw:bg-card tw:p-5 tw:text-card-foreground tw:shadow-(--shadow-soft) tw:sm:p-6"
    >
      <div className="tw:flex tw:flex-wrap tw:items-start tw:gap-x-3 tw:gap-y-3">
        <Icon aria-hidden="true" className="contract-detail__card-icon tw:mt-0.5 tw:size-6 tw:shrink-0 tw:text-primary" strokeWidth={1.75} />
        {/* A 14rem basis lets the heading wrap below the icon on narrow cards instead of squeezing it. */}
        <div className="tw:min-w-0 tw:flex-[1_1_14rem]">
          <h2 id={titleId} className="tw:text-lg tw:leading-snug tw:font-semibold tw:text-foreground">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="tw:mt-0.5 tw:text-sm tw:text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="tw:mt-5 tw:flex tw:min-w-0 tw:flex-1 tw:flex-col">{children}</div>
    </section>
  );
}

export function ContractTiles({ contract, payments }: { contract: ContractView; payments: PaymentView[] }) {
  return (
    <div role="group" aria-label="Contract summary">
      <AdminStatGrid columns={4}>
        <AdminStatCard label="Contract price" value={<Money value={contract.priceCentavos} />} icon={Layers} tone="brand" description={contract.priceStatus === "conflict" ? "Source conflict" : "Snapshot"} />
        <AdminStatCard label="Verified payments" value={<Money value={totalVerifiedCentavos(payments)} />} icon={CreditCard} tone="success" />
        <AdminStatCard label="Outstanding balance" value={<Money value={outstandingBalanceCentavos(contract, payments)} />} icon={Clock} tone="warning" />
        <AdminStatCard label="Status" value={<BizBadge status={contract.status} />} icon={Tag} tone="neutral" />
      </AdminStatGrid>
    </div>
  );
}

export function ContractTermsSection({ record }: { record: ContractRecord }) {
  const { contract, membership } = record;
  const rows: Array<{ icon: LucideIcon; term: string; value: ReactNode }> = [
    { icon: User, term: "Customer", value: contract.customerName },
    { icon: UserCheck, term: "Seller", value: contract.sellerName ?? "Company" },
    { icon: Layers, term: "Plan", value: `${contract.productCode} · version ${contract.productConfigVersion} · ${contract.validityYears} years` },
    { icon: CalendarDays, term: "Scheme", value: `${contract.schemeLabel}${contract.paymentCode ? ` (${contract.paymentCode})` : ""}` },
    ...(contract.arrangement
      ? [
          {
            icon: FileText,
            term: "Special arrangement",
            value:
              contract.arrangement.status === "approved"
                ? `Approved ${formatDate(contract.arrangement.approvedAt)} · ${contract.arrangement.approvalReference}`
                : "Awaiting Super Admin written approval",
          },
        ]
      : []),
    { icon: Diamond, term: "Classification", value: contract.classification === "S" ? "Standard (S)" : "Non-Standard (N)" },
    { icon: Star, term: "Benefits", value: `${contract.benefits.vipDiscountPercent}% VIP discount · ${contract.benefits.lifetimePoints.toLocaleString("en-PH")} lifetime points · ${contract.benefits.pointsPerCycle.toLocaleString("en-PH")} per cycle` },
    { icon: IdCard, term: "VIP Number", value: contract.vipNumber ?? "Not issued" },
    ...(contract.raNumber && contract.raNumber !== contract.vipNumber ? [{ icon: IdCard, term: "Historical RA number", value: contract.raNumber }] : []),
    { icon: Check, term: "Customer accepted", value: contract.customerAccepted ? "Yes" : "No" },
    { icon: CalendarCheck, term: "Finalized", value: formatDate(contract.finalizedAt) },
    { icon: Receipt, term: "Sale", value: contract.sale ? <BizBadge status={contract.sale.status} /> : "Not recorded yet" },
    { icon: Award, term: "Membership", value: membership ? <span>{humanize(membership.status)}{membership.cardId ? ` · Card ${membership.cardId}` : ""}{membership.financialHold ? " · Financial Hold" : ""}</span> : "Not created yet" },
  ];
  return (
    <ContractCard icon={FileText} title="Contract terms" description="Fixed snapshot. Later catalog changes never alter this contract.">
      <dl className="contract-detail__terms tw:m-0 tw:flex tw:flex-col">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.term} className="tw:flex tw:items-start tw:gap-3 tw:border-b tw:border-border tw:py-2.5 tw:last:border-b-0">
              <span aria-hidden="true" className="tw:mt-0.5 tw:flex tw:size-5 tw:shrink-0 tw:items-center tw:justify-center tw:text-muted-foreground">
                <Icon className="tw:size-4" strokeWidth={1.75} />
              </span>
              <dt className="tw:w-32 tw:shrink-0 tw:font-medium tw:text-muted-foreground tw:sm:w-40">{row.term}</dt>
              <dd className="tw:m-0 tw:min-w-0 tw:flex-1 tw:break-words">{row.value}</dd>
            </div>
          );
        })}
      </dl>
    </ContractCard>
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
  const sheetRows: Array<{ icon: LucideIcon; label: string; value: ReactNode }> = line
    ? [
        { icon: Calendar, label: "Due", value: line.dueDate ? formatDate(line.dueDate) : "Date not set" },
        { icon: Layers, label: "Amount", value: <Money value={line.amountCentavos} /> },
        { icon: CreditCard, label: "Paid", value: <Money value={line.allocatedCentavos} /> },
        { icon: Layers, label: "Remaining", value: <Money value={line.amountCentavos - line.allocatedCentavos} /> },
      ]
    : [];
  return (
    <>
      <Sheet open={line !== null} onOpenChange={(next) => (next ? undefined : setLine(null))}>
        <SheetContent className="contract-detail__sheet tw:overflow-y-auto tw:data-[side=right]:w-full tw:sm:data-[side=right]:max-w-md">
          <SheetHeader className="tw:gap-2 tw:border-b tw:border-border tw:pr-12">
            <SheetTitle className="tw:text-lg tw:font-semibold tw:tracking-tight">{line?.label ?? "Installment"}</SheetTitle>
            <SheetDescription>{`${contract.customerName} · ${contract.productCode}`}</SheetDescription>
            {line ? <div><BizBadge status={line.status} /></div> : null}
          </SheetHeader>
          <div className="tw:flex tw:flex-col tw:gap-5 tw:px-4">
            {line ? (
              <section aria-label="Installment Details" className="contract-detail__sheet-card tw:flex tw:flex-col tw:rounded-xl tw:border tw:border-border tw:bg-card tw:p-4 tw:shadow-(--shadow-soft)">
                <div className="tw:flex tw:items-start tw:gap-3">
                  <span aria-hidden="true" className="tw:flex tw:size-9 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg tw:bg-[var(--color-brand-soft)] tw:text-primary">
                    <FileText className="tw:size-5" strokeWidth={1.75} />
                  </span>
                  <div className="tw:min-w-0">
                    <h3 className="tw:text-sm tw:font-semibold tw:text-foreground">Installment Details</h3>
                    <p className="tw:mt-0.5 tw:text-sm tw:text-muted-foreground">Payment information for this installment.</p>
                  </div>
                </div>
                <dl className="tw:m-0 tw:mt-3 tw:flex tw:flex-col">
                  {sheetRows.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="tw:flex tw:items-center tw:gap-3 tw:border-b tw:border-border tw:py-2 tw:last:border-b-0">
                        <span aria-hidden="true" className="tw:flex tw:size-5 tw:shrink-0 tw:items-center tw:justify-center tw:text-muted-foreground">
                          <Icon className="tw:size-4" strokeWidth={1.75} />
                        </span>
                        <dt className="tw:w-20 tw:shrink-0 tw:font-medium tw:text-muted-foreground">{item.label}</dt>
                        <dd className="tw:m-0 tw:min-w-0 tw:flex-1 tw:break-words">{item.value}</dd>
                      </div>
                    );
                  })}
                </dl>
              </section>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
      <section className="tw:flex tw:flex-col tw:gap-4">
        <AdminSectionHeading title="Payment schedule" description="Verified money is applied to the schedule in order. No penalty or interest is ever added." icon={CalendarDays} />
        <DataTable data={schedule} columns={columns} getRowId={(row) => String(row.seq)} emptyText="No schedule." caption="Payment schedule" onRowOpen={setLine} getRowLabel={(row) => `Open ${row.label}`} rowActions={(row) => <RowActionsMenu itemName={row.label} onView={() => setLine(row)} />} />
      </section>
    </>
  );
}

export function ContractMilestonesSection({ record }: { record: ContractRecord }) {
  return (
    <AdminSection title="Collection milestones" description="Each step is separate: a verified payment never activates a membership.">
      <DetailList>
        {record.milestones.map((milestone) => (
          <DetailRow key={milestone.key} term={milestone.label}>
            {milestone.date ? formatDate(milestone.date) : "Not yet"}
            {milestone.note ? <span className="tw:text-muted-foreground"> · {milestone.note.replace(/\d{4}-\d{2}-\d{2}/, (date) => formatDate(date))}</span> : null}
          </DetailRow>
        ))}
      </DetailList>
    </AdminSection>
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
    <section className="tw:flex tw:flex-col tw:gap-4">
      <AdminSectionHeading title="Payment ledger" description="Verified payments, reversals and refunds in date order. Original payments are never changed." />
      <DataTable data={record.ledger} columns={columns} getRowId={(row) => `${row.paymentId}-${row.kind}-${row.date}-${row.netCentavos}`} emptyText="No verified payments yet." caption="Payment ledger" />
    </section>
  );
}

/** Payments list. Pass `actions` (from usePaymentActions) to make rows actionable; omitted, the list is read-only. */
export function ContractPaymentsSection({ record, actions }: { record: ContractRecord; actions?: { rowActions: (payment: PaymentView) => ReactNode; open?: (payment: PaymentView) => void } }) {
  const columns = useMemo<ColumnDef<PaymentView, unknown>[]>(
    () => [
      { id: "date", header: "Receipt date", cell: ({ row }) => formatDate(row.original.paidDate) },
      { id: "purpose", header: "Purpose", cell: ({ row }) => humanize(row.original.purpose) },
      { id: "amount", header: "Amount", cell: ({ row }) => <Money value={row.original.amountCentavos} /> },
      { id: "net", header: "Counted", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => <Money value={netVerifiedCentavos(row.original)} /> },
      { id: "status", header: "Status", cell: ({ row }) => <div className="tw:flex tw:flex-col tw:gap-1"><BizBadge status={row.original.status} />{row.original.adjustments.length > 0 ? <span className="tw:text-xs tw:text-muted-foreground">{row.original.adjustments.length} adjustment(s)</span> : null}</div> },
    ],
    [],
  );
  return (
    <section className="tw:flex tw:flex-col tw:gap-4">
      <AdminSectionHeading title="Payments" icon={CreditCard} />
      <DataTable data={record.payments} columns={columns} getRowId={(row) => row.id} emptyText="No payments submitted yet." caption="Payments" rowActions={actions?.rowActions} onRowOpen={actions?.open} getRowLabel={(row) => `Open payment of ${formatDate(row.paidDate)}`} />
    </section>
  );
}

export function ContractHistorySection({ contract }: { contract: ContractView }) {
  return (
    <ContractCard icon={Clock} title="History">
      {contract.history.length === 0 ? (
        <p className="tw:text-sm tw:text-muted-foreground">No events yet.</p>
      ) : (
        <ol className="contract-detail__history tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-2 tw:p-0">
          {contract.history.map((event, index) => (
            <li key={`${event.at}-${index}`} className="tw:flex tw:items-start tw:gap-2.5 tw:rounded-lg tw:bg-[var(--color-bg-subtle)] tw:px-3 tw:py-2.5 tw:text-sm">
              <FileText aria-hidden="true" className="tw:mt-0.5 tw:size-4 tw:shrink-0 tw:text-muted-foreground" strokeWidth={1.75} />
              <span>{formatDate(event.at)} · {humanize(event.event)}{event.note ? ` — ${event.note}` : ""}</span>
            </li>
          ))}
        </ol>
      )}
    </ContractCard>
  );
}
