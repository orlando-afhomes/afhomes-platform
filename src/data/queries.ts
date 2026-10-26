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

export function useDepartments() {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: ["departments", identity.id],
    queryFn: ({ signal }) => repositories.departments.list({ signal }),
  });
}

export function useStaff() {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: ["staff", identity.id],
    queryFn: ({ signal }) => repositories.staff.list({ signal }),
  });
}

export function useAccounts() {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: ["accounts", identity.id],
    queryFn: ({ signal }) => repositories.accounts.list({ signal }),
  });
}

export function useCreateAccount() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: { displayName: string; email: string; roleIds: string[]; departmentId?: string | null }) =>
      repositories.accounts.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", identity.id] });
    },
  });
}

export function useUpdateAccount() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: { id: string; displayName?: string; email?: string; departmentId?: string | null }) =>
      repositories.accounts.update(input.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", identity.id] });
    },
  });
}

export function useAssignAccountRole() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: { id: string; role: string }) => repositories.accounts.assignRole(input.id, input.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", identity.id] });
    },
  });
}

export function useRevokeAccountRole() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: { id: string; role: string }) => repositories.accounts.revokeRole(input.id, input.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", identity.id] });
    },
  });
}

export function useUpdateAccountStatus() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: { id: string; status: "pending" | "active" | "suspended" | "deactivated" }) =>
      repositories.accounts.updateStatus(input.id, input.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts", identity.id] });
    },
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
