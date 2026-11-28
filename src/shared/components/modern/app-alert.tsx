"use client";

import { createElement, useCallback, useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import Swal, { type SweetAlertOptions } from "sweetalert2";
import { buttonVariants } from "@/shared/ui/button";
import { iconForLabel } from "@/shared/ui/button-icons";
import { Spinner } from "@/shared/ui/spinner";
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

/** Color of the confirm button by purpose: Approve = success, Send back = warning, Reject/Delete = destructive. */
export type ConfirmTone = "default" | "success" | "warning" | "destructive" | "info";

/** Shared SweetAlert2 options: no default button styling, shadcn button classes, namespaced theme classes. */
export function appAlertOptions(danger = false, tone?: ConfirmTone): SweetAlertOptions {
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
      confirmButton: buttonVariants({ variant: tone ?? (danger ? "destructive" : "default"), className: BUTTON_SIZE }),
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
  /** Confirm button color; overrides `danger` for the button (default keeps today's look). */
  tone?: ConfirmTone;
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
  const confirmRoot = useRef<Root | null>(null);
  const confirmLabel = useRef("");
  useEffect(() => {
    latest.current = props;
  });

  // The confirm button keeps its label while pending so its width does not jump.
  const renderConfirm = useCallback((busy: boolean) => {
    if (!confirmRoot.current) return;
    const Icon = busy ? null : iconForLabel(confirmLabel.current);
    confirmRoot.current.render(
      createElement(
        "span",
        { style: { display: "inline-flex", alignItems: "center", gap: "0.5rem" } },
        busy ? createElement(Spinner, { "aria-hidden": true }) : null,
        Icon ? createElement(Icon, { "aria-hidden": true }) : null,
        createElement("span", null, confirmLabel.current),
      ),
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    const first = latest.current;
    let closedByApp = false;
    const blocked = () => latest.current.pending === true;
    const iconRoots: Root[] = [];
    const base = appAlertOptions(first.danger, first.tone);
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
        const confirmButton = Swal.getConfirmButton();
        if (confirmButton) {
          confirmLabel.current = (confirmButton.textContent ?? "").trim();
          confirmButton.textContent = "";
          const holder = document.createElement("span");
          holder.style.display = "contents";
          confirmButton.append(holder);
          confirmRoot.current = createRoot(holder);
          iconRoots.push(confirmRoot.current);
          renderConfirm(first.pending ?? false);
        }
        // Cancel and deny show the icon that matches their label, like every other button.
        for (const button of [Swal.getCancelButton(), Swal.getDenyButton()]) {
          const Icon = button ? iconForLabel(button.textContent ?? "") : undefined;
          if (!button || !Icon) continue;
          const holder = document.createElement("span");
          holder.style.display = "contents";
          button.prepend(holder);
          const root = createRoot(holder);
          root.render(createElement(Icon, { "aria-hidden": true }));
          iconRoots.push(root);
        }
      },
    });
    const popup = Swal.getPopup();
    void result.then((outcome) => {
      if (!closedByApp && outcome.isDismissed) latest.current.onClose();
    });
    return () => {
      closedByApp = true;
      setTimeout(() => {
        iconRoots.forEach((root) => root.unmount());
        confirmRoot.current = null;
      });
      if (popup && Swal.getPopup() === popup) Swal.close();
    };
  }, [open, renderConfirm]);

  useEffect(() => {
    if (!open) return;
    const confirmButton = Swal.getConfirmButton();
    if (confirmButton) {
      confirmButton.disabled = pending;
      if (pending) confirmButton.setAttribute("aria-busy", "true");
      else confirmButton.removeAttribute("aria-busy");
    }
    for (const button of [Swal.getCancelButton(), Swal.getDenyButton()]) {
      if (button) button.disabled = pending;
    }
    renderConfirm(pending);
  }, [open, pending, renderConfirm]);

  return null;
}
