"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { DevIdentity } from "@/modules/identity/types";
import { DEV_IDENTITIES } from "@/data/mock/dev-identities";

type DevIdentityContextValue = {
  identity: DevIdentity;
  identities: DevIdentity[];
  setIdentityId: (id: string) => void;
};

const DevIdentityContext = createContext<DevIdentityContextValue | null>(null);

export function DevIdentityProvider({ children, initialIdentityId }: { children: ReactNode; initialIdentityId?: string }) {
  const [identityId, setIdentityId] = useState(initialIdentityId ?? DEV_IDENTITIES[0].id);
  const queryClient = useQueryClient();
  const identity = DEV_IDENTITIES.find((item) => item.id === identityId) ?? DEV_IDENTITIES[0];
  const previousIdentityId = useRef(identityId);

  useEffect(() => {
    if (previousIdentityId.current === identityId) return;
    queryClient.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey[1] !== identityId &&
        (query.queryKey[0] === "members" || query.queryKey[0] === "customers"),
    });
    previousIdentityId.current = identityId;
  }, [identityId, queryClient]);

  return (
    <DevIdentityContext.Provider value={{ identity, identities: DEV_IDENTITIES, setIdentityId }}>
      {children}
    </DevIdentityContext.Provider>
  );
}

export function useDevIdentity() {
  const value = useContext(DevIdentityContext);
  if (!value) throw new Error("useDevIdentity must be used within DevIdentityProvider.");
  return value;
}
