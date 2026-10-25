"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { CustomerDraftInput } from "@/modules/customers/types";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMockStore } from "@/shared/providers/mock-store-provider";
import { createMockRepositories } from "@/data/mock/repositories";

export function useMockRepositories() {
  const store = useMockStore();
  const { identity } = useDevIdentity();
  return useMemo(() => createMockRepositories(store, () => identity), [store, identity]);
}

export function useMembers() {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: ["members", identity.id],
    queryFn: ({ signal }) => repositories.members.list({ signal }),
  });
}

export function useCustomers() {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: ["customers", identity.id],
    queryFn: ({ signal }) => repositories.customers.list({ signal }),
  });
}

export function useProducts() {
  const repositories = useMockRepositories();
  return useQuery({
    queryKey: ["products"],
    queryFn: ({ signal }) => repositories.products.list({ signal }),
  });
}

export function useCreateCustomerDraft() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: CustomerDraftInput) => repositories.customers.createDraft(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", identity.id] });
    },
  });
}
