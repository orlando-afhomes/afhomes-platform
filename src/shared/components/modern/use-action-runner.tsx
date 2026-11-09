"use client";

import { useCallback } from "react";
import { toast } from "sonner";

/**
 * Runs an async action and reports through toasts; returns whether it
 * succeeded. Central replacement for ad-hoc try/catch + toast blocks.
 */
export function useActionRunner() {
  return useCallback(async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
    try {
      await action();
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed.");
      return false;
    }
  }, []);
}
