"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCreatePaymentScheme, useCreateProduct, useUpdatePaymentScheme, useUpdateProduct, useVipProducts } from "@/data/business-queries";
import { PRODUCT_TIER_LEVELS, type PaymentScheme, type VipProduct, type VipTierCode } from "@/modules/vip/types";
import { CheckboxField, MoneyField, PointsField, SelectField, TextAreaField, TextField } from "@/shared/forms/modern";
import { FormGrid } from "@/shared/components/modern/form-layout";
import { centavosToInputText, formatIntegerInput, parsePercentToBasisPoints, parsePesoToCentavos } from "@/shared/lib/money";
import { FormDialog } from "@/shared/components/modern/form-dialog";

/** Per-tier Card ID payment codes for move-category schemes (doc 06 §6.3 mapping). */
type SchemeTierCodes = Partial<Record<VipTierCode, string>>;
type SchemeWithTierCodes = PaymentScheme & { paymentCodeByTier?: SchemeTierCodes };

const toPesoText = centavosToInputText;
const toInt = (value: string) => {
  const plain = value.trim().replace(/,/g, "");
  return /^\d+$/.test(plain) ? Number(plain) : null;
};
const groupedInt = (value: number) => formatIntegerInput(String(value));

/**
 * Edit a VIP product (saving creates a new configuration version; finalized contracts keep their
 * snapshot), or, with `creating`, add a new one at version 1.
 */
export function ProductDialog({ product, creating = false, onClose }: { product: VipProduct | null; creating?: boolean; onClose: () => void }) {
  if (creating) return <ProductForm key="new-product" product={null} onClose={onClose} />;
  if (!product) return null;
  return <ProductForm key={`${product.code}-${product.configVersion}`} product={product} onClose={onClose} />;
}

