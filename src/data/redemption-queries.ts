"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BookingInput, TableVersionInput, VenueInput } from "@/data/contracts/redemption-repository";
import type { MockRepositories } from "@/data/mock/repositories";
import { useMockRepositories } from "@/data/queries";
import { queryKeys } from "@/data/query-keys";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";

/** Redemption hooks: keys are partitioned by the active dev identity; every mutation refreshes the business and audit views. */
export function useRedemption() {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: queryKeys.business.list("redemption", identity.id),
    queryFn: ({ signal }) => repositories.redemption.overview({ signal }),
  });
}

function useRedemptionMutation<V, R>(run: (repositories: MockRepositories, variables: V) => Promise<R>) {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: V) => run(repositories, variables),
    onSuccess: () => {
      for (const key of [queryKeys.business.all, queryKeys.audit.all]) queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export type BookingAction =
  | { id: string; action: "cancel"; reason: string; cancelledAt?: string }
  | { id: string; action: "no-show"; reason: string }
  | { id: string; action: "complete" }
  | { id: string; action: "approve-cash"; reference: string };

export function useCreateRedemptionBooking() {
  return useRedemptionMutation((r, input: BookingInput) => r.redemption.createBooking(input));
}

export function useRedemptionBookingAction() {
  return useRedemptionMutation<BookingAction, unknown>((r, v) => {
    switch (v.action) {
      case "cancel": return r.redemption.cancelBooking(v.id, v.reason, v.cancelledAt);
      case "no-show": return r.redemption.recordNoShow(v.id, v.reason);
      case "complete": return r.redemption.completeBooking(v.id);
      case "approve-cash": return r.redemption.approveCashPayment(v.id, v.reference);
    }
  });
}

export type RedemptionConfigAction =
  | { action: "publish-version"; input: TableVersionInput }
  | { action: "add-holiday"; date: string; name: string }
  | { action: "remove-holiday"; id: string; reason: string }
  | { action: "save-venue"; input: VenueInput };

export function useRedemptionConfigAction() {
  return useRedemptionMutation<RedemptionConfigAction, unknown>((r, v) => {
    switch (v.action) {
      case "publish-version": return r.redemption.publishTableVersion(v.input);
      case "add-holiday": return r.redemption.addHoliday(v.date, v.name);
      case "remove-holiday": return r.redemption.removeHoliday(v.id, v.reason);
      case "save-venue": return r.redemption.saveVenue(v.input);
    }
  });
}
