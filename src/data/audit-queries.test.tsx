import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AUDIT_ACTIONS, AuditQueryError, type AuditQuery } from "@/modules/audit/types";
import { DevIdentityProvider, useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider, useMockStore } from "@/shared/providers/mock-store-provider";
import { AUDIT_READ_RESTRICTION } from "@/data/mock/audit-repository";
import { SEED_AUDIT_EVENT_COUNT } from "./mock/seed-data";
import { queryKeys } from "@/data/query-keys";
import { useAuditEvents, useChangeSalesNetworkMemberStatus, useUpdateAccountStatus } from "@/data/queries";

function setup(initialIdentityId: string, initialQuery: AuditQuery | undefined = undefined) {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={initialIdentityId}>{children}</DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
  const hook = renderHook(
    ({ query }: { query: AuditQuery | undefined }) => ({
      audit: useAuditEvents(query),
      identity: useDevIdentity(),
      store: useMockStore(),
      accountStatus: useUpdateAccountStatus(),
      memberStatus: useChangeSalesNetworkMemberStatus(),
    }),
    { wrapper, initialProps: { query: initialQuery } },
  );
  return { ...hook, queryClient };
}

describe("queryKeys.audit", () => {
  it("is stable for equivalent queries and partitioned by identity and access", () => {
    expect(queryKeys.audit.list("a", "read", { page: 1, action: undefined })).toEqual(queryKeys.audit.list("a", "read", { page: 1 }));
    expect(queryKeys.audit.list("a", "read")).toEqual(queryKeys.audit.list("a", "read", {}));
    expect(queryKeys.audit.list("a", "read")).not.toEqual(queryKeys.audit.list("b", "read"));
    expect(queryKeys.audit.list("a", "read")).not.toEqual(queryKeys.audit.list("a", "denied"));
    expect(queryKeys.audit.list("a", "read")[0]).toBe(queryKeys.audit.all[0]);
  });
});

describe("useAuditEvents", () => {
  it("loads pages and applies validated filters through the repository", async () => {
    const { result, rerender } = setup("dev-admin");
    await waitFor(() => expect(result.current.audit.isSuccess).toBe(true));
    expect(result.current.audit.data).toMatchObject({ total: SEED_AUDIT_EVENT_COUNT, page: 1, pageSize: 25 });
    expect(result.current.audit.data?.items).toHaveLength(SEED_AUDIT_EVENT_COUNT);

    await act(async () => {
      await result.current.accountStatus.mutateAsync({ id: "acct-pending", status: "active" });
    });
    await act(async () => {
      await result.current.accountStatus.mutateAsync({ id: "acct-pending", status: "suspended" });
    });
    rerender({ query: { pageSize: 1, page: 2, action: AUDIT_ACTIONS.ACCOUNT_STATUS_CHANGED } });
    await waitFor(() => expect(result.current.audit.data?.page).toBe(2));
    expect(result.current.audit.data).toMatchObject({ total: 2, pageSize: 1 });
    expect(result.current.audit.data?.items).toHaveLength(1);
    expect(result.current.audit.data?.items[0]).toMatchObject({ previousValue: "pending", newValue: "active" });
  });

  it("surfaces invalid queries as a controlled error without retrying", async () => {
    const { result } = setup("dev-admin", { pageSize: 101 });
    await waitFor(() => expect(result.current.audit.isError).toBe(true));
    expect(result.current.audit.error).toBeInstanceOf(AuditQueryError);
    expect(result.current.audit.failureCount).toBe(1);
  });

  it("returns the restriction error to unauthorized identities", async () => {
    for (const id of ["dev-hr", "dev-finance", "dev-ost-a1"]) {
      const { result, unmount } = setup(id);
      await waitFor(() => expect(result.current.audit.isError).toBe(true));
      expect(result.current.audit.error?.message).toBe(AUDIT_READ_RESTRICTION);
      expect(result.current.audit.data).toBeUndefined();
      unmount();
    }
  });

  it("never serves previously cached protected records after an identity change", async () => {
    const { result, queryClient } = setup("dev-super-admin");
    await act(async () => {
      await result.current.accountStatus.mutateAsync({ id: "acct-pending", status: "active" });
    });
    await waitFor(() => expect(result.current.audit.data?.total).toBe(1 + SEED_AUDIT_EVENT_COUNT));

    act(() => result.current.identity.setIdentityId("dev-hr"));
    await waitFor(() => expect(result.current.audit.isError).toBe(true));
    expect(result.current.audit.data).toBeUndefined();
    expect(result.current.audit.error?.message).toBe(AUDIT_READ_RESTRICTION);
    // Nothing from the earlier identity remains in the cache.
    const cached = queryClient.getQueryCache().findAll({ queryKey: queryKeys.audit.all });
    expect(cached.every((query) => query.queryKey[1] === "dev-hr" && query.state.data === undefined)).toBe(true);

    // Switching back refetches fresh data for the eligible identity.
    act(() => result.current.identity.setIdentityId("dev-super-admin"));
    await waitFor(() => expect(result.current.audit.data?.total).toBe(1 + SEED_AUDIT_EVENT_COUNT));
  });

  it("stops serving cached records when the identity's own eligibility is lost", async () => {
    const { result, rerender } = setup("dev-admin");
    await act(async () => {
      await result.current.accountStatus.mutateAsync({ id: "acct-pending", status: "active" });
    });
    await waitFor(() => expect(result.current.audit.data?.total).toBe(1 + SEED_AUDIT_EVENT_COUNT));
    // The Admin's linked account becomes Suspended; the next render uses the denied partition.
    result.current.store.accounts.find((item) => item.id === "acct-admin")!.status = "suspended";
    rerender({ query: undefined });
    await waitFor(() => expect(result.current.audit.isError).toBe(true));
    expect(result.current.audit.data).toBeUndefined();
    expect(result.current.audit.error?.message).toBe(AUDIT_READ_RESTRICTION);
  });
});

