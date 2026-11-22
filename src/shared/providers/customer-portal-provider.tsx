"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { CustomerPortalRepository } from "@/data/contracts/customer-portal-repository";
import { MockCustomerPortalRepository } from "@/data/mock/customer-portal-repository";
import type { PortalCustomer } from "@/modules/customer-portal/types";
import { useMockStore } from "./mock-store-provider";

type CustomerPortalContextValue = {
  customerId: string | null;
  customer: PortalCustomer | null;
  repository: CustomerPortalRepository;
  signIn: (email: string, password: string) => void;
  signOut: () => void;
};

const CustomerPortalContext = createContext<CustomerPortalContextValue | null>(null);

/** Prototype-only customer session. It is not production authentication. */
export function CustomerPortalProvider({ children, initialCustomerId }: { children: ReactNode; initialCustomerId?: string }) {
  const store = useMockStore();
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState<string | null>(initialCustomerId ?? null);
  const repository = useMemo(() => new MockCustomerPortalRepository(store, customerId), [store, customerId]);
  const customer = customerId ? repository.sampleCustomers().find((item) => item.id === customerId) ?? null : null;

  const clearPortalCache = useCallback(() => {
    queryClient.removeQueries({ queryKey: ["customer-portal"] });
  }, [queryClient]);

  const signIn = useCallback((email: string, password: string) => {
    const match = repository.authenticate(email, password);
    if (!match) throw new Error("Incorrect email or password.");
    clearPortalCache();
    setCustomerId(match.id);
  }, [clearPortalCache, repository]);

  const signOut = useCallback(() => {
    clearPortalCache();
    setCustomerId(null);
  }, [clearPortalCache]);

  return (
    <CustomerPortalContext.Provider value={{ customerId, customer, repository, signIn, signOut }}>
      {children}
    </CustomerPortalContext.Provider>
  );
}

export function useCustomerPortal() {
  const value = useContext(CustomerPortalContext);
  if (!value) throw new Error("useCustomerPortal must be used within CustomerPortalProvider.");
  return value;
}
