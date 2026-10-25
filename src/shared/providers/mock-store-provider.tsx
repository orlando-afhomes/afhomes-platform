"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { createMockStore, type MockStore } from "@/data/mock/seed";

const MockStoreContext = createContext<MockStore | null>(null);

export function MockStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createMockStore());
  return <MockStoreContext.Provider value={store}>{children}</MockStoreContext.Provider>;
}

export function useMockStore() {
  const store = useContext(MockStoreContext);
  if (!store) throw new Error("useMockStore must be used within MockStoreProvider.");
  return store;
}
