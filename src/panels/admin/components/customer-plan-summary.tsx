"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeftRight, Banknote, CalendarClock, CalendarDays, ChevronRight, Database, Pencil, Tag, TriangleAlert, Users } from "lucide-react";
import { applicablePriceStatus, displayPriceFor } from "@/modules/vip/pricing";
import type { PaymentScheme, VipProduct, VipTierCode } from "@/modules/vip/types";
import { formatPeso } from "@/shared/lib/money";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";

const PLAN_IMAGES: Record<VipTierCode, { src: string; alt: string }> = {
  B1: { src: "/images/cards/bronze.webp", alt: "Bronze VIP privilege card" },
  S1: { src: "/images/cards/silver.webp", alt: "Silver VIP privilege card" },
  G1: { src: "/images/cards/gold.webp", alt: "Gold VIP privilege card" },
};

/**
 * The card art has a transparent margin of about 11%; scaling crops it so the card fills its frame.
 * Pass `priority` only for card art that is on the first screen, so it is fetched eagerly
 * instead of being reported as a lazy Largest Contentful Paint candidate.
 */
export function PlanCardImage({ code, className, priority = false }: { code: VipTierCode; className?: string; priority?: boolean }) {
  const image = PLAN_IMAGES[code];
  return (
    <span className={cn("customer-plan__image tw:block tw:aspect-[1920/1198] tw:overflow-hidden", className)}>
      <Image
        src={image.src}
        alt={image.alt}
        width={1920}
        height={1198}
        loading={priority ? "eager" : undefined}
        fetchPriority={priority ? "high" : undefined}
        className="tw:size-full tw:scale-[1.27] tw:object-contain"
      />
    </span>
  );
}

const SCHEME_ICONS = { cash: Banknote, installment: CalendarClock, move: ArrowLeftRight };

/** Price, key facts, and the Gold price-conflict note for a VIP card. */
export function PlanFacts({ product, scheme, onPlanChange }: { product: VipProduct; scheme?: PaymentScheme; onPlanChange?: () => void }) {
  const SchemeIcon = scheme ? SCHEME_ICONS[scheme.category] : null;
  return (
    <span className="tw:flex tw:flex-col tw:gap-2">
      <span className="tw:text-xl tw:font-semibold tw:text-primary">{formatPeso(displayPriceFor(product, scheme))}</span>
      <span className="tw:grid tw:grid-cols-2 tw:gap-x-3 tw:gap-y-2">
        <span className="tw:flex tw:items-start tw:gap-2">
          <CalendarDays className="tw:mt-0.5 tw:size-4 tw:shrink-0 tw:text-primary" aria-hidden="true" />
          <span className="tw:flex tw:flex-col">
            <span className="tw:text-sm tw:font-semibold tw:text-foreground">{product.validityYears} years</span>
            <span className="tw:text-xs tw:text-muted-foreground">Validity</span>
          </span>
        </span>
        <span className="tw:flex tw:items-start tw:gap-2">
          <Database className="tw:mt-0.5 tw:size-4 tw:shrink-0 tw:text-primary" aria-hidden="true" />
          <span className="tw:flex tw:flex-col">
            <span className="tw:text-sm tw:font-semibold tw:text-foreground">{product.lifetimePoints.toLocaleString("en-PH")}</span>
            <span className="tw:text-xs tw:text-muted-foreground">Stay points</span>
          </span>
        </span>
        <span className="tw:flex tw:items-start tw:gap-2">
          <Tag className="tw:mt-0.5 tw:size-4 tw:shrink-0 tw:text-primary" aria-hidden="true" />
          <span className="tw:flex tw:flex-col">
            <span className="tw:text-sm tw:font-semibold tw:text-foreground">{product.vipDiscountPercent}%</span>
            <span className="tw:text-xs tw:text-muted-foreground">VIP discount</span>
          </span>
        </span>
        <span className="tw:flex tw:items-start tw:gap-2">
          <Users className="tw:mt-0.5 tw:size-4 tw:shrink-0 tw:text-primary" aria-hidden="true" />
          <span className="tw:flex tw:flex-col">
            <span className="tw:text-sm tw:font-semibold tw:text-foreground">
              {product.supplementaryHolders > 0 ? product.supplementaryHolders : "—"}
            </span>
            <span className="tw:text-xs tw:text-muted-foreground">Supplementary</span>
          </span>
        </span>
      </span>
      {scheme && SchemeIcon ? (
        <span className="tw:flex tw:flex-col tw:gap-1">
          <span className="tw:text-xs tw:text-muted-foreground">Payment scheme</span>
          <span className="tw:flex tw:items-center tw:gap-2 tw:rounded-lg tw:bg-muted tw:px-3 tw:py-2 tw:text-sm">
          <span aria-hidden="true" className="tw:flex tw:text-muted-foreground">
            <SchemeIcon aria-hidden="true" className="tw:size-4" />
          </span>
          <span className="tw:flex-1 tw:font-medium">{scheme.label}</span>
          {onPlanChange ? (
            <button
              type="button"
              onClick={onPlanChange}
              aria-label="Change payment scheme"
              className="tw:flex tw:text-muted-foreground tw:transition-colors hover:tw:text-foreground"
            >
              <ChevronRight aria-hidden="true" className="tw:size-4" />
            </button>
          ) : (
            <span className="tw:flex tw:text-muted-foreground">
              <ChevronRight aria-hidden="true" className="tw:size-4" />
            </span>
          )}
          </span>
        </span>
      ) : null}
      {applicablePriceStatus(product, scheme) === "conflict" ? (
        <span className="tw:flex tw:items-start tw:gap-1.5 tw:rounded-md tw:bg-warning/10 tw:p-2 tw:text-xs">
          <TriangleAlert aria-hidden="true" className="tw:mt-0.5 tw:size-3.5 tw:shrink-0" />
          <span>Price under review: the contract sources disagree. Contract finalization stays on hold until the owner decides.</span>
        </span>
      ) : null}
    </span>
  );
}

