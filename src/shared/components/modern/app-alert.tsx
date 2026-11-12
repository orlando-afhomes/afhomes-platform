"use client";

import { useEffect, useRef } from "react";
import Swal, { type SweetAlertOptions } from "sweetalert2";
import { buttonVariants } from "@/shared/ui/button";
import "./app-alert.css";

/**
 * Centralized SweetAlert2 pop-up. Every confirmation, discard prompt and notice in
 * the app goes through this component (directly, or through ConfirmDialog,
 * NoticeDialog and useConfirmRun) so they look and behave the same way.
 * Form dialogs with fields stay on the Base UI Dialog; toasts stay on Sonner.
 *
 * Controlled like the dialog it replaces: the caller owns `open`. The confirm
 * button never closes the pop-up itself. The caller runs its action, then sets
 * `open` to false, so a failed action keeps the context and `pending` shows
 * progress on the confirm button.
 */

const BUTTON_SIZE = "tw:min-h-11 tw:sm:min-h-8";

/** Shared SweetAlert2 options: no default button styling, shadcn button classes, namespaced theme classes. */
export function appAlertOptions(danger = false): SweetAlertOptions {
  return {
    buttonsStyling: false,
    reverseButtons: true,
    focusConfirm: true,
    customClass: {
      container: "app-alert__container",
      popup: "app-alert__popup",
      title: "app-alert__title",
      htmlContainer: "app-alert__body",
      actions: "app-alert__actions",
      confirmButton: buttonVariants({ variant: danger ? "destructive" : "default", className: BUTTON_SIZE }),
      denyButton: buttonVariants({ variant: "destructive", className: BUTTON_SIZE }),
      cancelButton: buttonVariants({ variant: "outline", className: BUTTON_SIZE }),
    },
  };
}

export type AppAlertProps = {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  /** Omit to hide the cancel button (information-only notice). */
  cancelText?: string;
  /** Provide to show a third, destructive button (for example "Discard all Changes"). */
  denyText?: string;
  danger?: boolean;
  /** Shows progress on the confirm button and blocks dismissal while the caller's action runs. */
  pending?: boolean;
  onConfirm: () => void;
  onDeny?: () => void;
  /** Called when the user cancels, presses Escape or clicks outside (never while pending). */
  onClose: () => void;
};

export function AppAlert(props: AppAlertProps) {
  const { open, pending = false } = props;
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  useEffect(() => {
    if (!open) return;
    const first = latest.current;
    let closedByApp = false;
    const blocked = () => latest.current.pending === true;
    const base = appAlertOptions(first.danger);
    const result = Swal.fire({
      ...base,
      title: first.title,
      text: first.description,
      icon: first.danger ? "warning" : undefined,
      showCancelButton: first.cancelText !== undefined,
      showDenyButton: first.denyText !== undefined,
      confirmButtonText: first.confirmText ?? "Confirm",
      cancelButtonText: first.cancelText,
      denyButtonText: first.denyText,
      allowOutsideClick: () => !blocked(),
      allowEscapeKey: () => !blocked(),
      returnFocus: true,
      // Keep the pop-up open; the caller closes it by setting `open` to false.
      preConfirm: () => {
        latest.current.onConfirm();
        return false;
      },
      preDeny: () => {
        latest.current.onDeny?.();
        return false;
      },
      didOpen: (popup) => {
        // A confirmation interrupts the user, so announce it as an alert dialog.
        popup.setAttribute("role", "alertdialog");
      },
    });
    const popup = Swal.getPopup();
    void result.then((outcome) => {
      if (!closedByApp && outcome.isDismissed) latest.current.onClose();
    });
    return () => {
      closedByApp = true;
      if (popup && Swal.getPopup() === popup) Swal.close();
    };
  }, [open]);

  useEffect(() => {
    if (!open || !Swal.isVisible()) return;
    if (pending) Swal.showLoading();
    else if (Swal.getPopup()?.hasAttribute("data-loading")) Swal.hideLoading();
  }, [open, pending]);

  return null;
}
