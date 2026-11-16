"use client";

import { EMPTY } from "@/shared/lib/empty-value";
import { useMemo, useState } from "react";
import { useCommissionAction, useCommissionClawbackAction, useCommissionClawbacks, useCommissions, useOperation } from "@/data/business-queries";
import type { CommissionView } from "@/data/contracts/commission-repository";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { FormDialog, ReasonDialog } from "@/shared/components/modern/form-dialog";
import { Money } from "@/shared/components/modern/money";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { QueryState } from "@/shared/components/modern/query-state";
import { AdminStatGrid, AdminStatCard } from "@/shared/components/admin";
import { BadgeCheck, Clock, CircleCheck, ReceiptText, RotateCcw } from "lucide-react";
import { AdjustDialog, awaitingConfirmation, COMMISSION_COLUMNS, CommissionDetailsSheet, HoldDialog, menuItemButtons, PayoutDialog, readyToPay, type CommissionMenuItem } from "../components/commission-shared";
import { CommissionPayoutBar } from "./commission-payouts-page";
import { clawbackBalance } from "@/modules/commissions/rules";
import type { CommissionClawback } from "@/modules/commissions/types";
import { MoneyField, TextField } from "@/shared/forms/modern";
import { formatPeso, parsePesoToCentavos } from "@/shared/lib/money";
import { formatDate } from "@/shared/lib/format-date";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { humanize } from "@/shared/lib/humanize";
import { matchesSearch, optionsFrom } from "@/shared/lib/search";
import { FilterBar } from "@/shared/components/modern/filter-bar";

type DialogState = { kind: "adjust" | "cancel" | "hold" | "payout" | "void"; commission: CommissionView } | null;

/** Payout filter options added to the status filter for payout staff. */
const PAYOUT_FILTERS: Record<string, { label: string; matches: (item: CommissionView) => boolean }> = {
  ready: { label: "Ready to pay", matches: readyToPay },
  awaiting: { label: "Waiting for confirmation", matches: awaitingConfirmation },
};

/**
 * Commissions tab of the Commissions area: everyone with the commissions grant sees the records their scope allows;
 * workflow actions need commission.approve, and payout staff also get the month-end payout bar and per-row payout fixes.
 */
