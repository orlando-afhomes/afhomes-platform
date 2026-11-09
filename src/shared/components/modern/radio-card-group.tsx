"use client";

import type { ReactNode } from "react";
import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { Check } from "lucide-react";
import { RadioGroup } from "@/shared/ui/radio-group";
import { cn } from "@/shared/lib/utils";

export type RadioCardOption<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
  /** Picture shown above the label, such as a card image. */
  media?: ReactNode;
  /** Extra content under the description, such as plan facts. */
  details?: ReactNode;
  disabled?: boolean;
};

/** Always-visible radio control: an empty ring that fills with a check when selected. */
function RadioMark() {
  return (
    <span
      aria-hidden="true"
      className="tw:flex tw:size-5 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-full tw:border-2 tw:border-(--color-border-strong) tw:bg-card tw:transition-colors tw:group-data-checked/radio-card:border-primary tw:group-data-checked/radio-card:bg-primary tw:group-data-disabled/radio-card:border-border"
    >
      <RadioPrimitive.Indicator className="tw:flex tw:items-center tw:justify-center tw:text-primary-foreground">
        <Check className="tw:size-3" strokeWidth={3} />
      </RadioPrimitive.Indicator>
    </span>
  );
}

/**
 * Radio group rendered as selectable cards (`card`) or compact tiles (`tile`).
 * Built on Base UI radios, so arrow keys, focus, and the checked state come
 * from the primitive. Every card shows a radio mark, and the checked card also
 * gets a border, ring, tint, and check, so selection never depends on color alone.
 */
export function RadioCardGroup<T extends string = string>({
  label,
  value,
  onChange,
  options,
  variant = "tile",
  className,
  describedBy,
  invalid,
}: {
  label: string;
  value: T | undefined;
  onChange: (value: T) => void;
  options: ReadonlyArray<RadioCardOption<T>>;
  variant?: "card" | "tile";
  className?: string;
  describedBy?: string;
  invalid?: boolean;
}) {
  const card = variant === "card";
  return (
    <RadioGroup
      aria-label={label}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      value={value ?? ""}
      onValueChange={(next) => onChange(next as T)}
      className={cn(
        "tw:grid tw:gap-3",
        card ? "tw:grid-cols-1 tw:md:grid-cols-2 tw:xl:grid-cols-3" : "tw:grid-cols-2 tw:sm:grid-cols-3 tw:lg:grid-cols-4",
        className,
      )}
    >
      {options.map((option) => (
        <RadioPrimitive.Root
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          data-slot="radio-card"
          className={cn(
            "tw:group/radio-card tw:relative tw:flex tw:h-full tw:cursor-pointer tw:flex-col tw:rounded-xl tw:border tw:bg-card tw:text-left tw:text-card-foreground tw:shadow-(--shadow-soft) tw:outline-none",
            "tw:transition-[border-color,box-shadow,background-color,transform] tw:duration-150 tw:hover:-translate-y-px tw:hover:border-primary/50 tw:hover:shadow-(--shadow-raised) tw:active:translate-y-0 tw:active:scale-[0.99] tw:motion-reduce:transition-none tw:motion-reduce:hover:translate-y-0 tw:motion-reduce:active:scale-100",
            "tw:focus-visible:border-ring tw:focus-visible:ring-3 tw:focus-visible:ring-ring/40 tw:focus-visible:ring-offset-2 tw:focus-visible:ring-offset-background",
            invalid ? "tw:border-destructive tw:ring-1 tw:ring-destructive/30" : "tw:border-border",
            "tw:data-checked:border-primary tw:data-checked:bg-primary/5 tw:data-checked:shadow-(--shadow-selected) tw:data-checked:ring-1 tw:data-checked:ring-primary",
            "tw:data-disabled:cursor-not-allowed tw:data-disabled:border-border tw:data-disabled:bg-muted/40 tw:data-disabled:text-muted-foreground tw:data-disabled:shadow-none tw:data-disabled:ring-0 tw:data-disabled:hover:translate-y-0 tw:data-disabled:hover:border-border tw:data-disabled:hover:shadow-none tw:data-disabled:active:scale-100",
            card ? "tw:gap-3 tw:p-4" : "tw:min-h-11 tw:justify-center tw:px-3 tw:py-2",
          )}
        >
          {option.media ? (
            <span className="tw:block tw:overflow-hidden tw:rounded-lg tw:bg-muted/50 tw:p-2 tw:transition-colors tw:group-data-checked/radio-card:bg-primary/10">{option.media}</span>
          ) : null}
          <span className={cn("tw:flex tw:gap-3", card ? "tw:items-start" : "tw:items-center")}>
            {!card ? <RadioMark /> : null}
            {option.icon ? (
              <span aria-hidden="true" className={cn("tw:flex tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg tw:bg-muted tw:text-foreground tw:transition-colors tw:group-data-checked/radio-card:bg-primary tw:group-data-checked/radio-card:text-primary-foreground", card ? "tw:size-10" : "tw:size-7")}>
                {option.icon}
              </span>
            ) : null}
            <span className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:gap-0.5">
              <span className={cn("tw:font-semibold tw:leading-tight", card ? "tw:text-base" : "tw:text-sm")}>{option.label}</span>
              {option.description ? <span className={cn("tw:leading-snug tw:text-muted-foreground", card ? "tw:text-sm" : "tw:text-xs")}>{option.description}</span> : null}
            </span>
            {card ? <RadioMark /> : null}
          </span>
          {option.details ? <span className="tw:mt-auto tw:block tw:border-t tw:border-border tw:pt-3">{option.details}</span> : null}
        </RadioPrimitive.Root>
      ))}
    </RadioGroup>
  );
}
