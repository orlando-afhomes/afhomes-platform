"use client";

import { createContext, useContext } from "react";
import type { DevIdentity } from "@/modules/identity/types";

/**
 * The signed-in identity every screen reads. It is supplied by the server session
 * (SessionIdentityProvider); screens never build identities themselves.
 */
export type IdentityContextValue = {
  identity: DevIdentity;
  identities: DevIdentity[];
  setIdentityId: (id: string) => void;
  status: "loading" | "signed-in" | "signed-out";
  signIn: (identityId: string) => void;
  signOut: () => void;
  /** Re-read the server session after sign-in. */
  reload: () => Promise<void>;
};

export const IdentityContext = createContext<IdentityContextValue | null>(null);

export function useDevIdentity() {
  const value = useContext(IdentityContext);
  if (!value) throw new Error("useDevIdentity must be used within a session identity provider.");
  return value;
}
