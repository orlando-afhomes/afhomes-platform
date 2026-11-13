import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { NotificationsProvider, useNotifications } from "./notifications-provider";
import { useCreateDepartment } from "@/data/queries";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin" }));

function setup(initialIdentityId: string) {
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
  return renderHook(() => ({ notifications: useNotifications(), departments: useCreateDepartment() }), { wrapper });
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
    await waitFor(() => expect(result.current.notifications.unreadByNavKey["staff"]).toBe(1));
    expect(result.current.notifications.unreadTotal).toBe(1);
    act(() => result.current.notifications.markAllSeen());
    expect(result.current.notifications.unreadTotal).toBe(0);
    expect(result.current.notifications.unreadByNavKey["staff"]).toBe(0);
  });

  it("denies non-admin identities with empty events and zero counts", async () => {
    const { result } = setup("dev-hr");
    await waitFor(() => expect(result.current.notifications.denied).toBe(true));
    expect(result.current.notifications.events).toEqual([]);
    expect(result.current.notifications.unreadTotal).toBe(0);
  });
});
