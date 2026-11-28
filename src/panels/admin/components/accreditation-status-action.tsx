"use client";

import { EMPTY } from "@/shared/lib/empty-value";
import { useId, useState } from "react";
import { toast } from "sonner";
import { notify } from "@/shared/components/modern/app-toaster";
import type { AccreditationRecord } from "@/modules/accreditation/types";
import type { AccreditationStatusRequest } from "@/data/contracts/accreditation-repository";
import { transitionRequiresReason } from "@/modules/accreditation/transitions";
import { ACCREDITATION_ACTION_LABELS, resolveAccreditationDisplay } from "@/modules/sales-network/display";
import { useUpdateAccreditationStatus } from "@/data/queries";
import { StatusBadge, ToneBadge } from "@/shared/components/modern/status-badge";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

type ChangeCopy = {
  title: string;
  intro: string;
  okText: string;
  cancelText: string;
  successTitle: string;
  successText: string;
  errorTitle: string;
};

/** One accreditation status change waiting for confirmation. */
export type AccreditationChangeTarget = {
  recordId: string;
  current: "pending" | "active";
  requested: AccreditationStatusRequest;
  memberName: string;
  aaNumber: string | null;
};

/** Read-only accreditation status for a table cell: always a badge, never a control. */
export function AccreditationBadge({ records }: { records: readonly AccreditationRecord[] | undefined }) {
  const state = resolveAccreditationDisplay(records);
  if (state.kind === "none") return <ToneBadge>{EMPTY}</ToneBadge>;
  if (state.kind === "ambiguous") return <StatusBadge status="under_review" label="Review records" />;
  if (state.kind === "static") return <StatusBadge status={state.label} label={state.label} />;
  // Each state keeps its own color from the shared status map.
  return <StatusBadge status={state.value === "active" ? "accredited" : "pending"} label={ACCREDITATION_ACTION_LABELS[state.value]} />;
}

function copyFor(target: AccreditationChangeTarget): ChangeCopy {
  const { current, requested, memberName } = target;
  const sellerRef = target.aaNumber ?? "No accreditation number issued";
  if (requested === "cancel") {
    return {
      title: current === "pending" ? "Cancel Pending Accreditation?" : "Cancel Accreditation?",
      intro: `This will cancel the ${current === "pending" ? "pending " : ""}accreditation for seller ${memberName} (${sellerRef}). The seller's account, member record, Team, Parent, and existing accreditation number will remain unchanged.`,
      okText: "Confirm Cancellation",
      cancelText: current === "pending" ? "Keep Pending" : "Keep Accredited",
      successTitle: "Accreditation cancelled.",
      successText: "Status is now Cancelled.",
      errorTitle: "Cancellation failed.",
    };
  }
  if (requested === "pending") {
    return {
      title: "Revert Accreditation to Pending?",
      intro: `Change accreditation status from Accredited to Pending for seller ${memberName} (${sellerRef})? The seller will no longer qualify for accreditation-dependent activities. Historical records, Team, Parent, and accreditation number remain unchanged.`,
      okText: "Confirm Reversal",
      cancelText: "Keep Accredited",
      successTitle: "Accreditation reverted.",
      successText: "Status is now Pending.",
      errorTitle: "Reversal failed.",
    };
  }
  return {
    title: "Update Accreditation Status",
    intro: `Change accreditation status from ${ACCREDITATION_ACTION_LABELS[current]} to ${ACCREDITATION_ACTION_LABELS[requested]} for seller ${sellerRef}?`,
    okText: "Update",
    cancelText: "Cancel",
    successTitle: "Accreditation status updated.",
    successText: `Status is now ${ACCREDITATION_ACTION_LABELS[requested]}.`,
    errorTitle: "Status update failed.",
  };
}

/**
 * Confirmation for an accreditation status change started from a row menu. A
 * required reason must be filled before the change runs; the page owns the
 * target and renders this once.
 */
export function AccreditationChangeHost({ target, onClose }: { target: AccreditationChangeTarget | null; onClose: () => void }) {
  const updateStatus = useUpdateAccreditationStatus();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const reasonId = useId();
  const errorId = useId();
  const copy = target ? copyFor(target) : null;
  const needsReason = target ? transitionRequiresReason(target.current, target.requested) : false;
  const pending = updateStatus.isPending;

  const close = () => {
    setReason("");
    setError(null);
    onClose();
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!target || !copy) return;
    if (needsReason && !reason.trim()) {
      setError("Provide a reason for this status change.");
      return;
    }
    updateStatus
      .mutateAsync({ recordId: target.recordId, requested: target.requested, expectedPrevious: target.current, reason: needsReason ? reason.trim() : undefined })
      .then(
        () => {
          close();
          toast.success(copy.successTitle, { description: copy.successText });
        },
        (err: unknown) => {
          close();
          notify.actionError(err, copy.errorTitle);
        },
      );
  };

  return (
    <Dialog open={target !== null} onOpenChange={(next) => (!next && !pending ? close() : undefined)}>
      <DialogContent className="tw:sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy?.title ?? ""}</DialogTitle>
          <DialogDescription>{copy?.intro ?? ""}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="tw:flex tw:flex-col tw:gap-4" data-record-id={target?.recordId}>
          {needsReason ? (
            <div className="tw:flex tw:flex-col tw:gap-1.5">
              <Label htmlFor={reasonId}>
                Reason <span aria-hidden="true">*</span>
              </Label>
              <Textarea
                id={reasonId}
                rows={3}
                placeholder="Enter the reason for this change"
                value={reason}
                aria-required="true"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                onChange={(event) => {
                  setReason(event.target.value);
                  setError(null);
                }}
              />
              {error ? (
                <p id={errorId} role="alert" className="tw:text-sm tw:text-destructive">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} className="tw:min-h-11 tw:sm:min-h-8" onClick={close}>
              {copy?.cancelText ?? "Cancel"}
            </Button>
            <Button type="submit" loading={pending} className="tw:min-h-11 tw:sm:min-h-8">
              {copy?.okText ?? "Confirm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
