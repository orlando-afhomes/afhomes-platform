"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCreatePaymentScheme, useCreateProduct, useUpdatePaymentScheme, useUpdateProduct, useVipProducts } from "@/data/business-queries";
import { useTierLevels } from "@/data/tier-level-queries";
import { productCodeError } from "@/modules/vip/rules";
import { tierLevelOptions } from "@/modules/vip/tier-levels";
import { configurationTierOptions } from "@/modules/vip/tier-options";
import type { PaymentScheme, VipProduct, VipTierCode } from "@/modules/vip/types";
import { manilaToday } from "@/modules/accreditation/dates";
import { formatDate } from "@/shared/lib/format-date";
import { CheckboxField, MoneyField, PointsField, ProfilePhotoUploader, SelectField, TextAreaField, TextField } from "@/shared/forms/modern";
import { FormGrid } from "@/shared/components/modern/form-layout";
import { centavosToInputText, formatIntegerInput, parsePercentToBasisPoints, parsePesoToCentavos } from "@/shared/lib/money";
import { readFileAsDataUrl } from "@/shared/lib/file-data";
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
 * Edit a VIP product (saving records a new configuration version; finalized contracts keep their
 * snapshot), or, with `creating`, add a new one at version 1.
 */
export function ProductDialog({ product, creating = false, onClose }: { product: VipProduct | null; creating?: boolean; onClose: () => void }) {
  if (creating) return <ProductForm key="new-product" product={null} onClose={onClose} />;
  if (!product) return null;
  return <ProductForm key={`${product.code}-${product.configVersion}`} product={product} onClose={onClose} />;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function ProductForm({ product, onClose }: { product: VipProduct | null; onClose: () => void }) {
  const update = useUpdateProduct();
  const create = useCreateProduct();
  const products = useVipProducts();
  const levels = useTierLevels();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [chosenLevelId, setChosenLevelId] = useState(product?.tierLevelId ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [benefits, setBenefits] = useState(product?.benefitsSummary ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(product?.imageUrl ?? null);
  const [imageName, setImageName] = useState<string | null>(product?.imageFileName ?? null);
  const [imageError, setImageError] = useState<string | null>(null);
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
  const [listed, setListed] = useState(product?.publiclyListed ?? false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();

  // Active levels, plus the level this product already has (a deactivated one stays visible on it).
  const levelOptions = tierLevelOptions(levels.data ?? [], [product?.tierLevelId]);
  const tierLevelId = chosenLevelId || levelOptions[0]?.value || "";
  const existingCodes = (products.data ?? []).map((item) => item.code);
  const codeIssue = !product && code.length === 2 ? productCodeError(code, existingCodes) : null;

  const acceptImage = (file: File) => {
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setImageError("The image must be a JPEG, PNG or WebP file of 5MB or less.");
      return;
    }
    setImageError(null);
    // Stored as a data URL in the browser-memory mock store, so it survives navigation.
    readFileAsDataUrl(file).then(
      (dataUrl) => {
        setImageUrl(dataUrl);
        setImageName(file.name);
      },
      () => setImageError("Could not read the selected image. Choose the file again."),
    );
  };

  const submit = async () => {
    const priceCentavos = parsePesoToCentavos(price);
    const minCentavos = parsePesoToCentavos(minSpend);
    const numbers = { validityYears: toInt(validity), earningCycles: toInt(cycles), vipDiscountPercent: toInt(discount), pointsPerCycle: toInt(perCycle), weekdayPointsPerCycle: toInt(weekday), weekendPointsPerCycle: toInt(weekend), lifetimePoints: toInt(lifetime), supplementaryHolders: toInt(holders) };
    if (!product) {
      const problem = productCodeError(code, existingCodes);
      if (problem) return setError(problem);
    }
    if (!tierLevelId) return setError("Choose a card level. Add one in the Card Levels tab if the list is empty.");
    if (priceCentavos === null || minCentavos === null || Object.values(numbers).some((value) => value === null)) {
      setError("Enter valid numbers in every field.");
      return;
    }
    if (!reason.trim()) {
      setError("A reason or management approval reference is required.");
      return;
    }
    const text = { description: description.trim() || null, benefitsSummary: benefits.trim() || null };
    try {
      if (product) {
        // Send only what differs, so an untouched optional field never counts as a change.
        const optional = {
          ...(tierLevelId !== product.tierLevelId ? { tierLevelId } : {}),
          ...(text.description !== (product.description ?? null) ? { description: text.description } : {}),
          ...(text.benefitsSummary !== (product.benefitsSummary ?? null) ? { benefitsSummary: text.benefitsSummary } : {}),
          ...(imageUrl !== (product.imageUrl ?? null) ? { imageUrl, imageFileName: imageUrl ? imageName : null } : {}),
          ...(listed !== (product.publiclyListed ?? false) ? { publiclyListed: listed } : {}),
        };
        await update.mutateAsync({ code: product.code, reason, input: { priceCentavos, minSpendPerCycleCentavos: minCentavos, status, ...optional, ...(numbers as Record<string, number>) } });
        toast.success(`${product.name} updated on ${formatDate(manilaToday())}.`);
      } else {
        const input = { code: code.trim().toUpperCase(), name, tierLevelId, ...text, imageUrl, imageFileName: imageUrl ? imageName : null, publiclyListed: listed, priceCentavos, minSpendPerCycleCentavos: minCentavos, ...(numbers as Record<keyof typeof numbers, number>) };
        await create.mutateAsync({ reason, input });
        toast.success(`${name.trim()} added to the catalog as a draft.`);
      }
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save.");
    }
  };

  return (
    <FormDialog open title={product ? `Edit ${product.name}` : "New Product"} description={product ? "Signed contracts keep their original terms." : "New products start as drafts. A Super Administrator approves them before sale or public listing."} submitText={product ? "Save Changes" : "Create Product"} size="lg" pending={update.isPending || create.isPending} error={error} onClose={onClose} onSubmit={() => void submit()}>
      <ProfilePhotoUploader
        label="Product image"
        document
        value={imageUrl}
        fileName={imageName}
        onSelect={acceptImage}
        onClear={() => {
          setImageUrl(null);
          setImageName(null);
        }}
        error={imageError}
        ariaLabel="Upload product image"
        uploadLabel="Upload image"
        previewAlt="Product image preview"
        hint="JPEG, PNG or WebP, up to 5MB. Optional."
      />
      <FormGrid>
        {product ? null : (
          <>
            <TextField label="Product code" required value={code} onChange={(value) => { setCode(value.toUpperCase()); setError(undefined); }} maxLength={2} error={codeIssue ?? undefined} hint="One letter and one digit, for example B3. It cannot be changed later." />
            <TextField label="Product name" required value={name} onChange={setName} />
          </>
        )}
        <SelectField label="Card level" required value={tierLevelId || undefined} options={levelOptions} onChange={setChosenLevelId} placeholder="Choose a card level" hint="Card levels are managed in the Card Levels tab." />
        <MoneyField label="Price" required value={price} onChange={setPrice} hint={product?.priceStatus === "conflict" ? "Source conflict: correcting the price needs management approval." : undefined} />
        <TextField label="Validity (years)" required inputMode="numeric" value={validity} onChange={setValidity} />
        <TextField label="Earning cycles" required inputMode="numeric" value={cycles} onChange={setCycles} />
        <TextField label="VIP discount (%)" required inputMode="numeric" value={discount} onChange={setDiscount} />
        <PointsField label="Points per cycle" required value={perCycle} onChange={setPerCycle} />
        <PointsField label="Weekday points per cycle" required value={weekday} onChange={setWeekday} />
        <PointsField label="Weekend points per cycle" required value={weekend} onChange={setWeekend} />
        <PointsField label="Lifetime points" required value={lifetime} onChange={setLifetime} />
        <MoneyField label="Minimum spend per cycle" required value={minSpend} onChange={setMinSpend} />
        <TextField label="Extra cardholders" required inputMode="numeric" value={holders} onChange={setHolders} />
        {product ? <SelectField label="Availability" value={status} options={[{ value: "active", label: "Active" }, { value: "retired", label: "Retired" }]} onChange={(value) => setStatus(value)} hint="A product that has been used can only be retired." /> : null}
      </FormGrid>
      <CheckboxField label="Show on the public website" checked={listed} onChange={setListed} />
      <p className="tw:text-sm tw:text-muted-foreground">Only approved, active products appear on the public VIP page.</p>
      <TextAreaField label="Description" value={description} onChange={setDescription} hint="Optional. Up to 500 characters." />
      <TextAreaField label="Other benefits" value={benefits} onChange={setBenefits} hint={product?.approvalStatus === "approved" ? "Required for an approved product; its public card shows these benefits." : "Optional. Benefits beyond the discount and Stay Points above, in plain words."} />
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
  // Active catalog products (drafts included, because a new product needs a payment plan before approval),
  // plus any tier this scheme already carries (a retired one stays editable).
  const planOptions = configurationTierOptions(products.data, scheme?.applicableTiers);
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
      toast.success(scheme ? "Payment plan updated." : "Payment plan created.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save.");
    }
  };

  return (
    <FormDialog open title={scheme ? `Edit ${scheme.label}` : "New Payment Plan"} description="A payment plan with incomplete terms stays unavailable." submitText="Save Payment Plan" size="lg" pending={pending} error={error} onClose={onClose} onSubmit={() => void submit()}>
      <FormGrid>
        <TextField label="Payment plan name" required value={label} onChange={setLabel} hint="The name sellers see when choosing a plan." />
        <TextField label="Payment code (part of the VIP Number)" value={code} onChange={setCode} hint="For example C01 or T04." maxLength={3} />
        <MoneyField label="Reservation fee" value={reservation} onChange={setReservation} hint="Paid first and counted in the total." />
        <TextField label="Number of installments" inputMode="numeric" value={count} onChange={setCount} hint="Leave blank when the count differs by card level." />
        <TextField label="Down payment (% of price)" inputMode="decimal" value={downPercent} onChange={setDownPercent} hint="Includes the reservation fee. Leave blank when there is none." />
      </FormGrid>
      {isMove ? (
        <fieldset className="tw:flex tw:flex-col tw:gap-2">
          <legend className="tw:text-sm tw:font-medium">Payment codes per card level</legend>
          <div className="tw:grid tw:grid-cols-1 tw:gap-2 tw:sm:grid-cols-3">
            {planOptions.map(({ value: tier, label: name }) => (
              <TextField key={tier} label={`${name} payment code`} value={tierCodes[tier] ?? ""} onChange={(value) => setTierCodes((current) => ({ ...current, [tier]: value }))} hint="For example T04." maxLength={3} />
            ))}
          </div>
        </fieldset>
      ) : null}
      <fieldset className="tw:flex tw:flex-col tw:gap-3">
        <legend className="tw:mb-1 tw:text-sm tw:font-medium">Card levels this payment plan applies to</legend>
        {planOptions.map(({ value: tier, label: name }) => {
          const selected = tiers.includes(tier);
          return (
            <div key={tier} role="group" aria-label={`${name} terms`} className={`tw:flex tw:flex-col tw:gap-3 tw:rounded-lg tw:border tw:p-3 ${selected ? "tw:border-primary/40 tw:bg-primary/5" : "tw:border-border"}`}>
              <CheckboxField label={name} checked={selected} onChange={(checked) => setTiers((current) => (checked ? [...current, tier] : current.filter((item) => item !== tier)))} />
              {selected ? (
                <div className="tw:grid tw:grid-cols-1 tw:gap-3 tw:sm:grid-cols-3 tw:sm:items-start">
                  <MoneyField label="Package price" hint="Leave blank to use the catalog price." value={prices[tier] ?? ""} onChange={(value) => setPrices((current) => ({ ...current, [tier]: value }))} />
                  <MoneyField label="Monthly installment" hint="Amount paid each month." value={amounts[tier] ?? ""} onChange={(value) => setAmounts((current) => ({ ...current, [tier]: value }))} />
                  <TextField label="Number of installments" inputMode="numeric" hint="Only when different from the payment plan." value={tierCounts[tier] ?? ""} onChange={(value) => setTierCounts((current) => ({ ...current, [tier]: value }))} />
                </div>
              ) : null}
            </div>
          );
        })}
      </fieldset>
      {scheme ? <TextAreaField label="Reason or approval reference" required value={reason} onChange={setReason} /> : null}
    </FormDialog>
  );
}

