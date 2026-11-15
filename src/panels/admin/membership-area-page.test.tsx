import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { MembershipAreaPage } from "./pages/membership-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/admin/membership",
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

function openActivationLink(identityId: string) {
  window.history.replaceState(null, "", "/admin/membership?tab=activation");
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>
          <MembershipAreaPage />
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>,
  );
}

describe("Membership area", () => {
  it("opens the activation queue from a direct link for Finance", async () => {
    openActivationLink("dev-finance");
    const table = await screen.findByRole("table", { name: "Activation queue" });
    expect(screen.getByRole("tab", { name: "Activation queue", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Memberships" })).toBeInTheDocument();
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent?.trim())).toEqual([
      "Customer", "Card number", "Plan", "Status", "Activated", "Actions",
    ]);
  });

  it("shows sellers only the membership list when they follow the activation link", async () => {
    openActivationLink("dev-ost-a1");
    expect(await screen.findByRole("table", { name: "Memberships" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Activation queue" })).toBeNull();
    expect(screen.queryByRole("table", { name: "Activation queue" })).toBeNull();
  });
});
