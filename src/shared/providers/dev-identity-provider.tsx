// shortcut: mock login only, remove when real authentication (Better Auth/API) is implemented
"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { DevIdentity } from "@/modules/identity/types";
import { DEV_IDENTITIES } from "@/data/mock/dev-identities";
import { clearProtectedQueries } from "@/data/protected-cache";
import { clearSession, readSession, writeSession } from "@/shared/providers/mock-session";

type DevIdentityContextValue = {
  identity: DevIdentity;
  identities: DevIdentity[];
  setIdentityId: (id: string) => void;
  // shortcut: mock login only, remove when real authentication (Better Auth/API) is implemented
  status: "loading" | "signed-in" | "signed-out";
  signIn: (identityId: string) => void;
  signOut: () => void;
};

const DevIdentityContext = createContext<DevIdentityContextValue | null>(null);

export function DevIdentityProvider({ children, initialIdentityId }: { children: ReactNode; initialIdentityId?: string }) {
  const [identityId, setIdentityIdState] = useState(initialIdentityId ?? DEV_IDENTITIES[0].id);
  const [status, setStatus] = useState<"loading" | "signed-in" | "signed-out">(initialIdentityId ? "signed-in" : "loading");
  const queryClient = useQueryClient();
  const identity = DEV_IDENTITIES.find((item) => item.id === identityId) ?? DEV_IDENTITIES[0];
  const setIdentityId = useCallback((id: string) => {
    // Clear synchronously before React renders a different identity.
    clearProtectedQueries(queryClient);
    setIdentityIdState(id);
  }, [queryClient]);

  useEffect(() => {
    if (initialIdentityId) return;
    const sync = () => {
      const session = readSession();
      if (session) setIdentityId(session.identityId);
      else clearProtectedQueries(queryClient);
      setStatus(session ? "signed-in" : "signed-out");
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [initialIdentityId, queryClient, setIdentityId]);

  const signIn = useCallback((id: string) => {
    writeSession(id);
    setIdentityId(id);
    setStatus("signed-in");
  }, [setIdentityId]);

  const signOut = useCallback(() => {
    clearSession();
    clearProtectedQueries(queryClient);
    setStatus("signed-out");
  }, [queryClient]);

  return (
    <DevIdentityContext.Provider value={{ identity, identities: DEV_IDENTITIES, setIdentityId, status, signIn, signOut }}>
      {children}
    </DevIdentityContext.Provider>
  );
}

export function useDevIdentity() {
  const value = useContext(DevIdentityContext);
  if (!value) throw new Error("useDevIdentity must be used within DevIdentityProvider.");
  return value;
}
