"use client";

import type { ReactNode } from "react";
import { TextAreaField } from "@/shared/forms/modern";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";

/** Shared dialog frame for forms: title, body, and a submit button with progress and an inline error. */
export function FormDialog({
  open,
  title,
  description,
  submitText,
  pending,
  error,
  onClose,
  onSubmit,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  submitText: string;
  pending?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!next && !pending ? onClose() : undefined)}>
      <DialogContent className="tw:max-h-[90vh] tw:overflow-y-auto tw:sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form
          className="tw:flex tw:flex-col tw:gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {children}
          {error ? (
            <p role="alert" className="tw:text-sm tw:text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={onClose} className="tw:min-h-11 tw:sm:min-h-8">
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="tw:min-h-11 tw:sm:min-h-8">
              {pending ? "Working…" : submitText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Dialog that collects a required reason before running an action. */
export function ReasonDialog({
  open,
  title,
  description,
  label = "Reason",
  confirmText = "Confirm",
  successText,
  danger,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description: string;
  label?: string;
  confirmText?: string;
  successText: string;
  danger?: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<unknown>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const submit = async () => {
    if (!reason.trim()) {
      setError(`${label} is required.`);
      return;
    }
    setPending(true);
    try {
      await onSubmit(reason.trim());
      toast.success(successText);
      setReason("");
      setError(undefined);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Request failed.");
    } finally {
      setPending(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(next) => (!next && !pending ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <TextAreaField label={label} required value={reason} onChange={setReason} error={error} />
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={onClose} className="tw:min-h-11 tw:sm:min-h-8">
            Cancel
          </Button>
          <Button variant={danger ? "destructive" : "default"} disabled={pending} onClick={() => void submit()} className="tw:min-h-11 tw:sm:min-h-8">
            {pending ? "Working…" : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
