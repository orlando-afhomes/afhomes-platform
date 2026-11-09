"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useApproveCommission, useCommissionAction, useCommissions, useEligibleSales, useOperation } from "@/data/business-queries";
import type { CommissionView, EligibleSale } from "@/data/contracts/commission-repository";
import { applyBasisPoints, formatBasisPoints, MoneyError, parsePercentToBasisPoints } from "@/shared/lib/money";
import { manilaToday } from "@/shared/lib/dates";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { CheckboxField, PercentField, SelectField, StandardDateField, TextField } from "@/shared/forms/modern";
import { Button } from "@/shared/ui/button";
import { BizBadge, FormDialog, Money, QueryState, ReasonDialog, Section, StatTiles, TabBar, formatDate } from "../components/business-ui";
import { ModulePage } from "../components/module-page";

type DialogState =
  | { kind: "approve"; sale: EligibleSale }
  | { kind: "adjust" | "cancel" | "hold" | "payout"; commission: CommissionView }
  | null;

export function CommissionsPage() {
  const canApprove = useOperation("commission.approve");
  const commissions = useCommissions();
  const eligible = useEligibleSales(canApprove);
  const action = useCommissionAction();
  const { confirmRun, dialog } = useConfirmRun();
  const [tab, setTab] = useState(canApprove ? "eligible" : "records");
  const [state, setState] = useState<DialogState>(null);

  const all = useMemo(() => commissions.data ?? [], [commissions.data]);
  const totals = useMemo(() => {
    const sum = (status: CommissionView["status"]) => all.filter((item) => item.status === status).reduce((total, item) => total + item.amountCentavos, 0);
    return { approved: sum("approved"), held: sum("on_hold"), paid: sum("paid") };
  }, [all]);

  const columns = useMemo<ColumnDef<CommissionView, unknown>[]>(
    () => [
      { id: "recipient", header: "Recipient", cell: ({ row }) => <span className="tw:font-semibold">{row.original.recipientName} <span className="tw:text-muted-foreground">({row.original.recipientDesignation})</span></span> },
      { id: "customer", header: "Sale", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => row.original.customerName },
      { id: "basis", header: "Contract value", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => <Money value={row.original.basisCentavos} /> },
      { id: "rate", header: "Rate", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => formatBasisPoints(row.original.percentBp) },
      { id: "amount", header: "Amount", cell: ({ row }) => <Money value={row.original.amountCentavos} /> },
      { id: "status", header: "Status", cell: ({ row }) => <div className="tw:flex tw:flex-col tw:gap-1"><BizBadge status={row.original.status} />{row.original.payout && !row.original.payout.confirmedAt ? <span className="tw:text-xs tw:text-muted-foreground">Payout initiated, not confirmed</span> : null}{row.original.holdReason ? <span className="tw:text-xs tw:text-muted-foreground">{row.original.holdReason}</span> : null}</div> },
      {
        id: "actions",
        header: () => <span className="tw:sr-only">Actions</span>,
        cell: ({ row }) => {
          const item = row.original;
          if (!canApprove) return null;
          return (
            <div className="tw:flex tw:flex-wrap tw:gap-1">
              {item.status === "approved" && !item.payout ? <Button size="sm" variant="outline" className="tw:min-h-11 tw:sm:min-h-7" onClick={() => setState({ kind: "payout", commission: item })}>Record payout</Button> : null}
              {item.status === "approved" && item.payout && !item.payout.confirmedAt ? <Button size="sm" className="tw:min-h-11 tw:sm:min-h-7" onClick={() => confirmRun({ title: "Confirm disbursement?", description: `Mark ${item.recipientName}'s commission as Paid. Only confirmed disbursement makes a commission Paid.`, confirmText: "Confirm", action: () => action.mutateAsync({ id: item.id, action: "confirm" }), successTitle: "Commission marked as Paid.", errorTitle: "Could not confirm" })}>Confirm disbursement</Button> : null}
              {(item.status === "approved" && !item.payout) ? <Button size="sm" variant="outline" className="tw:min-h-11 tw:sm:min-h-7" onClick={() => setState({ kind: "adjust", commission: item })}>Adjust</Button> : null}
              {item.status === "on_hold" ? <Button size="sm" variant="outline" className="tw:min-h-11 tw:sm:min-h-7" onClick={() => setState({ kind: "hold", commission: item })}>Resolve hold</Button> : null}
              {(item.status === "approved" || item.status === "on_hold") && !(item.payout && !item.payout.confirmedAt) ? <Button size="sm" variant="outline" className="tw:min-h-11 tw:sm:min-h-7" onClick={() => setState({ kind: "cancel", commission: item })}>Cancel</Button> : null}
            </div>
          );
        },
      },
    ],
    [canApprove, action, confirmRun],
  );

  const saleColumns = useMemo<ColumnDef<EligibleSale, unknown>[]>(
    () => [
      { id: "customer", header: "Customer", cell: ({ row }) => <span className="tw:font-semibold">{row.original.customerName}</span> },
      { id: "plan", header: "Plan", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => row.original.productCode },
      { id: "value", header: "Contract value", cell: ({ row }) => <Money value={row.original.valueCentavos} /> },
      { id: "confirmed", header: "Confirmed", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => formatDate(row.original.confirmedDate) },
      { id: "recipients", header: "Recipients", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => `${row.original.recipients.filter((item) => item.existingCommissionId).length} of ${row.original.recipients.length} have commissions` },
      { id: "actions", header: () => <span className="tw:sr-only">Actions</span>, cell: ({ row }) => <Button size="sm" className="tw:min-h-11 tw:sm:min-h-7" disabled={row.original.recipients.every((item) => item.existingCommissionId)} onClick={() => setState({ kind: "approve", sale: row.original })}>Review and approve</Button> },
    ],
    [],
  );

  return (
    <ModulePage anyOf={["commissions"]} title="Commissions" description={canApprove ? "Finance assigns percentages, approves, and confirms payouts. Approved is not Paid." : "Your commissions. Approved is not Paid; only confirmed disbursement makes a commission Paid."} crumbs={[{ label: "Commissions" }]}>
      {dialog}
      <StatTiles items={[{ label: "Approved, unpaid", value: <Money value={totals.approved} /> }, { label: "On hold", value: <Money value={totals.held} /> }, { label: "Paid", value: <Money value={totals.paid} /> }, { label: "Records", value: all.length }]} />
      {canApprove ? <InfoNote title="No default rates">Finance enters each recipient&apos;s percentage. The system never proposes a rate, and an approved amount is never changed by later product changes.</InfoNote> : null}
      {canApprove ? <TabBar label="Commission views" value={tab} onChange={setTab} tabs={[{ value: "eligible", label: "Confirmed sales", count: eligible.data?.length }, { value: "records", label: "Commission records", count: all.length }]} /> : null}
      {canApprove && tab === "eligible" ? (
        <Section title="Confirmed sales" description="A commission needs a Confirmed Sale. Recipients come from the genealogy recorded at the time of sale.">
          <QueryState isLoading={eligible.isLoading} error={eligible.error}>
            <DataTable data={eligible.data ?? []} columns={saleColumns} getRowId={(row) => row.saleId} emptyText="No confirmed sales yet." caption="Confirmed sales" />
          </QueryState>
        </Section>
      ) : (
        <Section title="Commission records">
          <QueryState isLoading={commissions.isLoading} error={commissions.error}>
            <DataTable data={all} columns={columns} getRowId={(row) => row.id} emptyText="No commissions yet." caption="Commissions" />
          </QueryState>
        </Section>
      )}
      {state?.kind === "approve" ? <ApproveDialog sale={state.sale} onClose={() => setState(null)} /> : null}
      {state?.kind === "adjust" ? <AdjustDialog commission={state.commission} onClose={() => setState(null)} /> : null}
      {state?.kind === "payout" ? <PayoutDialog commission={state.commission} onClose={() => setState(null)} /> : null}
      <ReasonDialog open={state?.kind === "cancel"} title="Cancel commission" description="A cancelled commission can no longer be paid. This is recorded in the audit history." confirmText="Cancel commission" danger successText="Commission cancelled." onClose={() => setState(null)} onSubmit={(reason) => (state?.kind === "cancel" ? action.mutateAsync({ id: state.commission.id, action: "cancel", reason }) : Promise.resolve())} />
      {state?.kind === "hold" ? <HoldDialog commission={state.commission} onClose={() => setState(null)} /> : null}
    </ModulePage>
  );
}