function ProductForm({ product, onClose }: { product: VipProduct | null; onClose: () => void }) {
  const update = useUpdateProduct();
  const create = useCreateProduct();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [tier, setTier] = useState<VipProduct["tier"]>("Bronze");
  const [price, setPrice] = useState(product ? toPesoText(product.priceCentavos) : "");
  const [validity, setValidity] = useState(product ? String(product.validityYears) : "");
  const [cycles, setCycles] = useState(product ? String(product.earningCycles) : "");
  const [discount, setDiscount] = useState(product ? String(product.vipDiscountPercent) : "");
  const [perCycle, setPerCycle] = useState(product ? groupedInt(product.pointsPerCycle) : "");
  const [weekday, setWeekday] = useState(product ? groupedInt(product.weekdayPointsPerCycle) : "");
  const [weekend, setWeekend] = useState(product ? groupedInt(product.weekendPointsPerCycle) : "");
  const [lifetime, setLifetime] = useState(product ? groupedInt(product.lifetimePoints) : "");
  const [minSpend, setMinSpend] = useState(product ? toPesoText(product.minSpendPerCycleCentavos) : "");
  const [holders, setHolders] = useState(product ? String(product.supplementaryHolders) : "0");
  const [status, setStatus] = useState<"active" | "retired">(product?.status ?? "active");
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
      if (product) {
        await update.mutateAsync({ code: product.code, reason, input: { priceCentavos, minSpendPerCycleCentavos: minCentavos, status, ...(numbers as Record<string, number>) } });
        toast.success(`${product.name} updated to a new configuration version.`);
      } else {
        const input = { code: code.trim().toUpperCase(), name, tier, priceCentavos, minSpendPerCycleCentavos: minCentavos, ...(numbers as Record<keyof typeof numbers, number>) };
        await create.mutateAsync({ reason, input });
        toast.success(`${name.trim()} added to the catalog.`);
      }
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save.");
    }
  };

  return (
    <FormDialog open title={product ? `Edit ${product.name}` : "New product"} description={product ? "Saving creates a new configuration version. Contracts already finalized keep the terms they were signed with." : "Enter terms taken from an approved document. The code is permanent and appears in every VIP Number."} submitText={product ? "Save new version" : "Create product"} pending={update.isPending || create.isPending} error={error} onClose={onClose} onSubmit={() => void submit()}>
      <FormGrid>
        {product ? null : (
          <>
            <TextField label="Product code" required value={code} onChange={(value) => setCode(value.toUpperCase())} maxLength={2} hint="One letter and one digit, for example B3. It cannot be changed later." />
            <TextField label="Product name" required value={name} onChange={setName} />
            <SelectField label="Tier level" required value={tier} options={PRODUCT_TIER_LEVELS.map((level) => ({ value: level, label: level }))} onChange={(value) => setTier(value)} />
          </>
        )}
        <MoneyField label="Price" required value={price} onChange={setPrice} hint={product?.priceStatus === "conflict" ? "Source conflict: correcting the price needs management approval." : undefined} />
        <TextField label="Validity (years)" required inputMode="numeric" value={validity} onChange={setValidity} />
        <TextField label="Earning cycles" required inputMode="numeric" value={cycles} onChange={setCycles} />
        <TextField label="VIP discount (%)" required inputMode="numeric" value={discount} onChange={setDiscount} />
        <PointsField label="Points per cycle" required value={perCycle} onChange={setPerCycle} />
        <PointsField label="Weekday points per cycle" required value={weekday} onChange={setWeekday} />
        <PointsField label="Weekend points per cycle" required value={weekend} onChange={setWeekend} />
        <PointsField label="Lifetime points" required value={lifetime} onChange={setLifetime} />
        <MoneyField label="Minimum spend per cycle" required value={minSpend} onChange={setMinSpend} />
        <TextField label="Supplementary holders" required inputMode="numeric" value={holders} onChange={setHolders} />
        {product ? <SelectField label="Availability" value={status} options={[{ value: "active", label: "Active" }, { value: "retired", label: "Retired" }]} onChange={(value) => setStatus(value)} hint="A product that has been used can only be retired." /> : null}
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
  const [amounts, setAmounts] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(scheme?.installmentCentavosByTier ?? {}).map(([tier, value]) => [tier, toPesoText(value)])));
  const [prices, setPrices] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(scheme?.priceCentavosByTier ?? {}).map(([tier, value]) => [tier, toPesoText(value)])));
  const [tierCounts, setTierCounts] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(scheme?.installmentCountByTier ?? {}).map(([tier, value]) => [tier, value ? String(value) : ""])));
  const [downPercent, setDownPercent] = useState(scheme?.downPaymentBasisPoints ? String(scheme.downPaymentBasisPoints / 100) : "");
  const [tierCodes, setTierCodes] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries((scheme as SchemeWithTierCodes | null)?.paymentCodeByTier ?? {}).map(([tier, value]) => [tier, value ?? ""])));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const products = useVipProducts();
  // Active catalog products, plus any tier this scheme already carries (a retired one stays editable).
  const tierCodesList = (products.data ?? []).filter((item) => item.status === "active" || scheme?.applicableTiers.includes(item.code)).map((item) => item.code);
  const pending = create.isPending || update.isPending;
  /** The form has no category control: new schemes default to non-move (hidden), edits mirror the stored category. */
  const isMove = scheme?.category === "move";

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
    const paymentCodeByTier: SchemeTierCodes = {};
    for (const tier of tiers) {
      const entry = (tierCodes[tier] ?? "").trim().toUpperCase();
      if (entry) paymentCodeByTier[tier] = entry;
    }
    const input = {
      label: label.trim(),
      paymentCode: code.trim().toUpperCase() || null,
      paymentCodeByTier,
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
      {isMove ? (
        <fieldset className="tw:flex tw:flex-col tw:gap-2">
          <legend className="tw:text-sm tw:font-medium">Per-tier Card ID codes</legend>
          <div className="tw:grid tw:grid-cols-1 tw:gap-2 tw:sm:grid-cols-3">
            {tierCodesList.map((tier) => (
              <TextField key={tier} label={`${tier} Card ID code`} value={tierCodes[tier] ?? ""} onChange={(value) => setTierCodes((current) => ({ ...current, [tier]: value }))} hint="For example T04." maxLength={3} />
            ))}
          </div>
        </fieldset>
      ) : null}
      <fieldset className="tw:flex tw:flex-col tw:gap-2">
        <legend className="tw:text-sm tw:font-medium">Applicable tiers, package price and monthly installment</legend>
        {tierCodesList.map((tier) => (
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

