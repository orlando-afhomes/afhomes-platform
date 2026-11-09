"use client";

import type { BaseFieldProps } from "@/shared/forms/types";
import { Checkbox } from "@/shared/ui/checkbox";
import { Textarea } from "@/shared/ui/textarea";
import { FieldShell, describedBy, useFieldIds } from "./field-shell";
import { TextField } from "./text-field";

type ValueProps = { value: string; onChange: (value: string) => void };

/** Peso amount input. The value stays text; the owning form converts it with parsePesoToCentavos. */
export function MoneyField({ onChange, ...rest }: Omit<BaseFieldProps, "inputMode"> & ValueProps) {
  return (
    <TextField
      {...rest}
      addonBefore="₱"
      inputMode="numeric"
      maxLength={16}
      transform={(next) => next.replace(/[^\d.,]/g, "")}
      onChange={onChange}
    />
  );
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
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: string;
  id?: string;
}) {
  const ids = useFieldIds(id);
  return (
    <div className="tw:flex tw:flex-col tw:gap-1">
      <label className="tw:flex tw:min-h-11 tw:cursor-pointer tw:items-start tw:gap-2 tw:text-sm tw:sm:min-h-8">
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
