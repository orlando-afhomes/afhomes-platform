"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { AdminModuleId } from "@/modules/identity/permissions";
import type { CustomerDraftInput } from "@/modules/customers/types";
import type { DepartmentRole, StaffMember } from "@/modules/organization/types";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useMockStore } from "@/shared/providers/mock-store-provider";
import { resolveEffectiveModules } from "@/data/mock/authorization";
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

/** System role grants plus linked department-role grants for the active identity. */
export function useEffectiveModuleIds(): Set<AdminModuleId> {
  const store = useMockStore();
  const { identity } = useDevIdentity();
  return useMemo(() => resolveEffectiveModules(store, identity), [store, identity]);
}

export function useCreateDepartment() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: { name: string; status?: "active" | "deactivated" }) => repositories.departments.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", identity.id] });
    },
  });
}

export function useUpdateDepartment() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: { id: string; name?: string; status?: "active" | "deactivated" }) =>
      repositories.departments.update(input.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", identity.id] });
    },
  });
}

export function useDepartmentRoles() {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: ["department-roles", identity.id],
    queryFn: ({ signal }) => repositories.roles.list({ signal }),
  });
}

export function useCreateDepartmentRole() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: {
      name: string;
      departmentId: string;
      moduleIds: AdminModuleId[];
      status?: DepartmentRole["status"];
    }) => repositories.roles.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-roles", identity.id] });
    },
  });
}

export function useUpdateDepartmentRole() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: {
      id: string;
      name?: string;
      departmentId?: string;
      moduleIds?: AdminModuleId[];
      status?: DepartmentRole["status"];
    }) => repositories.roles.update(input.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-roles", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["staff", identity.id] });
    },
  });
}

export function useDeleteDepartmentRole() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (id: string) => repositories.roles.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["department-roles", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["staff", identity.id] });
    },
  });
}

export function useCreateStaff() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: {
      displayName: string;
      position: string;
      departmentId?: string | null;
      departmentRoleId?: string | null;
      email: string;
      avatarUrl?: string | null;
      accountId?: string | null;
    }) => repositories.staff.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["departments", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["department-roles", identity.id] });
    },
  });
}

export function useUpdateStaff() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: {
      id: string;
      displayName?: string;
      position?: string;
      departmentId?: string | null;
      departmentRoleId?: string | null;
      status?: StaffMember["status"];
      avatarUrl?: string | null;
      accountId?: string | null;
      email?: string;
    }) => repositories.staff.update(input.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["departments", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["department-roles", identity.id] });
    },
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

export function useDeleteDepartment() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (id: string) => repositories.departments.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["staff", identity.id] });
    },
  });
}

export function useDeleteStaff() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (id: string) => repositories.staff.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["departments", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["department-roles", identity.id] });
    },
  });
}
