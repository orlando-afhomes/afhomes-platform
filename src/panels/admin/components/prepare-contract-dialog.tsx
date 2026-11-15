"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMembers } from "@/data/queries";
import { usePaymentSchemes, usePrepareContract, useVipProducts } from "@/data/business-queries";
import { buildSchedule } from "@/modules/contracts/rules";
import type { Customer } from "@/modules/customers/types";
import { CheckboxField, SelectField } from "@/shared/forms/modern";
import { StandardDateField } from "@/shared/forms/modern/date-field";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { Money } from "@/shared/components/modern/money";
import { formatDate } from "@/shared/lib/format-date";
import { useContractHref } from "./use-contract-href";

/** Prepares a contract for a submitted customer: scheme, schedule preview with due dates, customer acceptance. */
export function PrepareContractDialog({ customer, open, onClose, repeatPurchase = false }: { customer: Customer; open: boolean; onClose: () => void; repeatPurchase?: boolean }) {
  const router = useRouter();
  const contractHref = useContractHref();
  const members = useMembers();
  const products = useVipProducts();
  const schemes = usePaymentSchemes();
  const prepare = usePrepareContract();
  const [seller, setSeller] = useState(customer.ownerMemberId ?? "");
  const [referrer, setReferrer] = useState("none");
  const [classification, setClassification] = useState(customer.contractClassification ?? "S");
  const [productCode, setProductCode] = useState(customer.vipPlan ?? undefined);
  const [schemeId, setSchemeId] = useState(customer.paymentSchemeId ?? "");
  const [accepted, setAccepted] = useState(false);
  const [dueDates, setDueDates] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | undefined>();

  const product = products.data?.find((item) => item.code === productCode);
  const scheme = schemes.data?.find((item) => item.id === schemeId);
  const built = useMemo(() => (product && scheme ? buildSchedule(product, scheme) : null), [product, scheme]);

  const sellerOptions = (members.data ?? []).map((item) => ({ value: item.id, label: item.displayName }));
  const options = (schemes.data ?? []).map((item) => ({
    value: item.id,
    label: item.commercialStatus === "configured" ? item.label : `${item.label} (terms pending)`,
    disabled: item.availability !== "available",
  }));

  const submit = async () => {
    setError(undefined);
    try {
      const contract = await prepare.mutateAsync({ customerId: customer.id, productCode, schemeId, dueDates, customerAccepted: accepted, ...(repeatPurchase ? { sellerMemberId: seller, referrerMemberId: referrer === "none" ? null : referrer, classification } : {}) });
      toast.success("Contract prepared as a draft.");
      onClose();
      router.push(contractHref(contract.id));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not prepare the contract.");
    }
  };

  return (
    <FormDialog open={open} title="Prepare contract" description={`${customer.displayName} · ${product?.name ?? "No plan selected"}`} submitText="Prepare contract" pending={prepare.isPending} error={error} onClose={onClose} onSubmit={() => void submit()}>
      {repeatPurchase ? <SelectField label="VIP plan" required value={productCode} options={(products.data ?? []).filter((item) => item.status === "active").map((item) => ({ value: item.code, label: item.name }))} onChange={(value) => { setProductCode((products.data ?? []).find((item) => item.code === value)?.code); setDueDates({}); }} /> : null}
      {repeatPurchase ? <>
        <SelectField label="Closing seller" required value={seller} options={sellerOptions} onChange={setSeller} />
        <SelectField label="Referrer" value={referrer} options={[{ value: "none", label: "No referrer" }, ...sellerOptions]} onChange={setReferrer} />
        <SelectField label="Contract classification" required value={classification} options={[{ value: "S", label: "Standard" }, { value: "N", label: "Non-Standard" }]} onChange={(value) => setClassification(value === "N" ? "N" : "S")} />
      </> : null}
      <SelectField label="Payment scheme" required value={schemeId || undefined} options={options} onChange={setSchemeId} placeholder="Select a scheme" />
      {built && built.errors.length > 0 ? <InfoNote title="This scheme cannot be used yet">{built.errors[0]}</InfoNote> : null}
      {built && built.schedule.length > 0 ? (
        <div className="tw:flex tw:flex-col tw:gap-2">
          <h3 className="tw:text-sm tw:font-semibold">Payment schedule</h3>
          <p className="tw:text-sm tw:text-muted-foreground">Enter the due dates from Annex A of the signed contract. Dates left blank are never marked overdue.</p>
          {built.schedule.map((line) => (
            <div key={line.seq} className="tw:grid tw:grid-cols-1 tw:items-end tw:gap-2 tw:sm:grid-cols-[1fr_auto_1fr]">
              <span className="tw:text-sm">{line.label}</span>
              <Money value={line.amountCentavos} className="tw:text-sm" />
              <StandardDateField label={`${line.label} due date`} value={dueDates[line.seq] ?? ""} onChange={(value) => setDueDates((current) => ({ ...current, [line.seq]: value }))} hint={dueDates[line.seq] ? formatDate(dueDates[line.seq]) : undefined} />
            </div>
          ))}
        </div>
      ) : null}
      <CheckboxField label="The customer has read and accepted the contract terms." checked={accepted} onChange={setAccepted} />
    </FormDialog>
  );
}
