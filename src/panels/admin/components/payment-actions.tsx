"use client";

import { useMemo, useState, type ReactElement, type ReactNode } from "react";
import { Link2, Send, ShieldCheck, Undo2, Wrench, X, type LucideIcon } from "lucide-react";
import { useContracts, useOperation, usePaymentAction, usePayments, useSubmitPayment, useSubmitUnmatchedReceipt } from "@/data/business-queries";
import type { PaymentView, UnmatchedReceiptView } from "@/data/contracts/payment-repository";
import { canCorrectPayment } from "@/modules/identity/record-scope";
import { useReferenceEntries } from "@/data/settings-queries";
import { adjustableCentavos, adjustmentTotalCentavos, buildScheduleState, findSuggestedMatch } from "@/modules/finance/rules";
import { useDevIdentity } from "@/shared/providers/identity-provider";
import { PAYMENT_METHODS, PAYMENT_PURPOSES, type PaymentMethod, type PaymentPurpose } from "@/modules/finance/types";
import { manilaToday } from "@/shared/lib/dates";
import { centavosToInputText, formatPeso, parsePesoToCentavos } from "@/shared/lib/money";
import { MAX_UPLOAD_BYTES, readFileAsDataUrl } from "@/shared/lib/file-data";
import { MoneyField, SelectField, StandardDateField, TextAreaField, TextField } from "@/shared/forms/modern";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ImagePreview } from "@/shared/components/modern/image-preview";
import { toast } from "sonner";
import { FormDialog, ReasonDialog } from "@/shared/components/modern/form-dialog";
import { RowActionsMenu, type RowActionTone } from "@/shared/components/modern/row-actions-menu";
import { DetailActions } from "@/shared/components/modern/detail-actions";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { formatDate } from "@/shared/lib/format-date";
import { humanize } from "@/shared/lib/humanize";
import { EMPTY } from "@/shared/lib/empty-value";

const PURPOSE_LABELS: Record<PaymentPurpose, string> = { reservation: "Reservation", down_payment: "Down payment", installment: "Installment", full: "Full payment" };

/** The next unpaid schedule line of a contract (purpose and remaining amount), or null when it cannot be derived. */
function useNextUnpaidLine(contractId: string): { purpose: PaymentPurpose; amountCentavos: number } | null {
  const contracts = useContracts();
  const payments = usePayments();
  const contract = contracts.data?.find((item) => item.id === contractId);
  if (!contract || !payments.data) return null;
  const state = buildScheduleState(contract, payments.data.filter((item) => item.contractId === contractId), manilaToday());
  const line = state.find((item) => item.status !== "paid");
  const purpose = line ? contract.schedule.find((item) => item.seq === line.seq)?.purpose : undefined;
  return line && purpose ? { purpose, amountCentavos: line.amountCentavos - line.allocatedCentavos } : null;
}

