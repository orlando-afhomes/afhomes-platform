"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/query-keys";
import { simulateAsync } from "@/data/contracts/async-options";
import { resolveEffectiveModules, hasBlockedLinkedAccount, resolveMockIdentity } from "@/data/mock/authorization";
import { getAuthorizedGenealogyMemberIds } from "@/modules/sales-network/genealogy";
import { getGrantedOperations, type AdminModuleId, type AdminOperation } from "@/modules/identity/permissions";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMockStore } from "@/shared/providers/mock-store-provider";

export const ACCESS_QUERY_KEY = queryKeys.access.all;
const EMPTY_MODULES = new Set<AdminModuleId>();
const EMPTY_OPERATIONS = new Set<AdminOperation>();
const EMPTY_IDS = new Set<string>();

/** Presentation snapshot only; every repository retains its own authorization checks. */
export function useAccessSnapshot() {
 const store = useMockStore();
 const { identity } = useDevIdentity();
 const query = useQuery({
  queryKey: [...ACCESS_QUERY_KEY, identity.id, identity.status, identity.roles, identity.roleAssignments ?? null],
  queryFn: async ({ signal }) => {
   await simulateAsync({signal, delayMs:Number(process.env.NEXT_PUBLIC_MOCK_DELAY_MS)||0});
   const effectiveIdentity = resolveMockIdentity(store, identity);
   const blocked = effectiveIdentity.status !== "active" || hasBlockedLinkedAccount(store, identity);
   return {
    modules: [...resolveEffectiveModules(store, identity)],
    operations: blocked ? [] : [...getGrantedOperations(effectiveIdentity)],
    genealogyIds: blocked ? [] : [...getAuthorizedGenealogyMemberIds(effectiveIdentity, store)],
   };
  },
  retry:false,
  gcTime:0,
  staleTime:Infinity,
 });
 // Cached protected data is never used while its authority is being revalidated.
 const ready = query.isSuccess && !query.isFetching && !query.isStale;
 const access = useMemo(() => ({
  modules: ready && query.data ? new Set(query.data.modules) : EMPTY_MODULES,
  operations: ready && query.data ? new Set(query.data.operations) : EMPTY_OPERATIONS,
  genealogyIds: ready && query.data ? new Set(query.data.genealogyIds) : EMPTY_IDS,
 }), [ready, query.data]);
 return {...query, ready, ...access};
}
