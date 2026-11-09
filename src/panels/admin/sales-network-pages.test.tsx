import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { SalesNetworkMembersPage } from "./pages/sales-network-members-page";
import { SalesNetworkGenealogyPage } from "./pages/sales-network-genealogy-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/admin/sales-network/members",
}));

function Wrapper({ identityId, children }: { identityId: string; children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>{children}</DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  toast.dismiss();
});

const rows = () => [...document.querySelectorAll("tbody tr[data-row-key]")] as HTMLElement[];

describe("sales network members page", () => {
  it("lists members for a Super Administrator with management actions", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper identityId="dev-super-admin">
        <SalesNetworkMembersPage />
      </Wrapper>,
    );
    await waitFor(() => expect(rows().length).toBeGreaterThan(0), { timeout: 5000 });
    expect(screen.getByRole("table", { name: "Sales Network members" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add IST" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add OST" })).toBeInTheDocument();
    await user.click(within(rows()[0]).getByRole("button", { name: /actions for/i }));
    expect(await screen.findByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
  });

  it("filters by designation and searches by name", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper identityId="dev-super-admin">
        <SalesNetworkMembersPage />
      </Wrapper>,
    );
    await waitFor(() => expect(rows().length).toBeGreaterThan(1), { timeout: 5000 });
    const all = rows().length;
    await user.click(screen.getByRole("combobox", { name: "Designation filter" }));
    await user.click(await screen.findByRole("option", { name: "SVD" }));
    await waitFor(() => expect(rows().length).toBeLessThan(all));
    for (const row of rows()) expect(row).toHaveTextContent("Sales Vice Director");
    await user.click(screen.getByRole("combobox", { name: "Designation filter" }));
    await user.click(await screen.findByRole("option", { name: "All designations" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search members" }), { target: { value: "zzzz-no-such-member" } });
    expect(await screen.findByText("No members found.")).toBeInTheDocument();
  });

  it("opens the edit dialog with the member profile", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper identityId="dev-super-admin">
        <SalesNetworkMembersPage />
      </Wrapper>,
    );
    await waitFor(() => expect(rows().length).toBeGreaterThan(0), { timeout: 5000 });
    await user.click(within(rows()[0]).getByRole("button", { name: /actions for/i }));
    await user.click(await screen.findByRole("menuitem", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit member" });
    expect(within(dialog).getByLabelText(/First Name/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("restricts access without the sales network module", async () => {
    render(
      <Wrapper identityId="dev-finance">
        <SalesNetworkMembersPage />
      </Wrapper>,
    );
    expect(await screen.findByText("Access restricted")).toBeInTheDocument();
  });
});

describe("sales network genealogy page", () => {
  it("shows the authorized tree and a summary for the selected member", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper identityId="dev-super-admin">
        <SalesNetworkGenealogyPage />
      </Wrapper>,
    );
    const tree = await screen.findByRole("region", { name: "Genealogy tree" });
    const select = await within(tree).findAllByRole("button", { pressed: false }, { timeout: 5000 });
    expect(select.length).toBeGreaterThan(0);
    await user.click(select[0]);
    const summary = screen.getByRole("complementary", { name: "Member summary" });
    expect(within(summary).getByText("Member summary")).toBeInTheDocument();
    expect(within(summary).getByRole("link", { name: "View profile" })).toHaveAttribute("href", expect.stringContaining("/admin/sales-network/members/"));
  });

  it("expands and collapses branches", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper identityId="dev-super-admin">
        <SalesNetworkGenealogyPage />
      </Wrapper>,
    );
    await user.click(await screen.findByRole("button", { name: "Collapse all" }));
    const toggles = await screen.findAllByRole("button", { name: /^Expand (?!all)/ });
    expect(toggles[0]).toHaveAttribute("aria-expanded", "false");
    await user.click(screen.getByRole("button", { name: "Expand all" }));
    await waitFor(() => expect(screen.getAllByRole("button", { name: /^Collapse (?!all)/ }).length).toBeGreaterThan(0));
  });
});
