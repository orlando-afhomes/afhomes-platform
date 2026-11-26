import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminAuthGate } from "./admin-auth-gate";
import { SessionIdentityProvider } from "@/shared/providers/session-identity-provider";
import { json, sessionBody } from "@/test/api-harness";

const replace = vi.fn();
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/admin",
  useSearchParams: () => new URLSearchParams(""),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  replace.mockClear();
});

function mount(signedIn: boolean) {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/session")) return signedIn ? json(sessionBody("dev-admin")) : new Response(null, { status: 401 });
    return json({ items: [] });
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SessionIdentityProvider>
        <AdminAuthGate>
          <p>protected</p>
        </AdminAuthGate>
      </SessionIdentityProvider>
    </QueryClientProvider>,
  );
}

describe("admin auth gate", () => {
  it("shows the 401 page with sign-in links when signed out", async () => {
    mount(false);
    expect(await screen.findByRole("heading", { name: "Please sign in" })).toBeInTheDocument();
    expect(screen.queryByText("protected")).toBeNull();
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/login");
  });

  it("renders the protected page for a signed-in session", async () => {
    mount(true);
    expect(await screen.findByText("protected")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Please sign in" })).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });
});
