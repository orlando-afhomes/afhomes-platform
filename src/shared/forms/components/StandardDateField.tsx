"use client";

import dayjs from "dayjs";
import { DatePicker } from "antd";
import "./fields.css";

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

function toDateString(date: { isValid: () => boolean; format: (template: string) => string } | null): string {
  return date && date.isValid() ? date.format("YYYY-MM-DD") : "";
}

/** Date-only field backed by Ant Design DatePicker with Philippine-local day semantics. */
export function StandardDateField({
  id,
  label,
  required,
  disabled,
  value,
  onChange,
  error,
  hint,
  className,
}: StandardDateFieldProps) {
  return (
    <div className={`afhomes-field${className ? ` ${className}` : ""}`}>
      <label className="afhomes-field__label" htmlFor={id}>
        {label}
        {required ? <span className="afhomes-field__required"> *</span> : null}
      </label>
      <DatePicker
        id={id}
        value={value ? dayjs(value, "YYYY-MM-DD") : null}
        onChange={(date) => onChange(toDateString(date))}
        format="YYYY-MM-DD"
        disabled={disabled}
        status={error ? "error" : undefined}
        style={{ width: "100%" }}
      />
      {error ? <p className="afhomes-field__error">{error}</p> : null}
      {hint && !error ? <p className="afhomes-field__hint">{hint}</p> : null}
    </div>
  );
}