/** Submit a payment for a contract (Staff, IST and OST for their own scope). The receipt is kept for the Finance viewer. */
export function PaymentSubmitDialog({ contractId, open, onClose }: { contractId: string; open: boolean; onClose: () => void }) {
  const submit = useSubmitPayment();
  const suggestion = useNextUnpaidLine(contractId);
  // Purpose and amount follow the next unpaid schedule line until the user edits them.
  const [purposeEdit, setPurpose] = useState<PaymentPurpose | null>(null);
  const [amountEdit, setAmount] = useState<string | null>(null);
  const purpose = purposeEdit ?? suggestion?.purpose ?? "installment";
  const amount = amountEdit ?? (suggestion ? centavosToInputText(suggestion.amountCentavos) : "");
  const [method, setMethod] = useState<PaymentMethod>("Bank Transfer");
  const [paidDate, setPaidDate] = useState(manilaToday());
  const [documentNo, setDocumentNo] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [bankId, setBankId] = useState("");
  const [error, setError] = useState<string | undefined>();
  const bankOptions = (useReferenceEntries().data ?? []).filter((entry) => entry.list === "bank" && entry.status === "active").map((entry) => ({ value: entry.id, label: entry.label }));
  const usesBank = method === "Bank Transfer" || method === "Cheque";

  const send = async () => {
    const amountCentavos = parsePesoToCentavos(amount);
    if (!amountCentavos) {
      setError("Enter a valid amount.");
      return;
    }
    try {
      // Read at submit so a quick click never races the file read.
      const evidenceDataUrl = evidenceFile ? await readFileAsDataUrl(evidenceFile) : null;
      await submit.mutateAsync({
        contractId,
        purpose,
        amountCentavos,
        method,
        paidDate,
        documentNo: method === "Cash" ? null : documentNo.trim() || null,
        evidenceFileName: evidenceFile?.name ?? null,
        evidenceDataUrl,
        bankId: usesBank && bankId ? bankId : null,
      });
      toast.success("Payment submitted for Finance verification.");
      setBankId("");
      setAmount(null);
      setPurpose(null);
      setDocumentNo("");
      setEvidenceFile(null);
      setError(undefined);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not submit.");
    }
  };

  const chooseEvidence = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Choose a receipt file up to 5 MB.");
      return;
    }
    setError(undefined);
    setEvidenceFile(file);
  };

  return (
    <FormDialog open={open} title="Submit Payment" description="Finance verifies every payment. A submitted payment is not yet counted as paid." submitText="Submit Payment" pending={submit.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <SelectField label="Purpose" required value={purpose} options={PAYMENT_PURPOSES.map((value) => ({ value, label: PURPOSE_LABELS[value] }))} onChange={setPurpose} />
      <MoneyField label="Amount" required value={amount} onChange={setAmount} />
      <SelectField label="Method" required value={method} options={PAYMENT_METHODS.map((value) => ({ value, label: value }))} onChange={setMethod} />
      {usesBank && bankOptions.length > 0 ? <SelectField label="Bank" value={bankId} options={bankOptions} onChange={setBankId} allowClear placeholder="Select bank (optional)" /> : null}
      <StandardDateField label="Date on the receipt" required value={paidDate} onChange={setPaidDate} />
      <TextField
        label="Invoice / Receipt number"
        value={method === "Cash" ? "" : documentNo}
        onChange={setDocumentNo}
        disabled={method === "Cash"}
        maxLength={40}
        hint={method === "Cash"
          ? "Assigned when you submit a cash payment (OR-YYYYMMDD-NNNN). Finance sees the assigned number during review."
          : "Number of the Invoice, Official Receipt, Collection Receipt, or Acknowledgment Receipt issued for this collection."}
      />
      <p className="tw:text-xs tw:text-muted-foreground">The payment reference (PAY-YYYYMMDD-NNNN) is generated by the system and is mandatory for every method. Finance verifies the payment before it counts.</p>
      <div className="tw:flex tw:flex-col tw:gap-1.5">
        <Label htmlFor="payment-evidence">Receipt file</Label>
        <Input id="payment-evidence" type="file" accept="image/*,application/pdf" onChange={(event) => chooseEvidence(event.target.files?.[0])} />
        <p className="tw:text-xs tw:text-muted-foreground">{evidenceFile ? `${evidenceFile.name}. Finance can view it full size.` : "Image or PDF up to 5 MB; Finance can view it full size."}</p>
      </div>
    </FormDialog>
  );
}

