import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { getDevIdentity } from "@/data/mock/dev-identities";
import { MockMembershipRepository } from "@/data/mock/membership-repository";
import { createMockRepositories } from "@/data/mock/repositories";
import { createMockStore, type MockStore } from "@/data/mock/seed";
import type { MembershipView } from "@/data/contracts/membership-repository";
import { MembershipTable } from "./components/membership-table";
import { MembershipAreaPage } from "./pages/membership-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/admin/membership",
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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

function renderTable(identityId: string, data: MembershipView[], store: MockStore) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MockStoreProvider store={store}>
        <DevIdentityProvider initialIdentityId={identityId}>
          <MembershipTable data={data} caption="To Activate" emptyText="No memberships are waiting for activation." />
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>,
  );
}

describe("Membership area", () => {
  it("opens the activation queue from a direct link for Finance", async () => {
    openActivationLink("dev-finance");
    const table = await screen.findByRole("table", { name: "To Activate" });
    expect(screen.getByRole("tab", { name: "To Activate", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Memberships" })).toBeInTheDocument();
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent?.trim())).toEqual([
      "Customer", "Card Number", "Plan", "Status", "Activated", "Actions",
    ]);
  });

  it("shows sellers only the membership list when they follow the activation link", async () => {
    openActivationLink("dev-ost-a1");
    expect(await screen.findByRole("table", { name: "Memberships" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "To Activate" })).toBeNull();
    expect(screen.queryByRole("table", { name: "To Activate" })).toBeNull();
  });

  it("sends one activation request and shows a busy state when Activate is double-clicked", async () => {
    const user = userEvent.setup();
    const store = createMockStore();
    const view = (await createMockRepositories(store, () => getDevIdentity("dev-admin")).memberships.list()).find((item) => item.status === "pending");
    expect(view).toBeDefined();
    const eligible: MembershipView = { ...view!, eligible: true, blockers: [] };
    vi.spyOn(MockMembershipRepository.prototype, "list").mockResolvedValue([eligible]);
    const activate = vi.spyOn(MockMembershipRepository.prototype, "activate").mockImplementationOnce(() => new Promise(() => {}));

    renderTable("dev-admin", [eligible], store);
    await user.click(await screen.findByRole("row", { name: /Open membership of/ }));
    const dialog = await screen.findByRole("dialog");
    const button = within(dialog).getByRole("button", { name: "Activate" });
    await user.dblClick(button);
    await waitFor(() => expect(activate).toHaveBeenCalledTimes(1));
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-disabled", "true");
  });
});
