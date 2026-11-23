"use client";

import { useId, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";
import { HintTip } from "./hint-tip";

export type FieldShellIds = { id: string; errorId: string; hintId: string };

/** Stable ids for a field; an explicit `id` wins so tests and labels stay predictable. */
export function useFieldIds(explicitId?: string): FieldShellIds {
  const generated = useId();
  const id = explicitId ?? generated;
  return { id, errorId: `${id}-error`, hintId: `${id}-hint` };
}

/** Value for aria-describedby: the visible error first, then the hint. */
export function describedBy(ids: FieldShellIds, error?: string, hint?: string): string | undefined {
  return [error ? ids.errorId : null, hint && !error ? ids.hintId : null].filter(Boolean).join(" ") || undefined;
}

/**
 * Label, required marker, inline error (role="alert"), and hint around one
 * control. The control carries aria-invalid and aria-describedby itself.
 */
export function FieldShell({
  ids,
  label,
  required,
  error,
  hint,
  className,
  labelFor = true,
  children,
}: {
  ids: FieldShellIds;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  /** False for controls without a native labelable element (the label is then a plain caption). */
  labelFor?: boolean;
  children: ReactNode;
}) {
  const caption = (
    <>
      {label}
      {required ? <span aria-hidden="true" className="tw:-ml-1 tw:text-destructive">*</span> : null}
    </>
  );
  return (
    <div className={cn("tw:flex tw:min-w-0 tw:flex-col tw:gap-2", className)}>
      {/* Same height with or without the field-guide icon (size-5), so side-by-side fields line up. */}
      <div className="tw:flex tw:min-h-5 tw:min-w-0 tw:items-center tw:gap-1.5">
        {labelFor ? <Label id={`${ids.id}-label`} htmlFor={ids.id}>{caption}</Label> : <Label id={`${ids.id}-label`}>{caption}</Label>}
        {hint ? <HintTip labelId={`${ids.id}-label`} text={hint} /> : null}
      </div>
      {children}
      {error ? (
        <p id={ids.errorId} role="alert" className="tw:flex tw:items-start tw:gap-1.5 tw:text-sm tw:text-destructive">
          <CircleAlert aria-hidden="true" className="tw:mt-0.5 tw:size-4 tw:shrink-0" />
          {error}
        </p>
      ) : null}
      {/* The guide note lives in the info icon; keep the accessible description in the DOM. */}
      {hint ? (
        <p id={ids.hintId} className="tw:sr-only">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
