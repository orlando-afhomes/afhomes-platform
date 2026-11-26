"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/query-keys";
import { apiFetch } from "@/data/http/client";
import type { AdminModuleId, AdminOperation } from "@/modules/identity/permissions";
import { useDevIdentity } from "@/shared/providers/identity-provider";

export const ACCESS_QUERY_KEY = queryKeys.access.all;
const EMPTY_MODULES = new Set<AdminModuleId>();
const EMPTY_OPERATIONS = new Set<AdminOperation>();
const EMPTY_IDS = new Set<string>();

/** Presentation snapshot only; every repository retains its own authorization checks. */
export function useAccessSnapshot() {
  const { identity } = useDevIdentity();
  const query = useQuery({
    queryKey: [...ACCESS_QUERY_KEY, identity.id, identity.status, identity.roles, identity.roleAssignments ?? null],
    queryFn: async ({ signal }) => {
      // The server session already answers with the grant tables it enforces.
      const session = await apiFetch<{ modules: AdminModuleId[]; operations: AdminOperation[] }>("/session", { signal });
      return { modules: session.modules, operations: session.operations, genealogyIds: [] as string[] };
    },
    retry: false,
    gcTime: 0,
    staleTime: Infinity,
  });
  // Cached protected data is never used while its authority is being revalidated.
  const ready = query.isSuccess && !query.isFetching && !query.isStale;
  const access = useMemo(() => ({
    modules: ready && query.data ? new Set(query.data.modules) : EMPTY_MODULES,
    operations: ready && query.data ? new Set(query.data.operations) : EMPTY_OPERATIONS,
    genealogyIds: ready && query.data ? new Set(query.data.genealogyIds) : EMPTY_IDS,
  }), [ready, query.data]);
  return { ...query, ready, ...access };
}
