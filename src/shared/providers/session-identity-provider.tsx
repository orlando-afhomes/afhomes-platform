"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { DevIdentity } from "@/modules/identity/types";
import { clearProtectedQueries } from "@/data/protected-cache";
import { DevIdentityContext, type DevIdentityContextValue } from "@/shared/providers/dev-identity-provider";

/** Holds no roles and no access. Shown while loading and after sign-out. */
const NO_IDENTITY: DevIdentity = { id: "signed-out", displayName: "", roles: [], memberId: null, branchId: null, status: "inactive" };

/**
 * api mode: the identity comes from the server session cookie (GET /api/v1/session),
 * never from browser storage. It supplies the same context the screens already read.
 */
export function SessionIdentityProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [identity, setIdentity] = useState<DevIdentity>(NO_IDENTITY);
  const [status, setStatus] = useState<DevIdentityContextValue["status"]>("loading");

  const reload = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/session", { cache: "no-store" });
      const body = response.ok ? ((await response.json()) as { identity: DevIdentity }) : null;
      // Clear before a different person renders, so one identity's data never shows under another.
      clearProtectedQueries(queryClient);
      setIdentity(body?.identity ?? NO_IDENTITY);
      setStatus(body ? "signed-in" : "signed-out");
    } catch {
      clearProtectedQueries(queryClient);
      setIdentity(NO_IDENTITY);
      setStatus("signed-out");
    }
  }, [queryClient]);

  useEffect(() => {
    // Read the session once on load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const signOut = useCallback(() => {
    clearProtectedQueries(queryClient);
    setIdentity(NO_IDENTITY);
    setStatus("signed-out");
    void fetch("/api/v1/session", { method: "DELETE", keepalive: true });
  }, [queryClient]);

  const value = useMemo<DevIdentityContextValue>(
    () => ({ identity, identities: [identity], setIdentityId: () => undefined, status, signIn: () => undefined, signOut, reload }),
    [identity, status, signOut, reload],
  );

  return <DevIdentityContext.Provider value={value}>{children}</DevIdentityContext.Provider>;
}
