import type { MockStore } from "./seed";

/** Next identifier for a business collection, e.g. nextId(store, "contract", "ctr") gives "ctr-5". */
export function nextId(store: MockStore, key: string, prefix: string): string {
  const value = store.counters[key] ?? 1;
  store.counters[key] = value + 1;
  return `${prefix}-${value}`;
}
