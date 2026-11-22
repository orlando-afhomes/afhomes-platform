"use client";

import { useEffect, useId, useRef, useState, type ComponentProps } from "react";
import { toast } from "sonner";
import { ChevronRight, MoreHorizontal, Pencil, Trash2, type LucideIcon } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { ConfirmDialog, NoticeDialog } from "./confirm-dialog";
import { cn } from "@/shared/lib/utils";

export type RowActionTone = "default" | "danger" | "warning" | "success" | "info";

// Item text and icon colors per tone, from the semantic tokens. `danger` uses the
// menu item's own destructive variant. Dark mode lifts the text toward white.
const TONE_CLASS: Record<Exclude<RowActionTone, "default" | "danger">, string> = {
  warning:
    "tw:text-warning tw:focus:bg-warning/10 tw:focus:text-warning tw:focus:**:text-warning tw:dark:text-[color-mix(in_oklch,var(--warning),white_45%)] tw:dark:focus:bg-warning/20",
  success:
    "tw:text-success tw:focus:bg-success/10 tw:focus:text-success tw:focus:**:text-success tw:dark:text-[color-mix(in_oklch,var(--success),white_45%)] tw:dark:focus:bg-success/20",
  info: "tw:text-info tw:focus:bg-info/10 tw:focus:text-info tw:focus:**:text-info tw:dark:text-[color-mix(in_oklch,var(--info),white_45%)] tw:dark:focus:bg-info/20",
};

/** Button color for a tone (same meaning as the menu item colors). */
export function toneButtonVariant(tone: RowActionTone | undefined): "outline" | "success" | "warning" | "info" | "destructive" {
  return tone === "danger" ? "destructive" : tone && tone !== "default" ? tone : "outline";
}

type RowActionButtonProps = Omit<ComponentProps<typeof Button>, "size" | "variant"> & {
  tone?: RowActionTone;
  icon?: LucideIcon;
};

export function RowActionButton({ tone, icon: Icon = ChevronRight, children, className, ...props }: RowActionButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant={toneButtonVariant(tone)}
      className={cn("tw:min-h-11 tw:gap-2 tw:rounded-lg tw:px-2.5 tw:sm:min-h-8", (!tone || tone === "default") && "tw:border-primary/20 tw:bg-card tw:text-primary tw:hover:border-primary/40 tw:hover:bg-(--color-brand-soft)", className)}
      {...props}
    >
      {children}
      <Icon aria-hidden="true" className="tw:size-3.5" />
    </Button>
  );
}

export type RowActionItem = {
  key: string;
  label: string;
  /** Colors the item: danger red, warning amber, success green, info blue. */
  tone?: RowActionTone;
  /** Same as `tone: "danger"`; kept for existing callers. */
  danger?: boolean;
  /** Blocks the action, for example while the same mutation is still running. */
  disabled?: boolean;
  /** Shows a spinner in place of the icon while this action is running. */
  loading?: boolean;
  onClick: () => void;
};

/**
 * Row action menu for migrated directory tables (Base UI Menu). Same contract
 * as the legacy menu: Edit, policy-filtered extra items,
 * and Delete.
 * Delete always asks for confirmation (AlertDialog), then reports through a
 * toast. When Delete is not allowed, `deleteDisabledReason` keeps it visible:
 * it is keyboard-focusable, announced as "Delete (unavailable)", never runs a
 * mutation, explains itself in visible text and in a notice, and focus returns
 * to the row trigger afterwards. The 44px trigger meets the mobile touch goal.
 */
