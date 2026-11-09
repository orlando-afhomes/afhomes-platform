"use client";

import { useLayoutEffect, useRef } from "react";
import type { BaseFieldProps } from "@/shared/forms/types";
import { formatIntegerInput, formatMoneyInput } from "@/shared/lib/money";
import { cn } from "@/shared/lib/utils";
import { Checkbox } from "@/shared/ui/checkbox";
import { Textarea } from "@/shared/ui/textarea";
import { FieldShell, describedBy, useFieldIds } from "./field-shell";
import { TextField } from "./text-field";

type ValueProps = { value: string; onChange: (value: string) => void };

/**
 * Wraps a formatter (comma grouping) so the caret stays where the user is
 * typing: the number of digits and dots before the caret is kept across the
 * reformat, even when commas appear or disappear.
 */
function useGroupedInput(format: (raw: string) => string, onChange: (value: string) => void) {
  const ref = useRef<HTMLInputElement>(null);
  const pending = useRef<number | null>(null);
  const significant = (text: string) => text.replace(/[^\d.]/g, "").length;
  useLayoutEffect(() => {
    const input = ref.current;
    if (!input || pending.current === null) return;
    let seen = 0;
    let position = 0;
    while (position < input.value.length && seen < pending.current) {
      if (/[\d.]/.test(input.value[position])) seen += 1;
      position += 1;
    }
    input.setSelectionRange(position, position);
    pending.current = null;
  });
  const handle = (raw: string) => {
    const input = ref.current;
    if (input && document.activeElement === input) pending.current = significant(raw.slice(0, input.selectionStart ?? raw.length));
    onChange(format(raw));
  };
  return { ref, handle };
}

/** Peso amount input shown as "10,000" while typing. The value stays text; convert with parsePesoToCentavos. */
export function MoneyField({ onChange, ...rest }: Omit<BaseFieldProps, "inputMode"> & ValueProps) {
  const { ref, handle } = useGroupedInput(formatMoneyInput, onChange);
  return <TextField {...rest} inputRef={ref} addonBefore="₱" inputMode="decimal" maxLength={19} onChange={handle} />;
}

/** Whole-number input with comma grouping, for Stay Points and similar counts. */
export function PointsField({ onChange, ...rest }: Omit<BaseFieldProps, "inputMode"> & ValueProps) {
  const { ref, handle } = useGroupedInput(formatIntegerInput, onChange);
  return <TextField {...rest} inputRef={ref} inputMode="numeric" maxLength={16} onChange={handle} />;
}

/** Percentage input (up to two decimals). Convert with parsePercentToBasisPoints. */
export function PercentField({ onChange, ...rest }: Omit<BaseFieldProps, "inputMode"> & ValueProps) {
  return (
    <TextField
      {...rest}
      inputMode="numeric"
      maxLength={6}
      transform={(next) => next.replace(/[^\d.]/g, "")}
      onChange={onChange}
    />
  );
}

/** Multi-line text such as a reason or note. */
export function TextAreaField({
  id: explicitId,
  label,
  required,
  value,
  onChange,
  error,
  hint,
  placeholder,
  disabled,
  maxLength = 500,
  className,
}: Omit<BaseFieldProps, "inputMode" | "autoComplete"> & ValueProps) {
  const ids = useFieldIds(explicitId);
  return (
    <FieldShell ids={ids} label={label} required={required} error={error} hint={hint} className={className}>
      <Textarea
        id={ids.id}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        aria-required={required ? "true" : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, error, hint)}
        onChange={(event) => onChange(event.target.value)}
      />
    </FieldShell>
  );
}

/** Labelled checkbox (certifications, flags). Never pre-checked by this component. */
export function CheckboxField({
  label,
  checked,
  onChange,
  disabled,
  error,
  id,
  variant = "plain",
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: string;
  id?: string;
  /** `card` renders a bordered, fully clickable row that highlights when checked. */
  variant?: "plain" | "card";
}) {
  const ids = useFieldIds(id);
  return (
    <div className="tw:flex tw:flex-col tw:gap-1">
      <label
        className={cn(
          "tw:flex tw:min-h-11 tw:cursor-pointer tw:items-start tw:gap-3 tw:text-sm tw:sm:min-h-8",
          variant === "card" &&
            "tw:rounded-lg tw:border tw:bg-card tw:p-3 tw:shadow-(--shadow-soft) tw:transition-colors tw:hover:border-primary/40 tw:has-[[data-checked]]:border-primary tw:has-[[data-checked]]:bg-primary/5",
          variant === "card" && error && "tw:border-destructive",
        )}
      >
        <Checkbox id={ids.id} checked={checked} disabled={disabled} onCheckedChange={(next) => onChange(next === true)} />
        <span>{label}</span>
      </label>
      {error ? (
        <p role="alert" className="tw:text-sm tw:text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
