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
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { Money } from "@/shared/components/modern/money";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { PAYOUT_RELEASE_THRESHOLD_BP } from "@/modules/commissions/rules";
import { commissionRoleLabel } from "@/modules/commissions/types";
import { formatDate } from "@/shared/lib/format-date";

export const RELEASE_PERCENT = PAYOUT_RELEASE_THRESHOLD_BP / 100;

export type CommissionMenuItem = { key: string; label: string; danger?: boolean; onClick: () => void };

/** Five single-value columns; designation, type, rate, payout and hold details live in CommissionDetailsSheet. */
export const COMMISSION_COLUMNS: ColumnDef<CommissionView, unknown>[] = [
    { id: "recipient", header: "Seller", cell: ({ row }) => <span className="tw:font-semibold">{row.original.recipientName}</span> },
    { id: "customer", header: "Sale", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => row.original.customerName },
    { id: "amount", header: "Amount", cell: ({ row }) => <Money value={row.original.amountCentavos} /> },
    { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status} /> },
    { id: "release", header: "Release date", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => (row.original.payoutReleaseDate ? formatDate(row.original.payoutReleaseDate) : "—") },
];


export function payoutNote(item: CommissionView): string | null {
  return item.status === "approved" && !item.payout && !releaseOpen(item) ? (item.payoutReleaseDate ? `Payout opens ${formatDate(item.payoutReleaseDate)}` : `Payout opens the month after ${RELEASE_PERCENT}% is verified`) : null;
}

/** Details sheet shared by Commissions and Commission Payouts; the footer buttons come from the page's own actions. */
export function CommissionDetailsSheet({ detail, onClose, items }: { detail: CommissionView | null; onClose: () => void; items: CommissionMenuItem[] }): ReactNode {
  return (
      <RecordDetailsSheet
        open={detail !== null}
        onClose={onClose}
        title={detail ? detail.recipientName : "Commission"}
        subtitle={detail ? `Sale: ${detail.customerName}` : undefined}
        badge={detail ? <BizBadge status={detail.status} /> : undefined}
        sections={
          detail
            ? [
                {
                  title: "Commission",
                  rows: [
                    { label: "Designation", value: detail.recipientDesignation },
                    { label: "Commission type", value: detail.role ? `${commissionRoleLabel(detail.role)} (${detail.role})` : null },
                    { label: "Contract value", value: <Money value={detail.basisCentavos} /> },
                    { label: "Sale number", value: detail.saleReference },
                    { label: "Rate", value: formatBasisPoints(detail.percentBp) },
                    { label: "Release date", value: detail.payoutReleaseDate ? formatDate(detail.payoutReleaseDate) : null },
                    { label: "Amount", value: <Money value={detail.amountCentavos} /> },
                    { label: "Payout", value: detail.payout ? (detail.payout.confirmedAt ? "Disbursement confirmed" : "Initiated, not confirmed") : payoutNote(detail) },
                    { label: "Payout reference", value: detail.payout?.reference },
                    { label: "Proof", value: detail.payout?.evidenceFileName },
                    { label: "On hold because", value: detail.holdReason },
                  ],
                },
              ]
            : []
        }
        history={detail?.previousPayouts?.map((payout, index) => ({
          key: `${payout.voidedAt}-${index}`, when: formatDate(payout.voidedAt),
          text: `Payout voided · ${payout.reference} · ${payout.reason}`,
        }))}
        footer={detail && items.length > 0 ? items.map((item) => <Button key={item.key} type="button" variant={item.danger ? "danger" : "outline"} onClick={item.onClick}>{item.label}</Button>) : undefined}
      />
  );
}

/** Payout may be recorded once the release date (first day of the month after 40% was verified) has arrived. */
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
    <FormDialog open title="Adjust commission" description={commission.recipientName} submitText="Save" pending={action.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
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
  const [file, setFile] = useState("");
  const [error, setError] = useState<string | undefined>();
  const send = async () => {
    try {
      await action.mutateAsync({ id: commission.id, action: "payout", reference, method: method || null, payoutDate: date, evidenceFileName: file });
      toast.success("Payout recorded. Confirm disbursement to mark it Paid.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not record.");
    }
  };
  return (
    <FormDialog open title="Record payout" description={commission.recipientName} submitText="Record payout" pending={action.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <TextField label="Payment reference" required value={reference} onChange={setReference} />
      <TextField label="Payment method" required={Boolean(commission.releaseDate)} value={method} onChange={setMethod} />
      <StandardDateField label="Payout date" required value={date} onChange={setDate} />
      <div className="tw:grid tw:gap-2">
        <Label htmlFor="commission-payout-evidence">Payment proof</Label>
        <Input id="commission-payout-evidence" type="file" required={Boolean(commission.releaseDate)} accept="image/*,application/pdf" onChange={(event) => setFile(event.target.files?.[0]?.name ?? "")} />
      </div>
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
