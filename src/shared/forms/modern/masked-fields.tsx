"use client";

import type { ReactNode } from "react";
import { formatPartialPhilippineMobile } from "@/shared/forms/formatting/phone";
import { MAX_TIN_LENGTH, formatTin } from "@/shared/utils/input-sanitizers";
import type { BaseFieldProps } from "@/shared/forms/types";
import { Input } from "@/shared/ui/input";
import { FieldShell, describedBy, useFieldIds } from "./field-shell";

type MaskedProps = Omit<BaseFieldProps, "inputMode"> & {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Display-only adornment at the input start; never enters the value. */
  prefix?: ReactNode;
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
  prefix,
}: MaskedProps & { inputMode: "numeric" | "tel"; format?: (value: string) => string }) {
  const ids = useFieldIds(explicitId);
  // String prefixes get padding sized to their length; richer nodes use a fixed inset.
  const prefixStyle =
    typeof prefix === "string" && prefix.length > 0
      ? { paddingLeft: `calc(0.75rem + ${prefix.length}ch + 0.5rem)` }
      : undefined;
  const input = (
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
      className={prefix && prefixStyle === undefined ? "tw:h-11 tw:pl-24" : "tw:h-11"}
      style={prefixStyle}
      onChange={(event) =>
        format ? applyMask(event.currentTarget, event.target.value, format, onChange) : onChange(event.target.value)
      }
      onBlur={onBlur}
    />
  );
  return (
    <FieldShell ids={ids} label={label} required={required} error={error} hint={hint} className={className}>
      {prefix ? (
        <div className="tw:relative">
          <span
            aria-hidden="true"
            className="tw:pointer-events-none tw:absolute tw:left-3 tw:top-1/2 tw:-translate-y-1/2 tw:text-sm tw:text-muted-foreground"
          >
            {prefix}
          </span>
          {input}
        </div>
      ) : (
        input
      )}
    </FieldShell>
  );
}

/** Philippine mobile input with live XXXX-XXX-XXXX masking and caret preservation. */
export function PhilippineMobileField({ maxLength = 14, ...rest }: MaskedProps) {
  return <MaskedInput {...rest} maxLength={maxLength} inputMode="numeric" format={formatPartialPhilippineMobile} />;
}

/** Optional Philippine landline input (digits and presentation separators), always prefixed with +63. */
export function PhilippineLandlineField({
  maxLength = 15,
  countryCode = "+63",
  areaCode,
  ...rest
}: MaskedProps & { countryCode?: string; areaCode?: string }) {
  return (
    <MaskedInput
      {...rest}
      maxLength={maxLength}
      inputMode="tel"
      prefix={areaCode ? `${countryCode} (${areaCode})` : countryCode}
    />
  );
}

/** Display width for a fully grouped 12-digit TIN. */
// A 12-digit TIN groups as 123-456-789-012: 12 digits plus 3 hyphens.
export const TIN_DISPLAY_LENGTH = MAX_TIN_LENGTH + 3;

/** TIN input with live 123-456-789 / 123-456-789-000 grouping; digits only in the canonical value. */
export function TinField({ maxLength = TIN_DISPLAY_LENGTH, ...rest }: MaskedProps) {
  return <MaskedInput {...rest} maxLength={maxLength} inputMode="numeric" format={formatTin} />;
}
