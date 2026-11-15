"use client";

import { StandardDateField } from "@/shared/forms/modern/date-field";
import { cn } from "@/shared/lib/utils";

export type DateRange = { from: string; to: string };

/**
 * From and To dates side by side (stacked on phones), for filters such as reports
 * and lists. Values are Manila date-only strings (YYYY-MM-DD) compared as text, so
 * no timezone shift can occur; an empty string means "no limit". When both are set
 * and From is after To, an inline error is shown and the values are still reported
 * so the caller decides what to do. Pass it as a child of `FilterBar`.
 */
export function DateRangeFields({
  from,
  to,
  onChange,
  fromLabel = "From",
  toLabel = "To",
  className,
}: {
  from: string;
  to: string;
  onChange: (range: DateRange) => void;
  fromLabel?: string;
  toLabel?: string;
  className?: string;
}) {
  const reversed = Boolean(from && to && from > to);
  return (
    <div className={cn("tw:flex tw:flex-col tw:gap-3 tw:sm:flex-row tw:sm:items-start tw:md:flex-[2_1_20rem]", className)}>
      <StandardDateField label={fromLabel} value={from} onChange={(next) => onChange({ from: next, to })} className="tw:sm:min-w-36 tw:sm:flex-1" />
      <StandardDateField
        label={toLabel}
        value={to}
        onChange={(next) => onChange({ from, to: next })}
        error={reversed ? `${toLabel} must be on or after ${fromLabel}.` : undefined}
        className="tw:sm:min-w-36 tw:sm:flex-1"
      />
    </div>
  );
}