/** Records a receipt with no matching contract (F6.5). It waits in the Finance exceptions queue with its reason. */
export function UnmatchedReceiptDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const submit = useSubmitUnmatchedReceipt();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Bank Transfer");
  const [paidDate, setPaidDate] = useState(manilaToday());
  const [orNumber, setOrNumber] = useState("");
  const [reason, setReason] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [error, setError] = useState<string | undefined>();

  const send = async () => {
    const amountCentavos = parsePesoToCentavos(amount);
    if (!amountCentavos) {
      setError("Enter a valid amount.");
      return;
    }
    if (!orNumber.trim()) {
      setError("Enter the OR or bank reference number.");
      return;
    }
    if (!reason.trim()) {
      setError("Explain why no matching contract or payment was found.");
      return;
    }
    try {
      // Read at submit so a quick click never races the file read.
      const evidenceDataUrl = evidenceFile ? await readFileAsDataUrl(evidenceFile) : null;
      await submit.mutateAsync({
        amountCentavos,
        method,
        paidDate,
        orNumber: orNumber.trim(),
        reason: reason.trim(),
        evidenceFileName: evidenceFile?.name ?? null,
        evidenceDataUrl,
      });
      toast.success("Unmatched receipt recorded for Finance review.");
      setAmount("");
      setOrNumber("");
      setReason("");
      setEvidenceFile(null);
      setError(undefined);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save.");
    }
  };

  const chooseEvidence = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Choose a receipt file up to 5 MB.");
      return;
    }
    setError(undefined);
    setEvidenceFile(file);
  };

  return (
    <FormDialog open={open} title="Record Unmatched Receipt" description="Money arrived but no matching contract or payment was found. Finance matches it to a contract or rejects it. Nothing counts until Finance verifies the matched payment." submitText="Record Receipt" pending={submit.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <MoneyField label="Amount" required value={amount} onChange={setAmount} />
      <SelectField label="Method" required value={method} options={PAYMENT_METHODS.map((value) => ({ value, label: value }))} onChange={setMethod} />
      <StandardDateField label="Date on the receipt" required value={paidDate} onChange={setPaidDate} />
      <TextField
        label="OR / bank reference number"
        required
        value={orNumber}
        onChange={setOrNumber}
        maxLength={60}
        hint="The number on the receipt slip. A number already used anywhere in the system is refused."
      />
      <TextAreaField label="Why no match was found" required value={reason} onChange={setReason} />
      <div className="tw:flex tw:flex-col tw:gap-1.5">
        <Label htmlFor="unmatched-evidence">Receipt file</Label>
        <Input id="unmatched-evidence" type="file" accept="image/*,application/pdf" onChange={(event) => chooseEvidence(event.target.files?.[0])} />
        <p className="tw:text-xs tw:text-muted-foreground">{evidenceFile ? `${evidenceFile.name}. Finance can view it full size.` : "Image or PDF up to 5 MB; Finance can view it full size."}</p>
      </div>
    </FormDialog>
  );
}

