"use client";

import { createElement, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "@/shared/components/modern/confirm-dialog";

/**
 * Shared sign-out flow: confirm, drop permission-scoped query data, leave for
 * login. Render `dialog` once next to the control that calls `logout`.
 */
export function useLogout(): { logout: () => void; dialog: ReactElement } {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const dialog = createElement(ConfirmDialog, {
    open,
    title: "Log out?",
    description: "You will be signed out of the admin console.",
    confirmText: "Log out",
    onConfirm: () => {
      setOpen(false);
      queryClient.clear();
      router.push("/login");
    },
    onClose: () => setOpen(false),
  });

  return { logout: () => setOpen(true), dialog };
}
