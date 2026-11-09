"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCreatePaymentScheme, useUpdatePaymentScheme, useUpdateProduct } from "@/data/business-queries";
import type { PaymentScheme, VipProduct, VipTierCode } from "@/modules/vip/types";
import { CheckboxField, MoneyField, PointsField, SelectField, TextAreaField, TextField } from "@/shared/forms/modern";
import { FormGrid } from "@/shared/components/modern/form-layout";
import { centavosToInputText, formatIntegerInput, parsePercentToBasisPoints, parsePesoToCentavos } from "@/shared/lib/money";
import { FormDialog } from "@/shared/components/modern/form-dialog";

const TIERS: VipTierCode[] = ["B1", "S1", "G1"];

const toPesoText = centavosToInputText;
const toInt = (value: string) => {
  const plain = value.trim().replace(/,/g, "");
  return /^\d+$/.test(plain) ? Number(plain) : null;
};
const groupedInt = (value: number) => formatIntegerInput(String(value));

/** Edit a VIP product. Saving creates a new configuration version; finalized contracts keep their snapshot. */
export function ProductDialog({ product, onClose }: { product: VipProduct | null; onClose: () => void }) {
  if (!product) return null;
  return <ProductForm key={`${product.code}-${product.configVersion}`} product={product} onClose={onClose} />;
}

function ProductForm({ product, onClose }: { product: VipProduct; onClose: () => void }) {
  const update = useUpdateProduct();
  const [price, setPrice] = useState(toPesoText(product.priceCentavos));
  const [validity, setValidity] = useState(String(product.validityYears));
  const [cycles, setCycles] = useState(String(product.earningCycles));
  const [discount, setDiscount] = useState(String(product.vipDiscountPercent));
  const [perCycle, setPerCycle] = useState(groupedInt(product.pointsPerCycle));
  const [weekday, setWeekday] = useState(groupedInt(product.weekdayPointsPerCycle));
  const [weekend, setWeekend] = useState(groupedInt(product.weekendPointsPerCycle));
  const [lifetime, setLifetime] = useState(groupedInt(product.lifetimePoints));
  const [minSpend, setMinSpend] = useState(toPesoText(product.minSpendPerCycleCentavos));
  const [holders, setHolders] = useState(String(product.supplementaryHolders));
  const [status, setStatus] = useState<"active" | "retired">(product.status);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();

  const submit = async () => {
    const priceCentavos = parsePesoToCentavos(price);
    const minCentavos = parsePesoToCentavos(minSpend);
    const numbers = { validityYears: toInt(validity), earningCycles: toInt(cycles), vipDiscountPercent: toInt(discount), pointsPerCycle: toInt(perCycle), weekdayPointsPerCycle: toInt(weekday), weekendPointsPerCycle: toInt(weekend), lifetimePoints: toInt(lifetime), supplementaryHolders: toInt(holders) };
    if (priceCentavos === null || minCentavos === null || Object.values(numbers).some((value) => value === null)) {
      setError("Enter valid numbers in every field.");
      return;
    }
    if (!reason.trim()) {
      setError("A reason or management approval reference is required.");
      return;
    }
    try {
      await update.mutateAsync({ code: product.code, reason, input: { priceCentavos, minSpendPerCycleCentavos: minCentavos, status, ...(numbers as Record<string, number>) } });
      toast.success(`${product.name} updated to a new configuration version.`);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save.");
    }
  };

  return (
    <FormDialog open title={`Edit ${product.name}`} description="Saving creates a new configuration version. Contracts already finalized keep the terms they were signed with." submitText="Save new version" pending={update.isPending} error={error} onClose={onClose} onSubmit={() => void submit()}>
      <FormGrid>
        <MoneyField label="Price" required value={price} onChange={setPrice} hint={product.priceStatus === "conflict" ? "Source conflict: correcting the price needs management approval." : undefined} />
        <TextField label="Validity (years)" required inputMode="numeric" value={validity} onChange={setValidity} />
        <TextField label="Earning cycles" required inputMode="numeric" value={cycles} onChange={setCycles} />
        <TextField label="VIP discount (%)" required inputMode="numeric" value={discount} onChange={setDiscount} />
        <PointsField label="Points per cycle" required value={perCycle} onChange={setPerCycle} />
        <PointsField label="Weekday points per cycle" required value={weekday} onChange={setWeekday} />
        <PointsField label="Weekend points per cycle" required value={weekend} onChange={setWeekend} />
        <PointsField label="Lifetime points" required value={lifetime} onChange={setLifetime} />
        <MoneyField label="Minimum spend per cycle" required value={minSpend} onChange={setMinSpend} />
        <TextField label="Supplementary holders" required inputMode="numeric" value={holders} onChange={setHolders} />
        <SelectField label="Availability" value={status} options={[{ value: "active", label: "Active" }, { value: "retired", label: "Retired" }]} onChange={(value) => setStatus(value)} hint="Products are retired, never deleted." />
      </FormGrid>
      <TextAreaField label="Reason or approval reference" required value={reason} onChange={setReason} />
    </FormDialog>
  );
}

/** Create or edit a payment scheme. A scheme is usable only once its documented terms are complete. */
export function SchemeDialog({ open, scheme, onClose }: { open: boolean; scheme: PaymentScheme | null; onClose: () => void }) {
  if (!open) return null;
  return <SchemeForm key={scheme?.id ?? "new"} scheme={scheme} onClose={onClose} />;
}