/** Finance links an unmatched receipt to a contract (F6.5). The money stays frozen; only the contract and purpose are assigned. */
function MatchUnmatchedDialog({ record, onClose }: { record: UnmatchedReceiptView; onClose: () => void }) {
  const action = usePaymentAction();
  const contracts = useContracts();
  const [contractId, setContractId] = useState("");
  const [purpose, setPurpose] = useState<PaymentPurpose>("installment");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();
  const options = useMemo(
    () => (contracts.data ?? []).map((contract) => ({ value: contract.id, label: `${contract.customerName} · ${contract.id}` })),
    [contracts.data],
  );

  const send = async () => {
    if (!contractId) {
      setError("Choose the contract this receipt pays.");
      return;
    }
    try {
      await action.mutateAsync({ id: record.id, action: "matchUnmatched", input: { contractId, purpose, note: note.trim() || null } });
      toast.success("Receipt matched. Finance verification is still required before it counts.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not match.");
    }
  };

  return (
    <FormDialog open title="Match Unmatched Receipt" description={`${formatPeso(record.amountCentavos)} · ${record.method} · ${formatDate(record.paidDate)} · OR ${record.orNumber}. The created payment still needs Finance verification; a receipt dated in a closed month counts in the first open month.`} submitText="Match Receipt" pending={action.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <SelectField label="Contract" required value={contractId} options={options} onChange={setContractId} placeholder={contracts.isLoading ? "Loading contracts…" : "Choose a contract"} loading={contracts.isLoading} />
      <SelectField label="Purpose" required value={purpose} options={PAYMENT_PURPOSES.map((value) => ({ value, label: PURPOSE_LABELS[value] }))} onChange={setPurpose} />
      <TextAreaField label="Matching note (optional)" value={note} onChange={setNote} />
    </FormDialog>
  );
}

/** Fix and resend a returned receipt. The original version stays in the payment history (07 section 9.1, U06). */function PaymentResubmitDialog({ payment, onClose }: { payment: PaymentView; onClose: () => void }) {
  const action = usePaymentAction();
  const [amount, setAmount] = useState(centavosToInputText(payment.amountCentavos));
  const [method, setMethod] = useState<PaymentMethod>(payment.method);
  const [paidDate, setPaidDate] = useState(payment.paidDate);
  const [documentNo, setDocumentNo] = useState(payment.documentNo ?? "");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [error, setError] = useState<string | undefined>();

  const send = async () => {
    const amountCentavos = parsePesoToCentavos(amount);
    if (!amountCentavos) return setError("Enter a valid amount.");
    try {
      // Read at submit so a quick click never races the file read.
      const evidenceDataUrl = evidenceFile ? await readFileAsDataUrl(evidenceFile) : undefined;
      await action.mutateAsync({
        id: payment.id,
        action: "resubmit",
        input: {
          amountCentavos,
          method,
          paidDate,
          documentNo: documentNo.trim() || null,
          ...(evidenceFile ? { evidenceFileName: evidenceFile.name, evidenceDataUrl } : {}),
        },
      });
      toast.success("Payment resent for Finance verification.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not resend.");
    }
  };

  const chooseEvidence = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) return setError("Choose a receipt file up to 5 MB.");
    setError(undefined);
    setEvidenceFile(file);
  };

  return (
    <FormDialog open title="Resend Payment" description={`Finance returned this payment${payment.decisionReason ? `: ${payment.decisionReason}` : "."} Correct it and resend it for verification. The original entry stays in history.`} submitText="Resend Payment" pending={action.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <MoneyField label="Amount" required value={amount} onChange={setAmount} />
      <SelectField label="Method" required value={method} options={PAYMENT_METHODS.map((value) => ({ value, label: value }))} onChange={setMethod} />
      <StandardDateField label="Date on the receipt" required value={paidDate} onChange={setPaidDate} />
      <div className="tw:flex tw:flex-col tw:gap-1.5">
        <Label htmlFor="payment-resend-reference">Payment reference (system)</Label>
        <Input id="payment-resend-reference" value={payment.referenceNo ?? ""} readOnly />
      </div>
      <TextField label="Invoice / Receipt number" value={documentNo} onChange={setDocumentNo} maxLength={40} hint="Invoice, Official Receipt, Collection Receipt, or Acknowledgment Receipt number." />
      <div className="tw:flex tw:flex-col tw:gap-1.5">
        <Label htmlFor="payment-resend-evidence">New receipt file</Label>
        <Input id="payment-resend-evidence" type="file" accept="image/*,application/pdf" onChange={(event) => chooseEvidence(event.target.files?.[0])} />
        {payment.evidenceFileDataUrl ? (
          <ImagePreview
            src={payment.evidenceFileDataUrl}
            fileName={payment.evidenceFileName}
            contentType={payment.evidenceContentType}
            label="Current receipt file"
          />
        ) : null}
        <p className="tw:text-xs tw:text-muted-foreground">{payment.evidenceFileName ? `Current file: ${payment.evidenceFileName}. Leave empty to keep it.` : "Image or PDF up to 5 MB; Finance can view it full size."}</p>
      </div>
    </FormDialog>
  );
}

