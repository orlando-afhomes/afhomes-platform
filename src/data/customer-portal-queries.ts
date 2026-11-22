"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PortalContactInput } from "@/modules/customer-portal/types";
import { useCustomerPortal } from "@/shared/providers/customer-portal-provider";

const overviewKey = (customerId: string) => ["customer-portal", customerId, "overview"] as const;

export function useCustomerPortalOverview() {
  const { customerId, repository } = useCustomerPortal();
  return useQuery({
    queryKey: customerId ? overviewKey(customerId) : ["customer-portal", "signed-out"],
    queryFn: () => repository.overview(),
    enabled: Boolean(customerId),
    retry: false,
    gcTime: 0,
  });
}

export function useUpdatePortalPhoto() {
  const { customerId, repository } = useCustomerPortal();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photo: { dataUrl: string; fileName: string } | null) => {
      if (!customerId) throw new Error("Sign in first.");
      return Promise.resolve(repository.updateProfilePhoto(photo));
    },
    onSuccess: (overview) => {
      if (customerId) queryClient.setQueryData(overviewKey(customerId), overview);
      // Staff screens read the same record, so refresh their customer queries too.
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useUpdatePortalContact() {
  const { customerId, repository } = useCustomerPortal();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PortalContactInput) => {
      if (!customerId) throw new Error("Sign in first.");
      return Promise.resolve(repository.updateContact(input));
    },
    onSuccess: (overview) => {
      if (customerId) queryClient.setQueryData(overviewKey(customerId), overview);
    },
  });
}
