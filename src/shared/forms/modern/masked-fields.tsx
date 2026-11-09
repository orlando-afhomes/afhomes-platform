"use client";

import { formatPartialPhilippineMobile } from "@/shared/forms/formatting/phone";
import { MAX_TIN_LENGTH, formatTin } from "@/shared/utils/input-sanitizers";
import type { BaseFieldProps } from "@/shared/forms/types";
import { Input } from "@/shared/ui/input";
import { FieldShell, describedBy, useFieldIds } from "./field-shell";

type MaskedProps = Omit<BaseFieldProps, "inputMode"> & {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
};

/**
 * Reformats on every edit and puts the caret back after the same number of
 * digits, so typing, deletion, and selection replacement never jump the caret.
 */
function applyMask(input: HTMLInputElement, raw: string, format: (value: string) => string, onChange: (value: string) => void) {
  const formatted = format(raw);
  const cursor = input.selectionStart ?? raw.length;
  const digitsBeforeCursor = raw.slice(0, cursor).replace(/\D/g, "").length;
  onChange(formatted);
  requestAnimationFrame(() => {
    let seen = 0;
    let pos = formatted.length;
    for (let index = 0; index < formatted.length; index += 1) {
      if (/\d/.test(formatted[index])) seen += 1;
      if (seen >= digitsBeforeCursor) {
        pos = index + 1;
        break;
      }
    }
    try {
      input.setSelectionRange(pos, pos);
    } catch {
      // Non-text inputs ignore caret placement; the value is already set.
    }
  });
}

function MaskedInput({
  id: explicitId,
  label,
  required,
  value,
  onChange,
  onBlur,
  error,
  hint,
  placeholder,
  disabled,
  maxLength,
  autoComplete,
  className,
  inputMode,
  format,
}: MaskedProps & { inputMode: "numeric" | "tel"; format?: (value: string) => string }) {
  const ids = useFieldIds(explicitId);
  return (
    <FieldShell ids={ids} label={label} required={required} error={error} hint={hint} className={className}>
      <Input
        id={ids.id}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-required={required ? "true" : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, error, hint)}
        className="tw:h-10 tw:sm:h-8"
        onChange={(event) =>
          format ? applyMask(event.currentTarget, event.target.value, format, onChange) : onChange(event.target.value)
        }
        onBlur={onBlur}
      />
    </FieldShell>
  );
}

/** Philippine mobile input with live XXXX-XXX-XXXX masking and caret preservation. */
export function PhilippineMobileField({ maxLength = 14, ...rest }: MaskedProps) {
  return <MaskedInput {...rest} maxLength={maxLength} inputMode="numeric" format={formatPartialPhilippineMobile} />;
}

/** Optional Philippine landline input (digits and presentation separators). */
export function PhilippineLandlineField({ maxLength = 15, ...rest }: MaskedProps) {
  return <MaskedInput {...rest} maxLength={maxLength} inputMode="tel" />;
}

/** Display width for a fully grouped 12-digit TIN. */
export const TIN_DISPLAY_LENGTH = MAX_TIN_LENGTH + 2;

/** TIN input with live 123-456-789 / 123-456-789-000 grouping; digits only in the canonical value. */
export function TinField({ maxLength = TIN_DISPLAY_LENGTH, ...rest }: MaskedProps) {
  return <MaskedInput {...rest} maxLength={maxLength} inputMode="numeric" format={formatTin} />;
}
