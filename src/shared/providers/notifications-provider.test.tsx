import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DevIdentityProvider, useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { useNotifications } from "./notifications-provider";
import { NotificationsProvider } from "@/panels/admin/providers/notifications-provider";
import { useCreateDepartment } from "@/data/queries";
import type { AuditPage } from "@/modules/audit/types";
import { queryKeys } from "@/data/query-keys";

// Mutable route for the mocked hook; renderHook's rerender picks up the change.
let currentPath = "/admin";
let currentSearch = "";

vi.mock("next/navigation", () => ({
  usePathname: () => currentPath,
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

function setup(initialIdentityId: string, initialPath = "/admin") {
  currentPath = initialPath;
  currentSearch = "";
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={initialIdentityId}>
          <NotificationsProvider>{children}</NotificationsProvider>
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
  const hook = renderHook(
    () => ({ notifications: useNotifications(), departments: useCreateDepartment(), identity: useDevIdentity() }),
    { wrapper },
  );
  const setPath = (nextUrl: string) => {
    [currentPath, currentSearch = ""] = nextUrl.split("?");
    hook.rerender();
  };
  return { ...hook, setPath, queryClient };
}

describe("NotificationsProvider", () => {
  it("starts with everything before mount seen and caps the bell list at 30", async () => {
    const { result } = setup("dev-super-admin");
    await waitFor(() => expect(result.current.notifications.events.length).toBeGreaterThan(0));
    expect(result.current.notifications.denied).toBe(false);
    expect(result.current.notifications.unreadTotal).toBe(0);
    expect(result.current.notifications.events.length).toBeLessThanOrEqual(30);
  });

  it("counts a brand-new record created after mount, then clears it with markAllSeen", async () => {
    const { result } = setup("dev-super-admin");
    await waitFor(() => expect(result.current.notifications.events.length).toBeGreaterThan(0));
    await act(async () => {
      await result.current.departments.mutateAsync({ name: "Notif Probe Dept" });
    });
    await waitFor(() => expect(result.current.notifications.unreadByNavKey["organization"]).toBe(1));
    expect(result.current.notifications.unreadTotal).toBe(1);
    act(() => result.current.notifications.markAllSeen());
    expect(result.current.notifications.unreadTotal).toBe(0);
    expect(result.current.notifications.unreadByNavKey["organization"]).toBe(0);
  });

  it("keeps another area's badge unseen until that area is visited", async () => {
    const { result, setPath } = setup("dev-super-admin", "/admin/organization");
    await waitFor(() => expect(result.current.notifications.events.length).toBeGreaterThan(0));
    await act(async () => {
      await result.current.departments.mutateAsync({ name: "Area Scope Dept" });
    });
    await waitFor(() => expect(result.current.notifications.unreadByNavKey["organization"]).toBe(1));

    // Navigating to a different area must not clear the Organization badge.
    setPath("/admin/customers");
    expect(result.current.notifications.unreadByNavKey["organization"]).toBe(1);
    expect(result.current.notifications.unreadTotal).toBe(1);

    setPath("/admin/customer-lookup");
    expect(result.current.notifications.unreadByTab).toEqual({});
    expect(result.current.notifications.unreadByNavKey.organization).toBe(1);

    // Opening Staff leaves the unread Departments tab visible.
    setPath("/admin/organization");
    expect(result.current.notifications.unreadByTab.departments).toBe(1);
    expect(result.current.notifications.unreadByTab.staff ?? 0).toBe(0);
    expect(result.current.notifications.unreadTotal).toBe(1);

    // Switching tabs without changing areas clears the newly visited tab.
    setPath("/admin/organization?tab=departments");
    await waitFor(() => expect(result.current.notifications.unreadByNavKey["organization"]).toBe(0));
    expect(result.current.notifications.unreadTotal).toBe(0);
  });

  it("still resets every marker when the development identity changes", async () => {
    const { result, setPath } = setup("dev-super-admin", "/admin/organization");
    await waitFor(() => expect(result.current.notifications.events.length).toBeGreaterThan(0));
    await act(async () => {
      await result.current.departments.mutateAsync({ name: "Identity Reset Dept" });
    });
    await waitFor(() => expect(result.current.notifications.unreadByNavKey["organization"]).toBe(1));

    // Leave the badge unseen in another area before switching identity.
    setPath("/admin/customers");
    expect(result.current.notifications.unreadTotal).toBe(1);

    act(() => result.current.identity.setIdentityId("dev-admin"));
    await waitFor(() => expect(result.current.identity.identity.id).toBe("dev-admin"));
    await waitFor(() => expect(result.current.notifications.events.length).toBeGreaterThan(0));
    expect(result.current.notifications.unreadTotal).toBe(0);
    expect(result.current.notifications.unreadByNavKey["organization"]).toBe(0);
  });

  it("does not carry a badge into a different area with the same tab value", async () => {
    const { result, setPath, queryClient } = setup("dev-super-admin");
    await waitFor(() => expect(result.current.notifications.events.length).toBeGreaterThan(0));
    act(() => queryClient.setQueriesData<AuditPage>({ queryKey: queryKeys.audit.all }, (page) => {
      if (!page?.items[0]) return page;
      const event = { ...page.items[0], id: "audit-999999", module: "customers" as const, action: "CUSTOMER_DRAFT_CREATED" };
      return { ...page, items: [event, ...page.items] };
    }));
    await waitFor(() => expect(result.current.notifications.unreadByNavKey.customers).toBe(1));
    setPath("/admin/reports?tab=customers");
    expect(result.current.notifications.unreadByTab.customers).toBe(0);
    expect(result.current.notifications.unreadByNavKey.customers).toBe(1);
  });

  it("denies non-admin identities with empty events and zero counts", async () => {
    const { result } = setup("dev-hr");
    await waitFor(() => expect(result.current.notifications.denied).toBe(true));
    expect(result.current.notifications.events).toEqual([]);
    expect(result.current.notifications.unreadTotal).toBe(0);
  });
});
