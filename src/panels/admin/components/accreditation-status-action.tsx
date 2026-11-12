"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronDown } from "lucide-react";
import type { AccreditationRecord } from "@/modules/accreditation/types";
import type { AccreditationStatusRequest } from "@/data/contracts/accreditation-repository";
import { transitionRequiresReason } from "@/modules/accreditation/transitions";
import { ACCREDITATION_ACTION_LABELS, resolveAccreditationDisplay } from "@/modules/sales-network/display";
import { useIssuePendingAccreditation, useUpdateAccreditationStatus } from "@/data/queries";
import { ConfirmDialog } from "@/shared/components/modern/confirm-dialog";
import { ToneBadge } from "@/shared/components/modern/status-badge";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { cn } from "@/shared/lib/utils";
import { toneFromColor } from "@/shared/components/business/designation-badge";

const DOT_CLASSES = {
  pending: "tw:bg-warning",
  accredited: "tw:bg-success",
  cancelled: "tw:bg-destructive",
  expired: "tw:bg-muted-foreground",
} as const;

function StatusDot({ status }: { status: keyof typeof DOT_CLASSES }) {
  return <span aria-hidden="true" className={cn("tw:inline-block tw:size-2 tw:rounded-full", DOT_CLASSES[status])} />;
}

type ChangeCopy = {
  title: string;
  intro: string;
  okText: string;
  cancelText: string;
  successTitle: string;
  successText: string;
  errorTitle: string;
};

/**
 * Permission-controlled accreditation status action shared by the Members
 * table and the member detail page. Renders a status menu for mutable
 * records, a truthful read-only badge otherwise, and a gated Set
 * Accreditation control when no record exists.
 */
