"use client";

import { createElement, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Trash2, type LucideIcon } from "lucide-react";
import { Button, actionMenuClass, isDestructiveAction, type ActionVariant } from "@/shared/ui/button";
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

export type RowActionItem = {
  key: string;
  label: string;
  /** Colors the item: danger red, warning amber, success green, info blue. */
  tone?: RowActionTone;
  variant?: ActionVariant;
  /** Required: every menu item shows its own icon. */
  icon: LucideIcon;
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
            <DropdownMenuItem onClick={onEdit} className={cn(itemClass, actionMenuClass("warning"))}>
              <Pencil aria-hidden="true" /> Edit
            </DropdownMenuItem>
          ) : null}
          {extraItems.map((extra) => {
            const tone = extra.tone ?? (extra.danger ? "danger" : "default");
            return (
              <DropdownMenuItem
                key={extra.key}
                variant={tone === "danger" || isDestructiveAction(extra.variant) ? "destructive" : "default"}
                disabled={extra.disabled}
                aria-busy={extra.loading || undefined}
                onClick={extra.onClick}
                className={cn(itemClass, extra.variant ? actionMenuClass(extra.variant) : tone !== "default" && tone !== "danger" && TONE_CLASS[tone])}
              >
                {extra.loading ? <Spinner aria-hidden="true" /> : createElement(extra.icon, { "aria-hidden": true })}
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
            // The reason is not printed in the menu; choosing Delete explains it in a pop-up.
            <DropdownMenuItem variant="destructive" onClick={() => setNoticeOpen(true)} className={itemClass}>
              <Trash2 aria-hidden="true" /> Delete <span className="tw:sr-only">(unavailable)</span>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
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

