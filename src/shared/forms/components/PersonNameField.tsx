"use client";

import { MAX_NAME_LENGTH } from "@/shared/utils/input-sanitizers";
import { cleanTitleInput } from "@/shared/forms/formatting/text";
import { TextField, type TextFieldProps } from "./TextField";

export type PersonNameFieldProps = Omit<TextFieldProps, "transform" | "type"> & {
  maxLength?: number;
};

/**
 * Person-name input with title-case normalization. Supports legitimate names
 * with hyphens, apostrophes, accents, and periods (O'Neil, Anne-Marie, José,
 * M. Cristina); digits and other symbols are stripped as typed.
 */
export function PersonNameField({ maxLength = MAX_NAME_LENGTH, onChange, ...rest }: PersonNameFieldProps) {
  return <TextField {...rest} maxLength={maxLength} onChange={(value) => onChange(cleanTitleInput(value))} type="text" />;
}

export type MiddleNameFieldProps = PersonNameFieldProps & {
  noMiddleName: boolean;
  onNoMiddleNameChange: (checked: boolean) => void;
};

/**
 * Middle-name input with a No-middle-name checkbox. Checking the box clears
 * any typed value so it can never be submitted accidentally; the empty state
 * is stored as null, never as "N/A", "None", or a dash.
 */
export function MiddleNameField({ noMiddleName, onNoMiddleNameChange, onChange, ...rest }: MiddleNameFieldProps) {
  return (
    <>
      <TextField {...rest} disabled={rest.disabled ?? noMiddleName} onChange={onChange} />
      <label className="afhomes-field__check">
        <input
          type="checkbox"
          checked={noMiddleName}
          onChange={(event) => {
            const checked = event.target.checked;
            onNoMiddleNameChange(checked);
            if (checked) onChange("");
          }}
        />{" "}
        No middle-name
      </label>
    </>
  );
}