export function RowActionsMenu({
  itemName,
  onEdit,
  extraItems = [],
  onDelete,
  deleteDisabledReason,
  deleteTitle,
  deleteDescription,
}: {
  itemName: string;
  onEdit?: () => void;
  extraItems?: RowActionItem[];
  onDelete?: () => void | Promise<unknown>;
  deleteDisabledReason?: string | null;
  deleteTitle?: string;
  deleteDescription?: string;
}) {
  const triggerId = useId();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const dialogWasOpen = useRef(false);
  const dialogOpen = confirmOpen || noticeOpen;

  // Base UI returns focus to the element that opened a dialog, but that was a
  // menu item, which unmounts on close. Once the dialog is gone, focus goes to
  // the row trigger.
  useEffect(() => {
    if (dialogOpen) {
      dialogWasOpen.current = true;
      return;
    }
    if (!dialogWasOpen.current) return;
    dialogWasOpen.current = false;
    // Base UI keeps the dialog mounted (and moves focus) through its close
    // transition, then restores focus to the detached menu item. Wait until the
    // dialog is really gone before focusing, retrying a few frames if needed.
    let frame = 0;
    let waited = 0;
    let attempts = 0;
    const tryFocus = () => {
      if (document.querySelector("[role='alertdialog']") && waited < 90) {
        waited += 1;
        frame = requestAnimationFrame(tryFocus);
        return;
      }
      const trigger = document.getElementById(triggerId);
      trigger?.focus();
      attempts += 1;
      if (trigger && document.activeElement !== trigger && attempts < 10) frame = requestAnimationFrame(tryFocus);
    };
    frame = requestAnimationFrame(tryFocus);
    return () => cancelAnimationFrame(frame);
  }, [dialogOpen, triggerId]);

  const hasLeadingItems = Boolean(onEdit || extraItems.length > 0);
  const hasDeleteEntry = Boolean(onDelete || deleteDisabledReason);
  if (!hasLeadingItems && !hasDeleteEntry) return null;
  const itemClass = "tw:min-h-11 tw:sm:min-h-8";
  const entryCount = (onEdit ? 1 : 0) + extraItems.length + (hasDeleteEntry ? 1 : 0);
  const single = extraItems[0];
  const singleTone = single ? (single.tone ?? (single.danger ? "danger" : "default")) : "default";

  const runDelete = async () => {
    if (!onDelete) return;
    setPending(true);
    try {
      await onDelete();
      setConfirmOpen(false);
      toast.success(`${itemName} deleted successfully.`);
    } catch (error) {
      setConfirmOpen(false);
      toast.error("Delete failed.", { description: error instanceof Error ? error.message : "Request failed." });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="tw:flex tw:justify-end">
      {entryCount === 1 ? (
        // One action only: show it directly instead of hiding it behind "...".
        <RowActionButton
          id={triggerId}
          tone={onEdit ? "default" : single ? singleTone : "danger"}
          icon={onEdit ? Pencil : single ? undefined : Trash2}
          loading={single?.loading}
          disabled={single?.disabled}
          aria-label={`${onEdit ? "Edit" : single ? single.label : "Delete"} ${itemName}`}
          onClick={onEdit ?? single?.onClick ?? (() => (onDelete ? setConfirmOpen(true) : setNoticeOpen(true)))}
        >
          {onEdit ? "Edit" : single ? single.label : "Delete"}
        </RowActionButton>
      ) : (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              id={triggerId}
              variant="outline"
              size="icon-sm"
              aria-label={`Actions for ${itemName}`}
              className="tw:size-11 tw:rounded-lg tw:border-transparent tw:bg-transparent tw:shadow-none tw:hover:border-primary/20 tw:hover:bg-(--color-brand-soft) tw:aria-expanded:border-primary/20 tw:aria-expanded:bg-(--color-brand-soft) tw:sm:size-8"
            />
          }
        >
          <MoreHorizontal aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="tw:min-w-44">
          {onEdit ? (
            <DropdownMenuItem onClick={onEdit} className={itemClass}>
              <Pencil aria-hidden="true" /> Edit
            </DropdownMenuItem>
          ) : null}
          {extraItems.map((extra) => {
            const tone = extra.tone ?? (extra.danger ? "danger" : "default");
            return (
              <DropdownMenuItem
                key={extra.key}
                variant={tone === "danger" ? "destructive" : "default"}
                disabled={extra.disabled}
                aria-busy={extra.loading || undefined}
                onClick={extra.onClick}
                className={tone === "default" || tone === "danger" ? itemClass : `${itemClass} ${TONE_CLASS[tone]}`}
              >
                {extra.loading ? <Spinner aria-hidden="true" /> : null}
                {extra.label}
              </DropdownMenuItem>
            );
          })}
          {hasDeleteEntry && hasLeadingItems ? <DropdownMenuSeparator /> : null}
          {onDelete ? (
            <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)} className={itemClass}>
              <Trash2 aria-hidden="true" /> Delete
            </DropdownMenuItem>
          ) : deleteDisabledReason ? (
            <>
              <DropdownMenuItem variant="destructive" onClick={() => setNoticeOpen(true)} className={itemClass}>
                <Trash2 aria-hidden="true" /> Delete <span className="tw:sr-only">(unavailable)</span>
              </DropdownMenuItem>
              <p role="note" className="tw:max-w-64 tw:px-2 tw:pb-1.5 tw:text-xs tw:text-muted-foreground">
                Delete unavailable: {deleteDisabledReason}
              </p>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      )}
      {onDelete ? (
        <ConfirmDialog
          open={confirmOpen}
          title={deleteTitle ?? `Delete ${itemName}?`}
          description={deleteDescription ?? "This action cannot be undone."}
          confirmText="Delete"
          danger
          tone="destructive"
          pending={pending}
          onConfirm={() => void runDelete()}
          onClose={() => setConfirmOpen(false)}
        />
      ) : null}
      {deleteDisabledReason ? (
        <NoticeDialog
          open={noticeOpen}
          title="Deletion unavailable"
          description={deleteDisabledReason}
          onClose={() => setNoticeOpen(false)}
        />
      ) : null}
    </div>
  );
}
