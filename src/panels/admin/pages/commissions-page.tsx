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
import { AdjustDialog, COMMISSION_COLUMNS, CommissionDetailsSheet, HoldDialog, menuItemButtons, type CommissionMenuItem } from "../components/commission-shared";
import { clawbackBalance } from "@/modules/commissions/rules";
import type { CommissionClawback } from "@/modules/commissions/types";
import { MoneyField, TextField } from "@/shared/forms/modern";
import { formatPeso, parsePesoToCentavos } from "@/shared/lib/money";
import { formatDate } from "@/shared/lib/format-date";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { humanize } from "@/shared/lib/humanize";
import { matchesSearch, optionsFrom } from "@/shared/lib/search";
import { FilterBar } from "@/shared/components/modern/filter-bar";

type DialogState = { kind: "adjust" | "cancel" | "hold"; commission: CommissionView } | null;

/** Commissions tab of the Commissions area: everyone with the commissions grant sees the records their scope allows; workflow actions need commission.approve. */
export function CommissionsPanel() {
  const canApprove = useOperation("commission.approve");
  const commissions = useCommissions();
  const action = useCommissionAction();
  const { dialog } = useConfirmRun();
  const [state, setState] = useState<DialogState>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const all = useMemo(() => commissions.data ?? [], [commissions.data]);
  const totals = useMemo(() => {
    const sum = (status: CommissionView["status"]) => all.filter((item) => item.status === status).reduce((total, item) => total + item.amountCentavos, 0);
    return { approved: sum("approved"), held: sum("on_hold"), paid: sum("paid") };
  }, [all]);

  /** Workflow actions for a commission, in the row menu and the details sheet footer. */
  const itemsFor = (item: CommissionView): CommissionMenuItem[] => {
    if (!canApprove) return [];
    const items: CommissionMenuItem[] = [];
    if (item.status === "approved" && !item.payout && !item.releaseDate) items.push({ key: "adjust", label: "Adjust", tone: "warning", onClick: () => setState({ kind: "adjust", commission: item }) });
    if (item.status === "on_hold") items.push({ key: "hold", label: "Resolve hold", tone: "warning", onClick: () => setState({ kind: "hold", commission: item }) });
    if ((item.status === "approved" || item.status === "on_hold") && !(item.payout && !item.payout.confirmedAt)) items.push({ key: "cancel", label: "Cancel commission", tone: "danger", onClick: () => setState({ kind: "cancel", commission: item }) });
    return items;
  };
  const detail = detailId ? all.find((item) => item.id === detailId) ?? null : null;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const statusOptions = useMemo(() => optionsFrom("All statuses", all.map((item) => item.status), humanize), [all]);
  const productOptions = useMemo(() => optionsFrom("All products", all.map((item) => item.product), humanize), [all]);
  const visible = useMemo(
    () =>
      all.filter(
        (item) =>
          (statusFilter === "all" || item.status === statusFilter) &&
          (productFilter === "all" || item.product === productFilter) &&
          matchesSearch(search, item.recipientName, item.customerName, item.saleReference),
      ),
    [all, search, statusFilter, productFilter],
  );
  return (
    <>
      {dialog}
      <AdminStatGrid>
        <AdminStatCard label="Approved, unpaid" value={<Money value={totals.approved} />} icon={BadgeCheck} tone="brand" />
        <AdminStatCard label="On hold" value={<Money value={totals.held} />} icon={Clock} tone="warning" />
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
      <ReasonDialog open={state?.kind === "cancel"} title="Cancel commission" description="A cancelled commission can no longer be paid. This is recorded in the audit history." confirmText="Cancel commission" danger successText="Commission cancelled." onClose={() => setState(null)} onSubmit={(reason) => (state?.kind === "cancel" ? action.mutateAsync({ id: state.commission.id, action: "cancel", reason }) : Promise.resolve())} />
      {state?.kind === "hold" ? <HoldDialog commission={state.commission} onClose={() => setState(null)} /> : null}
    </>
  );
}

