"use client";

import { useCallback, useState, type RefObject } from "react";

/**
 * Inline validation for dialog forms. The owner passes every rule's current
 * message each render; `visible(key)` shows a message once the form was
 * submitted, or live for fields listed in `live` (those already holding
 * input). `reveal` runs on submit: it shows everything, moves focus to the
 * first invalid control, and reports whether the form is valid.
 */
export function useFormErrors(
  rules: Record<string, string | null | undefined>,
  live: Record<string, boolean> = {},
  formRef?: RefObject<HTMLElement | null>,
) {
  const [showAll, setShowAll] = useState(false);
  const hasErrors = Object.values(rules).some(Boolean);

  const visible = useCallback(
    (key: string): string | undefined => (showAll || live[key] ? (rules[key] ?? undefined) : undefined),
    [showAll, live, rules],
  );

  const reveal = (): boolean => {
    setShowAll(true);
    if (hasErrors) {
      requestAnimationFrame(() => formRef?.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return false;
    }
    return true;
  };

  return { visible, reveal, hasErrors };
}
