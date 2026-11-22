"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCommissionRates, useSetClawbackAddendum } from "@/data/business-queries";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { SelectField, StandardDateField } from "@/shared/forms/modern";
import { formatDate } from "@/shared/lib/format-date";

/**
 * Records the day an Internal Seller signed the IST Commission and Clawback Addendum. From that day, paybacks raised for
 * that person are taken out of their month-end payouts and allowances automatically (owner decision 2026-11-22).
 */
export function ClawbackAddendumDialog({ onClose }: { onClose: () => void }) {
  const directory = useCommissionRates(true).data;
  const action = useSetClawbackAddendum();
  const [memberId, setMemberId] = useState("");
  const [date, setDate] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const sellers = (directory?.members ?? []).filter(({ designation }) => designation !== "OST");
  const current = sellers.find(({ id }) => id === memberId)?.clawbackAddendumSignedDate ?? null;
  const shown = date ?? current ?? "";
  return (
    <FormDialog open title="Signed Clawback Addendum" submitText="Save" pending={action.isPending} error={error} onClose={onClose}
      description="Only Internal Sellers (IST) sign this. Without a signing date, a payback is collected directly instead of being taken out of pay."
      onSubmit={() => {
        if (!memberId) { setError("Choose the seller."); return; }
        void action.mutateAsync({ memberId, signedDate: shown || null })
          .then(() => { toast.success("Signed addendum saved."); onClose(); })
          .catch((failure: Error) => setError(failure.message));
      }}>
      <SelectField label="Seller" value={memberId} required options={sellers.map(({ id, name }) => ({ value: id, label: name }))}
        onChange={(value) => { setMemberId(value); setDate(null); setError(undefined); }} />
      <StandardDateField label="Date signed" value={shown} hint={memberId ? (current ? `Currently ${formatDate(current)}. Clear the date to remove it.` : "No signed addendum on record.") : undefined}
        onChange={(value) => { setDate(value); setError(undefined); }} />
    </FormDialog>
  );
}
