"use client";

import { MAX_PASSWORD_LENGTH } from "@/shared/utils/input-sanitizers";
import { TextField } from "./TextField";
import type { BaseFieldProps } from "../types";

export type PasswordFieldProps = Omit<BaseFieldProps, "transform" | "type" | "inputMode"> & {
  maxLength?: number;
};

/**
 * Password input with visibility toggle. Values are never trimmed,
 * transformed, or logged; validation happens in the owning form.
 */
export function PasswordField({ maxLength = MAX_PASSWORD_LENGTH, ...rest }: PasswordFieldProps & { value: string; onChange: (value: string) => void; onBlur?: () => void }) {
  return <TextField {...rest} type="password" maxLength={maxLength} autoComplete={rest.autoComplete ?? "new-password"} />;
}

/** Confirmation input; must match the original password exactly. */
export function ConfirmPasswordField(props: PasswordFieldProps & { value: string; onChange: (value: string) => void; onBlur?: () => void }) {
  return <PasswordField {...props} />;
}
