"use client";

import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { ConfirmDialog, NoticeDialog } from "./confirm-dialog";

export type RowActionItem = {
  key: string;
  label: string;
  danger?: boolean;
  onClick: () => void;
};

/**
 * Row action menu for migrated directory tables (Base UI Menu). Same contract
 * as the legacy menu: View, Edit, policy-filtered extra items, and Delete.
 * Delete always asks for confirmation (AlertDialog), then reports through a
 * toast. When Delete is not allowed, `deleteDisabledReason` keeps it visible:
 * it is keyboard-focusable, announced as "Delete (unavailable)", never runs a
 * mutation, explains itself in visible text and in a notice, and focus returns
 * to the row trigger afterwards. The 44px trigger meets the mobile touch goal.
 */
export function RowActionsMenu({
  itemName,
  onView,
  onEdit,
  extraItems = [],
  onDelete,
  deleteDisabledReason,
  deleteTitle,
  deleteDescription,
}: {
  itemName: string;
  onView?: () => void;
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

  const hasLeadingItems = Boolean(onView || onEdit || extraItems.length > 0);
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
              variant="ghost"
              size="icon"
              aria-label={`Actions for ${itemName}`}
              className="tw:size-11 tw:sm:size-8"
            />
          }
        >
          <MoreHorizontal aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="tw:min-w-44">
          {onView ? (
            <DropdownMenuItem onClick={onView} className={itemClass}>
              <Eye aria-hidden="true" /> View
            </DropdownMenuItem>
          ) : null}
          {onEdit ? (
            <DropdownMenuItem onClick={onEdit} className={itemClass}>
              <Pencil aria-hidden="true" /> Edit
            </DropdownMenuItem>
          ) : null}
          {extraItems.map((extra) => (
            <DropdownMenuItem
              key={extra.key}
              variant={extra.danger ? "destructive" : "default"}
              onClick={extra.onClick}
              className={itemClass}
            >
              {extra.label}
            </DropdownMenuItem>
          ))}
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
      {onDelete ? (
        <ConfirmDialog
          open={confirmOpen}
          title={deleteTitle ?? `Delete ${itemName}?`}
          description={deleteDescription ?? "This action cannot be undone."}
          confirmText="Delete"
          danger
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
