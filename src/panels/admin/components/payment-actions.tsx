"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { useOperation, usePaymentAction, useSubmitPayment } from "@/data/business-queries";
import type { PaymentView } from "@/data/contracts/payment-repository";
import { adjustableCentavos } from "@/modules/finance/rules";
import { PAYMENT_METHODS, PAYMENT_PURPOSES, type PaymentMethod, type PaymentPurpose } from "@/modules/finance/types";
import { manilaToday } from "@/shared/lib/dates";
import { formatPeso, parsePesoToCentavos } from "@/shared/lib/money";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { MoneyField, SelectField, StandardDateField, TextAreaField, TextField } from "@/shared/forms/modern";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { toast } from "sonner";
import { FormDialog, ReasonDialog } from "@/shared/components/modern/form-dialog";

const PURPOSE_LABELS: Record<PaymentPurpose, string> = { reservation: "Reservation", down_payment: "Down payment", installment: "Installment", full: "Full payment" };

/** Submit a payment for a contract (Staff, IST and OST for their own scope). Only the receipt file name is kept. */
export function PaymentSubmitDialog({ contractId, open, onClose }: { contractId: string; open: boolean; onClose: () => void }) {
  const submit = useSubmitPayment();
  const [purpose, setPurpose] = useState<PaymentPurpose>("installment");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Bank Transfer");
  const [paidDate, setPaidDate] = useState(manilaToday());
  const [reference, setReference] = useState("");
  const [file, setFile] = useState("");
  const [error, setError] = useState<string | undefined>();

  const send = async () => {
    const amountCentavos = parsePesoToCentavos(amount);
    if (!amountCentavos) {
      setError("Enter a valid amount.");
      return;
    }
    try {
      await submit.mutateAsync({ contractId, purpose, amountCentavos, method, paidDate, referenceNo: reference || null, evidenceFileName: file || null });
      toast.success("Payment submitted for Finance verification.");
      setAmount("");
      setReference("");
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
      <SelectField label="Method" required value={method} options={PAYMENT_METHODS.map((value) => ({ value, label: value }))} onChange={setMethod} />
      <StandardDateField label="Date on the receipt" required value={paidDate} onChange={setPaidDate} />
      <TextField label="Receipt or reference number" value={reference} onChange={setReference} hint="Enter it exactly as printed. Never guess a receipt number." />
      <div className="tw:flex tw:flex-col tw:gap-1.5">
        <Label htmlFor="payment-evidence">Receipt file</Label>
        <Input id="payment-evidence" type="file" accept="image/*,application/pdf" onChange={(event) => setFile(event.target.files?.[0]?.name ?? "")} />
        <p className="tw:text-xs tw:text-muted-foreground">Only the file name is kept in this prototype.</p>
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
  // The Reservation Fee is non-refundable (OD-12): only a reversal is offered for it.
  const refundAllowed = payment.purpose !== "reservation";
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

/**
 * Finance row actions for payments (verify, review, reject, return, reverse or
 * refund) with one shared set of dialogs. Render `dialogs` once in the parent.
 */
export function usePaymentActions(): { actions: (payment: PaymentView) => ReactNode; dialogs: ReactElement } {
  const action = usePaymentAction();
  const { confirmRun, dialog } = useConfirmRun();
  const canVerify = useOperation("finance.verify");
  const canRefund = useOperation("finance.refund");
  const [reasonFor, setReasonFor] = useState<{ payment: PaymentView; kind: "reject" | "return" } | null>(null);
  const [adjusting, setAdjusting] = useState<PaymentView | null>(null);

  const actions = (payment: PaymentView): ReactNode => {
    const open = payment.status === "submitted" || payment.status === "under_review";
    const buttons: ReactNode[] = [];
    if (canVerify && open) {
      if (payment.status === "submitted") {
        buttons.push(
          <Button key="review" variant="outline" size="sm" className="tw:min-h-11 tw:sm:min-h-7" onClick={() => void action.mutateAsync({ id: payment.id, action: "startReview" }).catch((error: Error) => toast.error(error.message))}>
            Start review
          </Button>,
        );
      }
      buttons.push(
        <Button key="verify" size="sm" className="tw:min-h-11 tw:sm:min-h-7" onClick={() => confirmRun({ title: "Verify this payment?", description: `${formatPeso(payment.amountCentavos)} for ${payment.customerName} will be counted as paid. A reservation alone never confirms a sale.`, confirmText: "Verify", action: () => action.mutateAsync({ id: payment.id, action: "verify" }), successTitle: "Payment verified.", errorTitle: "Could not verify" })}>
          Verify
        </Button>,
        <Button key="return" variant="outline" size="sm" className="tw:min-h-11 tw:sm:min-h-7" onClick={() => setReasonFor({ payment, kind: "return" })}>
          Return
        </Button>,
        <Button key="reject" variant="outline" size="sm" className="tw:min-h-11 tw:sm:min-h-7" onClick={() => setReasonFor({ payment, kind: "reject" })}>
          Reject
        </Button>,
      );
    }
    if (canRefund && payment.status === "verified" && adjustableCentavos(payment) > 0) {
      buttons.push(
        <Button key="adjust" variant="outline" size="sm" className="tw:min-h-11 tw:sm:min-h-7" onClick={() => setAdjusting(payment)}>
          Reverse or refund
        </Button>,
      );
    }
    return buttons.length > 0 ? <div className="tw:flex tw:flex-wrap tw:gap-1">{buttons}</div> : null;
  };

  const dialogs = (
    <>
      {dialog}
      <ReasonDialog
        open={reasonFor !== null}
        title={reasonFor?.kind === "reject" ? "Reject payment" : "Return payment for correction"}
        description={reasonFor?.kind === "reject" ? "A rejected payment never counts toward the balance." : "The submitter can correct and resubmit. The original submission stays in history."}
        confirmText={reasonFor?.kind === "reject" ? "Reject" : "Return"}
        danger={reasonFor?.kind === "reject"}
        successText={reasonFor?.kind === "reject" ? "Payment rejected." : "Payment returned."}
        onClose={() => setReasonFor(null)}
        onSubmit={(reason) => (reasonFor ? action.mutateAsync({ id: reasonFor.payment.id, action: reasonFor.kind === "reject" ? "reject" : "return", reason }) : Promise.resolve())}
      />
      <AdjustDialog payment={adjusting} onClose={() => setAdjusting(null)} />
    </>
  );
  return { actions, dialogs };
}
