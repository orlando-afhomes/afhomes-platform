"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TierLevelInput } from "@/data/contracts/tier-level-repository";
import { useRepositories } from "@/data/queries";
import { queryKeys } from "@/data/query-keys";
import type { TierLevel } from "@/modules/vip/types";
import { useDevIdentity } from "@/shared/providers/identity-provider";

/** Admin-managed VIP tier levels. Keys are partitioned by identity like every business query. */

export function useTierLevels() {
  const { tierLevels } = useRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: queryKeys.business.list("tier-levels", identity.id),
    queryFn: ({ signal }) => tierLevels.list({ signal }),
  });
}

export function useCreateTierLevel() {
  const { tierLevels } = useRepositories();
  const invalidate = useInvalidateTierLevels();
  return useMutation({ mutationFn: (input: TierLevelInput) => tierLevels.create(input), onSuccess: invalidate });
}

export function useUpdateTierLevel() {
  const { tierLevels } = useRepositories();
  const invalidate = useInvalidateTierLevels();
  return useMutation({ mutationFn: (input: { id: string } & Partial<TierLevelInput> & { status?: TierLevel["status"] }) => tierLevels.update(input.id, { name: input.name, colorKey: input.colorKey, sortOrder: input.sortOrder, status: input.status }), onSuccess: invalidate });
}

export function useDeleteTierLevel() {
  const { tierLevels } = useRepositories();
  const invalidate = useInvalidateTierLevels();
  return useMutation({ mutationFn: (id: string) => tierLevels.delete(id), onSuccess: invalidate });
}

function useInvalidateTierLevels() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.business.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.audit.all });
  };
}
