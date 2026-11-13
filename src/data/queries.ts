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
import { canReadAuditHistory } from "@/data/mock/audit-repository";
import { queryKeys } from "@/data/query-keys";
import type { AuditQuery } from "@/modules/audit/types";

export function useMockRepositories() {
  const store = useMockStore();
  const { identity } = useDevIdentity();
  // Opt-in latency to see loaders in the browser: NEXT_PUBLIC_MOCK_DELAY_MS=800. Unset = instant.
  const delayMs = Number(process.env.NEXT_PUBLIC_MOCK_DELAY_MS) || 0;
  return useMemo(() => createMockRepositories(store, () => identity, delayMs > 0 ? { delayMs } : undefined), [store, identity, delayMs]);
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

/** Account Management actions the active identity may take (presentation only). */
export function useAccountPolicies() {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: ["account-policies", identity.id],
    queryFn: ({ signal }) => repositories.accounts.getPolicies({ signal }),
  });
}

/** Department roles with the active identity's assign/manage authority. */
export function useRoleOptions() {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: ["role-options", identity.id],
    queryFn: ({ signal }) => repositories.roles.listForAssignment({ signal }),
  });
}

/** Staff record actions and linked-account summaries for the active identity. */
export function useStaffPolicies() {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: ["staff-policies", identity.id],
    queryFn: ({ signal }) => repositories.staff.listPolicies({ signal }),
  });
}

/** The active identity's own staff record and linked-account summary. */
export function useMyProfile() {
  const repositories = useMockRepositories();
  const { identity } = useDevIdentity();
  return useQuery({
    queryKey: ["my-profile", identity.id],
    queryFn: ({ signal }) => repositories.staff.getSelf({ signal }),
  });
}

/**
 * Read-only, privacy-projected audit history (Admin and Super Admin only).
 * Partitioned by identity and eligibility; unobserved results are discarded
 * immediately (gcTime 0) and never carried across key changes. Errors from
 * authorization or validation are deterministic, so they are not retried.
 */
export function useAuditEvents(query?: AuditQuery) {
  const repositories = useMockRepositories();
  const store = useMockStore();
  const { identity } = useDevIdentity();
  const access = canReadAuditHistory(store, identity) ? "read" : "denied";
  return useQuery({
    queryKey: queryKeys.audit.list(identity.id, access, query),
    queryFn: ({ signal }) => repositories.audit.list(query, { signal }),
    retry: false,
    gcTime: 0,
  });
}

/** Audited mutations append events, so every cached audit view is refreshed after one succeeds. */
function invalidateAudit(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.audit.all });
}

/**
 * Organization and account records affect each other (linked accounts,
 * role options, policies), so their mutations refresh every dependent view.
 */
function invalidateOrganization(queryClient: ReturnType<typeof useQueryClient>, identityId: string) {
  invalidateAudit(queryClient);
  for (const key of ["staff", "staff-policies", "my-profile", "accounts", "account-policies", "departments", "department-roles", "role-options"]) {
    queryClient.invalidateQueries({ queryKey: [key, identityId] });
  }
}

export function useUpdateLinkedAccountStatus() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: { staffId: string; status: "active" | "suspended" | "deactivated" }) =>
      repositories.staff.updateLinkedAccountStatus(input.staffId, input.status),
    onSuccess: () => invalidateOrganization(queryClient, identity.id),
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
    onSuccess: () => invalidateOrganization(queryClient, identity.id),
  });
}

export function useUpdateDepartment() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: { id: string; name?: string; status?: "active" | "deactivated" }) =>
      repositories.departments.update(input.id, input),
    onSuccess: () => invalidateOrganization(queryClient, identity.id),
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
    onSuccess: () => invalidateOrganization(queryClient, identity.id),
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
    onSuccess: () => invalidateOrganization(queryClient, identity.id),
  });
}

export function useDeleteDepartmentRole() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (id: string) => repositories.roles.delete(id),
    onSuccess: () => invalidateOrganization(queryClient, identity.id),
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
      provisionPendingAccount?: boolean;
      systemRoleIds?: string[];
      firstName?: string | null;
      middleName?: string | null;
      lastName?: string | null;
      suffix?: string | null;
      mobileNumber?: string | null;
      street?: string | null;
      province?: string | null;
      city?: string | null;
      barangay?: string | null;
      postalCode?: string | null;
      telephone?: string | null;
      facebook?: string | null;
      tin?: string | null;
      gender?: string | null;
      civilStatus?: string | null;
      governmentIdType?: string | null;
      governmentIdNumber?: string | null;
    }) => repositories.staff.create(input),
    onSuccess: () => invalidateOrganization(queryClient, identity.id),
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
      postalCode?: string | null;
      telephone?: string | null;
      facebook?: string | null;
      tin?: string | null;
      gender?: string | null;
      civilStatus?: string | null;
      governmentIdType?: string | null;
      governmentIdNumber?: string | null;
    }) => repositories.staff.update(input.id, input),
    onSuccess: () => invalidateOrganization(queryClient, identity.id),
  });
}

export function useDeleteAccount() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (id: string) => repositories.accounts.delete(id),
    onSuccess: () => invalidateOrganization(queryClient, identity.id),
  });
}

export function useUpdateAccount() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: { id: string; displayName?: string; email?: string; departmentId?: string | null }) =>
      repositories.accounts.update(input.id, input),
    onSuccess: () => invalidateOrganization(queryClient, identity.id),
  });
}

export function useAssignAccountRole() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: { id: string; role: string }) => repositories.accounts.assignRole(input.id, input.role),
    onSuccess: () => invalidateOrganization(queryClient, identity.id),
  });
}

export function useRevokeAccountRole() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: { id: string; role: string }) => repositories.accounts.revokeRole(input.id, input.role),
    onSuccess: () => invalidateOrganization(queryClient, identity.id),
  });
}

export function useUpdateAccountStatus() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (input: { id: string; status: "pending" | "active" | "suspended" | "deactivated" }) =>
      repositories.accounts.updateStatus(input.id, input.status),
    onSuccess: () => invalidateOrganization(queryClient, identity.id),
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
    onSuccess: () => invalidateOrganization(queryClient, identity.id),
  });
}

export function useDeleteStaff() {
  const repositories = useMockRepositories();
  const queryClient = useQueryClient();
  const { identity } = useDevIdentity();
  return useMutation({
    mutationFn: (id: string) => repositories.staff.delete(id),
    onSuccess: () => invalidateOrganization(queryClient, identity.id),
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
      invalidateAudit(queryClient);
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
      invalidateAudit(queryClient);
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
      invalidateAudit(queryClient);
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
      invalidateAudit(queryClient);
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
      invalidateAudit(queryClient);
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
      invalidateAudit(queryClient);
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
      invalidateAudit(queryClient);
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
