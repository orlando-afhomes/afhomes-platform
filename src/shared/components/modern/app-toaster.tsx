"use client";

import { Toaster as SharedToaster } from "@/shared/ui/sonner";
import { toast } from "sonner";

/**
 * Single toast host for a panel layout. Mount once per layout (admin, public
 * only if public flows emit toasts) instead of once per page.
 */
export function AppToaster({ position = "top-right" }: { position?: "top-right" | "bottom-right" | "top-center" | "bottom-center" }) {
  return <SharedToaster position={position} />;
}

const GENERIC_VALIDATION = /^(review|check) the highlighted fields\.$/i;
const NETWORK_FAILURE = /failed to fetch|load failed|network ?error/i;

/** The most specific reason a failed action carries; undefined when only a generic summary exists. */
export function failureReason(failure: unknown): string | undefined {
  const carrier = failure as { errors?: Record<string, string | undefined>; fields?: Record<string, string | undefined> } | null;
  const fields = carrier?.errors ?? carrier?.fields;
  const messages = fields ? [...new Set(Object.values(fields).filter((value): value is string => Boolean(value)))] : [];
  if (messages.length > 0) return messages.join(" ");
  if (failure instanceof Error) {
    const message = failure.message.trim();
    if (NETWORK_FAILURE.test(message)) return "Could not reach the server. Check your connection and try again.";
    return message && !GENERIC_VALIDATION.test(message) ? message : undefined;
  }
  return undefined;
}

/** Central toast helpers so pages do not depend on Sonner's argument shape. */
export const notify = {
  success(message: string, description?: string) {
    toast.success(message, description ? { description } : undefined);
  },
  error(message: string, description?: string) {
    toast.error(message, { duration: 8000, ...(description ? { description } : {}) });
  },
  /** Titles the toast with the action and describes the real reason, never a generic summary. */
  actionError(failure: unknown, fallback: string) {
    const reason = failureReason(failure);
    toast.error(fallback, { duration: 8000, ...(reason ? { description: reason } : {}) });
  },
  warning(message: string, description?: string) {
    toast.warning(message, { duration: 8000, ...(description ? { description } : {}) });
  },
  info(message: string, description?: string) {
    toast.info(message, description ? { description } : undefined);
  },
};
