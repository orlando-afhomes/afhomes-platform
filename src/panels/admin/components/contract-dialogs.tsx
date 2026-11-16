"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useApproveDeal, useContractAction, useUpdateContract } from "@/data/business-queries";
import type { ContractView } from "@/data/contracts/contract-repository";
import { CANCELLATION_GROUNDS, CANCELLATION_GROUND_LABELS, type ContractCancellationGround } from "@/modules/contracts/types";
import { CheckboxField, SelectField, StandardDateField, TextAreaField, TextField } from "@/shared/forms/modern";
import { FormDialog, ReasonDialog } from "@/shared/components/modern/form-dialog";
import { reportHeldDeal } from "../actions/sales-contract-actions";
import { NonStandardTermsList } from "./contract-sections";

type DialogProps = { contract: ContractView; onClose: () => void };
type ReasonProps = DialogProps & { open: boolean };

export function EditContractDialog({ contract, onClose }: DialogProps) {
  const update = useUpdateContract();
  const [dates, setDates] = useState<Record<number, string>>(() => Object.fromEntries(contract.schedule.map((line) => [line.seq, line.dueDate ?? ""])));
  const [accepted, setAccepted] = useState(contract.customerAccepted);
  const [error, setError] = useState<string | undefined>();
  const send = async () => {
    try {
      await update.mutateAsync({ id: contract.id, input: { dueDates: dates, customerAccepted: accepted } });
      toast.success("Contract updated.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save.");
    }
  };
  return (
    <FormDialog open title="Edit Contract Details" description="Due dates come from Annex A of the signed contract." submitText="Save" pending={update.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      {contract.schedule.map((line) => (
        <StandardDateField key={line.seq} label={`${line.label} due date`} value={dates[line.seq] ?? ""} onChange={(value) => setDates((current) => ({ ...current, [line.seq]: value }))} />
      ))}
      {contract.customerAccepted ? null : <CheckboxField label="The customer has read and accepted the contract terms." checked={accepted} onChange={setAccepted} />}
    </FormDialog>
  );
}

export function RequestCancellationDialog({ contract, onClose }: DialogProps) {
  const action = useContractAction();
  const [ground, setGround] = useState<ContractCancellationGround>("voluntary_withdrawal");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const send = async () => {
    if (!reason.trim()) return setError("A reason is required.");
    try {
      await action.mutateAsync({ id: contract.id, action: "requestCancel", ground, reason: reason.trim() });
      toast.success("Cancellation requested. Finance confirms or declines it.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save.");
    }
  };
  return (
    <FormDialog open title="Request Cancellation" description="This contract has verified payments. Under the Reservation Agreement the company keeps them on cancellation. Finance must confirm the request." submitText="Request Cancellation" submitVariant="warning" pending={action.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <SelectField label="Ground" required value={ground} options={CANCELLATION_GROUNDS.map((value) => ({ value, label: CANCELLATION_GROUND_LABELS[value] }))} onChange={setGround} />
      <TextAreaField label="Reason" required value={reason} onChange={setReason} />
    </FormDialog>
  );
}

export function ReturnContractDialog({ contract, open, onClose }: ReasonProps) {
  const action = useContractAction();
  return <ReasonDialog open={open} title="Return for Correction" description="The preparer can correct the contract and submit it again." confirmText="Return" tone="warning" successText="Contract returned." onClose={onClose} onSubmit={(reason) => action.mutateAsync({ id: contract.id, action: "return", reason })} />;
}

/** Finance sends back Non-Standard terms; both approvals are cleared (doc 05 §10.2 step 3). */
export function SendBackNonStandardDialog({ contract, open, onClose }: ReasonProps) {
  const action = useContractAction();
  return <ReasonDialog open={open} title="Send Back Non-Standard Terms" description="The contract goes back to the preparer to fix the price, payments or reason. The Administrator and Finance then approve it again." confirmText="Send Back" tone="warning" successText="Contract sent back." onClose={onClose} onSubmit={(reason) => action.mutateAsync({ id: contract.id, action: "return", reason })} />;
}

/** "Approve deal" for Non-Standard terms not yet approved: shows the difference and asks for the signed approval reference (doc 05 §10.2 step 1). */
export function ApproveNonStandardDealDialog({ contract, onClose }: DialogProps) {
  const approveDeal = useApproveDeal();
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | undefined>();
  const send = async () => {
    if (!reference.trim()) return setError("Enter the signed approval reference.");
    setError(undefined);
    try {
      reportHeldDeal(await approveDeal.mutateAsync({ contractId: contract.id, approvalReference: reference.trim() }));
      toast.success("Deal approved.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not approve the deal.");
    }
  };
  return (
    <FormDialog open title="Approve This Deal?" description="This contract has Non-Standard terms. Approving records your approval of them, approves the customer and the sale, and issues the VIP Number. Finance then confirms the terms before the contract is finalized." submitText="Approve Deal" submitVariant="success" pending={approveDeal.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <NonStandardTermsList contract={contract} />
      <TextField label="Signed approval reference" required value={reference} onChange={setReference} maxLength={120} />
    </FormDialog>
  );
}

export function CancelContractDialog({ contract, open, onClose }: ReasonProps) {
  const action = useContractAction();
  return <ReasonDialog open={open} title="Cancel Contract" description="The linked sale and membership are cancelled. This is recorded in the audit history." confirmText="Cancel Contract" danger successText="Contract cancelled." onClose={onClose} onSubmit={(reason) => action.mutateAsync({ id: contract.id, action: "cancel", reason })} />;
}

export function ApproveArrangementDialog({ contract, open, onClose }: ReasonProps) {
  const action = useContractAction();
  return <ReasonDialog open={open} title="Approve Special Arrangement" description={`Record the written approval for ${contract.arrangement?.schemeLabel ?? "this arrangement"}. Enter the reference of the signed approval.`} confirmText="Approve" tone="success" successText="Arrangement approved." onClose={onClose} onSubmit={(reason) => action.mutateAsync({ id: contract.id, action: "approveArrangement", reference: reason })} />;
}

export function ResolvePaymentCodeDialog({ contract, open, onClose }: ReasonProps) {
  const action = useContractAction();
  return <ReasonDialog open={open} title="Record Payment Code" description="Finds the payment code (part of the VIP Number) from the approved mapping for this payment plan and card level. Enter the reference of the approval." confirmText="Record Payment Code" successText="Payment code recorded." onClose={onClose} onSubmit={(reason) => action.mutateAsync({ id: contract.id, action: "resolvePaymentCode", reference: reason })} />;
}

export function ConfirmCancellationDialog({ contract, open, onClose }: ReasonProps) {
  const action = useContractAction();
  return <ReasonDialog open={open} title="Confirm Cancellation, Payments Kept" description="The contract, sale and pending membership are cancelled. Verified payments stay on record as kept by the company, a Confirmed Sale is undone this month, and unpaid commissions go on hold." confirmText="Confirm Cancellation" danger successText="Contract cancelled, payments kept." onClose={onClose} onSubmit={(reason) => action.mutateAsync({ id: contract.id, action: "decideCancel", decision: "confirm", reason })} />;
}

export function DeclineCancellationDialog({ contract, open, onClose }: ReasonProps) {
  const action = useContractAction();
  return <ReasonDialog open={open} title="Decline Cancellation" description="The contract stays as it is. The request and your reason are recorded in the audit history." confirmText="Decline" tone="warning" successText="Cancellation request declined." onClose={onClose} onSubmit={(reason) => action.mutateAsync({ id: contract.id, action: "decideCancel", decision: "decline", reason })} />;
}