export function CommissionsPanel() {
  const canApprove = useOperation("commission.approve");
  const canPayout = useOperation("commission.payout");
  const commissions = useCommissions();
  const action = useCommissionAction();
  const { confirmRun, dialog } = useConfirmRun();
  const [state, setState] = useState<DialogState>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const all = useMemo(() => commissions.data ?? [], [commissions.data]);
  const totals = useMemo(() => {
    const sum = (status: CommissionView["status"]) => all.filter((item) => item.status === status).reduce((total, item) => total + item.amountCentavos, 0);
    return { approved: sum("approved"), held: sum("on_hold"), paid: sum("paid") };
  }, [all]);

  /** Workflow actions for a commission, in the row menu and the details sheet footer. */
  const itemsFor = (item: CommissionView): CommissionMenuItem[] => {
    const items: CommissionMenuItem[] = [];
    if (canPayout && readyToPay(item)) items.push({ key: "payout", label: "Record Payout", onClick: () => setState({ kind: "payout", commission: item }) });
    if (canPayout && awaitingConfirmation(item)) {
      items.push({ key: "confirm", label: "Confirm Paid Out", tone: "success", onClick: () => confirmRun({ title: "Confirm Paid Out?", description: `Mark ${item.recipientName}'s commission as paid.`, confirmText: "Confirm", tone: "success", action: () => action.mutateAsync({ id: item.id, action: "confirm" }), successTitle: "Commission marked as Paid.", errorTitle: "Could not confirm" }) });
      if (item.status === "on_hold") items.push({ key: "void", label: "Void Payout", tone: "danger", onClick: () => setState({ kind: "void", commission: item }) });
    }
    if (!canApprove) return items;
    if (item.status === "approved" && !item.payout && !item.releaseDate) items.push({ key: "adjust", label: "Adjust", tone: "warning", onClick: () => setState({ kind: "adjust", commission: item }) });
    if (item.status === "on_hold") items.push({ key: "hold", label: "Resolve Hold", tone: "warning", onClick: () => setState({ kind: "hold", commission: item }) });
    if ((item.status === "approved" || item.status === "on_hold") && !(item.payout && !item.payout.confirmedAt)) items.push({ key: "cancel", label: "Cancel Commission", tone: "danger", onClick: () => setState({ kind: "cancel", commission: item }) });
    return items;
  };
  const detail = detailId ? all.find((item) => item.id === detailId) ?? null : null;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const statusOptions = useMemo(() => [
    ...optionsFrom("All statuses", all.map((item) => item.status), humanize),
    ...(canPayout ? Object.entries(PAYOUT_FILTERS).map(([value, { label }]) => ({ value, label })) : []),
  ], [all, canPayout]);
  const productOptions = useMemo(() => optionsFrom("All products", all.map((item) => item.product), humanize), [all]);
  const visible = useMemo(
    () =>
      all.filter(
        (item) =>
          (statusFilter === "all" || (PAYOUT_FILTERS[statusFilter]?.matches(item) ?? item.status === statusFilter)) &&
          (productFilter === "all" || item.product === productFilter) &&
          matchesSearch(search, item.recipientName, item.customerName, item.saleReference),
      ),
    [all, search, statusFilter, productFilter],
  );
  return (
    <>
      {dialog}
      <CommissionPayoutBar commissions={all} />
      <AdminStatGrid>
        <AdminStatCard label="Approved, Unpaid" value={<Money value={totals.approved} />} icon={BadgeCheck} tone="brand" />
        <AdminStatCard label="On Hold" value={<Money value={totals.held} />} icon={Clock} tone="warning" />
        <AdminStatCard label="Paid" value={<Money value={totals.paid} />} icon={CircleCheck} tone="success" />
        <AdminStatCard label="Records" value={all.length} icon={ReceiptText} tone="neutral" />
      </AdminStatGrid>
      <FilterBar
        search={search}
        onSearch={setSearch}
        searchLabel="Search commissions"
        filters={[
          { label: "Status filter", value: statusFilter, onChange: setStatusFilter, options: statusOptions },
          { label: "Product filter", value: productFilter, onChange: setProductFilter, options: productOptions },
        ]}
      />
      <QueryState isLoading={commissions.isLoading} error={commissions.error}>
        <DataTable
          data={visible}
          columns={COMMISSION_COLUMNS}
          getRowId={(row) => row.id}
          emptyText={all.length === 0 ? "No commissions yet." : "No commissions match the filters."}
          caption="Commissions"
          onRowOpen={(row) => setDetailId(row.id)}
          getRowLabel={(row) => `Open commission for ${row.recipientName}`}
          rowActions={(row) => <RowActionsMenu itemName={`commission for ${row.recipientName}`} extraItems={itemsFor(row)} />}
        />
      </QueryState>
      <CommissionDetailsSheet detail={detail} onClose={() => setDetailId(null)} items={detail ? itemsFor(detail) : []} />
      {state?.kind === "adjust" ? <AdjustDialog commission={state.commission} onClose={() => setState(null)} /> : null}
      <ReasonDialog open={state?.kind === "cancel"} title="Cancel Commission" description="A cancelled commission can no longer be paid. This is recorded in the audit history." confirmText="Cancel Commission" danger successText="Commission cancelled." onClose={() => setState(null)} onSubmit={(reason) => (state?.kind === "cancel" ? action.mutateAsync({ id: state.commission.id, action: "cancel", reason }) : Promise.resolve())} />
      {state?.kind === "hold" ? <HoldDialog commission={state.commission} onClose={() => setState(null)} /> : null}
      {state?.kind === "payout" ? <PayoutDialog commissions={[state.commission]} onClose={() => setState(null)} /> : null}
      <ReasonDialog open={state?.kind === "void"} title="Void Initiated Payout" description="The voided payout stays in the record." confirmText="Void Payout" danger successText="Payout voided."
        onClose={() => setState(null)} onSubmit={(reason) => (state?.kind === "void" ? action.mutateAsync({ id: state.commission.id, action: "void", reason }) : Promise.resolve())} />
    </>
  );
}

function recoveredOf(row: CommissionClawback): number {
  return row.recoveries.reduce((sum, item) => sum + item.amountCentavos, 0);
}

function recoveryStatus(row: CommissionClawback): string {
  return row.refundDueCentavos ? "Refund due" : row.writeOff ? "Not collected" : clawbackBalance(row) === 0 ? "Paid back" : "Owed";
}

/** Recovery is shown to people who approve commissions or who have commission records of their own. */
export function useCommissionRecoveryVisible(): boolean {
  const canApprove = useOperation("commission.approve");
  const commissions = useCommissions();
  return canApprove || (commissions.data ?? []).length > 0;
}

/**
 * Commission recovery (clawback) ledger, the Recovery tab. Visibility follows
 * `useCommissionRecoveryVisible`; collection and write-off follow their own operations.
 */
