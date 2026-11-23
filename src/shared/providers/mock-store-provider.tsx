"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { createMockStore, createSeedStore, type MockStore } from "@/data/mock/seed";

const MockStoreContext = createContext<MockStore | null>(null);

/**
 * The seed is dated from today's Manila date. The server prerender has no request
 * date (cacheComponents forbids reading the clock there), so it uses this fixed
 * date; the browser builds the store from today when it hydrates. Records reach
 * the screen through async queries in the browser, so nothing server-rendered
 * depends on the seed's dates.
 */
const PRERENDER_SEED_DATE = "2026-11-23";

export function MockStoreProvider({ children, store: initialStore }: { children: ReactNode; store?: MockStore }) {
  const [store] = useState(() => initialStore ?? createMockStore(typeof window === "undefined" ? createSeedStore(PRERENDER_SEED_DATE) : undefined));
  return <MockStoreContext.Provider value={store}>{children}</MockStoreContext.Provider>;
}

export function useMockStore() {
  const store = useContext(MockStoreContext);
  if (!store) throw new Error("useMockStore must be used within MockStoreProvider.");
  return store;
}
