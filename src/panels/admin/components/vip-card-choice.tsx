"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { CalendarDays, Check, Database, Tag, Users } from "lucide-react";
import type { PaymentScheme, VipProduct, VipTierCode } from "@/modules/vip/types";
import { fromPriceFor } from "@/modules/vip/pricing";
import { formatPeso } from "@/shared/lib/money";
import { cn } from "@/shared/lib/utils";
import { RadioGroup } from "@/shared/ui/radio-group";
import { PlanCardImage } from "./customer-plan-summary";

/** Always-visible radio control: an empty ring that fills with a check when selected. */
function VipCardRadioMark() {
  return (
    <span
      aria-hidden="true"
      className="vip-card-choice__radio tw:flex tw:size-5 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:border-2 tw:border-(--color-border-strong) tw:bg-card tw:transition-colors tw:group-data-checked/vip-card:border-primary tw:group-data-checked/vip-card:bg-primary"
    >
      <RadioPrimitive.Indicator className="tw:flex tw:items-center tw:justify-center tw:text-primary-foreground">
        <Check className="tw:size-3" strokeWidth={3} />
      </RadioPrimitive.Indicator>
    </span>
  );
}

function VipCardFact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <span className="vip-card-choice__fact tw:flex tw:items-center tw:gap-2 tw:rounded-md tw:bg-muted/60 tw:px-3 tw:py-1.5 tw:text-[13px] tw:leading-snug">
      <span aria-hidden="true" className="tw:flex tw:shrink-0 tw:text-muted-foreground">
        {icon}
      </span>
      <span className="tw:flex-1 tw:text-muted-foreground">{label}</span>
      <span className="tw:font-medium tw:text-foreground">{value}</span>
    </span>
  );
}

export function VipCardChoiceCard({ product, fromPrice, invalid }: { product: VipProduct; fromPrice?: number | null; invalid?: boolean }) {
  const supplementary =
    product.supplementaryHolders > 0
      ? `${product.supplementaryHolders} supplementary holder${product.supplementaryHolders === 1 ? "" : "s"}`
      : "No supplementary holder";
  return (
    <RadioPrimitive.Root
      value={product.code}
      data-slot="vip-card-choice-card"
      className={cn(
        "vip-card-choice__card tw:group/vip-card tw:relative tw:flex tw:h-full tw:cursor-pointer tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:bg-card tw:p-4 tw:text-left tw:text-card-foreground tw:shadow-(--shadow-soft) tw:outline-none",
        "tw:transition-[border-color,box-shadow,background-color,transform] tw:duration-150 tw:hover:-translate-y-px tw:hover:border-primary/50 tw:hover:shadow-(--shadow-raised) tw:active:translate-y-0 tw:active:scale-[0.99] tw:motion-reduce:transition-none tw:motion-reduce:hover:translate-y-0 tw:motion-reduce:active:scale-100",
        "tw:focus-visible:border-ring tw:focus-visible:ring-3 tw:focus-visible:ring-ring/40 tw:focus-visible:ring-offset-2 tw:focus-visible:ring-offset-background",
        invalid ? "tw:border-destructive tw:ring-1 tw:ring-destructive/30" : "tw:border-border",
        "tw:data-checked:border-primary tw:data-checked:bg-primary/5 tw:data-checked:shadow-(--shadow-selected) tw:data-checked:ring-1 tw:data-checked:ring-primary",
      )}
    >
      <span className="vip-card-choice__art tw:block tw:overflow-hidden tw:rounded-lg">
        <PlanCardImage code={product.code} priority />
      </span>
      <span className="vip-card-choice__title-row tw:flex tw:items-start tw:gap-3">
        <span className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-0.5">
          <span className="tw:text-base tw:font-semibold tw:leading-tight">
            {product.name} ({product.code})
          </span>
          <span className="tw:text-sm tw:leading-snug tw:text-muted-foreground">{product.tier} tier</span>
        </span>
        <VipCardRadioMark />
      </span>
      <span className="vip-card-choice__price tw:block tw:rounded-lg tw:bg-muted tw:px-3 tw:py-2 tw:text-xl tw:font-bold tw:tracking-tight tw:text-foreground tw:transition-colors tw:group-data-checked/vip-card:text-primary">
        {fromPrice != null ? `From ${formatPeso(fromPrice)}` : formatPeso(product.priceCentavos)}
      </span>
      <span className="vip-card-choice__facts tw:flex tw:flex-col tw:gap-1.5">
        <VipCardFact icon={<CalendarDays className="tw:size-4" />} label="Validity" value={`${product.validityYears} ${product.validityYears === 1 ? "year" : "years"}`} />
        <VipCardFact icon={<Database className="tw:size-4" />} label="Stay Points" value={product.lifetimePoints.toLocaleString("en-PH")} />
        <VipCardFact icon={<Tag className="tw:size-4" />} label="VIP Discount" value={`${product.vipDiscountPercent}%`} />
        <VipCardFact icon={<Users className="tw:size-4" />} label="Supplementary Holder" value={supplementary} />
      </span>
    </RadioPrimitive.Root>
  );
}

export function VipCardChoiceGrid({
  products,
  schemes,
  value,
  onChange,
  invalid,
}: {
  products: ReadonlyArray<VipProduct>;
  schemes?: ReadonlyArray<PaymentScheme>;
  value: VipTierCode | "";
  onChange: (code: VipTierCode) => void;
  invalid?: boolean;
}) {
  const priced = schemes != null && schemes.length > 0 ? schemes : null;
  return (
    <RadioGroup
      aria-label="VIP card"
      aria-invalid={invalid || undefined}
      value={value || ""}
      onValueChange={(next) => {
        if (next) onChange(next as VipTierCode);
      }}
      className="vip-card-choice tw:grid tw:grid-cols-1 tw:gap-4 tw:lg:grid-cols-3"
    >
      {products.map((product) => (
        <VipCardChoiceCard key={product.code} product={product} fromPrice={priced ? fromPriceFor(product, priced) : null} invalid={invalid} />
      ))}
    </RadioGroup>
  );
}
