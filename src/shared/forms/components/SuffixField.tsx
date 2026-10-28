"use client";

import { SelectField } from "./SelectField";
import { SUFFIX_OPTIONS, type NameSuffix } from "../validation/person-name";
import type { BaseFieldProps } from "../types";

export type SuffixFieldProps = Omit<BaseFieldProps, "inputMode" | "autoComplete" | "maxLength"> & {
  value: string | undefined;
  onChange: (value: NameSuffix) => void;
  showSearch?: boolean;
};

/**
 * Optional name-suffix dropdown (Jr., Sr., II–V) with allow-clear.
 * Blank means no suffix and is stored as null, never "N/A".
 */
export function SuffixField({
  id = "suffix",
  label = "Suffix",
  value,
  onChange,
  ...rest
}: SuffixFieldProps) {
  return (
    <SelectField<NameSuffix>
      id={id}
      label={label}
      value={(value || undefined) as NameSuffix | undefined}
      options={SUFFIX_OPTIONS}
      onChange={onChange}
      placeholder="Select suffix"
      allowClear
      {...rest}
    />
  );
}
