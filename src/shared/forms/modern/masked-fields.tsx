"use client";

import type { ClipboardEventHandler, ReactNode } from "react";
import { formatPartialPhilippineMobile } from "@/shared/forms/formatting/phone";
import { validateLandline } from "@/shared/forms/validation/contact";
import { MAX_MOBILE_DIGITS, MAX_TIN_LENGTH, formatTin, landlineDigitRange } from "@/shared/utils/input-sanitizers";
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
function applyMask(input: HTMLInputElement, raw: string, format: (value: string) => string | null, onChange: (value: string) => void) {
  const formatted = format(raw);
  if (formatted === null) return;
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
  stablePrefix,
  onPaste,
}: MaskedProps & {
  inputMode: "numeric" | "tel";
  format?: (value: string) => string | null;
  stablePrefix?: boolean;
  onPaste?: ClipboardEventHandler<HTMLInputElement>;
}) {
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
      onPaste={onPaste}
    />
  );
  return (
    <FieldShell ids={ids} label={label} required={required} error={error} hint={hint} className={className}>
      {prefix || stablePrefix ? (
        <div className="tw:relative">
          {prefix ? (
            <span
              aria-hidden="true"
              className="tw:pointer-events-none tw:absolute tw:left-3 tw:top-1/2 tw:-translate-y-1/2 tw:text-sm tw:text-muted-foreground"
            >
              {prefix}
            </span>
          ) : null}
          {input}
        </div>
      ) : (
        input
      )}
    </FieldShell>
  );
}

const MOBILE_PREFIX = "09";
const MOBILE_SUFFIX_LENGTH = MAX_MOBILE_DIGITS - MOBILE_PREFIX.length;

function completeMobileSuffix(digits: string): string | undefined {
  return /^(?:09|639)(\d{9})$/.exec(digits)?.[1];
}

/** Philippine mobile input with an optional fixed national prefix. */
export function PhilippineMobileField({ maxLength = 14, fixedPrefix, value, onChange, ...rest }: MaskedProps & { fixedPrefix?: boolean }) {
  if (!fixedPrefix) {
    return <MaskedInput {...rest} value={value} onChange={onChange} maxLength={maxLength} inputMode="numeric" format={formatPartialPhilippineMobile} />;
  }

  const storedDigits = value.replace(/\D/g, "");
  const suffix = completeMobileSuffix(storedDigits) ?? storedDigits.replace(/^09/, "");
  const storeSuffix = (digits: string) => onChange(digits ? MOBILE_PREFIX + digits : "");
  return (
    <MaskedInput
      {...rest}
      value={suffix}
      onChange={storeSuffix}
      inputMode="numeric"
      autoComplete="tel"
      prefix={MOBILE_PREFIX}
      hint="Enter the nine digits after 09."
      format={(raw) => {
        const digits = raw.replace(/\D/g, "");
        return completeMobileSuffix(digits) ?? (digits.length <= MOBILE_SUFFIX_LENGTH ? digits : null);
      }}
      onPaste={(event) => {
        const pasted = completeMobileSuffix(event.clipboardData.getData("text").replace(/\D/g, ""));
        if (pasted === undefined) return;
        event.preventDefault();
        storeSuffix(pasted);
      }}
    />
  );
}

/** Optional Philippine landline input with an address-derived area code. */
export function PhilippineLandlineField({
  maxLength = 15,
  countryCode = "+63",
  areaCode,
  localDigitsOnly,
  value,
  error,
  ...rest
}: MaskedProps & { countryCode?: string; areaCode?: string; localDigitsOnly?: boolean }) {
  const { max } = landlineDigitRange(areaCode);
  const currentDigitCount = value.replace(/\D/g, "").length;
  const limitError = localDigitsOnly && currentDigitCount > max ? validateLandline(value, areaCode) : null;
  return (
    <MaskedInput
      {...rest}
      value={value}
      error={error ?? limitError ?? undefined}
      maxLength={localDigitsOnly ? undefined : maxLength}
      inputMode="tel"
      stablePrefix={localDigitsOnly}
      prefix={[localDigitsOnly ? "" : countryCode, areaCode ? `(${areaCode})` : ""].filter(Boolean).join(" ")}
      format={localDigitsOnly ? (raw) => {
        const digits = raw.replace(/\D/g, "");
        // Address changes can lower the limit. Allow the user to shorten an existing number.
        return digits.length <= max || digits.length < currentDigitCount ? digits : null;
      } : undefined}
      onPaste={localDigitsOnly ? (event) => {
        const input = event.currentTarget;
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? start;
        const candidate = input.value.slice(0, start) + event.clipboardData.getData("text") + input.value.slice(end);
        if (candidate.replace(/\D/g, "").length > max) event.preventDefault();
      } : undefined}
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
