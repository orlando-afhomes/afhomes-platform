"use client";

import { Input } from "@/shared/ui/input";
import { FieldShell, describedBy, useFieldIds } from "./field-shell";

export type StandardDateFieldProps = {
  id?: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  /** Date-only YYYY-MM-DD string. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  className?: string;
};

/**
 * Date-only field on the native date input (owner decision: native dates, no
 * date-picker dependency). The value stays a YYYY-MM-DD string, so no timezone
 * shift can occur for Philippine business dates.
 */
export function StandardDateField({ id: explicitId, label, required, disabled, value, onChange, error, hint, className }: StandardDateFieldProps) {
  const ids = useFieldIds(explicitId);
  return (
    <FieldShell ids={ids} label={label} required={required} error={error} hint={hint} className={className}>
      <Input
        id={ids.id}
        type="date"
        value={value}
        disabled={disabled}
        aria-required={required ? "true" : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, error, hint)}
        className="tw:h-11"
        onChange={(event) => onChange(event.target.value)}
      />
    </FieldShell>
  );
}
