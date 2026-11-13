"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { IgpAction } from "@/data/contracts/igp-repository";
import { useMockRepositories } from "@/data/queries";
import { queryKeys } from "@/data/query-keys";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";

export function useIgpRegister(enabled: boolean) {
  const { igp } = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: queryKeys.business.list("igp", identity.id),
    queryFn: ({ signal }) => igp.list({ signal }),
    enabled,
  });
}

export function useIgpAction() {
  const { igp } = useMockRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: IgpAction) => igp.act(action),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.business.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.audit.all });
    },
  });
}
