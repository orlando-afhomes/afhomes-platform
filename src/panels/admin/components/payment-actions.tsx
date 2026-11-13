"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { useOperation, usePaymentAction, usePayments, useSubmitPayment } from "@/data/business-queries";
import type { PaymentView } from "@/data/contracts/payment-repository";
import { canCorrectPayment } from "@/data/mock/scope";
import { useReferenceEntries } from "@/data/settings-queries";
import { adjustableCentavos, adjustmentTotalCentavos, findSuggestedMatch } from "@/modules/finance/rules";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { PAYMENT_METHODS, PAYMENT_PURPOSES, type PaymentMethod, type PaymentPurpose } from "@/modules/finance/types";
import { manilaToday } from "@/shared/lib/dates";
import { centavosToInputText, formatPeso, parsePesoToCentavos } from "@/shared/lib/money";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { MoneyField, SelectField, StandardDateField, TextAreaField, TextField } from "@/shared/forms/modern";
import { REFERENCE_LIMITS, cleanReferenceNumber, referencePolicyFor, validateReferenceNumber, type ReferencePolicy } from "@/shared/forms/validation/reference-number";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { toast } from "sonner";
import { FormDialog, ReasonDialog } from "@/shared/components/modern/form-dialog";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { formatDate } from "@/shared/lib/format-date";
import { humanize } from "@/shared/lib/humanize";

const PURPOSE_LABELS: Record<PaymentPurpose, string> = { reservation: "Reservation", down_payment: "Down payment", installment: "Installment", full: "Full payment" };

/** Per-policy guidance for the receipt/reference field. */
function referenceHint(policy: ReferencePolicy): string {
  if (policy === "digital") return "12-16 letters or digits, uppercase; no spaces or symbols.";
  if (policy === "bank") return "6-20 letters or digits, uppercase; no spaces or symbols.";
  return "Letters, digits, spaces, and , . / - only.";
}

