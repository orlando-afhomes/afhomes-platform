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

/** Central toast helpers so pages do not depend on Sonner's argument shape. */
export const notify = {
  success(message: string, description?: string) {
    toast.success(message, description ? { description } : undefined);
  },
  error(message: string, description?: string) {
    toast.error(message, description ? { description } : undefined);
  },
  info(message: string, description?: string) {
    toast(message, description ? { description } : undefined);
  },
};
