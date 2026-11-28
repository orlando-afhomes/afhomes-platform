"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { notify } from "@/shared/components/modern/app-toaster";
import { useBulkCommissionPayout, useCommissionAction, type BulkCommissionResult } from "@/data/business-queries";
import type { CommissionView } from "@/data/contracts/commission-repository";
import { formatBasisPoints, formatPeso, parsePercentToBasisPoints } from "@/shared/lib/money";
import { manilaToday } from "@/shared/lib/dates";
import { MAX_UPLOAD_BYTES, readFileAsDataUrl } from "@/shared/lib/file-data";
import type { ColumnDef } from "@/shared/components/modern/data-table";
import { FieldShell, PercentField, SelectField, StandardDateField, TakePictureButton, TextField, describedBy, useFieldIds } from "@/shared/forms/modern";
import { Banknote, FileText, HandCoins, Landmark, Smartphone, Upload, WalletCards, X, type LucideIcon } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import type { RowActionTone } from "@/shared/components/modern/row-actions-menu";
import { Money } from "@/shared/components/modern/money";
import { ImagePreview } from "@/shared/components/modern/image-preview";
import { DetailActions } from "@/shared/components/modern/detail-actions";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { PAYOUT_RELEASE_THRESHOLD_BP } from "@/modules/commissions/rules";
import { PAYOUT_METHODS, commissionRoleLabel, type PayoutMethod } from "@/modules/commissions/types";
import { formatDate } from "@/shared/lib/format-date";
import { designationLabel } from "@/modules/sales-network/display";

export const RELEASE_PERCENT = PAYOUT_RELEASE_THRESHOLD_BP / 100;

/** A workflow action, shown in the row menu and as a footer button; `tone` colors both (rule: success approves or pays, warning adjusts, danger cancels). */
export type CommissionMenuItem = { key: string; label: string; tone?: RowActionTone; icon: LucideIcon; onClick: () => void };

const TONE_VARIANT: Record<RowActionTone, "default" | "destructive" | "warning" | "success" | "info"> = {
  default: "default",
  danger: "destructive",
  warning: "warning",
  success: "success",
  info: "info",
};

/** Footer buttons for a details sheet, one per action, colored by purpose. */
export function menuItemButtons(items: CommissionMenuItem[]): ReactNode {
  return <DetailActions actions={items.map((item) => ({
    ...item,
    next: ["payout", "confirm", "hold", "collect"].includes(item.key),
    variant: TONE_VARIANT[item.tone ?? "default"],
  }))} />;
}

/** Month input (value stays YYYY-MM). Browsers without a month picker fall back to typing the same format. */
export function MonthField({ label, value, onChange, required, hint }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; hint?: string }) {
  const ids = useFieldIds();
  return (
    <FieldShell ids={ids} label={label} required={required} hint={hint}>
      <Input id={ids.id} type="month" value={value} placeholder="YYYY-MM" aria-required={required ? "true" : undefined} aria-describedby={describedBy(ids, undefined, hint)} className="tw:h-11" onChange={(event) => onChange(event.target.value)} />
    </FieldShell>
  );
}

