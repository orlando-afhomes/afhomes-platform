"use client";

// shortcut: mock login only, remove when real authentication (Better Auth/API) is implemented
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { AdminShellSkeleton } from "@/shared/components/modern/skeletons";

export function AdminAuthGate({ children }: { children: ReactNode }) {
  const { status } = useDevIdentity();
  const router = useRouter();

  useEffect(() => {
    if (status === "signed-out") router.replace("/login");
  }, [status, router]);

  if (status !== "signed-in") return <AdminShellSkeleton />;
  return <>{children}</>;
}
