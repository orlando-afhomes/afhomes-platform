"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { AdminModuleId } from "@/modules/identity/permissions";
import type { CustomerDraftInput } from "@/modules/customers/types";
import type { DepartmentRole, Designation, StaffMember } from "@/modules/organization/types";
import type { CreateAccreditedSellerInput, CreateSalesNetworkMemberInput, UpdateSalesNetworkMemberInput } from "@/modules/sales-network/types";
import type { AccreditationStatusRequest } from "@/data/contracts/accreditation-repository";
import type { AccreditationAdminStatus } from "@/modules/accreditation/types";
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
      firstName?: string | null;
      middleName?: string | null;
      lastName?: string | null;
      suffix?: string | null;
      mobileNumber?: string | null;
      street?: string | null;
      province?: string | null;
      city?: string | null;
      barangay?: string | null;
      subdivision?: string | null;
      postalCode?: string | null;
      telephone?: string | null;
      facebook?: string | null;
      tin?: string | null;
      gender?: string | null;
      civilStatus?: string | null;
      governmentIdType?: string | null;
      governmentIdNumber?: string | null;
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
      firstName?: string | null;
      middleName?: string | null;
      lastName?: string | null;
      suffix?: string | null;
      mobileNumber?: string | null;
      street?: string | null;
      province?: string | null;
      city?: string | null;
      barangay?: string | null;
      subdivision?: string | null;
      postalCode?: string | null;
      telephone?: string | null;
      facebook?: string | null;
      tin?: string | null;
      gender?: string | null;
      civilStatus?: string | null;
      governmentIdType?: string | null;
      governmentIdNumber?: string | null;
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

export function useSalesNetworkMember(id: string) {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: ["sales-network-member", id, identity.id],
    queryFn: ({ signal }) => repositories.members.getById(id, { signal }),
    enabled: Boolean(id),
  });
}

/** Resolve a member by official AA number, falling back to the internal ID. */
export function useSalesNetworkMemberByKey(key: string) {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: ["sales-network-member", key, identity.id],
    queryFn: async ({ signal }) =>
      (await repositories.members.getByAaNumber(key, { signal })) ??
      repositories.members.getById(key, { signal }),
    enabled: Boolean(key),
  });
}

export function useCreateSalesNetworkMember() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: CreateSalesNetworkMemberInput) => repositories.members.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["sales-network-members", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["sales-network-member"] });
      queryClient.invalidateQueries({ queryKey: ["uplines", identity.id] });
    },
  });
}

export function useTransferSalesNetworkMember() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: { id: string; newParentId: string | null; designation?: Designation; teamName?: string | null }) =>
      repositories.members.transfer(input.id, input.newParentId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["sales-network-members", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["sales-network-member"] });
      queryClient.invalidateQueries({ queryKey: ["uplines", identity.id] });
    },
  });
}

export function useChangeSalesNetworkMemberStatus() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: { id: string; status: "active" | "inactive" | "suspended" }) =>
      repositories.members.changeStatus(input.id, input.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["sales-network-members", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["sales-network-member"] });
    },
  });
}

export function useEligibleSalesNetworkParents(childDesignation: "SVD" | "SSM" | "SM" | "OST") {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: ["sales-network-eligible-parents", childDesignation, identity.id],
    queryFn: ({ signal }) => repositories.members.listEligibleParents(childDesignation, { signal }),
  });
}

export function useUpdateSalesNetworkMember() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: { id: string } & UpdateSalesNetworkMemberInput) =>
      repositories.members.update(input.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["sales-network-members", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["sales-network-member"] });
    },
  });
}

export function useCreateAccreditedSeller() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: CreateAccreditedSellerInput) => repositories.members.createAccreditedSeller(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["sales-network-members", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["sales-network-member"] });
      queryClient.invalidateQueries({ queryKey: ["accreditations", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["accounts", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["uplines", identity.id] });
    },
  });
}

export function useUpdateAccreditationStatus() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: { recordId: string; requested: AccreditationStatusRequest; expectedPrevious?: AccreditationAdminStatus; reason?: string }) =>
      repositories.accreditations.updateStatus(input.recordId, input.requested, undefined, input.expectedPrevious, input.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accreditations", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["member-accreditations"] });
      queryClient.invalidateQueries({ queryKey: ["accreditation-record"] });
      queryClient.invalidateQueries({ queryKey: ["sales-network-eligible-parents"] });
    },
  });
}

export function useIssuePendingAccreditation() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (memberId: string) => repositories.accreditations.issuePendingAccreditation(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["accreditations", identity.id] });
      queryClient.invalidateQueries({ queryKey: ["member-accreditations"] });
      queryClient.invalidateQueries({ queryKey: ["accreditation-record"] });
      queryClient.invalidateQueries({ queryKey: ["sales-network-eligible-parents"] });
    },
  });
}

export function useVerifyReferralSponsor() {
  const repositories = useMockRepositories();
  return useMutation({
    mutationFn: (code: string) => repositories.members.resolveReferralSponsor(code),
  });
}

export function useMemberAccreditations(memberId: string) {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: ["member-accreditations", memberId, identity.id],
    queryFn: ({ signal }) => repositories.accreditations.listByMember(memberId, { signal }),
    enabled: Boolean(memberId),
  });
}

export function useAccreditationRecord(id: string) {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: ["accreditation-record", id, identity.id],
    queryFn: ({ signal }) => repositories.accreditations.getById(id, { signal }),
    enabled: Boolean(id),
  });
}

export function useRegistrationApplications() {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: ["registration-applications", identity.id],
    queryFn: ({ signal }) => repositories.registrations.list({ signal }),
  });
}

export function useRegistrationApplication(id: string) {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: ["registration-application", id, identity.id],
    queryFn: ({ signal }) => repositories.registrations.getById(id, { signal }),
    enabled: Boolean(id),
  });
}

export function useAccreditations() {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: ["accreditations", identity.id],
    queryFn: ({ signal }) => repositories.accreditations.list({ signal }),
  });
}
