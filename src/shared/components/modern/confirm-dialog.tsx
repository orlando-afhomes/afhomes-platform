"use client";

import { AppAlert, type ConfirmTone } from "./app-alert";

/**
 * Controlled confirmation, shown with SweetAlert2 through the shared AppAlert.
 * The confirm button never closes the pop-up itself: the caller runs its
 * action, then closes, so a failed action keeps the context and the button
 * shows progress.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Confirm",
  danger = false,
  tone,
  pending = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  danger?: boolean;
  tone?: ConfirmTone;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AppAlert
      open={open}
      title={title}
      description={description}
      confirmText={confirmText}
      cancelText="Cancel"
      danger={danger}
      tone={tone}
      pending={pending}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}

/** Information-only pop-up with a single acknowledgement (replaces a blocking informational modal). */
export function NoticeDialog({
  open,
  title,
  description,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
}) {
  return <AppAlert open={open} title={title} description={description} confirmText="OK" onConfirm={onClose} onClose={onClose} />;
}