function SchemeForm({ scheme, onClose }: { scheme: PaymentScheme | null; onClose: () => void }) {
  const create = useCreatePaymentScheme();
  const update = useUpdatePaymentScheme();
  const [label, setLabel] = useState(scheme?.label ?? "");
  const [code, setCode] = useState(scheme?.paymentCode ?? "");
  const [tiers, setTiers] = useState<VipTierCode[]>(scheme?.applicableTiers ?? []);
  const [reservation, setReservation] = useState(toPesoText(scheme?.reservationCentavos));
  const [count, setCount] = useState(scheme?.installmentCount ? String(scheme.installmentCount) : "");
  const [amounts, setAmounts] = useState<Record<string, string>>(() => Object.fromEntries(TIERS.map((tier) => [tier, toPesoText(scheme?.installmentCentavosByTier[tier])])));
  const [prices, setPrices] = useState<Record<string, string>>(() => Object.fromEntries(TIERS.map((tier) => [tier, toPesoText(scheme?.priceCentavosByTier[tier])])));
  const [tierCounts, setTierCounts] = useState<Record<string, string>>(() => Object.fromEntries(TIERS.map((tier) => [tier, scheme?.installmentCountByTier?.[tier] ? String(scheme.installmentCountByTier[tier]) : ""])));
  const [downPercent, setDownPercent] = useState(scheme?.downPaymentBasisPoints ? String(scheme.downPaymentBasisPoints / 100) : "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const pending = create.isPending || update.isPending;

  const submit = async () => {
    setError(undefined);
    const installmentCentavosByTier: Partial<Record<VipTierCode, number>> = {};
    const priceCentavosByTier: Partial<Record<VipTierCode, number>> = {};
    const installmentCountByTier: Partial<Record<VipTierCode, number>> = {};
    const downPaymentBasisPoints = downPercent.trim() ? parsePercentToBasisPoints(downPercent) : null;
    if (downPercent.trim() && downPaymentBasisPoints == null) return setError("Enter the down payment as a percentage, for example 40.");
    for (const tier of tiers) {
      const tierCount = tierCounts[tier] ? toInt(tierCounts[tier]) : null;
      if (tierCount) installmentCountByTier[tier] = tierCount;
      const parsed = amounts[tier] ? parsePesoToCentavos(amounts[tier]) : null;
      if (parsed) installmentCentavosByTier[tier] = parsed;
      const price = prices[tier] ? parsePesoToCentavos(prices[tier]) : null;
      if (price) priceCentavosByTier[tier] = price;
    }
    const input = {
      label: label.trim(),
      paymentCode: code.trim().toUpperCase() || null,
      applicableTiers: tiers,
      reservationCentavos: reservation ? parsePesoToCentavos(reservation) : null,
      installmentCount: count ? toInt(count) : null,
      installmentCentavosByTier,
      priceCentavosByTier,
      installmentCountByTier,
      downPaymentBasisPoints,
    };
    try {
      if (scheme) {
        if (!reason.trim()) throw new Error("A reason or management approval reference is required.");
        await update.mutateAsync({ id: scheme.id, input, reason });
      } else {
        await create.mutateAsync(input);
      }
      toast.success(scheme ? "Scheme updated." : "Scheme created.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save.");
    }
  };

  return (
    <FormDialog open title={scheme ? `Edit ${scheme.label}` : "New payment scheme"} description="Only enter terms taken from an approved document. A scheme with incomplete terms stays unavailable." submitText="Save scheme" pending={pending} error={error} onClose={onClose} onSubmit={() => void submit()}>
      <FormGrid>
        <TextField label="Scheme name" required value={label} onChange={setLabel} />
        <TextField label="Card ID payment code" value={code} onChange={setCode} hint="For example C01 or T04." maxLength={3} />
        <MoneyField label="Reservation fee" value={reservation} onChange={setReservation} />
        <TextField label="Number of monthly installments" inputMode="numeric" value={count} onChange={setCount} hint="Leave blank when the count differs by tier." />
        <TextField label="Down payment (% of price)" inputMode="decimal" value={downPercent} onChange={setDownPercent} hint="Includes the reservation fee. Leave blank when there is none." />
      </FormGrid>
      <fieldset className="tw:flex tw:flex-col tw:gap-2">
        <legend className="tw:text-sm tw:font-medium">Applicable tiers, package price and monthly installment</legend>
        {TIERS.map((tier) => (
          <div key={tier} className="tw:grid tw:grid-cols-1 tw:gap-2 tw:sm:grid-cols-2 tw:lg:grid-cols-4 tw:sm:items-end">
            <CheckboxField label={tier} checked={tiers.includes(tier)} onChange={(checked) => setTiers((current) => (checked ? [...current, tier] : current.filter((item) => item !== tier)))} />
            {tiers.includes(tier) ? <MoneyField label={`${tier} package price`} hint="Leave blank to use the catalog price." value={prices[tier] ?? ""} onChange={(value) => setPrices((current) => ({ ...current, [tier]: value }))} /> : null}
            {tiers.includes(tier) ? <MoneyField label={`${tier} monthly installment`} value={amounts[tier] ?? ""} onChange={(value) => setAmounts((current) => ({ ...current, [tier]: value }))} /> : null}
            {tiers.includes(tier) ? <TextField label={`${tier} number of installments`} inputMode="numeric" hint="Only when it differs from the scheme count." value={tierCounts[tier] ?? ""} onChange={(value) => setTierCounts((current) => ({ ...current, [tier]: value }))} /> : null}
          </div>
        ))}
      </fieldset>
      {scheme ? <TextAreaField label="Reason or approval reference" required value={reason} onChange={setReason} /> : null}
    </FormDialog>
  );
}