function AdjustDialog({ payment, onClose }: { payment: PaymentView | null; onClose: () => void }) {
  const action = usePaymentAction();
  const [kind, setKind] = useState<"reversal" | "refund">("reversal");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  if (!payment) return null;
  // The VIP Reservation Fee is non-refundable. JA&D or the Property Owner decides IGP refunds.
  const refundAllowed = payment.isIgp || payment.purpose !== "reservation";
  const effectiveKind = refundAllowed ? kind : "reversal";
  const send = async () => {
    const amountCentavos = parsePesoToCentavos(amount);
    if (!amountCentavos) return setError("Enter a valid amount.");
    if (!reason.trim()) return setError("A reason is required.");
    try {
      await action.mutateAsync({ id: payment.id, action: "adjust", kind: effectiveKind, amountCentavos, reason: reason.trim() });
      toast.success(effectiveKind === "reversal" ? "Payment undone." : "Refund recorded.");
      setAmount("");
      setReason("");
      setError(undefined);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save.");
    }
  };
  return (
    <FormDialog open title="Refund Payment" description={`The original payment stays on record. Up to ${formatPeso(adjustableCentavos(payment))} can still be adjusted.`} submitText="Record" submitVariant="warning" pending={action.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <SelectField
        label="Type"
        required
        value={effectiveKind}
        options={refundAllowed ? [{ value: "reversal", label: "Undo" }, { value: "refund", label: "Refund" }] : [{ value: "reversal", label: "Undo (the Reservation Fee is non-refundable)" }]}
        onChange={setKind}
      />
      <MoneyField label="Amount" required value={amount} onChange={setAmount} />
      <TextAreaField label="Reason" required value={reason} onChange={setReason} />
    </FormDialog>
  );
}

/** A single payment-row action; the same list feeds the row menu and the details sheet footer. */
type PaymentItem = { key: string; label: string; tone?: RowActionTone; icon: LucideIcon; onClick: () => void };

/** Footer button color for each row-menu tone: success green, warning amber, danger red, otherwise neutral. */
const TONE_VARIANT = { success: "success", warning: "warning", danger: "destructive", info: "info", default: "outline" } as const;

const PURPOSE_TEXT = (value: string) => humanize(value);

/**
 * Finance row actions for payments (verify, return, reject, reverse
 * or refund) with one shared set of dialogs and a details sheet. Render `dialogs`
 * once in the parent. `rowActions` is the trailing Actions column menu and `open`
 * opens the details sheet, which is what a row click does.
 */
export function usePaymentActions(): { rowActions: (payment: PaymentView) => ReactNode; open: (payment: PaymentView) => void; dialogs: ReactElement } {
  const action = usePaymentAction();
  const payments = usePayments();
  const canVerify = useOperation("finance.verify");
  const canRefund = useOperation("finance.refund");
  const [reasonFor, setReasonFor] = useState<{ payment: PaymentView; kind: "reject" | "return" | "verify" } | null>(null);
  const canSubmit = useOperation("payments.submit");
  const { identity } = useDevIdentity();
  const [adjusting, setAdjusting] = useState<PaymentView | null>(null);
  const [resending, setResending] = useState<PaymentView | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = detailId ? (payments.data ?? []).find((item) => item.id === detailId) ?? null : null;
  const suggestedMatch = detail && (detail.status === "submitted" || detail.status === "under_review") && canVerify ? findSuggestedMatch(payments.data ?? [], detail) : undefined;

  const itemsFor = (payment: PaymentView): PaymentItem[] => {
    const open = payment.status === "submitted" || payment.status === "under_review";
    const items: PaymentItem[] = [];
    if (canSubmit && payment.status === "returned" && canCorrectPayment(identity, payment.submittedBy)) {
      items.push({ key: "resend", label: "Resend", tone: "warning", icon: Send, onClick: () => setResending(payment) });
    }
    if (canVerify && open) {
      if (!payment.approvalBlocked && !payment.referenceConflict) {
        items.push({ key: "verify", label: "Verify", tone: "success", icon: ShieldCheck, onClick: () => {
          if (findSuggestedMatch(payments.data ?? [], payment)) {
            setReasonFor({ payment, kind: "verify" });
            return;
          }
          // No confirmation: a mistaken verification is fixed with the audited Reverse.
          void toast.promise(action.mutateAsync({ id: payment.id, action: "verify" }), { loading: "Verifying…", success: "Payment verified.", error: (error: Error) => error.message });
        } });
      }
      items.push(
        { key: "return", label: "Request Fix", tone: "warning", icon: Wrench, onClick: () => setReasonFor({ payment, kind: "return" }) },
        { key: "reject", label: "Reject", tone: "danger", icon: X, onClick: () => setReasonFor({ payment, kind: "reject" }) },
      );
    }
    if (canRefund && payment.status === "verified" && adjustableCentavos(payment) > 0) {
      items.push({ key: "adjust", label: "Refund", tone: "warning", icon: Undo2, onClick: () => setAdjusting(payment) });
    }
    return items;
  };

  // Every action, Verify included, lives in the row menu.
  const rowActions = (payment: PaymentView): ReactNode => (
    <RowActionsMenu itemName={`payment for ${payment.customerName}`} extraItems={itemsFor(payment)} />
  );

  const detailFooter = detail ? <DetailActions actions={itemsFor(detail).map((item) => ({ ...item, next: item.key === "verify" || item.key === "resend", variant: TONE_VARIANT[item.tone ?? "default"] }))} /> : undefined;

  const dialogs = (
    <>
      <ReasonDialog
        open={reasonFor !== null}
        title={reasonFor?.kind === "verify" ? "Verify Possible Matching Receipt" : reasonFor?.kind === "reject" ? "Reject Payment" : "Return Payment for Correction"}
        description={reasonFor?.kind === "verify" ? "Explain why this is a separate payment." : reasonFor?.kind === "reject" ? "A rejected payment never counts toward the balance." : "The submitter can correct and resubmit. The original submission stays in history."}
        confirmText={reasonFor?.kind === "verify" ? "Verify" : reasonFor?.kind === "reject" ? "Reject" : "Return"}
        danger={reasonFor?.kind === "reject"}
        tone={reasonFor?.kind === "verify" ? "success" : reasonFor?.kind === "reject" ? "destructive" : "warning"}
        successText={reasonFor?.kind === "verify" ? "Payment verified." : reasonFor?.kind === "reject" ? "Payment rejected." : "Payment returned."}
        onClose={() => setReasonFor(null)}
        onSubmit={(reason) => {
          if (!reasonFor) return Promise.resolve();
          const id = reasonFor.payment.id;
          return action.mutateAsync(reasonFor.kind === "verify" ? { id, action: "verify", exceptionReason: reason } : { id, action: reasonFor.kind, reason });
        }}
      />
      <AdjustDialog payment={adjusting} onClose={() => setAdjusting(null)} />
      {resending ? <PaymentResubmitDialog key={resending.id} payment={resending} onClose={() => setResending(null)} /> : null}
      <RecordDetailsSheet
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail ? `${formatPeso(detail.amountCentavos)} · ${PURPOSE_TEXT(detail.purpose)}` : "Payment"}
        subtitle={detail ? `${detail.customerName} · ${detail.contractLabel}` : undefined}
        badge={detail ? <BizBadge status={detail.status} /> : undefined}
        sections={
          detail
            ? [
                {
                  title: "Payment",
                  rows: [
                    { label: "Method", value: detail.method },
                    { label: "Date on receipt", value: formatDate(detail.paidDate) },
                    { label: "Payment reference", value: detail.referenceNo },
                    { label: "Invoice / Receipt no.", value: detail.documentNo ?? null },
                    { label: "Receipt file", value: <ImagePreview src={detail.evidenceFileDataUrl} fileName={detail.evidenceFileName} contentType={detail.evidenceContentType} label="Receipt file" /> },
                    { label: "Submitted by", value: detail.submitterName },
                    { label: "Submitted", value: formatDate(detail.submittedAt) },
                  ],
                },
                {
                  title: "Finance Review",
                  rows: [
                    { label: "Verified on", value: detail.verifiedDate ? formatDate(detail.verifiedDate) : null },
                    { label: "Decision note", value: detail.decisionReason },
                    { label: "Possible match", value: suggestedMatch ? `Another open payment on this contract has the same amount and date (${suggestedMatch.referenceNo ?? EMPTY}). Check it before verifying.` : null },
                    { label: "Exception", value: detail.referenceConflict ? "This reference is already in use." : detail.approvalBlocked ? "The sale is awaiting approval or closed." : null },
                    { label: "Adjusted", value: detail.adjustments.length > 0 ? `${detail.adjustments.length} adjustment(s), ${formatPeso(adjustmentTotalCentavos(detail.adjustments))}` : null },
                  ],
                },
              ]
            : []
        }
        history={detail?.history.map((item, index) => {
          const prior = item.previousVersion;
          const note = prior
            ? `Earlier entry · ${humanize(prior.purpose)} · ${formatPeso(prior.amountCentavos)} · ${prior.method} · ${formatDate(prior.paidDate)} · Ref. ${prior.referenceNo ?? EMPTY} · File: ${prior.evidenceFileName ?? EMPTY}`
            : item.note;
          return { key: `${item.at}-${index}`, when: formatDate(item.at), text: `${humanize(item.event)}${note ? `: ${note}` : ""}` };
        })}
        footer={detailFooter}
      />
    </>
  );
  return { rowActions, open: (payment) => setDetailId(payment.id), dialogs };
}