/**
 * The chosen VIP card, always in view while the form is filled in.
 * From 1024px it is a sticky panel beside the form; below that it is a compact
 * bar under the header with a Details sheet, so the form keeps the screen.
 */
export function PlanSummary({ product, scheme, onChange, onPlanChange }: { product: VipProduct; scheme?: PaymentScheme; onChange: () => void; onPlanChange?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside aria-label="Selected VIP card" className="customer-plan tw:hidden tw:lg:sticky tw:lg:top-20 tw:lg:block tw:lg:self-start">
        <Card className="tw:gap-4 tw:p-4">
          <PlanCardImage code={product.code} priority />
          <div className="tw:flex tw:flex-col tw:gap-0.5">
            <h2 className="tw:text-base tw:font-semibold">{product.name} ({product.code})</h2>
            <span className="tw:inline-flex tw:self-start tw:rounded-full tw:bg-secondary tw:px-2 tw:py-0.5 tw:text-xs tw:font-medium tw:text-secondary-foreground">{product.tier} tier</span>
          </div>
          <PlanFacts product={product} scheme={scheme} onPlanChange={onPlanChange} />
          <Button type="button" variant="outline" size="sm" onClick={onChange}>
            <Pencil aria-hidden="true" className="tw:size-3.5" />
            Change card
          </Button>
        </Card>
      </aside>

      <div className="customer-plan-bar tw:sticky tw:top-16 tw:z-10 tw:-mx-4 tw:border-b tw:border-border tw:bg-background tw:px-4 tw:py-2 tw:lg:hidden">
        <div className="tw:flex tw:items-center tw:gap-3">
          <PlanCardImage code={product.code} className="tw:w-14 tw:shrink-0" />
          <div className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col">
            <span className="tw:truncate tw:text-sm tw:font-semibold">{product.name} ({product.code})</span>
            <span className="tw:truncate tw:text-xs tw:text-muted-foreground">
              {formatPeso(displayPriceFor(product, scheme))}
              {scheme ? ` · ${scheme.label}` : ""}
            </span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            Details
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="tw:top-auto tw:bottom-0 tw:left-0 tw:max-w-full tw:translate-x-0 tw:translate-y-0 tw:rounded-b-none tw:sm:max-w-full">
          <DialogHeader>
            <DialogTitle>{product.name} ({product.code})</DialogTitle>
            <DialogDescription><span className="tw:inline-flex tw:self-start tw:rounded-full tw:bg-secondary tw:px-2 tw:py-0.5 tw:text-xs tw:font-medium tw:text-secondary-foreground">{product.tier} tier</span></DialogDescription>
          </DialogHeader>
          <PlanCardImage code={product.code} className="tw:mx-auto tw:w-3/4 tw:max-w-xs" />
          <PlanFacts product={product} scheme={scheme} onPlanChange={onPlanChange} />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false);
              onChange();
            }}
          >
            <Pencil aria-hidden="true" className="tw:size-3.5" />
            Change card
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
