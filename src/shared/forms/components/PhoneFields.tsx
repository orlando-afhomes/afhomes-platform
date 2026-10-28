"use client";

import { useRef } from "react";
import { Input } from "antd";
import { formatPartialPhilippineMobile } from "@/shared/forms/formatting/phone";
import type { BaseFieldProps } from "../types";
import "./fields.css";

export type PhilippineMobileFieldProps = Omit<BaseFieldProps, "inputMode" | "maxLength"> & {
  maxLength?: number;
};

/**
 * Philippine mobile input with live XXXX-XXX-XXXX masking. Caret position is
 * preserved across reformatting (typing, deletion, selection replacement);
 * the canonical 09XXXXXXXXXX value is derived by the shared normalizer.
 */
export function PhilippineMobileField({
  value,
  onChange,
  onBlur,
  maxLength = 14,
  ...rest
}: PhilippineMobileFieldProps & { value: string; onChange: (value: string) => void; onBlur?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (raw: string) => {
    const formatted = formatPartialPhilippineMobile(raw);
    const input = inputRef.current;
    const cursor = input?.selectionStart ?? raw.length;
    const digitsBeforeCursor = raw.slice(0, cursor).replace(/\D/g, "").length;
    onChange(formatted);
    requestAnimationFrame(() => {
      if (!input) return;
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
  };

  return (
    <div className={`afhomes-field${rest.className ? ` ${rest.className}` : ""}`}>
      <label className="afhomes-field__label" htmlFor={rest.id}>
        {rest.label}
        {rest.required ? <span className="afhomes-field__required"> *</span> : null}
      </label>
      <Input
        id={rest.id}
        ref={inputRef}
        value={value}
        maxLength={maxLength}
        placeholder={rest.placeholder}
        disabled={rest.disabled}
        autoComplete={rest.autoComplete}
        inputMode="numeric"
        status={rest.error ? "error" : undefined}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={onBlur}
      />
      {rest.error ? <p className="afhomes-field__error">{rest.error}</p> : null}
      {rest.hint && !rest.error ? <p className="afhomes-field__hint">{rest.hint}</p> : null}
    </div>
  );
}

export type PhilippineLandlineFieldProps = Omit<BaseFieldProps, "inputMode" | "maxLength"> & {
  maxLength?: number;
};

/** Optional Philippine landline input (digits and presentation separators). */
export function PhilippineLandlineField({
  value,
  onChange,
  onBlur,
  maxLength = 15,
  ...rest
}: PhilippineLandlineFieldProps & { value: string; onChange: (value: string) => void; onBlur?: () => void }) {
  return (
    <div className={`afhomes-field${rest.className ? ` ${rest.className}` : ""}`}>
      <label className="afhomes-field__label" htmlFor={rest.id}>
        {rest.label}
        {rest.required ? <span className="afhomes-field__required"> *</span> : null}
      </label>
      <Input
        id={rest.id}
        value={value}
        maxLength={maxLength}
        placeholder={rest.placeholder}
        disabled={rest.disabled}
        autoComplete={rest.autoComplete}
        inputMode="tel"
        status={rest.error ? "error" : undefined}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
      {rest.error ? <p className="afhomes-field__error">{rest.error}</p> : null}
      {rest.hint && !rest.error ? <p className="afhomes-field__hint">{rest.hint}</p> : null}
    </div>
  );
}
