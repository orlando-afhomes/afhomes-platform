"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMembers } from "@/data/queries";
import { usePaymentSchemes, usePrepareContract, useVipProducts } from "@/data/business-queries";
import { buildNonStandardSchedule, buildSchedule } from "@/modules/contracts/rules";
import type { Customer } from "@/modules/customers/types";
import { CheckboxField, SelectField } from "@/shared/forms/modern";
import { parsePesoToCentavos } from "@/shared/lib/money";
import { NonStandardTermsFields, nonStandardTermsFromText, type NonStandardTermsText } from "./non-standard-terms-fields";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { Money } from "@/shared/components/modern/money";
import { useContractHref } from "./use-contract-href";

/** Prepares a contract for a submitted customer. Due dates follow the reservation date; the plan, scheme and classification are asked only when the customer does not already have them. */
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
  const [isSeparatePurchase, setIsSeparatePurchase] = useState(false);
  const [newPurchaseRequestId] = useState(() => repeatPurchase ? crypto.randomUUID() : undefined);
  const [error, setError] = useState<string | undefined>();
  const [nonStandardText, setNonStandardText] = useState<NonStandardTermsText>({ price: "", months: "", reason: "" });

  const product = products.data?.find((item) => item.code === productCode);
  const scheme = schemes.data?.find((item) => item.id === schemeId);
  const standard = useMemo(() => (product && scheme ? buildSchedule(product, scheme) : null), [product, scheme]);
  const nonStandard = classification === "N";
  const nonStandardTerms = nonStandardTermsFromText(nonStandardText);
  // A Non-Standard contract shows its own schedule once its price and months are valid (doc 05 §10.2).
  const built = useMemo(() => {
    if (!standard || !nonStandard || standard.errors.length > 0 || !scheme) return standard;
    const price = parsePesoToCentavos(nonStandardText.price);
    const months = Number(nonStandardText.months);
    const custom = price != null ? buildNonStandardSchedule(price, scheme.reservationCentavos ?? 0, months) : null;
    return custom && custom.errors.length === 0 ? { ...custom, priceCentavos: price ?? 0 } : { ...standard, schedule: [] };
  }, [standard, nonStandard, scheme, nonStandardText.price, nonStandardText.months]);

  const askScheme = repeatPurchase || !customer.paymentSchemeId;
  // Same-team rule: each picker follows the other party's team (owner instruction 2026-11-20).
  const referrerTeam = members.data?.find((item) => item.id === (referrer === "none" ? "" : referrer))?.branchId;
  const sellerTeam = members.data?.find((item) => item.id === seller)?.branchId;
  const sellerOptions = (members.data ?? [])
    .filter((item) => !referrerTeam || item.branchId === referrerTeam)
    .map((item) => ({ value: item.id, label: item.displayName }));
  const referrerOptions = [
    { value: "none", label: "No referrer" },
    ...(members.data ?? [])
      .filter((item) => !sellerTeam || item.branchId === sellerTeam)
      .map((item) => ({ value: item.id, label: item.displayName })),
  ];
  const options = (schemes.data ?? []).map((item) => ({
    value: item.id,
    label: item.commercialStatus === "configured" ? item.label : `${item.label} (terms pending)`,
    disabled: item.availability !== "available",
  }));

  const submit = async () => {
    setError(undefined);
    if (repeatPurchase && !isSeparatePurchase) {
      setError("Confirm that this is a separate purchase before creating its contract.");
      return;
    }
    try {
      const contract = await prepare.mutateAsync({
        customerId: customer.id,
        productCode,
        schemeId,
        customerAccepted: accepted,
        ...(nonStandard ? { nonStandardTerms } : {}),
        ...(repeatPurchase ? { newPurchaseRequestId, sellerMemberId: seller, referrerMemberId: referrer === "none" ? null : referrer, classification } : {}),
      });
      toast.success("Contract prepared as a draft.");
      onClose();
      router.push(contractHref(contract.id));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not prepare the contract.");
    }
  };

  return (
    <FormDialog open={open} title={repeatPurchase ? "New VIP Purchase" : "Prepare Contract"} description={`${customer.displayName} · ${product?.name ?? "No plan selected"}${!askScheme && scheme ? ` · ${scheme.label}` : ""}`} submitText={repeatPurchase ? "Create Purchase Contract" : "Prepare Contract"} pending={prepare.isPending} error={error} onClose={onClose} onSubmit={() => void submit()}>
      {repeatPurchase ? <SelectField label="VIP plan" required value={productCode} options={(products.data ?? []).filter((item) => item.status === "active").map((item) => ({ value: item.code, label: item.name }))} onChange={(value) => { setProductCode((products.data ?? []).find((item) => item.code === value)?.code); }} /> : null}
      {repeatPurchase ? <>
        <SelectField label="Closing seller" required value={seller} options={sellerOptions} onChange={(value) => { setSeller(value); if (referrer !== "none" && !sellerOptions.some((option) => option.value === referrer)) setReferrer("none"); }} />
        <SelectField label="Referrer" value={referrer} options={referrerOptions} onChange={(value) => { setReferrer(value); if (value !== "none" && seller && !referrerOptions.some((option) => option.value === seller)) setSeller(""); }} />
        <SelectField label="Contract type" required value={classification} options={[{ value: "S", label: "Standard" }, { value: "N", label: "Non-Standard" }]} onChange={(value) => setClassification(value === "N" ? "N" : "S")} />
      </> : null}
      {askScheme ? <SelectField label="Payment plan" required value={schemeId || undefined} options={options} onChange={setSchemeId} placeholder="Select a payment plan" /> : null}
      {nonStandard && standard && standard.errors.length === 0 && scheme ? <NonStandardTermsFields value={nonStandardText} onChange={setNonStandardText} standard={standard} reservationCentavos={scheme.reservationCentavos ?? 0} /> : null}
      {built && built.errors.length > 0 ? <InfoNote title="This Payment Plan Cannot Be Used Yet">{built.errors[0]}</InfoNote> : null}
      {built && built.schedule.length > 0 ? (
        <div className="tw:flex tw:flex-col tw:gap-2">
          <h3 className="tw:text-sm tw:font-semibold">Payment Schedule</h3>
          <p className="tw:text-sm tw:text-muted-foreground">Due dates are set from the reservation date. They can be changed on the contract while it is a Draft or Returned.</p>
          {built.schedule.map((line) => (
            <div key={line.seq} className="tw:flex tw:items-center tw:justify-between tw:gap-2">
              <span className="tw:text-sm">{line.label}</span>
              <Money value={line.amountCentavos} className="tw:text-sm" />
            </div>
          ))}
        </div>
      ) : null}
      <CheckboxField label="The customer has read and accepted the contract terms." checked={accepted} onChange={setAccepted} />
      {repeatPurchase ? <CheckboxField label="This is a separate purchase with its own contract and payments." checked={isSeparatePurchase} onChange={setIsSeparatePurchase} /> : null}
    </FormDialog>
  );
}