function recoveredOf(row: CommissionClawback): number {
  return row.recoveries.reduce((sum, item) => sum + item.amountCentavos, 0);
}

function recoveryStatus(row: CommissionClawback): string {
  return row.refundDueCentavos ? "Refund due" : row.writeOff ? "Written off" : clawbackBalance(row) === 0 ? "Recovered" : "Owed";
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
    { header: "Original amount", cell: ({ row }) => <Money value={row.original.amountCentavos} /> },
    { header: "Balance", cell: ({ row }) => <Money value={clawbackBalance(row.original)} /> },
    { header: "Status", cell: ({ row }) => recoveryStatus(row.original) },
  ], [commissions]);
  if (!enabled) return null;
  const sellerOf = (row: CommissionClawback) => commissions.find((item) => item.id === row.commissionId)?.recipientName ?? EMPTY;
  const itemsFor = (row: CommissionClawback): CommissionMenuItem[] => {
    if (clawbackBalance(row) <= 0) return [];
    const items: CommissionMenuItem[] = [];
    if (canCollect) items.push({ key: "collect", label: "Record collection", tone: "success", onClick: () => { setDetailId(null); setError(undefined); setAmount(""); setReference(""); setCollecting(row); } });
    if (canWriteOff) items.push({ key: "writeOff", label: "Write off", tone: "danger", onClick: () => { setDetailId(null); setWriteOff(row); } });
    return items;
  };
  const detail = detailId ? (query.data ?? []).find((row) => row.id === detailId) ?? null : null;
  return (
    <section className="tw:grid tw:gap-3" aria-label="Commission recovery">
      <QueryState isLoading={query.isLoading} error={query.error}>
        <DataTable data={query.data ?? []} caption="Commission recovery" emptyText="No recovery records." getRowId={(row) => row.id}
          onRowOpen={(row) => setDetailId(row.id)} getRowLabel={(row) => `Open recovery for ${sellerOf(row)}`}
          rowActions={(row) => <RowActionsMenu itemName={`recovery for ${sellerOf(row)}`} extraItems={itemsFor(row)} />}
          columns={recoveryColumns} />
      </QueryState>
      <RecordDetailsSheet
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail ? sellerOf(detail) : "Commission recovery"}
        subtitle={detail ? humanize(detail.trigger) : undefined}
        icon={<RotateCcw />}
        sections={detail ? [
          {
            title: "Recovery",
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
              { label: "Recovered", value: <Money value={recoveredOf(detail)} /> },
              { label: "Balance", value: <Money value={clawbackBalance(detail)} /> },
              { label: "Write-off reason", value: detail.writeOff?.reason, wide: true },
            ],
          },
        ] : []}
        history={detail?.recoveries.map((item, index) => ({ key: `${item.date}-${index}`, when: formatDate(item.date), text: `Collected ${formatPeso(item.amountCentavos)}, reference ${item.reference}` }))}
        footer={detail && itemsFor(detail).length > 0 ? menuItemButtons(itemsFor(detail)) : undefined}
      />
      {collecting ? <FormDialog open title="Record direct collection" submitText="Record collection" pending={action.isPending} error={error}
        onClose={() => setCollecting(null)} onSubmit={() => {
          const amountCentavos = parsePesoToCentavos(amount);
          if (!amountCentavos) { setError("Enter the amount collected."); return; }
          void action.mutateAsync({ kind: "collect", id: collecting.id, amountCentavos, reference })
            .then(() => setCollecting(null)).catch((failure: Error) => setError(failure.message));
        }}>
        <MoneyField label="Amount collected" required value={amount} onChange={setAmount} />
        <TextField label="Collection reference" required value={reference} onChange={setReference} />
      </FormDialog> : null}
      <ReasonDialog open={writeOff !== null} title="Write off this balance" description="The original amount and collections stay in history." confirmText="Write off" danger
        successText="Balance written off." onClose={() => setWriteOff(null)}
        onSubmit={(reason) => writeOff ? action.mutateAsync({ kind: "writeOff", id: writeOff.id, reason }) : Promise.resolve()} />
    </section>
  );
}