export function CommissionRecoveryPanel() {
  const canCollect = useOperation("commission.clawback.collect");
  const canWriteOff = useOperation("commission.clawback.writeOff");
  const commissionsQuery = useCommissions();
  const commissions = useMemo(() => commissionsQuery.data ?? [], [commissionsQuery.data]);
  const enabled = useCommissionRecoveryVisible();
  const query = useCommissionClawbacks(enabled);
  const action = useCommissionClawbackAction();
  const [collecting, setCollecting] = useState<CommissionClawback | null>(null);
  const [writeOff, setWriteOff] = useState<CommissionClawback | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string>();
  // Memoized: TanStack renders cell functions as components, so a new columns
  // array on every render would remount every cell (and close an open row menu).
  const recoveryColumns = useMemo<ColumnDef<CommissionClawback, unknown>[]>(() => [
    { header: "Seller", cell: ({ row }) => <span className="tw:font-semibold">{commissions.find((item) => item.id === row.original.commissionId)?.recipientName ?? EMPTY}</span> },
    { header: "Reason", cell: ({ row }) => humanize(row.original.trigger) },
    { header: "Original Amount", cell: ({ row }) => <Money value={row.original.amountCentavos} /> },
    { header: "Balance", cell: ({ row }) => <Money value={clawbackBalance(row.original)} /> },
    { header: "Status", cell: ({ row }) => recoveryStatus(row.original) },
  ], [commissions]);
  if (!enabled) return null;
  const sellerOf = (row: CommissionClawback) => commissions.find((item) => item.id === row.commissionId)?.recipientName ?? EMPTY;
  const itemsFor = (row: CommissionClawback): CommissionMenuItem[] => {
    if (clawbackBalance(row) <= 0) return [];
    const items: CommissionMenuItem[] = [];
    if (canCollect) items.push({ key: "collect", label: "Record Payback Received", tone: "success", onClick: () => { setDetailId(null); setError(undefined); setAmount(""); setReference(""); setCollecting(row); } });
    if (canWriteOff) items.push({ key: "writeOff", label: "Mark Not Collected", tone: "danger", onClick: () => { setDetailId(null); setWriteOff(row); } });
    return items;
  };
  const detail = detailId ? (query.data ?? []).find((row) => row.id === detailId) ?? null : null;
  return (
    <section className="tw:grid tw:gap-3" aria-label="Commission paybacks">
      <QueryState isLoading={query.isLoading} error={query.error}>
        <DataTable data={query.data ?? []} caption="Commission Paybacks" emptyText="No payback records." getRowId={(row) => row.id}
          onRowOpen={(row) => setDetailId(row.id)} getRowLabel={(row) => `Open payback for ${sellerOf(row)}`}
          rowActions={(row) => <RowActionsMenu itemName={`payback for ${sellerOf(row)}`} extraItems={itemsFor(row)} />}
          columns={recoveryColumns} />
      </QueryState>
      <RecordDetailsSheet
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail ? sellerOf(detail) : "Commission Paybacks"}
        subtitle={detail ? humanize(detail.trigger) : undefined}
        icon={<RotateCcw />}
        sections={detail ? [
          {
            title: "Payback",
            rows: [
              { label: "Reason", value: humanize(detail.trigger) },
              { label: "Status", value: recoveryStatus(detail) },
              { label: "Raised on", value: formatDate(detail.raisedDate) },
              { label: "Refund due", value: detail.refundDueCentavos ? <Money value={detail.refundDueCentavos} /> : null },
            ],
          },
          {
            title: "Amounts",
            rows: [
              { label: "Original amount", value: <Money value={detail.amountCentavos} /> },
              { label: "Paid back", value: <Money value={recoveredOf(detail)} /> },
              { label: "Balance", value: <Money value={clawbackBalance(detail)} /> },
              { label: "Reason for not collecting", value: detail.writeOff?.reason, wide: true },
            ],
          },
        ] : []}
        history={detail?.recoveries.map((item, index) => ({ key: `${item.date}-${index}`, when: formatDate(item.date), text: `Received ${formatPeso(item.amountCentavos)}, reference ${item.reference}` }))}
        footer={detail && itemsFor(detail).length > 0 ? menuItemButtons(itemsFor(detail)) : undefined}
      />
      {collecting ? <FormDialog open title="Record Payback Received" submitText="Record Payback" pending={action.isPending} error={error}
        onClose={() => setCollecting(null)} onSubmit={() => {
          const amountCentavos = parsePesoToCentavos(amount);
          if (!amountCentavos) { setError("Enter the amount received."); return; }
          void action.mutateAsync({ kind: "collect", id: collecting.id, amountCentavos, reference })
            .then(() => setCollecting(null)).catch((failure: Error) => setError(failure.message));
        }}>
        <MoneyField label="Amount received" required value={amount} onChange={setAmount} />
        <TextField label="Payback reference" required value={reference} onChange={setReference} />
      </FormDialog> : null}
      <ReasonDialog open={writeOff !== null} title="Mark Balance as Not Collected" description="The original amount and collections stay in history." confirmText="Mark Not Collected" danger
        successText="Marked as not collected." onClose={() => setWriteOff(null)}
        onSubmit={(reason) => writeOff ? action.mutateAsync({ kind: "writeOff", id: writeOff.id, reason }) : Promise.resolve()} />
    </section>
  );
}

