// shortcut: mock login only, remove when real authentication (Better Auth/API) is implemented
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminAuthGate } from "./admin-auth-gate";
import { DevIdentityProvider, useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { MOCK_SESSION_KEY } from "@/shared/providers/mock-session";

const replace = vi.fn();
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ replace, push: vi.fn() }),
}));

beforeEach(() => {
  replace.mockClear();
  window.localStorage.clear();
});
afterEach(() => cleanup());

function Probe() {
  const { signOut } = useDevIdentity();
  return <button onClick={signOut}>protected</button>;
}

function mount() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <DevIdentityProvider>
        <AdminAuthGate>
          <Probe />
        </AdminAuthGate>
      </DevIdentityProvider>
    </QueryClientProvider>,
  );
}

describe("admin auth gate", () => {
  it("redirects to /login when signed out", () => {
    mount();
    expect(screen.queryByText("protected")).toBeNull();
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("restores a stored session after remount and clears it on sign out", () => {
    window.localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify({ identityId: "dev-admin" }));
    mount();
    expect(screen.getByText("protected")).toBeDefined();
    expect(replace).not.toHaveBeenCalled();
    act(() => screen.getByText("protected").click());
    expect(window.localStorage.getItem(MOCK_SESSION_KEY)).toBeNull();
    expect(replace).toHaveBeenCalledWith("/login");
  });
});
