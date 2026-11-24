import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { createMockStore } from "@/data/mock/seed";
import { buildLargeNetwork } from "@/modules/sales-network/large-network.fixture";
import { SalesNetworkGenealogyPage, TREE_PAGE_SIZE } from "./pages/sales-network-genealogy-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/admin/sales-network/members",
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  const [store] = useState(() => {
    const next = createMockStore();
    next.members = buildLargeNetwork(14_000);
    return next;
  });
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider store={store}>
        <DevIdentityProvider initialIdentityId="dev-super-admin">{children}</DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

afterEach(cleanup);

const rowCount = () => document.querySelectorAll("[id^='tree-row-']").length;

describe("Team Tree with 14,000 sellers", () => {
  it("lists only the people it must, with totals, and pages long teams", async () => {
    const user = userEvent.setup();
    render(<Wrapper><SalesNetworkGenealogyPage /></Wrapper>);
    const legend = await screen.findByRole("list", { name: "People in your tree" }, { timeout: 20000 });
    expect(within(legend).getByText("14,000")).toBeInTheDocument();
    expect(within(legend).getByText("140")).toBeInTheDocument();

    // First view: three Directors, each with at most one page of the people directly under them.
    expect(rowCount()).toBeLessThanOrEqual(3 + 3 * (TREE_PAGE_SIZE + 4));
    expect(screen.getAllByRole("button", { name: "Show more" }).length).toBeGreaterThan(0);
    const before = rowCount();
    await user.click(screen.getAllByRole("button", { name: "Show more" })[0]);
    // A page adds up to 50 more people (fewer when the team has fewer left).
    expect(rowCount()).toBeGreaterThan(before);
    expect(rowCount()).toBeLessThanOrEqual(before + TREE_PAGE_SIZE);

    // Show Leaders opens Directors and Senior Managers only, never a Manager's sellers.
    await user.click(screen.getByRole("button", { name: "Collapse All" }));
    await user.click(screen.getByRole("button", { name: "Show Leaders" }));
    await waitFor(() => expect(rowCount()).toBeGreaterThan(3));
    expect(rowCount()).toBeLessThan(3 + 12 * (TREE_PAGE_SIZE + 12));
  }, 60000);

  it("finds a seller by AA number, opens the path and shows counts instead of names in the summary", async () => {
    const user = userEvent.setup();
    render(<Wrapper><SalesNetworkGenealogyPage /></Wrapper>);
    await screen.findByRole("list", { name: "People in your tree" }, { timeout: 20000 });
    await user.type(screen.getByRole("searchbox", { name: "Search members" }), "AA-009000");
    const option = await screen.findByRole("button", { name: /AA-009000/ });
    await user.click(option);
    const summary = screen.getByRole("complementary", { name: "Member summary" });
    expect(await within(summary).findByText("AA-009000")).toBeInTheDocument();
    expect(document.getElementById("tree-row-ost-8958") ?? document.querySelector("[aria-pressed='true']")).not.toBeNull();
    expect(screen.getByRole("navigation", { name: "Where this person sits" })).toBeInTheDocument();
  }, 60000);
});
