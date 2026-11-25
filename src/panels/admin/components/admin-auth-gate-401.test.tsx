import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiRequestError } from "@/data/http/client";
import { AdminAuthGate } from "./admin-auth-gate";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/admin/customers",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/data/access-snapshot", () => ({
  useAccessSnapshot: () => ({
    isError: true,
    error: new ApiRequestError(401, "unauthenticated", "Sign in to continue."),
    ready: false,
    modules: new Set(),
    operations: new Set(),
    genealogyIds: new Set(),
    refetch: vi.fn(),
  }),
}));

afterEach(() => cleanup());

it("asks an expired session to sign in instead of showing a 403", () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId="dev-admin">
          <AdminAuthGate>
            <p>Protected portal</p>
          </AdminAuthGate>
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>,
  );
  expect(screen.getByRole("heading", { name: "Please sign in" })).toBeDefined();
  expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/login?next=%2Fadmin%2Fcustomers");
  expect(screen.queryByText("Protected portal")).toBeNull();
});
