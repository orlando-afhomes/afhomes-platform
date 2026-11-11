"use client";

import type { ReactElement, ReactNode } from "react";
import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { Check } from "lucide-react";
import { RadioGroup } from "@/shared/ui/radio-group";
import { cn } from "@/shared/lib/utils";

export type PaymentOption<T extends string = string> = {
  value: T;
  label: string;
  sub?: string | null;
  pill?: string | null;
  pillIcon?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
};

/**
 * Selectable payment option cards matching the approved Step 2 reference
 * (`docs/ui-redesign/step-2-redesign.png`): a radio ring pinned top-left that
 * fills green with a check when selected, an icon chip, a bold title with a
 * muted total line, and an optional green schedule pill below.
 *
 * Why a separate component (AGENTS.md §8 — compose existing primitives
 * first): RadioCardGroup's `card`/`tile` variants cannot adopt this layout
 * (top-left radio mark, icon chip, `text-[15px]` title with muted total line,
 * schedule pill row, compact 2-col classification grid) without changing the
 * shared variants already used by gender/civil-status/acquisition tiles,
 * payment-method tiles, and the legacy edit form. A dedicated component keeps
 * those existing usages untouched.
 */
function OptionMark() {
  return (
    <span
      aria-hidden="true"
      className="payment-option__mark tw:flex tw:size-5 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:border-2 tw:border-(--color-border-strong) tw:bg-card tw:transition-colors tw:group-data-checked/payment-option:border-primary tw:group-data-checked/payment-option:bg-primary tw:group-data-disabled/payment-option:border-border"
    >
      <RadioPrimitive.Indicator className="tw:flex tw:items-center tw:justify-center tw:text-primary-foreground">
        <Check className="tw:size-3" strokeWidth={3} />
      </RadioPrimitive.Indicator>
    </span>
  );
}

export function PaymentOptionGrid<T extends string = string>({
  label,
  value,
  onChange,
  options,
  columns = "three",
  describedBy,
  invalid,
  className,
}: {
  label: string;
  value: T | undefined;
  onChange: (value: T) => void;
  options: ReadonlyArray<PaymentOption<T>>;
  columns?: "two" | "three";
  describedBy?: string;
  invalid?: boolean;
  className?: string;
}): ReactElement {
  return (
    <RadioGroup
      aria-label={label}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      value={value ?? ""}
      onValueChange={(next) => onChange(next as T)}
      className={cn(
        "payment-option-grid tw:grid tw:grid-cols-1 tw:items-stretch tw:gap-3",
        columns === "two" ? "tw:sm:grid-cols-2" : "tw:sm:grid-cols-2 tw:xl:grid-cols-3",
        className,
      )}
    >
      {options.map((option) => (
        <RadioPrimitive.Root
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          data-slot="payment-option-card"
          className={cn(
            "payment-option__card tw:group/payment-option tw:relative tw:flex tw:h-full tw:cursor-pointer tw:flex-col tw:gap-2 tw:rounded-xl tw:border-2 tw:bg-card tw:p-4 tw:text-left tw:text-card-foreground tw:shadow-(--shadow-soft) tw:outline-none",
            "tw:transition-[border-color,box-shadow,background-color,transform] tw:duration-150 tw:hover:-translate-y-px tw:hover:border-primary/50 tw:hover:shadow-(--shadow-raised) tw:active:translate-y-0 tw:active:scale-[0.99] tw:motion-reduce:transition-none tw:motion-reduce:hover:translate-y-0 tw:motion-reduce:active:scale-100",
            "tw:focus-visible:border-ring tw:focus-visible:ring-3 tw:focus-visible:ring-ring/40 tw:focus-visible:ring-offset-2 tw:focus-visible:ring-offset-background",
            invalid ? "tw:border-destructive tw:ring-1 tw:ring-destructive/30" : "tw:border-border",
            "tw:data-checked:border-primary tw:data-checked:bg-primary/5 tw:data-checked:shadow-(--shadow-selected)",
            "tw:data-disabled:cursor-not-allowed tw:data-disabled:border-border tw:data-disabled:bg-muted/40 tw:data-disabled:text-muted-foreground tw:data-disabled:shadow-none tw:data-disabled:ring-0 tw:data-disabled:hover:translate-y-0 tw:data-disabled:hover:border-border tw:data-disabled:hover:shadow-none tw:data-disabled:active:scale-100",
          )}
        >
          <span className="payment-option__row tw:flex tw:items-center tw:gap-3">
            <OptionMark />
            {option.icon ? (
              <span
                aria-hidden="true"
                className="payment-option__icon tw:flex tw:size-9 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg tw:bg-muted tw:text-foreground tw:transition-colors tw:group-data-checked/payment-option:bg-primary tw:group-data-checked/payment-option:text-primary-foreground"
              >
                {option.icon}
              </span>
            ) : null}
            <span className="payment-option__texts tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:justify-center tw:gap-0.5">
              <span className="payment-option__label tw:font-semibold tw:text-[15px] tw:leading-tight">{option.label}</span>
              {option.sub ? (
                <span className="payment-option__sub tw:text-sm tw:leading-snug tw:text-muted-foreground">{option.sub}</span>
              ) : null}
            </span>
          </span>
          {option.pill ? (
            <span className="payment-option__pill tw:mt-auto tw:inline-flex tw:self-start tw:items-center tw:gap-1 tw:rounded-full tw:bg-primary/10 tw:px-2 tw:py-0.5 tw:text-xs tw:font-medium tw:text-primary">
              {option.pillIcon ? (
                <span
                  aria-hidden="true"
                  className="payment-option__pill-icon tw:flex tw:size-3.5 tw:items-center tw:justify-center tw:[&_svg]:tw:size-3.5"
                >
                  {option.pillIcon}
                </span>
              ) : null}
              {option.pill}
            </span>
          ) : null}
        </RadioPrimitive.Root>
      ))}
    </RadioGroup>
  );
}
