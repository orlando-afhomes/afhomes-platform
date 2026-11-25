"use client";

// shortcut: mock login only, remove when real authentication (Better Auth/API) is implemented
import { useAccessSnapshot } from "@/data/access-snapshot";
import { ApiRequestError } from "@/data/http/client";
import { Button } from "@/shared/ui/button";
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
  return <AdminAccessGate>{children}</AdminAccessGate>;
}

/** Keeps protected portals and page siblings inside the same access boundary. */
function AdminAccessGate({ children }: { children: ReactNode }) {
  const access = useAccessSnapshot();
  const pathname = usePathname();
  const search = useSearchParams()?.toString();
  // An expired session asks for a sign-in, not for a permission it can never grant.
  if (access.isError && access.error instanceof ApiRequestError && access.error.status === 401) {
    const requested = safeReturnPath(`${pathname ?? "/admin"}${search ? `?${search}` : ""}`);
    const query = requested === "/admin" ? "" : `?next=${encodeURIComponent(requested)}`;
    return (
      <StatusPage variant="401">
        <StatusLink href={`/login${query}`} primary>Sign in</StatusLink>
        <StatusLink href={`/login/sales${query}`}>Sales sign in</StatusLink>
      </StatusPage>
    );
  }
  if (access.isError) return <StatusPage variant="403" description="Access could not be verified."><Button onClick={() => void access.refetch()}>Try again</Button></StatusPage>;
  if (!access.ready) return <AdminShellSkeleton />;
  if (access.modules.size === 0) return <StatusPage variant="403" />;
  return <>{children}</>;
}
