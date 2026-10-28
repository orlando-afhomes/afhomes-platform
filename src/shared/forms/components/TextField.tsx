"use client";

import { Input, Space } from "antd";
import type { BaseFieldProps } from "../types";
import "./fields.css";

export type TextFieldProps = BaseFieldProps & {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: "text" | "password";
  transform?: (value: string) => string;
  /** Fixed text shown left of the input via Space.Compact (replaces deprecated Input addonBefore). */
  addonBefore?: string;
};

/**
 * Generic labeled text input. Validation lives in the owning form via the
 * `error` prop; this component never invents its own business rules.
 */
export function TextField({
  id,
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
  inputMode,
  transform,
  type = "text",
  addonBefore,
  className,
}: TextFieldProps) {
  const Control = type === "password" ? Input.Password : Input;
  const inputNode = (
    <Control
      id={id}
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      disabled={disabled}
      autoComplete={autoComplete}
      inputMode={inputMode}
      status={error ? "error" : undefined}
      onChange={(event) => onChange(transform ? transform(event.target.value) : event.target.value)}
      onBlur={onBlur}
    />
  );
  return (
    <div className={`afhomes-field${className ? ` ${className}` : ""}`}>
      <label className="afhomes-field__label" htmlFor={id}>
        {label}
        {required ? <span className="afhomes-field__required"> *</span> : null}
      </label>
      {addonBefore === undefined ? (
        inputNode
      ) : (
        <Space.Compact block>
          <Input
            value={addonBefore}
            disabled
            tabIndex={-1}
            aria-hidden
            className="afhomes-field__addon"
          />
          {inputNode}
        </Space.Compact>
      )}
      {error ? <p className="afhomes-field__error">{error}</p> : null}
      {hint && !error ? <p className="afhomes-field__hint">{hint}</p> : null}
    </div>
  );
}
