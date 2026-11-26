"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/data/queries";
import { queryKeys } from "@/data/query-keys";
import type { ReservationInput } from "@/modules/reservations/types";
import { useDevIdentity } from "@/shared/providers/identity-provider";

/** Restaurant reservation hooks: keys are partitioned by the active dev identity; every change refreshes the business and audit views. */
export function useRestaurantReservations(enabled = true) {
  const repositories = useRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: queryKeys.business.list("restaurant-reservations", identity.id),
    queryFn: () => repositories.reservations.list(),
    enabled,
  });
}

function useReservationMutation<V, R>(run: (repositories: ReturnType<typeof useRepositories>, variables: V) => Promise<R>) {
  const repositories = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: V) => run(repositories, variables),
    onSuccess: () => {
      for (const key of [queryKeys.business.all, queryKeys.audit.all]) queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useCreateRestaurantReservation() {
  return useReservationMutation((r, input: ReservationInput) => r.reservations.create(input));
}

export function useCancelRestaurantReservation() {
  return useReservationMutation((r, v: { id: string; reason: string }) => r.reservations.cancel(v.id, v.reason));
}
