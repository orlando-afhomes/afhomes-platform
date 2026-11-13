"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PromoInput, RecordPromoUseInput } from "@/data/contracts/promo-repository";
import { useMockRepositories } from "@/data/queries";
import { queryKeys } from "@/data/query-keys";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";

/**
 * Promo Points hooks. Keys sit under the business prefix, so every business mutation
 * (including resort-bill approve and refund, which earn and reverse points) refreshes them.
 */
function useInvalidatePromos() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.business.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.audit.all });
  };
}

export function usePromos() {
  const { promos } = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({ queryKey: queryKeys.business.list("promos", identity.id), queryFn: ({ signal }) => promos.list({ signal }) });
}

export function usePromoLedger() {
  const { promos } = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({ queryKey: queryKeys.business.list("promo-ledger", identity.id), queryFn: ({ signal }) => promos.ledger({ signal }) });
}

export function usePromoBalances() {
  const { promos } = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({ queryKey: queryKeys.business.list("promo-balances", identity.id), queryFn: ({ signal }) => promos.balances({ signal }) });
}

export function useSavePromo() {
  const { promos } = useMockRepositories();
  const invalidate = useInvalidatePromos();
  return useMutation({
    mutationFn: (input: { id?: string; promo: PromoInput }) => (input.id ? promos.update(input.id, input.promo) : promos.create(input.promo)),
    onSuccess: invalidate,
  });
}

export function useEndPromo() {
  const { promos } = useMockRepositories();
  const invalidate = useInvalidatePromos();
  return useMutation({ mutationFn: (id: string) => promos.end(id), onSuccess: invalidate });
}

export function useDeletePromo() {
  const { promos } = useMockRepositories();
  const invalidate = useInvalidatePromos();
  return useMutation({ mutationFn: (id: string) => promos.delete(id), onSuccess: invalidate });
}

export function useRecordPromoUse() {
  const { promos } = useMockRepositories();
  const invalidate = useInvalidatePromos();
  return useMutation({ mutationFn: (input: RecordPromoUseInput) => promos.recordUse(input), onSuccess: invalidate });
}

export function useVoidPromoUse() {
  const { promos } = useMockRepositories();
  const invalidate = useInvalidatePromos();
  return useMutation({ mutationFn: (input: { entryId: string; reason: string }) => promos.voidUse(input.entryId, input.reason), onSuccess: invalidate });
}
