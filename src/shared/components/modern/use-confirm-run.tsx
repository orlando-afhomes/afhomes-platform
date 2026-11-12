"use client";

import { useCallback, useState, type ReactElement } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "./confirm-dialog";

export type ConfirmRunInput = {
  title: string;
  description: string;
  confirmText?: string;
  danger?: boolean;
  action: () => unknown;
  successTitle: string;
  successDescription?: string;
  errorTitle: string;
};

/**
 * Asks first (SweetAlert2 through the shared AppAlert), shows progress on the
 * confirm button while the action runs,
 * then reports through a toast. Render `dialog` once in the owning component.
 * A failed action closes the dialog and shows the error, as before.
 */
export function useConfirmRun(): { confirmRun: (input: ConfirmRunInput) => void; dialog: ReactElement } {
  const [input, setInput] = useState<ConfirmRunInput | null>(null);
  const [pending, setPending] = useState(false);
  // Keeps the last text visible while the dialog animates closed.
  const [last, setLast] = useState<ConfirmRunInput | null>(null);
  const shown = input ?? last;

  const confirmRun = useCallback((next: ConfirmRunInput) => {
    setInput(next);
    setLast(next);
  }, []);

  const run = async () => {
    if (!input) return;
    setPending(true);
    try {
      await input.action();
      setInput(null);
      toast.success(input.successTitle, input.successDescription ? { description: input.successDescription } : undefined);
    } catch (error) {
      setInput(null);
      toast.error(input.errorTitle, { description: error instanceof Error ? error.message : "Request failed." });
    } finally {
      setPending(false);
    }
  };

  const dialog = (
    <ConfirmDialog
      open={input !== null}
      title={shown?.title ?? ""}
      description={shown?.description ?? ""}
      confirmText={shown?.confirmText}
      danger={shown?.danger}
      pending={pending}
      onConfirm={() => void run()}
      onClose={() => setInput(null)}
    />
  );
  return { confirmRun, dialog };
}