export function AccreditationStatusAction({
  records,
  aaNumber,
  canEdit,
  memberId,
  memberName,
}: {
  records: readonly AccreditationRecord[] | undefined;
  aaNumber: string | null;
  canEdit: boolean;
  memberId: string;
  memberName: string;
}) {
  const updateStatus = useUpdateAccreditationStatus();
  const issuePending = useIssuePendingAccreditation();
  const state = resolveAccreditationDisplay(records);
  const busy = updateStatus.isPending || issuePending.isPending;
  const [createOpen, setCreateOpen] = useState(false);
  const [change, setChange] = useState<{ requested: AccreditationStatusRequest; needsReason: boolean; copy: ChangeCopy } | null>(null);

  if (state.kind === "none") {
    if (!canEdit) return <ToneBadge>No record</ToneBadge>;
    return (
      <>
        <Button type="button" size="sm" variant="outline" loading={issuePending.isPending} disabled={busy} className="tw:min-h-11 tw:min-w-33 tw:sm:min-h-7" onClick={() => setCreateOpen(true)}>
          Set Accreditation
        </Button>
        <ConfirmDialog
          open={createOpen}
          title="Create Pending Accreditation"
          description={`Create a pending accreditation with automatic AA issuance for seller ${memberName}?`}
          confirmText="Create"
          pending={issuePending.isPending}
          onConfirm={() => {
            void issuePending.mutateAsync(memberId).then(
              (record) => {
                setCreateOpen(false);
                toast.success("Pending accreditation created.", {
                  description: `Issued ${record.aaNumber ?? "AA number"}. Accreditation stays Pending until approval.`,
                });
              },
              (err: unknown) => {
                setCreateOpen(false);
                toast.error("Creation failed.", { description: err instanceof Error ? err.message : "Failed to create accreditation." });
              },
            );
          }}
          onClose={() => setCreateOpen(false)}
        />
      </>
    );
  }

  if (state.kind === "ambiguous") return <ToneBadge tone="warning">Review records</ToneBadge>;

  if (state.kind === "static" || !canEdit) {
    const label = state.kind === "static" ? state.label : ACCREDITATION_ACTION_LABELS[state.value];
    const tone = state.kind === "static" ? (state.color ? toneFromColor(state.color) : "neutral") : state.value === "active" ? "success" : "warning";
    return <ToneBadge tone={tone}>{label}</ToneBadge>;
  }

  const current = state.value;
  const sellerRef = aaNumber ?? "No AA issued";

  const requestUpdate = (requested: AccreditationStatusRequest) => {
    if (requested === current || busy) return;
    const needsReason = transitionRequiresReason(current, requested);
    const copy: ChangeCopy =
      requested === "cancel"
        ? {
            title: current === "pending" ? "Cancel Pending Accreditation?" : "Cancel Accreditation?",
            intro: `This will cancel the ${current === "pending" ? "pending " : ""}accreditation for seller ${memberName} (${sellerRef}). The seller's account, member record, Team, Parent, and existing AA number will remain unchanged.`,
            okText: "Confirm Cancellation",
            cancelText: current === "pending" ? "Keep Pending" : "Keep Accredited",
            successTitle: "Accreditation cancelled.",
            successText: "Status is now Cancelled.",
            errorTitle: "Cancellation failed.",
          }
        : requested === "pending"
          ? {
              title: "Revert Accreditation to Pending?",
              intro: `Change accreditation status from Accredited to Pending for seller ${memberName} (${sellerRef})? The seller will no longer qualify for accreditation-dependent activities. Historical records, Team, Parent, and AA number remain unchanged.`,
              okText: "Confirm Reversal",
              cancelText: "Keep Accredited",
              successTitle: "Accreditation reverted.",
              successText: "Status is now Pending.",
              errorTitle: "Reversal failed.",
            }
          : {
              title: "Update Accreditation Status",
              intro: `Change accreditation status from ${ACCREDITATION_ACTION_LABELS[current]} to ${ACCREDITATION_ACTION_LABELS[requested]} for seller ${sellerRef}?`,
              okText: "Update",
              cancelText: "Cancel",
              successTitle: "Accreditation status updated.",
              successText: `Status is now ${ACCREDITATION_ACTION_LABELS[requested]}.`,
              errorTitle: "Status update failed.",
            };
    setChange({ requested, needsReason, copy });
  };

  const itemClass = "tw:min-h-11 tw:sm:min-h-8";
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={busy}
          render={
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={`Accreditation status: ${ACCREDITATION_ACTION_LABELS[current]}. Activate to change.`}
              className="tw:group/accreditation-trigger tw:min-h-11 tw:min-w-36 tw:justify-between tw:gap-1.5 tw:rounded-lg tw:border-input tw:bg-card tw:pr-2.5 tw:pl-3 tw:font-normal tw:text-foreground tw:shadow-(--shadow-soft) tw:hover:border-foreground/30 tw:hover:bg-card tw:focus-visible:border-ring tw:focus-visible:ring-3 tw:focus-visible:ring-ring/30 tw:sm:min-h-8"
            />
          }
        >
          <StatusDot status={current === "active" ? "accredited" : current} />
          {ACCREDITATION_ACTION_LABELS[current]}
          {busy ? (
            <Spinner className="tw:ml-auto tw:size-4 tw:shrink-0 tw:text-muted-foreground" />
          ) : (
            <ChevronDown aria-hidden="true" className="tw:ml-auto tw:size-4 tw:shrink-0 tw:text-muted-foreground tw:transition-transform tw:duration-150 tw:group-data-popup-open/accreditation-trigger:rotate-180" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem disabled={current === "pending"} onClick={() => requestUpdate("pending")} title={current === "pending" ? "Current status" : "Revert to Pending (reason required)"} className={itemClass}>
            <StatusDot status="pending" /> {ACCREDITATION_ACTION_LABELS.pending}
            {current === "pending" ? <Check aria-hidden="true" className="tw:ml-auto tw:size-4" /> : null}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={current === "active"} onClick={() => requestUpdate("active")} title={current === "active" ? "Current status" : undefined} className={itemClass}>
            <StatusDot status="accredited" /> {ACCREDITATION_ACTION_LABELS.active}
            {current === "active" ? <Check aria-hidden="true" className="tw:ml-auto tw:size-4" /> : null}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={current !== "pending" && current !== "active"}
            onClick={() => requestUpdate("cancel")}
            title="Cancel this accreditation (reason required)"
            className={itemClass}
          >
            <StatusDot status="cancelled" /> {ACCREDITATION_ACTION_LABELS.cancel}
          </DropdownMenuItem>
          <DropdownMenuItem disabled title="Expiry is date-derived" className={itemClass}>
            <StatusDot status="expired" /> {ACCREDITATION_ACTION_LABELS.expired}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangeDialog
        key={change ? `${change.requested}-${current}` : "closed"}
        change={change}
        recordId={state.recordId}
        pending={updateStatus.isPending}
        onClose={() => setChange(null)}
        onConfirm={(reason) => {
          if (!change) return;
          updateStatus
            .mutateAsync({ recordId: state.recordId, requested: change.requested, expectedPrevious: current, reason: change.needsReason ? reason : undefined })
            .then(
              () => {
                setChange(null);
                toast.success(change.copy.successTitle, { description: change.copy.successText });
              },
              (err: unknown) => {
                setChange(null);
                toast.error(change.copy.errorTitle, { description: err instanceof Error ? err.message : "Failed to update status." });
              },
            );
        }}
      />
    </>
  );
}

/** Confirmation for a status change; a required reason must be filled before the action can run. */
function ChangeDialog({
  change,
  recordId,
  pending,
  onClose,
  onConfirm,
}: {
  change: { requested: AccreditationStatusRequest; needsReason: boolean; copy: ChangeCopy } | null;
  recordId: string;
  pending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const reasonId = useId();
  const errorId = useId();
  const copy = change?.copy;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (change?.needsReason && !reason.trim()) {
      setError("Provide a reason for this status change.");
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <Dialog open={change !== null} onOpenChange={(next) => (!next && !pending ? onClose() : undefined)}>
      <DialogContent className="tw:sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy?.title ?? ""}</DialogTitle>
          <DialogDescription>{copy?.intro ?? ""}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="tw:flex tw:flex-col tw:gap-4" data-record-id={recordId}>
          {change?.needsReason ? (
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
            <Button type="button" variant="outline" disabled={pending} className="tw:min-h-11 tw:sm:min-h-8" onClick={onClose}>
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