/** Five single-value columns; designation, type, rate, payout and hold details live in CommissionDetailsSheet. */
export const COMMISSION_COLUMNS: ColumnDef<CommissionView, unknown>[] = [
    { id: "recipient", header: "Seller", cell: ({ row }) => <span className="tw:font-semibold">{row.original.recipientName}</span> },
    { id: "customer", header: "Sale", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => row.original.customerName },
    { id: "amount", header: "Amount", cell: ({ row }) => <Money value={row.original.amountCentavos} /> },
    { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status} /> },
    { id: "release", header: "Ready-to-Pay Date", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => (row.original.payoutReleaseDate ? formatDate(row.original.payoutReleaseDate) : "—") },
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
        icon={<HandCoins />}
        sections={
          detail
            ? [
                {
                  title: "Commission",
                  rows: [
                    { label: "Position", value: designationLabel(detail.recipientDesignation) },
                    { label: "Commission type", value: detail.role ? `${commissionRoleLabel(detail.role)} (${detail.role})` : null },
                    { label: "Contract value", value: <Money value={detail.basisCentavos} /> },
                    { label: "Sale number", value: detail.saleReference },
                    { label: "Rate", value: formatBasisPoints(detail.percentBp) },
                    { label: "Amount", value: <Money value={detail.amountCentavos} /> },
                  ],
                },
                {
                  title: "Payout",
                  rows: [
                    { label: "Ready-to-pay date", value: detail.payoutReleaseDate ? formatDate(detail.payoutReleaseDate) : null },
                    { label: "Payout", value: detail.payout ? (detail.payout.confirmedAt ? "Payment sent" : "Initiated, not confirmed") : payoutNote(detail) },
                    { label: "Payout reference", value: detail.payout?.reference },
                    { label: "Proof", value: <ImagePreview src={detail.payout?.evidenceFileDataUrl} fileName={detail.payout?.evidenceFileName} label="Payout proof" /> },
                    { label: "On hold because", value: detail.holdReason, wide: true },
                  ],
                },
              ]
            : []
        }
        history={detail?.previousPayouts?.map((payout, index) => ({
          key: `${payout.voidedAt}-${index}`, when: formatDate(payout.voidedAt),
          text: `Payout voided · ${payout.reference} · ${payout.reason}`,
        }))}
        footer={detail && items.length > 0 ? menuItemButtons(items) : undefined}
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
    <FormDialog open title="Adjust Commission" description={commission.recipientName} submitText="Save" submitVariant="warning" pending={action.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <PercentField label="Percentage" required value={rate} onChange={setRate} />
      <TextField label="Reason" required value={reason} onChange={setReason} />
    </FormDialog>
  );
}

/** Approved, no payout yet, and the payout day has come. */
export function readyToPay(item: CommissionView): boolean {
  return item.status === "approved" && !item.payout && releaseOpen(item);
}

/** A payout was recorded but its disbursement is not confirmed yet (approved or held). */
export function awaitingConfirmation(item: CommissionView): boolean {
  return Boolean(item.payout && !item.payout.confirmedAt) && (item.status === "approved" || item.status === "on_hold");
}

/** "3 recorded" or "2 recorded, 1 not recorded: <reason>". */
export function bulkSummary(result: BulkCommissionResult, verb: string): string {
  const done = `${result.done} ${verb}`;
  if (!result.failed.length) return done;
  const reasons = [...new Set(result.failed.map(({ reason }) => reason))].join(" ");
  return `${done}, ${result.failed.length} not ${verb}: ${reasons}`;
}

const PAYOUT_METHOD_ICONS: Record<PayoutMethod, LucideIcon> = {
  "Bank Transfer": Landmark,
  GCash: Smartphone,
  Maya: WalletCards,
  Cash: Banknote,
  Cheque: FileText,
};

/**
 * Records one payout for each commission with the same date, method, reference and proof
 * (doc 08 §11.3). Each commission is recorded on its own, with its own checks and audit entry.
 */
