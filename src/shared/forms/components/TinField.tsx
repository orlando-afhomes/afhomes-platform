"use client";

import { useRef } from "react";
import { Input } from "antd";
import { formatTin, MAX_TIN_LENGTH } from "@/shared/utils/input-sanitizers";
import type { BaseFieldProps } from "../types";
import "./fields.css";

export type TinFieldProps = Omit<BaseFieldProps, "inputMode" | "maxLength" | "transform"> & {
  maxLength?: number;
};

/** Display width for a fully grouped 12-digit TIN. */
export const TIN_DISPLAY_LENGTH = MAX_TIN_LENGTH + 2;

/**
 * TIN input with live 123-456-789 / 123-456-789-000 grouping. Digits only in
 * the canonical value; formatting is presentation-only.
 */
export function TinField({
  value,
  onChange,
  onBlur,
  maxLength = TIN_DISPLAY_LENGTH,
  ...rest
}: TinFieldProps & { value: string; onChange: (value: string) => void; onBlur?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (raw: string) => {
    const formatted = formatTin(raw);
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
