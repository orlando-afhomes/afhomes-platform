"use client";

import { useState, type ReactNode, type Ref } from "react";
import { Eye, EyeOff } from "lucide-react";
import { EMAIL_DOMAINS, MAX_NAME_LENGTH, MAX_PASSWORD_LENGTH, cleanEmailInput, splitEmail } from "@/shared/utils/input-sanitizers";
import { cleanTitleInput } from "@/shared/forms/formatting/text";
import { exampleFor } from "@/shared/forms/example-text";
import type { BaseFieldProps } from "@/shared/forms/types";
import { SearchSelect } from "@/shared/components/modern/search-select";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { FieldShell, describedBy, useFieldIds } from "./field-shell";

export type TextFieldProps = BaseFieldProps & {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: "text" | "password";
  transform?: (value: string) => string;
  /** Fixed text shown inside the left edge of the input. */
  addonBefore?: string;
  /** A control shown at the right edge of the input (for example the email domain picker). */
  addonAfter?: ReactNode;
  /** Lets a wrapper restore the caret after reformatting the value as it is typed. */
  inputRef?: Ref<HTMLInputElement>;
};

const INPUT_HEIGHT = "tw:h-11";
const OTHER_DOMAIN = "__other__";

/**
 * Labelled text input (Base UI input). Same props as the legacy field, so a
 * migrated form swaps imports only. Validation lives in the owning form via
 * `error`; this component never invents business rules. Password fields get
 * an accessible show/hide toggle.
 */
export function TextField({
  id: explicitId,
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
  addonAfter,
  className,
  inputRef,
}: TextFieldProps) {
  const ids = useFieldIds(explicitId);
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  return (
    <FieldShell ids={ids} label={label} required={required} error={error} hint={hint} className={className}>
      <div className="tw:relative tw:flex">
        {addonBefore !== undefined ? (
          <span
            aria-hidden="true"
            className="tw:flex tw:shrink-0 tw:items-center tw:rounded-l-lg tw:border tw:border-r-0 tw:border-input tw:bg-muted tw:px-2.5 tw:text-sm tw:text-muted-foreground"
          >
            {addonBefore}
          </span>
        ) : null}
        <Input
          ref={inputRef}
          id={ids.id}
          type={isPassword && visible ? "text" : type}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder ?? exampleFor(label)}
          disabled={disabled}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-required={required ? "true" : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(ids, error, hint)}
          className={`${INPUT_HEIGHT}${addonBefore !== undefined ? " tw:rounded-l-none" : ""}${addonAfter ? " tw:rounded-r-none" : ""}${isPassword ? " tw:pr-11" : ""}`}
          onChange={(event) => onChange(transform ? transform(event.target.value) : event.target.value)}
          onBlur={onBlur}
        />
        {addonAfter}
        {isPassword ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            aria-pressed={visible}
            disabled={disabled}
            // Keep focus in the field so toggling never triggers blur validation.
            onMouseDown={(event) => event.preventDefault()}
            className="tw:absolute tw:top-1/2 tw:right-0.5 tw:size-9 tw:-translate-y-1/2 tw:sm:size-7"
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
        ) : null}
      </div>
    </FieldShell>
  );
}

type ValueProps = { value: string; onChange: (value: string) => void; onBlur?: () => void };

export type PasswordFieldProps = Omit<BaseFieldProps, "inputMode"> & ValueProps;

/** Password input; values are never trimmed, transformed, or logged. */
export function PasswordField({ maxLength = MAX_PASSWORD_LENGTH, autoComplete, ...rest }: PasswordFieldProps) {
  return <TextField {...rest} type="password" maxLength={maxLength} autoComplete={autoComplete ?? "new-password"} />;
}

/** Confirmation input; must match the original password exactly. */
export function ConfirmPasswordField(props: PasswordFieldProps) {
  return <PasswordField {...props} />;
}

/**
 * Email input: lowercases and strips spaces as typed. The person types the name and
 * picks the domain (Gmail first); "Other…" turns it into one box for any full address.
 * The value stays one full email string, and stays empty until a name is typed.
 */
export function EmailField({ onChange, value, ...rest }: Omit<BaseFieldProps, "inputMode"> & ValueProps) {
  const { name, domain } = splitEmail(value);
  const [picked, setPicked] = useState<string>(EMAIL_DOMAINS.find((item) => item === domain) ?? EMAIL_DOMAINS[0]);
  const [forceOther, setForceOther] = useState(false);
  const known = EMAIL_DOMAINS.find((item) => item === domain);
  const other = forceOther || (domain !== "" && !known);
  const current = known ?? picked;
  const items = [...EMAIL_DOMAINS.map((item) => ({ value: item, label: item })), { value: OTHER_DOMAIN, label: "Other…" }];
  const typed = (raw: string) => {
    const clean = cleanEmailInput(raw);
    if (other) return onChange(clean);
    if (!clean.includes("@")) return onChange(clean ? clean + current : "");
    // A pasted or typed "@" means a full address: keep it whole.
    setForceOther(true);
    onChange(clean);
  };
  const pick = (next: string | null) => {
    if (next === OTHER_DOMAIN) return setForceOther(true);
    if (!next) return;
    setPicked(next);
    setForceOther(false);
    onChange(name ? name + next : "");
  };
  return (
    <TextField
      {...rest}
      value={other ? value : name}
      placeholder={rest.placeholder ?? (other ? "juan@example.com" : "juan.delacruz")}
      onChange={typed}
      inputMode="email"
      addonAfter={
        <SearchSelect items={items} value={other ? OTHER_DOMAIN : current} onChange={pick} aria-label="Email domain" wrapperClassName="tw:w-auto tw:shrink-0" className="tw:w-auto tw:min-w-28 tw:rounded-l-none tw:[field-sizing:content]" />
      }
    />
  );
}

/** Person-name input with title-case normalization (hyphens, apostrophes, accents, periods allowed). */
export function PersonNameField({ maxLength = MAX_NAME_LENGTH, onChange, ...rest }: BaseFieldProps & ValueProps) {
  return <TextField {...rest} maxLength={maxLength} onChange={(value) => onChange(cleanTitleInput(value))} />;
}

/**
 * Middle-name input with a No-middle-name checkbox. Checking the box clears
 * any typed value; the empty state is stored as null, never "N/A".
 */
export function MiddleNameField({
  noMiddleName,
  onNoMiddleNameChange,
  onChange,
  ...rest
}: BaseFieldProps & ValueProps & { noMiddleName: boolean; onNoMiddleNameChange: (checked: boolean) => void }) {
  return (
    <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-1.5">
      <PersonNameField {...rest} disabled={rest.disabled ?? noMiddleName} onChange={onChange} />
      <label className="tw:flex tw:min-h-11 tw:cursor-pointer tw:items-center tw:gap-2 tw:text-sm tw:sm:min-h-8">
        <Checkbox
          checked={noMiddleName}
          disabled={rest.disabled}
          onCheckedChange={(checked) => {
            onNoMiddleNameChange(checked);
            if (checked) onChange("");
          }}
        />
        No middle-name
      </label>
    </div>
  );
}
