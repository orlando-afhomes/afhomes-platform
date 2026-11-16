"use client";

import type { ReactNode } from "react";
import type { ConfirmTone } from "./app-alert";
import { TextAreaField } from "@/shared/forms/modern";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";

/** Shared dialog frame for forms: title, body, and a submit button with progress and an inline error. */
export function FormDialog({
  open,
  title,
  description,
  submitText,
  submitVariant = "default",
  size = "md",
  scrollBody = false,
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
  /** Color of the submit button by purpose (default = main action). */
  submitVariant?: ConfirmTone;
  /** md = standard width, lg = wide dialog for large forms. */
  size?: "md" | "lg";
  /** Scroll the fields while keeping the dialog title and actions visible. */
  scrollBody?: boolean;
  pending?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!next && !pending ? onClose() : undefined)}>
      <DialogContent className={cn(
        size === "lg" ? "tw:sm:max-w-3xl" : "tw:sm:max-w-xl",
        scrollBody
          ? "tw:flex tw:max-h-[calc(100dvh-2rem)] tw:flex-col tw:gap-0 tw:overflow-hidden tw:p-0"
          : "tw:max-h-[90vh] tw:overflow-y-auto",
      )}>
        <DialogHeader className={scrollBody ? "tw:shrink-0 tw:border-b tw:py-4 tw:pr-12 tw:pl-5 tw:sm:pl-6" : undefined}>
          <DialogTitle className={scrollBody ? "tw:text-lg tw:leading-tight tw:font-semibold" : undefined}>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form
          className={cn("tw:flex tw:flex-col", scrollBody ? "tw:min-h-0 tw:flex-1" : "tw:gap-3")}
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {scrollBody ? (
            <div className="tw:flex tw:min-h-0 tw:flex-1 tw:flex-col tw:gap-5 tw:overflow-y-auto tw:overscroll-contain tw:px-5 tw:py-5 tw:sm:px-6">
              {children}
            </div>
          ) : children}
          {error ? (
            <p role="alert" className={cn("tw:text-sm tw:text-destructive", scrollBody && "tw:px-5 tw:py-2 tw:sm:px-6")}>
              {error}
            </p>
          ) : null}
          <DialogFooter className={scrollBody ? "tw:m-0 tw:shrink-0 tw:flex-row tw:justify-end tw:px-5 tw:py-3 tw:sm:px-6" : undefined}>
            <Button type="button" variant="outline" disabled={pending} onClick={onClose} className="tw:min-h-11 tw:sm:min-h-8">
              Cancel
            </Button>
            <Button type="submit" variant={submitVariant} loading={pending} className="tw:min-h-11 tw:sm:min-h-8">
              {submitText}
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
  tone,
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
  /** Confirm button color by purpose; overrides `danger` for the button. */
  tone?: ConfirmTone;
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
          <Button variant={tone ?? (danger ? "destructive" : "default")} loading={pending} onClick={() => void submit()} className="tw:min-h-11 tw:sm:min-h-8">
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
