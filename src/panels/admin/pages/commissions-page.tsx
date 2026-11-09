"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useCommissionAction, useCommissions, useOperation } from "@/data/business-queries";
import type { CommissionView } from "@/data/contracts/commission-repository";
import { formatBasisPoints, parsePercentToBasisPoints } from "@/shared/lib/money";
import { manilaToday } from "@/shared/lib/dates";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { PercentField, SelectField, StandardDateField, TextField } from "@/shared/forms/modern";
import { Button, buttonVariants } from "@/shared/ui/button";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { FormDialog, ReasonDialog } from "@/shared/components/modern/form-dialog";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { Section } from "@/shared/components/modern/section";
import { StatTiles } from "@/shared/components/modern/stat-tiles";
import { formatDate } from "@/shared/lib/format-date";
import { ModulePage } from "../components/module-page";

type DialogState = { kind: "adjust" | "cancel" | "hold" | "payout"; commission: CommissionView } | null;

export function CommissionsPage() {
  const canApprove = useOperation("commission.approve");
  const commissions = useCommissions();
  const action = useCommissionAction();
  const { confirmRun, dialog } = useConfirmRun();
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
              {item.status === "approved" && !item.payout && releaseOpen(item) ? <Button size="sm" variant="outline" className="tw:min-h-11 tw:sm:min-h-7" onClick={() => setState({ kind: "payout", commission: item })}>Record payout</Button> : null}
              {item.status === "approved" && !item.payout && !releaseOpen(item) ? <span className="tw:self-center tw:text-xs tw:text-muted-foreground">{item.payoutReleaseDate ? `Payout opens ${formatDate(item.payoutReleaseDate)}` : "Payout opens 7 days after 40% is verified"}</span> : null}
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

  return (
    <ModulePage
      anyOf={["commissions"]}
      title="Commissions"
      description={canApprove ? "Finance approves and confirms payouts. Approved is not Paid." : "Your commissions. Approved is not Paid; only confirmed disbursement makes a commission Paid."}
      crumbs={[{ label: "Commissions" }]}
      actions={
        canApprove ? (
          <Link href="/admin/commissions/assignment" className={buttonVariants({ className: "tw:min-h-11 tw:sm:min-h-8" })}>
            Commission assignment
          </Link>
        ) : null
      }
    >
      {dialog}
      <StatTiles items={[{ label: "Approved, unpaid", value: <Money value={totals.approved} /> }, { label: "On hold", value: <Money value={totals.held} /> }, { label: "Paid", value: <Money value={totals.paid} /> }, { label: "Records", value: all.length }]} />
      {canApprove ? <InfoNote title="Payout release">A payout can be recorded 7 days after 40% of the contract value is Finance-verified.</InfoNote> : null}
      <Section title="Commission records">
        <QueryState isLoading={commissions.isLoading} error={commissions.error}>
          <DataTable data={all} columns={columns} getRowId={(row) => row.id} emptyText="No commissions yet." caption="Commissions" />
        </QueryState>
      </Section>
      {state?.kind === "adjust" ? <AdjustDialog commission={state.commission} onClose={() => setState(null)} /> : null}
      {state?.kind === "payout" ? <PayoutDialog commission={state.commission} onClose={() => setState(null)} /> : null}
      <ReasonDialog open={state?.kind === "cancel"} title="Cancel commission" description="A cancelled commission can no longer be paid. This is recorded in the audit history." confirmText="Cancel commission" danger successText="Commission cancelled." onClose={() => setState(null)} onSubmit={(reason) => (state?.kind === "cancel" ? action.mutateAsync({ id: state.commission.id, action: "cancel", reason }) : Promise.resolve())} />
      {state?.kind === "hold" ? <HoldDialog commission={state.commission} onClose={() => setState(null)} /> : null}
    </ModulePage>
  );
}

/** Payout may be recorded once the release date (40% verified + 7 days) has arrived. */
function releaseOpen(item: CommissionView): boolean {
  return item.payoutReleaseDate !== null && manilaToday() >= item.payoutReleaseDate;
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
