"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useCommissionAction } from "@/data/business-queries";
import type { CommissionView } from "@/data/contracts/commission-repository";
import { formatBasisPoints, parsePercentToBasisPoints } from "@/shared/lib/money";
import { manilaToday } from "@/shared/lib/dates";
import type { ColumnDef } from "@/shared/components/modern/data-table";
import { PercentField, SelectField, StandardDateField, TextField } from "@/shared/forms/modern";
import { Button } from "@/shared/ui/button";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { Money } from "@/shared/components/modern/money";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { PAYOUT_RELEASE_THRESHOLD_BP, PAYOUT_RELEASE_WAIT_DAYS } from "@/modules/commissions/rules";
import { formatDate } from "@/shared/lib/format-date";

export const RELEASE_PERCENT = PAYOUT_RELEASE_THRESHOLD_BP / 100;

export type CommissionMenuItem = { key: string; label: string; danger?: boolean; onClick: () => void };

export const COMMISSION_COLUMNS: ColumnDef<CommissionView, unknown>[] = [
    { id: "recipient", header: "Recipient", cell: ({ row }) => <span className="tw:font-semibold">{row.original.recipientName} <span className="tw:text-muted-foreground">({row.original.recipientDesignation})</span></span> },
    { id: "customer", header: "Sale", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => row.original.customerName },
    { id: "basis", header: "Contract value", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => <Money value={row.original.basisCentavos} /> },
    { id: "rate", header: "Rate", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => formatBasisPoints(row.original.percentBp) },
    { id: "amount", header: "Amount", cell: ({ row }) => <Money value={row.original.amountCentavos} /> },
    { id: "status", header: "Status", cell: ({ row }) => <div className="tw:flex tw:flex-col tw:gap-1"><BizBadge status={row.original.status} />{row.original.payout && !row.original.payout.confirmedAt ? <span className="tw:text-xs tw:text-muted-foreground">Payout initiated, not confirmed</span> : null}{row.original.holdReason ? <span className="tw:text-xs tw:text-muted-foreground">{row.original.holdReason}</span> : null}</div> },
];


export function payoutNote(item: CommissionView): string | null {
  return item.status === "approved" && !item.payout && !releaseOpen(item) ? (item.payoutReleaseDate ? `Payout opens ${formatDate(item.payoutReleaseDate)}` : `Payout opens ${PAYOUT_RELEASE_WAIT_DAYS} days after ${RELEASE_PERCENT}% is verified`) : null;
}

/** Details sheet shared by Commissions and Commission Payouts; the footer buttons come from the page's own actions. */
export function CommissionDetailsSheet({ detail, onClose, items }: { detail: CommissionView | null; onClose: () => void; items: CommissionMenuItem[] }): ReactNode {
  return (
      <RecordDetailsSheet
        open={detail !== null}
        onClose={onClose}
        title={detail ? `${detail.recipientName} (${detail.recipientDesignation})` : "Commission"}
        subtitle={detail ? `Sale: ${detail.customerName}` : undefined}
        badge={detail ? <BizBadge status={detail.status} /> : undefined}
        sections={
          detail
            ? [
                {
                  title: "Commission",
                  rows: [
                    { label: "Contract value", value: <Money value={detail.basisCentavos} /> },
                    { label: "Rate", value: formatBasisPoints(detail.percentBp) },
                    { label: "Amount", value: <Money value={detail.amountCentavos} /> },
                    { label: "Payout", value: detail.payout ? (detail.payout.confirmedAt ? "Disbursement confirmed" : "Initiated, not confirmed") : payoutNote(detail) },
                    { label: "On hold because", value: detail.holdReason },
                  ],
                },
              ]
            : []
        }
        footer={detail && items.length > 0 ? items.map((item) => <Button key={item.key} type="button" variant={item.danger ? "danger" : "outline"} onClick={item.onClick}>{item.label}</Button>) : undefined}
      />
  );
}

/** Payout may be recorded once the release date (40% verified + 7 days) has arrived. */
export function releaseOpen(item: CommissionView): boolean {
  return item.payoutReleaseDate !== null && manilaToday() >= item.payoutReleaseDate;
}

export function AdjustDialog({ commission, onClose }: { commission: CommissionView; onClose: () => void }) {
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

export function PayoutDialog({ commission, onClose }: { commission: CommissionView; onClose: () => void }) {
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

export function HoldDialog({ commission, onClose }: { commission: CommissionView; onClose: () => void }) {
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
