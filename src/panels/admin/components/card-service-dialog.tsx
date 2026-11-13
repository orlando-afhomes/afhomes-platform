"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useServiceCard } from "@/data/business-queries";
import type { MembershipView } from "@/data/contracts/membership-repository";
import { useCustomers } from "@/data/queries";
import type { CardServiceInput } from "@/modules/membership/types";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { CheckboxField, SelectField, TextField } from "@/shared/forms/modern";

export function CardServiceDialog({ membership, onClose }: { membership: MembershipView; onClose: () => void }) {
  const customers = useCustomers();
  const action = useServiceCard();
  const [kind, setKind] = useState<CardServiceInput["kind"]>("replacement");
  const [custody, setCustody] = useState<"voided" | "recalled">("voided");
  const [requestReference, setRequest] = useState("");
  const [approvalReference, setApproval] = useState("");
  const [nextCustomerId, setHolder] = useState("");
  const [holderNotified, setNotified] = useState(false);
  const [inheritanceReference, setInheritance] = useState("");
  const [acknowledgementReference, setAcknowledgement] = useState("");
  const [error, setError] = useState<string>();
  const holders = (customers.data ?? []).filter((item) => item.id !== membership.customerId && ["approved", "active_member"].includes(item.status));
  const submit = async () => {
    const references = { requestReference, approvalReference };
    const service: CardServiceInput = kind === "replacement" ? { ...references, kind, custody }
      : kind === "transfer" ? { ...references, kind, nextCustomerId, holderNotified }
        : { ...references, kind, nextCustomerId, inheritanceReference, acknowledgementReference };
    try {
      await action.mutateAsync({ id: membership.id, service });
      toast.success("Card service recorded.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not record card service.");
    }
  };
  return (
    <FormDialog open title="Service VIP card" description={membership.customerName} submitText="Record service" pending={action.isPending} error={error} onClose={onClose} onSubmit={() => void submit()}>
      <SelectField label="Service" value={kind} onChange={setKind} options={[{ value: "replacement", label: "Replace card" }, { value: "transfer", label: "Transfer to another holder" }, { value: "inheritance", label: "Transfer to an heir" }]} />
      <TextField label="Written request reference" required value={requestReference} onChange={setRequest} />
      <TextField label="Management approval reference" required value={approvalReference} onChange={setApproval} />
      {kind === "replacement" ? <SelectField label="Former card" value={custody} onChange={setCustody} options={[{ value: "voided", label: "Voided" }, { value: "recalled", label: "Recalled" }]} />
        : <SelectField label="New holder" required value={nextCustomerId} onChange={setHolder} options={holders.map((item) => ({ value: item.id, label: item.displayName }))} />}
      {kind === "transfer" ? <CheckboxField label="The former holder was informed about future bookings." checked={holderNotified} onChange={setNotified} /> : null}
      {kind === "inheritance" ? <>
        <TextField label="Inheritance document reference" required value={inheritanceReference} onChange={setInheritance} />
        <TextField label="Signed successor acknowledgement reference" required value={acknowledgementReference} onChange={setAcknowledgement} />
      </> : null}
    </FormDialog>
  );
}
