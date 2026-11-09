"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useContractAction, useUpdateContract } from "@/data/business-queries";
import type { ContractView } from "@/data/contracts/contract-repository";
import { CANCELLATION_GROUNDS, CANCELLATION_GROUND_LABELS, type ContractCancellationGround } from "@/modules/contracts/types";
import { CheckboxField, SelectField, StandardDateField, TextAreaField, TextField } from "@/shared/forms/modern";
import { FormDialog, ReasonDialog } from "@/shared/components/modern/form-dialog";

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
    <FormDialog open title="Edit contract details" description="Due dates come from Annex A of the signed contract." submitText="Save" pending={update.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      {contract.schedule.map((line) => (
        <StandardDateField key={line.seq} label={`${line.label} due date`} value={dates[line.seq] ?? ""} onChange={(value) => setDates((current) => ({ ...current, [line.seq]: value }))} />
      ))}
      <CheckboxField label="The customer has read and accepted the contract terms." checked={accepted} onChange={setAccepted} />
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
    <FormDialog open title="Request cancellation" description="This contract has verified payments. Under the Reservation Agreement they are forfeited on cancellation. Finance must confirm the request." submitText="Request cancellation" pending={action.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <SelectField label="Ground" required value={ground} options={CANCELLATION_GROUNDS.map((value) => ({ value, label: CANCELLATION_GROUND_LABELS[value] }))} onChange={setGround} />
      <TextAreaField label="Reason" required value={reason} onChange={setReason} />
    </FormDialog>
  );
}

export function RaDialog({ contract, onClose }: DialogProps) {
  const action = useContractAction();
  const [value, setValue] = useState(contract.raNumber ?? "");
  const [error, setError] = useState<string | undefined>();
  const send = async () => {
    try {
      await action.mutateAsync({ id: contract.id, action: "ra", raNumber: value });
      toast.success("RA number recorded.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save.");
    }
  };
  return (
    <FormDialog open title="Record RA number" description="Copy the number from the signed Reservation Agreement. It is needed to issue the VIP Card ID." submitText="Record" pending={action.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <TextField label="RA number" required value={value} onChange={setValue} hint="For example 2027-0001. The official numbering format is pending an owner decision." />
    </FormDialog>
  );
}

export function ReturnContractDialog({ contract, open, onClose }: ReasonProps) {
  const action = useContractAction();
  return <ReasonDialog open={open} title="Return for correction" description="The preparer can correct the contract and submit it again." confirmText="Return" successText="Contract returned." onClose={onClose} onSubmit={(reason) => action.mutateAsync({ id: contract.id, action: "return", reason })} />;
}

export function CancelContractDialog({ contract, open, onClose }: ReasonProps) {
  const action = useContractAction();
  return <ReasonDialog open={open} title="Cancel contract" description="The linked sale and membership are cancelled. This is recorded in the audit history." confirmText="Cancel contract" danger successText="Contract cancelled." onClose={onClose} onSubmit={(reason) => action.mutateAsync({ id: contract.id, action: "cancel", reason })} />;
}

export function ApproveArrangementDialog({ contract, open, onClose }: ReasonProps) {
  const action = useContractAction();
  return <ReasonDialog open={open} title="Approve special arrangement" description={`Record the written approval for ${contract.arrangement?.schemeLabel ?? "this arrangement"}. Enter the reference of the signed approval.`} confirmText="Approve" successText="Arrangement approved." onClose={onClose} onSubmit={(reason) => action.mutateAsync({ id: contract.id, action: "approveArrangement", reference: reason })} />;
}

export function ConfirmCancellationDialog({ contract, open, onClose }: ReasonProps) {
  const action = useContractAction();
  return <ReasonDialog open={open} title="Confirm cancellation with forfeiture" description="The contract, sale and pending membership are cancelled. Verified payments stay on record as forfeited, a Confirmed sale is reversed this month, and unpaid commissions go on hold." confirmText="Confirm cancellation" danger successText="Contract cancelled with forfeiture." onClose={onClose} onSubmit={(reason) => action.mutateAsync({ id: contract.id, action: "decideCancel", decision: "confirm", reason })} />;
}

export function DeclineCancellationDialog({ contract, open, onClose }: ReasonProps) {
  const action = useContractAction();
  return <ReasonDialog open={open} title="Decline cancellation" description="The contract stays as it is. The request and your reason are recorded in the audit history." confirmText="Decline" successText="Cancellation request declined." onClose={onClose} onSubmit={(reason) => action.mutateAsync({ id: contract.id, action: "decideCancel", decision: "decline", reason })} />;
}
