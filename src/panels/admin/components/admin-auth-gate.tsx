"use client";

// shortcut: mock login only, remove when real authentication (Better Auth/API) is implemented
import type { ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { AdminShellSkeleton } from "@/shared/components/modern/skeletons";
import { StatusLink, StatusPage } from "@/shared/components/status/status-page";
import { safeReturnPath } from "@/shared/lib/safe-return-path";

export function AdminAuthGate({ children }: { children: ReactNode }) {
  const { status } = useDevIdentity();
  const pathname = usePathname();
  const search = useSearchParams()?.toString();

  if (status === "signed-out") {
    // Remember where the user was going; only a safe same-origin admin path is kept.
    const requested = safeReturnPath(`${pathname ?? "/admin"}${search ? `?${search}` : ""}`);
    const query = requested === "/admin" ? "" : `?next=${encodeURIComponent(requested)}`;
    return (
      <StatusPage variant="401">
        <StatusLink href={`/login${query}`} primary>
          Sign in
        </StatusLink>
        <StatusLink href={`/login/sales${query}`}>Sales sign in</StatusLink>
      </StatusPage>
    );
  }
  if (status !== "signed-in") return <AdminShellSkeleton />;
  return <>{children}</>;
}