/** Submit a payment for a contract (Staff, IST and OST for their own scope). Only the receipt file name is kept. */
export function PaymentSubmitDialog({ contractId, open, onClose }: { contractId: string; open: boolean; onClose: () => void }) {
  const submit = useSubmitPayment();
  const [purpose, setPurpose] = useState<PaymentPurpose>("installment");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Bank Transfer");
  const [paidDate, setPaidDate] = useState(manilaToday());
  const [reference, setReference] = useState("");
  const [referenceTouched, setReferenceTouched] = useState(false);
  const [file, setFile] = useState("");
  const [bankId, setBankId] = useState("");
  const [error, setError] = useState<string | undefined>();
  const refPolicy = referencePolicyFor(method);
  const bankOptions = (useReferenceEntries().data ?? []).filter((entry) => entry.list === "bank" && entry.status === "active").map((entry) => ({ value: entry.id, label: entry.label }));
  const usesBank = method === "Bank Transfer" || method === "Cheque";

  const send = async () => {
    const amountCentavos = parsePesoToCentavos(amount);
    if (!amountCentavos) {
      setError("Enter a valid amount.");
      return;
    }
    const referenceError = requiredReferenceError(reference, refPolicy);
    if (referenceError) {
      setReferenceTouched(true);
      setError(referenceError);
      return;
    }
    try {
      await submit.mutateAsync({ contractId, purpose, amountCentavos, method, paidDate, referenceNo: reference, evidenceFileName: file || null, bankId: usesBank && bankId ? bankId : null });
      toast.success("Payment submitted for Finance verification.");
      setBankId("");
      setAmount("");
      setReference("");
      setReferenceTouched(false);
      setFile("");
      setError(undefined);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not submit.");
    }
  };

  return (
    <FormDialog open={open} title="Submit payment" description="Finance verifies every payment. A submitted payment is not yet counted as paid." submitText="Submit payment" pending={submit.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <SelectField label="Purpose" required value={purpose} options={PAYMENT_PURPOSES.map((value) => ({ value, label: PURPOSE_LABELS[value] }))} onChange={setPurpose} />
      <MoneyField label="Amount" required value={amount} onChange={setAmount} />
      <SelectField label="Method" required value={method} options={PAYMENT_METHODS.map((value) => ({ value, label: value }))} onChange={(value) => { setMethod(value); setReference(cleanReferenceNumber(reference, referencePolicyFor(value))); }} />
      {usesBank && bankOptions.length > 0 ? <SelectField label="Bank" value={bankId} options={bankOptions} onChange={setBankId} allowClear placeholder="Select bank (optional)" /> : null}
      <StandardDateField label="Date on the receipt" required value={paidDate} onChange={setPaidDate} />
      <TextField
        label="Receipt or reference number"
        required
        value={reference}
        onChange={(value) => setReference(cleanReferenceNumber(value, refPolicy))}
        onBlur={() => setReferenceTouched(true)}
        maxLength={REFERENCE_LIMITS[refPolicy].max}
        hint={referenceHint(refPolicy)}
        error={referenceTouched ? (requiredReferenceError(reference, refPolicy) ?? undefined) : undefined}
      />
      <div className="tw:flex tw:flex-col tw:gap-1.5">
        <Label htmlFor="payment-evidence">Receipt file</Label>
        <Input id="payment-evidence" type="file" accept="image/*,application/pdf" onChange={(event) => setFile(event.target.files?.[0]?.name ?? "")} />
        <p className="tw:text-xs tw:text-muted-foreground">Only the file name is kept in this prototype.</p>
      </div>
    </FormDialog>
  );
}

/** The receipt or reference number is required (07 section 5.1); uniqueness is checked when the payment is saved. */
function requiredReferenceError(reference: string, policy: ReferencePolicy): string | null {
  if (!reference.trim()) return "Enter the receipt or reference number.";
  return validateReferenceNumber(reference, policy);
}

/** Fix and resend a returned receipt. The original version stays in the payment history (07 section 9.1, U06). */
function PaymentResubmitDialog({ payment, onClose }: { payment: PaymentView; onClose: () => void }) {
  const action = usePaymentAction();
  const [amount, setAmount] = useState(centavosToInputText(payment.amountCentavos));
  const [method, setMethod] = useState<PaymentMethod>(payment.method);
  const [paidDate, setPaidDate] = useState(payment.paidDate);
  const [file, setFile] = useState("");
  const [error, setError] = useState<string | undefined>();

  const send = async () => {
    const amountCentavos = parsePesoToCentavos(amount);
    if (!amountCentavos) return setError("Enter a valid amount.");
    try {
      await action.mutateAsync({ id: payment.id, action: "resubmit", input: { amountCentavos, method, paidDate, ...(file ? { evidenceFileName: file } : {}) } });
      toast.success("Payment resent for Finance verification.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not resend.");
    }
  };

  return (
    <FormDialog open title="Fix and resend payment" description={`Finance returned this payment${payment.decisionReason ? `: ${payment.decisionReason}` : "."} Correct it and resend it for verification. The original version stays in history.`} submitText="Resend payment" pending={action.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <MoneyField label="Amount" required value={amount} onChange={setAmount} />
      <SelectField label="Method" required value={method} options={PAYMENT_METHODS.map((value) => ({ value, label: value }))} onChange={setMethod} />
      <StandardDateField label="Date on the receipt" required value={paidDate} onChange={setPaidDate} />
      <div className="tw:flex tw:flex-col tw:gap-1.5">
        <Label htmlFor="payment-resend-reference">Receipt or reference number</Label>
        <Input id="payment-resend-reference" value={payment.referenceNo ?? ""} readOnly />
      </div>
      <div className="tw:flex tw:flex-col tw:gap-1.5">
        <Label htmlFor="payment-resend-evidence">New receipt file</Label>
        <Input id="payment-resend-evidence" type="file" accept="image/*,application/pdf" onChange={(event) => setFile(event.target.files?.[0]?.name ?? "")} />
        <p className="tw:text-xs tw:text-muted-foreground">{payment.evidenceFileName ? `Current file: ${payment.evidenceFileName}. Leave empty to keep it.` : "Only the file name is kept in this prototype."}</p>
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
      toast.success(effectiveKind === "reversal" ? "Payment reversal recorded." : "Refund recorded.");
      setAmount("");
      setReason("");
      setError(undefined);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save.");
    }
  };
  return (
    <FormDialog open title="Reverse or refund payment" description={`The original payment stays on record. Up to ${formatPeso(adjustableCentavos(payment))} can still be adjusted.`} submitText="Record" pending={action.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <SelectField
        label="Type"
        required
        value={effectiveKind}
        options={refundAllowed ? [{ value: "reversal", label: "Reversal" }, { value: "refund", label: "Refund" }] : [{ value: "reversal", label: "Reversal (the Reservation Fee is non-refundable)" }]}
        onChange={setKind}
      />
      <MoneyField label="Amount" required value={amount} onChange={setAmount} />
      <TextAreaField label="Reason" required value={reason} onChange={setReason} />
    </FormDialog>
  );
}

/** A single payment-row action; the same list feeds the row menu and the details sheet footer. */
type PaymentItem = { key: string; label: string; danger?: boolean; onClick: () => void };

const PURPOSE_TEXT = (value: string) => humanize(value);

/**
 * Finance row actions for payments (start review, verify, return, reject, reverse
 * or refund) with one shared set of dialogs and a details sheet. Render `dialogs`
 * once in the parent. `rowActions` is the trailing Actions column menu and `open`
 * opens the details sheet, which is what a row click does.
 */
export function usePaymentActions(): { rowActions: (payment: PaymentView) => ReactNode; open: (payment: PaymentView) => void; dialogs: ReactElement } {
  const action = usePaymentAction();
  const payments = usePayments();
  const { confirmRun, dialog } = useConfirmRun();
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
      items.push({ key: "resend", label: "Fix and resend", onClick: () => setResending(payment) });
    }
    if (canVerify && open) {
      if (payment.status === "submitted") {
        items.push({ key: "review", label: "Start review", onClick: () => void toast.promise(action.mutateAsync({ id: payment.id, action: "startReview" }), { loading: "Starting review…", success: "Review started.", error: (error: Error) => error.message }) });
      }
      if (!payment.approvalBlocked && !payment.referenceConflict) {
        items.push({ key: "verify", label: "Verify", onClick: () => {
          if (findSuggestedMatch(payments.data ?? [], payment)) {
            setReasonFor({ payment, kind: "verify" });
            return;
          }
          confirmRun({ title: "Verify this payment?", description: `${formatPeso(payment.amountCentavos)} for ${payment.customerName} will count toward the sale's approved collections.`, confirmText: "Verify", action: () => action.mutateAsync({ id: payment.id, action: "verify" }), successTitle: "Payment verified.", errorTitle: "Could not verify" });
        } });
      }
      items.push(
        { key: "return", label: "Return for correction", onClick: () => setReasonFor({ payment, kind: "return" }) },
        { key: "reject", label: "Reject", danger: true, onClick: () => setReasonFor({ payment, kind: "reject" }) },
      );
    }
    if (canRefund && payment.status === "verified" && adjustableCentavos(payment) > 0) {
      items.push({ key: "adjust", label: "Reverse or refund", onClick: () => setAdjusting(payment) });
    }
    return items;
  };

  const rowActions = (payment: PaymentView): ReactNode => (
    <RowActionsMenu itemName={`payment for ${payment.customerName}`} onView={() => setDetailId(payment.id)} extraItems={itemsFor(payment)} />
  );

  const detailFooter = detail
    ? itemsFor(detail).map((item) => (
        <Button key={item.key} type="button" variant={item.danger ? "danger" : item.key === "verify" ? "primary" : "outline"} onClick={item.onClick}>
          {item.label}
        </Button>
      ))
    : null;

  const dialogs = (
    <>
      {dialog}
      <ReasonDialog
        open={reasonFor !== null}
        title={reasonFor?.kind === "verify" ? "Verify possible matching receipt" : reasonFor?.kind === "reject" ? "Reject payment" : "Return payment for correction"}
        description={reasonFor?.kind === "verify" ? "Explain why this is a separate payment." : reasonFor?.kind === "reject" ? "A rejected payment never counts toward the balance." : "The submitter can correct and resubmit. The original submission stays in history."}
        confirmText={reasonFor?.kind === "verify" ? "Verify" : reasonFor?.kind === "reject" ? "Reject" : "Return"}
        danger={reasonFor?.kind === "reject"}
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
                    { label: "Reference no.", value: detail.referenceNo },
                    { label: "Receipt file", value: detail.evidenceFileName },
                    { label: "Submitted by", value: detail.submitterName },
                    { label: "Submitted", value: formatDate(detail.submittedAt) },
                  ],
                },
                {
                  title: "Finance review",
                  rows: [
                    { label: "Verified on", value: detail.verifiedDate ? formatDate(detail.verifiedDate) : null },
                    { label: "Decision note", value: detail.decisionReason },
                    { label: "Possible match", value: suggestedMatch ? `Another open payment on this contract has the same amount and date (${suggestedMatch.referenceNo ?? "no reference"}). Check it before verifying.` : null },
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
            ? `Previous version · ${humanize(prior.purpose)} · ${formatPeso(prior.amountCentavos)} · ${prior.method} · ${formatDate(prior.paidDate)} · Ref. ${prior.referenceNo ?? "—"} · File: ${prior.evidenceFileName ?? "None"}`
            : item.note;
          return { key: `${item.at}-${index}`, when: formatDate(item.at), text: `${humanize(item.event)}${note ? `: ${note}` : ""}` };
        })}
        footer={detailFooter && detailFooter.length > 0 ? detailFooter : undefined}
      />
    </>
  );
  return { rowActions, open: (payment) => setDetailId(payment.id), dialogs };
}
