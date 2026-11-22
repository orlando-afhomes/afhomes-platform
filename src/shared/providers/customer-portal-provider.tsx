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
  samples: PortalCustomer[];
  signIn: (email: string) => void;
  signOut: () => void;
};

const CustomerPortalContext = createContext<CustomerPortalContextValue | null>(null);

/** Prototype-only customer session. It is not production authentication. */
export function CustomerPortalProvider({ children, initialCustomerId }: { children: ReactNode; initialCustomerId?: string }) {
  const store = useMockStore();
  const queryClient = useQueryClient();
  const repository = useMemo(() => new MockCustomerPortalRepository(store), [store]);
  const samples = useMemo(() => repository.sampleCustomers(), [repository]);
  const [customerId, setCustomerId] = useState<string | null>(initialCustomerId ?? null);
  const customer = customerId ? samples.find((item) => item.id === customerId) ?? null : null;

  const clearPortalCache = useCallback(() => {
    queryClient.removeQueries({ queryKey: ["customer-portal"] });
  }, [queryClient]);

  const signIn = useCallback((email: string) => {
    const match = repository.findCustomerByEmail(email);
    if (!match) throw new Error("Use the sample customer email shown on this page.");
    clearPortalCache();
    setCustomerId(match.id);
  }, [clearPortalCache, repository]);

  const signOut = useCallback(() => {
    clearPortalCache();
    setCustomerId(null);
  }, [clearPortalCache]);

  return (
    <CustomerPortalContext.Provider value={{ customerId, customer, repository, samples, signIn, signOut }}>
      {children}
    </CustomerPortalContext.Provider>
  );
}

export function useCustomerPortal() {
  const value = useContext(CustomerPortalContext);
  if (!value) throw new Error("useCustomerPortal must be used within CustomerPortalProvider.");
  return value;
}
