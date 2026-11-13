"use client";

import { createElement, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { MOCK_ACCOUNTS } from "@/data/mock/mock-credentials";
import { ConfirmDialog } from "@/shared/components/modern/confirm-dialog";

/**
 * Shared sign-out flow: confirm, drop permission-scoped query data, leave for
 * login. Render `dialog` once next to the control that calls `logout`.
 */
export function useLogout(): { logout: () => void; dialog: ReactElement } {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { signOut, identity } = useDevIdentity();
  const [open, setOpen] = useState(false);

  const dialog = createElement(ConfirmDialog, {
    open,
    title: "Log out?",
    description: "You will be signed out of the admin console.",
    confirmText: "Log out",
    onConfirm: () => {
      setOpen(false);
      queryClient.clear();
      signOut();
      // Sales accounts sign in at their own page.
      const isSales = MOCK_ACCOUNTS.find((account) => account.identityId === identity.id)?.portal === "sales";
      router.replace(isSales ? "/login/sales" : "/login");
    },
    onClose: () => setOpen(false),
  });

  return { logout: () => setOpen(true), dialog };
}
