// shortcut: mock login only, remove when real authentication (Better Auth/API) is implemented
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminAuthGate } from "./admin-auth-gate";
import { DevIdentityProvider, useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { MOCK_SESSION_KEY } from "@/shared/providers/mock-session";

const replace = vi.fn();
const mockPath = { value: "/admin", search: "" };
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => mockPath.value,
  useSearchParams: () => new URLSearchParams(mockPath.search),
}));

beforeEach(() => {
  replace.mockClear();
  mockPath.value = "/admin";
  mockPath.search = "";
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
  it("shows the 401 page with a sign-in link when signed out", () => {
    mount();
    expect(screen.queryByText("protected")).toBeNull();
    expect(screen.getByRole("heading", { name: "Please sign in" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/login");
    expect(replace).not.toHaveBeenCalled();
  });

  it("remembers the requested admin page in the sign-in link", () => {
    mockPath.value = "/admin/customers/c1";
    mockPath.search = "tab=a";
    mount();
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe(
      "/login?next=%2Fadmin%2Fcustomers%2Fc1%3Ftab%3Da",
    );
    expect(screen.getByRole("link", { name: "Sales sign in" }).getAttribute("href")).toContain("/login/sales?next=");
  });

  it("restores a stored session after remount and clears it on sign out", () => {
    window.localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify({ identityId: "dev-admin" }));
    mount();
    expect(screen.getByText("protected")).toBeDefined();
    expect(replace).not.toHaveBeenCalled();
    act(() => screen.getByText("protected").click());
    expect(window.localStorage.getItem(MOCK_SESSION_KEY)).toBeNull();
    expect(screen.getByRole("heading", { name: "Please sign in" })).toBeDefined();
  });
});
