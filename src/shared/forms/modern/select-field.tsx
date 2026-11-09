"use client";

import type { BaseFieldProps, FieldOption } from "@/shared/forms/types";
import { SUFFIX_OPTIONS, type NameSuffix } from "@/shared/forms/validation/person-name";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/shared/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { FieldShell, describedBy, useFieldIds } from "./field-shell";

export type SelectFieldProps<T extends string = string> = Omit<BaseFieldProps, "inputMode" | "autoComplete" | "maxLength"> & {
  value: T | undefined;
  options: ReadonlyArray<FieldOption<T>>;
  onChange: (value: T) => void;
  loading?: boolean;
  /** Adds a leading "None" item; choosing it calls onChange with an empty string. */
  allowClear?: boolean;
  clearLabel?: string;
  /** Renders a type-ahead combobox (Base UI) instead of a plain select; use for long lists. */
  showSearch?: boolean;
};

// Base UI selects need a non-empty sentinel for the "None" item.
const CLEAR_VALUE = "__none__";

/**
 * Labelled select (Base UI). The trigger is named by the field label so it
 * stays addressable as a combobox. Business option sets stay in the owning module.
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
  showSearch,
  error,
  hint,
  className,
}: SelectFieldProps<T>) {
  const ids = useFieldIds(explicitId);
  const items = [
    ...(allowClear ? [{ value: CLEAR_VALUE, label: clearLabel }] : []),
    ...options.map((option) => ({ value: option.value as string, label: option.label, disabled: option.disabled })),
  ];
  if (showSearch) {
    const searchItems = items;
    const selected = searchItems.find((item) => item.value === value) ?? null;
    return (
      <FieldShell ids={ids} label={label} required={required} error={error} hint={hint} className={className}>
        <Combobox
          items={searchItems}
          value={selected}
          disabled={disabled || loading}
          onValueChange={(next) => onChange((next && next.value !== CLEAR_VALUE ? next.value : "") as T)}
        >
          <ComboboxInput
            id={ids.id}
            placeholder={loading ? "Loading…" : placeholder ?? "Type to search"}
            aria-required={required ? "true" : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(ids, error, hint)}
          />
          <ComboboxContent>
            <ComboboxEmpty>No matches</ComboboxEmpty>
            <ComboboxList>
              {(item: { value: string; label: string; disabled?: boolean }) => (
                <ComboboxItem key={item.value} value={item} disabled={item.disabled}>
                  {item.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </FieldShell>
    );
  }
  return (
    <FieldShell ids={ids} label={label} required={required} error={error} hint={hint} className={className} labelFor={false}>
      <Select
        items={items}
        value={value ?? null}
        disabled={disabled || loading}
        onValueChange={(next) => onChange((next === CLEAR_VALUE || next == null ? "" : next) as T)}
      >
        <SelectTrigger
          id={ids.id}
          aria-label={label}
          aria-required={required ? "true" : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(ids, error, hint)}
          className="tw:h-10 tw:w-full tw:sm:h-8"
        >
          <SelectValue placeholder={loading ? "Loading…" : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value} disabled={"disabled" in item ? item.disabled : undefined} className="tw:min-h-11 tw:sm:min-h-8">
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
