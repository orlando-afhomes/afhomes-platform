import type { QueryClient, Query } from "@tanstack/react-query";
import { queryKeys } from "./query-keys";

/** Only these allowlisted projections are independent of staff authority. */
const PUBLIC_CONTENT = new Set(["public-experiences", "public-offers", "public-vip-products"]);
const isProtected = (query: Query) => !PUBLIC_CONTENT.has(String(query.queryKey[0]));

/** Remove, rather than merely stale, records that may have been read under broader authority. */
export function clearProtectedQueries(client: QueryClient): void {
  void client.cancelQueries({ predicate: isProtected });
  client.removeQueries({ predicate: isProtected });
}

export async function refreshAccessAfterMutation(client: QueryClient): Promise<void> {
  // Hide protected UI before refreshing authority, while retaining the gate's active observer.
  const authorityCancellation = client.cancelQueries({ queryKey: queryKeys.access.all });
  const invalidation = client.invalidateQueries({ queryKey: queryKeys.access.all, refetchType: "none" });
  const records = { predicate: (query: Query) => isProtected(query) && query.queryKey[0] !== queryKeys.access.all[0] };
  const recordCancellation = client.cancelQueries(records);
  client.removeQueries(records);
  await Promise.all([authorityCancellation, invalidation, recordCancellation]);
  await client.invalidateQueries({ queryKey: queryKeys.access.all });
}
