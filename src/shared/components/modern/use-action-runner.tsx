"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { notify } from "./app-toaster";

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
      notify.actionError(error, "Request failed.");
      return false;
    }
  }, []);
}