function ApproveDialog({ sale, onClose }: { sale: EligibleSale; onClose: () => void }) {
  const approve = useApproveCommission();
  const free = sale.recipients.filter((item) => !item.existingCommissionId);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [rates, setRates] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | undefined>();

  const preview = (memberId: string): string => {
    const bp = parsePercentToBasisPoints(rates[memberId] ?? "");
    if (bp === null || bp <= 0 || bp > 10_000) return "";
    try {
      return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(applyBasisPoints(sale.valueCentavos, bp) / 100);
    } catch (failure) {
      return failure instanceof MoneyError ? "Needs a rounding policy" : "";
    }
  };

  const send = async () => {
    const entries = free.filter((item) => picked[item.memberId]).map((item) => ({ memberId: item.memberId, percentBp: parsePercentToBasisPoints(rates[item.memberId] ?? "") ?? 0 }));
    if (entries.length === 0) return setError("Select at least one recipient.");
    if (entries.some((entry) => entry.percentBp <= 0)) return setError("Enter a valid percentage for every selected recipient.");
    try {
      await approve.mutateAsync({ saleId: sale.saleId, entries });
      toast.success("Commission approved.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not approve.");
    }
  };

  return (
    <FormDialog open title="Approve commissions" description={`${sale.customerName} · contract value ${new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(sale.valueCentavos / 100)}`} submitText="Approve" pending={approve.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      {free.map((recipient) => (
        <div key={recipient.memberId} className="tw:grid tw:grid-cols-1 tw:gap-2 tw:sm:grid-cols-2 tw:sm:items-end">
          <CheckboxField label={`${recipient.displayName} (${recipient.designation})`} checked={Boolean(picked[recipient.memberId])} onChange={(checked) => setPicked((current) => ({ ...current, [recipient.memberId]: checked }))} />
          {picked[recipient.memberId] ? <PercentField label="Percentage" value={rates[recipient.memberId] ?? ""} onChange={(value) => setRates((current) => ({ ...current, [recipient.memberId]: value }))} hint={preview(recipient.memberId) ? `Amount: ${preview(recipient.memberId)}` : "Calculated on the contract value."} /> : null}
        </div>
      ))}
    </FormDialog>
  );
}

function AdjustDialog({ commission, onClose }: { commission: CommissionView; onClose: () => void }) {
  const action = useCommissionAction();
  const [rate, setRate] = useState(String(commission.percentBp / 100));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const send = async () => {
    const percentBp = parsePercentToBasisPoints(rate);
    if (!percentBp) return setError("Enter a valid percentage.");
    if (!reason.trim()) return setError("A reason is required.");
    try {
      await action.mutateAsync({ id: commission.id, action: "adjust", percentBp, reason: reason.trim() });
      toast.success("Commission adjusted.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not adjust.");
    }
  };
  return (
    <FormDialog open title="Adjust commission" description={`${commission.recipientName} · the original and revised values are kept in the audit history.`} submitText="Save" pending={action.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <PercentField label="Percentage" required value={rate} onChange={setRate} />
      <TextField label="Reason" required value={reason} onChange={setReason} />
    </FormDialog>
  );
}

function PayoutDialog({ commission, onClose }: { commission: CommissionView; onClose: () => void }) {
  const action = useCommissionAction();
  const [reference, setReference] = useState("");
  const [method, setMethod] = useState("");
  const [date, setDate] = useState(manilaToday());
  const [error, setError] = useState<string | undefined>();
  const send = async () => {
    try {
      await action.mutateAsync({ id: commission.id, action: "payout", reference, method: method || null, payoutDate: date });
      toast.success("Payout recorded. Confirm disbursement to mark it Paid.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not record.");
    }
  };
  return (
    <FormDialog open title="Record payout" description={`${commission.recipientName} · the commission stays Approved until disbursement is confirmed.`} submitText="Record payout" pending={action.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <TextField label="Payment reference" required value={reference} onChange={setReference} />
      <TextField label="Payment method" value={method} onChange={setMethod} hint="Follow the company financial process." />
      <StandardDateField label="Payout date" required value={date} onChange={setDate} />
    </FormDialog>
  );
}

function HoldDialog({ commission, onClose }: { commission: CommissionView; onClose: () => void }) {
  const action = useCommissionAction();
  const [decision, setDecision] = useState<"keep" | "cancel" | "restore">("keep");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const send = async () => {
    if (!reason.trim()) return setError("A reason is required.");
    try {
      await action.mutateAsync({ id: commission.id, action: "hold", decision, reason: reason.trim() });
      toast.success("Hold resolved.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not resolve.");
    }
  };
  return (
    <FormDialog open title="Resolve hold" description={commission.holdReason ?? "This commission is on hold."} submitText="Save decision" pending={action.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <SelectField label="Decision" required value={decision} options={[{ value: "keep", label: "Keep on hold" }, { value: "restore", label: "Restore to Approved" }, { value: "cancel", label: "Cancel commission" }]} onChange={setDecision} />
      <TextField label="Reason" required value={reason} onChange={setReason} />
    </FormDialog>
  );
}
