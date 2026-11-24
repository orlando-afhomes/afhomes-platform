"use client";

import { RadioCardGroup, type RadioCardOption } from "@/shared/components/modern/radio-card-group";
import { FieldShell, describedBy, useFieldIds } from "./field-shell";

/** Labelled radio-card field with the shared error and hint treatment. */
export function RadioCardField<T extends string = string>({
  id,
  label,
  required,
  value,
  options,
  onChange,
  variant,
  error,
  hint,
  className,
  groupClassName,
}: {
  id?: string;
  label: string;
  required?: boolean;
  value: T | undefined;
  options: ReadonlyArray<RadioCardOption<T>>;
  onChange: (value: T) => void;
  variant?: "card" | "tile";
  error?: string;
  hint?: string;
  className?: string;
  /** Classes for the option grid itself, for example `tw:md:grid-cols-1` to stack the cards in a dialog. */
  groupClassName?: string;
}) {
  const ids = useFieldIds(id);
  return (
    <FieldShell ids={ids} label={label} required={required} error={error} hint={hint} labelFor={false} className={className}>
      <RadioCardGroup label={label} value={value} onChange={onChange} options={options} variant={variant} className={groupClassName} describedBy={describedBy(ids, error, hint)} invalid={Boolean(error)} />
    </FieldShell>
  );
}
