"use client";

import { useId, type ReactNode } from "react";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";

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
      {required ? <span aria-hidden="true"> *</span> : null}
    </>
  );
  return (
    <div className={cn("tw:flex tw:min-w-0 tw:flex-col tw:gap-1.5", className)}>
      {labelFor ? <Label htmlFor={ids.id}>{caption}</Label> : <Label>{caption}</Label>}
      {children}
      {error ? (
        <p id={ids.errorId} role="alert" className="tw:text-sm tw:text-destructive">
          {error}
        </p>
      ) : null}
      {hint && !error ? (
        <p id={ids.hintId} className="tw:text-xs tw:text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
