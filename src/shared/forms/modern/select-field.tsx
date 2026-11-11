"use client";

import type { BaseFieldProps, FieldOption } from "@/shared/forms/types";
import { SUFFIX_OPTIONS, type NameSuffix } from "@/shared/forms/validation/person-name";
import { SearchSelect } from "@/shared/components/modern/search-select";
import { FieldShell, describedBy, useFieldIds } from "./field-shell";

export type SelectFieldProps<T extends string = string> = Omit<BaseFieldProps, "inputMode" | "autoComplete" | "maxLength"> & {
  value: T | undefined;
  options: ReadonlyArray<FieldOption<T>>;
  onChange: (value: T) => void;
  loading?: boolean;
  /** Adds a leading "None" item; choosing it calls onChange with an empty string. */
  allowClear?: boolean;
  clearLabel?: string;
};

// Base UI selects need a non-empty sentinel for the "None" item.
const CLEAR_VALUE = "__none__";

/**
 * Labelled dropdown (shared SearchSelect: type to filter, then pick). The field
 * label names the input so it stays addressable as a combobox. Business option sets stay in the owning module.
 */
export function SelectField<T extends string = string>({
  id: explicitId,
  label,
  required,
  value,
  options,
  onChange,
  placeholder,
  disabled,
  loading,
  allowClear,
  clearLabel = "None",
  error,
  hint,
  className,
}: SelectFieldProps<T>) {
  const ids = useFieldIds(explicitId);
  const items = [
    ...(allowClear ? [{ value: CLEAR_VALUE, label: clearLabel }] : []),
    ...options.map((option) => ({ value: option.value as string, label: option.label, disabled: option.disabled })),
  ];
  return (
    <FieldShell ids={ids} label={label} required={required} error={error} hint={hint} className={className}>
      <SearchSelect
        id={ids.id}
        items={items}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        loading={loading}
        onChange={(next) => onChange((next && next !== CLEAR_VALUE ? next : "") as T)}
        aria-required={required ? "true" : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(ids, error, hint)}
      />
    </FieldShell>
  );
}

export type SuffixFieldProps = Omit<BaseFieldProps, "inputMode" | "autoComplete" | "maxLength" | "label"> & {
  label?: string;
  value: string | undefined;
  onChange: (value: NameSuffix) => void;
};

/** Optional name-suffix select (Jr., Sr., II–V). Blank means no suffix, stored as null. */
export function SuffixField({ id = "suffix", label = "Suffix", value, onChange, ...rest }: SuffixFieldProps) {
  return (
    <SelectField<NameSuffix>
      id={id}
      label={label}
      value={(value || undefined) as NameSuffix | undefined}
      options={SUFFIX_OPTIONS}
      onChange={onChange}
      placeholder="Select suffix"
      allowClear
      clearLabel="No suffix"
      {...rest}
    />
  );
}
