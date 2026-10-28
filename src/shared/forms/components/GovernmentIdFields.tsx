"use client";

import { TextField } from "./TextField";
import { SelectField } from "./SelectField";
import type { FieldOption } from "../types";

export type GovernmentIdFieldsProps = {
  idType: string | undefined;
  onIdTypeChange: (value: string) => void;
  idNumber: string;
  onIdNumberChange: (value: string) => void;
  idTypeOptions: ReadonlyArray<FieldOption>;
  required?: boolean;
  disabled?: boolean;
  errorType?: string;
  errorIdNumber?: string;
  idPrefix?: string;
};

/**
 * Government ID type + number pair. Accepts alphanumeric values with official
 * separators; no single numeric-only rule is imposed across ID types.
 */
export function GovernmentIdFields({
  idType,
  onIdTypeChange,
  idNumber,
  onIdNumberChange,
  idTypeOptions,
  required,
  disabled,
  errorType,
  errorIdNumber,
  idPrefix = "gov-id",
}: GovernmentIdFieldsProps) {
  return (
    <>
      <SelectField
        id={`${idPrefix}-type`}
        label="Government ID"
        required={required}
        value={idType}
        options={idTypeOptions}
        onChange={onIdTypeChange}
        placeholder="Select ID type"
        disabled={disabled}
        error={errorType}
      />
      <TextField
        id={`${idPrefix}-number`}
        label="ID Number"
        required={required}
        value={idNumber}
        onChange={onIdNumberChange}
        onBlur={() => onIdNumberChange(idNumber.trim())}
        maxLength={40}
        autoComplete="off"
        disabled={disabled}
        error={errorIdNumber}
      />
    </>
  );
}