/**
 * Finance row actions for unmatched receipts (F6.5): match to a contract or
 * reject with a reason, plus the intake dialog. Render `dialogs` once in the
 * parent. Nothing is ever deleted; every step keeps its history and audit.
 */
export function useUnmatchedReceiptActions(): {
  canRecord: boolean;
  openIntake: () => void;
  rowActions: (record: UnmatchedReceiptView) => ReactNode;
  dialogs: ReactElement;
} {
  const action = usePaymentAction();
  const canRecord = useOperation("payments.submit");
  const canVerify = useOperation("finance.verify");
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [matching, setMatching] = useState<UnmatchedReceiptView | null>(null);
  const [rejecting, setRejecting] = useState<UnmatchedReceiptView | null>(null);

  const rowActions = (record: UnmatchedReceiptView): ReactNode => {
    if (record.status !== "unmatched" || !canVerify) return null;
    return (
      <RowActionsMenu
        itemName={`unmatched receipt ${record.orNumber}`}
        extraItems={[
          { key: "match", label: "Match", tone: "success", icon: Link2, onClick: () => setMatching(record) },
          { key: "reject", label: "Reject", tone: "danger", icon: X, onClick: () => setRejecting(record) },
        ]}
      />
    );
  };

  const dialogs = (
    <>
      {intakeOpen ? <UnmatchedReceiptDialog open onClose={() => setIntakeOpen(false)} /> : null}
      {matching ? <MatchUnmatchedDialog key={matching.id} record={matching} onClose={() => setMatching(null)} /> : null}
      <ReasonDialog
        open={rejecting !== null}
        title="Reject Unmatched Receipt"
        description="The record is kept for history. It never counted toward any contract, and its OR number is freed because it never became a receipt."
        confirmText="Reject"
        danger
        tone="destructive"
        successText="Unmatched receipt rejected."
        onClose={() => setRejecting(null)}
        onSubmit={(reason) => {
          if (!rejecting) return Promise.resolve();
          const id = rejecting.id;
          return action.mutateAsync({ id, action: "rejectUnmatched", reason });
        }}
      />
    </>
  );
  return { canRecord, openIntake: () => setIntakeOpen(true), rowActions, dialogs };
}