export function PayoutDialog({ commissions, onClose }: { commissions: CommissionView[]; onClose: () => void }) {
  const bulk = useBulkCommissionPayout();
  const [reference, setReference] = useState("");
  const [method, setMethod] = useState("");
  const [date, setDate] = useState(manilaToday());
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState<string | undefined>();
  const single = commissions.length === 1;
  const proofRequired = commissions.some((item) => Boolean(item.releaseDate));
  const chooseProof = (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Choose a proof file up to 5 MB.");
      return;
    }
    setError(undefined);
    setProofFile(file);
  };
  const send = async () => {
    try {
      // Read at submit so a quick click never races the file read.
      const evidenceDataUrl = proofFile ? await readFileAsDataUrl(proofFile) : undefined;
      const result = await bulk.mutateAsync({
        kind: "payout",
        ids: commissions.map(({ id }) => id),
        reference,
        method: method || null,
        payoutDate: date,
        evidenceFileName: proofFile?.name ?? "",
        evidenceDataUrl,
      });
      // Nothing recorded: keep the form open with the reason so it can be corrected.
      if (result.done === 0) return setError([...new Set(result.failed.map(({ reason }) => reason))].join(" "));
      if (single) toast.success("Payout recorded. Confirm paid out to mark it Paid.");
      else if (result.failed.length) notify.warning(bulkSummary(result, "recorded"));
      else toast.success(bulkSummary(result, "recorded"), { description: "Confirm paid out to mark them Paid." });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not record.");
    }
  };
  const total = commissions.reduce((sum, item) => sum + item.amountCentavos, 0);
  return (
    <FormDialog open title={single ? "Record Payout" : `Record Payout for ${commissions.length} commissions`}
      submitText="Record Payout" pending={bulk.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <div className="tw:flex tw:items-center tw:gap-3 tw:rounded-xl tw:border tw:border-border tw:bg-muted/40 tw:p-3">
        <span aria-hidden="true" className="tw:flex tw:size-11 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg tw:bg-(--color-brand-soft) tw:text-primary"><HandCoins className="tw:size-5" /></span>
        <div className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col">
          <span className="tw:truncate tw:text-sm tw:font-medium">{single ? commissions[0].recipientName : `${commissions.length} commissions`}</span>
          <span className="tw:text-xs tw:text-muted-foreground">{single ? "Payout total" : "Total payout"}</span>
        </div>
        <strong className="tw:text-lg tw:tabular-nums">{formatPeso(total)}</strong>
      </div>
      {!single ? <p className="tw:text-xs tw:text-muted-foreground">To leave a commission out, close this and use Record payout on each row you want to pay.</p> : null}
      <TextField label="Payment reference" required value={reference} onChange={setReference} />
      <div className="tw:grid tw:gap-3 tw:sm:grid-cols-2">
        <SelectField label="Payment method" required={proofRequired} value={method} placeholder="Search or choose a method"
          options={PAYOUT_METHODS.map((item) => ({ value: item, label: item, icon: PAYOUT_METHOD_ICONS[item] }))} onChange={setMethod} />
        <StandardDateField label="Payout date" required value={date} onChange={setDate} />
      </div>
      <div className="tw:grid tw:gap-2">
        <Label htmlFor="commission-payout-evidence">Payment proof</Label>
        <label htmlFor="commission-payout-evidence" className="tw:flex tw:min-h-14 tw:cursor-pointer tw:items-center tw:gap-3 tw:rounded-xl tw:border tw:border-dashed tw:border-input tw:bg-card tw:p-3 tw:transition-colors tw:hover:border-primary/40 tw:hover:bg-muted/40 tw:focus-within:ring-3 tw:focus-within:ring-ring/40">
          <span aria-hidden="true" className="tw:flex tw:size-9 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg tw:bg-primary/10 tw:text-primary"><Upload className="tw:size-4" /></span>
          <span className="tw:min-w-0 tw:flex-1 tw:truncate tw:text-sm">{proofFile ? proofFile.name : "Choose an image or PDF"}</span>
          {proofFile ? (
            <button type="button" aria-label="Remove payment proof" className="tw:flex tw:size-8 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-md tw:text-muted-foreground tw:hover:bg-muted"
              onClick={(event) => { event.preventDefault(); setProofFile(null); }}><X aria-hidden="true" className="tw:size-4" /></button>
          ) : null}
        </label>
        <Input
          id="commission-payout-evidence"
          className="tw:sr-only"
          type="file"
          required={proofRequired}
          accept="image/*,application/pdf"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) chooseProof(file);
          }}
        />
        <TakePictureButton onCapture={chooseProof} facingMode="environment" className="tw:min-h-11 tw:sm:min-h-8" />
        <p className="tw:text-xs tw:text-muted-foreground">Image or PDF up to 5 MB; Finance can view it full size.</p>
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
    <FormDialog open title="Resolve Hold" description={commission.holdReason ?? "This commission is on hold."} submitText="Save Decision" pending={action.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <SelectField label="Decision" required value={decision} options={[{ value: "keep", label: "Keep on hold" }, { value: "restore", label: "Restore to Approved" }, { value: "cancel", label: "Cancel commission" }]} onChange={setDecision} />
      <TextField label="Reason" required value={reason} onChange={setReason} />
    </FormDialog>
  );
}