describe("audit invalidation", () => {
  it("refetches the active audit view after audited Account and Sales Network mutations", async () => {
    const { result } = setup("dev-super-admin");
    await waitFor(() => expect(result.current.audit.isSuccess).toBe(true));
    expect(result.current.audit.data?.total).toBe(0 + SEED_AUDIT_EVENT_COUNT);

    await act(async () => {
      await result.current.accountStatus.mutateAsync({ id: "acct-pending", status: "active" });
    });
    await waitFor(() => expect(result.current.audit.data?.total).toBe(1 + SEED_AUDIT_EVENT_COUNT));

    const member = result.current.store.members.find((item) => item.status === "active")!;
    await act(async () => {
      await result.current.memberStatus.mutateAsync({ id: member.id, status: "suspended" });
    });
    await waitFor(() => expect(result.current.audit.data?.total).toBe(2 + SEED_AUDIT_EVENT_COUNT));
    expect(result.current.audit.data?.items[0]).toMatchObject({ action: "MEMBER_STATUS_CHANGED", newValue: "suspended" });
  });

  it("does not invalidate or create events when a mutation is rejected, and reads never create events", async () => {
    const { result } = setup("dev-hr");
    await waitFor(() => expect(result.current.audit.isError).toBe(true));
    await act(async () => {
      await expect(result.current.accountStatus.mutateAsync({ id: "acct-admin", status: "suspended" })).rejects.toThrow();
    });
    expect(result.current.store.auditEvents).toHaveLength(SEED_AUDIT_EVENT_COUNT);
  });

  it("covers every audited emitter: each emitting mutation hook invalidates audit queries", () => {
    const source = readFileSync(join(process.cwd(), "src/data/queries.ts"), "utf8");
    const hookBody = (name: string) => {
      const start = source.indexOf(`export function ${name}(`);
      expect(start, name).toBeGreaterThanOrEqual(0);
      const end = source.indexOf("export function", start + 10);
      return source.slice(start, end === -1 ? undefined : end);
    };
    // Organization hooks invalidate through invalidateOrganization, which invalidates audit.
    const organizationHooks = [
      "useUpdateLinkedAccountStatus", "useCreateDepartment", "useUpdateDepartment", "useCreateDepartmentRole",
      "useUpdateDepartmentRole", "useCreateStaff", "useUpdateStaff", "useUpdateAccount", "useAssignAccountRole",
      "useRevokeAccountRole", "useUpdateAccountStatus",
    ];
    for (const name of organizationHooks) expect(hookBody(name), name).toContain("invalidateOrganization(queryClient");
    expect(source).toMatch(/function invalidateOrganization\([^)]*\) \{\s*invalidateAudit\(queryClient\);/);
    const directHooks = [
      "useCreateSalesNetworkMember", "useTransferSalesNetworkMember", "useChangeSalesNetworkMemberStatus",
      "useUpdateSalesNetworkMember", "useCreateAccreditedSeller", "useUpdateAccreditationStatus", "useIssuePendingAccreditation",
    ];
    for (const name of directHooks) expect(hookBody(name), name).toContain("invalidateAudit(queryClient)");
  });
});
