"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { confirmAction } from "@/shared/utils/feedback";

/** Shared sign-out flow: confirm, drop permission-scoped query data, leave for login. */
export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return () => {
    void (async () => {
      const confirmed = await confirmAction({
        title: "Log out?",
        text: "You will be signed out of the admin console.",
        confirmText: "Log out",
      });
      if (!confirmed) return;
      queryClient.clear();
      router.push("/login");
    })();
  };
}
