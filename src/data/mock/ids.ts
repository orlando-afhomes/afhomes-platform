import type { MockStore } from "./seed";

/** Next identifier for a business collection, e.g. nextId(store, "contract", "ctr") gives "ctr-5". */
export function nextId(store: MockStore, key: string, prefix: string): string {
  const value = store.counters[key] ?? 1;
  store.counters[key] = value + 1;
  return `${prefix}-${value}`;
}

/**
 * Secure random numeric identifier with no pattern (no year, sequence or prefix).
 * Uses crypto randomness with rejection sampling; the first digit is never 0.
 * `taken` is checked so the value is unique within the caller's collection.
 * The same contract carries over to the database.
 */
export function randomNumericId(taken: ReadonlySet<string>, length = 12): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const bytes = new Uint8Array(length * 2);
    crypto.getRandomValues(bytes);
    let value = "";
    for (const byte of bytes) {
      if (byte >= 250) continue; // reject 250-255 so digits stay uniform
      const digit = byte % 10;
      if (value.length === 0 && digit === 0) continue;
      value += digit;
      if (value.length === length) break;
    }
    if (value.length === length && !taken.has(value)) return value;
  }
  throw new Error("Could not generate a unique identifier.");
}
