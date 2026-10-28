"use client";

import { Select } from "antd";
import type { BaseFieldProps, FieldOption } from "../types";
import "./fields.css";
import "./fields.css";

export type SelectFieldProps<T extends string = string> = Omit<BaseFieldProps, "inputMode" | "autoComplete" | "maxLength"> & {
  value: T | undefined;
  options: ReadonlyArray<FieldOption<T>>;
  onChange: (value: T) => void;
  showSearch?: boolean;
  loading?: boolean;
  allowClear?: boolean;
};

/** Generic labeled Select. Business option sets stay in the owning module. */
export function SelectField<T extends string = string>({
  id,
  label,
  required,
  value,
  options,
  onChange,
  placeholder,
  disabled,
  showSearch,
  loading,
  allowClear,
  error,
  hint,
  className,
}: SelectFieldProps<T>) {
  return (
    <div className={`afhomes-field${className ? ` ${className}` : ""}`}>
      <label className="afhomes-field__label" htmlFor={id}>
        {label}
        {required ? <span className="afhomes-field__required"> *</span> : null}
      </label>
      <Select
        id={id}
        value={value}
        options={options as Array<{ value: string; label: string }>}
        onChange={(next) => onChange(next as T)}
        placeholder={placeholder}
        disabled={disabled}
        showSearch={showSearch}
        optionFilterProp="label"
        loading={loading}
        allowClear={allowClear}
        status={error ? "error" : undefined}
      />
      {error ? <p className="afhomes-field__error">{error}</p> : null}
      {hint && !error ? <p className="afhomes-field__hint">{hint}</p> : null}
    </div>
  );
}
