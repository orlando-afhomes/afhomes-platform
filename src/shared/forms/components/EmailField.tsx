"use client";

import { cleanEmailInput } from "@/shared/utils/input-sanitizers";
import { TextField } from "./TextField";
import type { BaseFieldProps } from "../types";

export type EmailFieldProps = Omit<BaseFieldProps, "transform" | "type" | "inputMode">;

/** Email input: lowercases and strips spaces as typed. */
export function EmailField(props: EmailFieldProps & { value: string; onChange: (value: string) => void; onBlur?: () => void }) {
  const { onChange, ...rest } = props;
  return <TextField {...rest} onChange={(value) => onChange(cleanEmailInput(value))} type="text" inputMode="email" />;
}
