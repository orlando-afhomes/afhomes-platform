import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminSidebar } from "./admin-sidebar";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";

// next/navigation's useRouter requires a mounted app router; stub navigation
// while keeping the real usePathname used elsewhere in the tree.
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(() => cleanup());

function renderSidebar(collapsed = false, identityId = "dev-admin") {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>
          <AdminSidebar collapsed={collapsed} onCollapse={() => {}} />
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>,
  );
}

describe("admin sidebar", () => {
  it("renders brand, navigation landmark, and logout footer without a separate Accounts entry", async () => {
    renderSidebar();
    expect(screen.getByText("AFHomes")).toBeDefined();
    expect(screen.getByText("Management Platform")).toBeDefined();
    expect(screen.getByRole("navigation", { name: "Administration" })).toBeDefined();
    expect(await screen.findByText("Organization")).toBeDefined();
    expect(screen.queryByText("Accounts and Permissions")).toBeNull();
    expect(screen.getByRole("button", { name: "Log out" })).toBeDefined();
  });

  it("shows no Accounts entry to HR either", async () => {
    renderSidebar(false, "dev-hr");
    await screen.findByText("Organization");
    expect(screen.queryByText("Accounts and Permissions")).toBeNull();
  });

  it("lists process pages under their department parent and keeps Audit Logs top level", async () => {
    const user = userEvent.setup();
    renderSidebar(false, "dev-finance");
    const finance = await screen.findByRole("button", { name: /Finance/ });
    await user.click(finance);
    for (const name of ["Payment Verification", "Collections", "Payment History", "Commission Payouts"]) {
      expect(screen.getByRole("link", { name })).toBeDefined();
    }
    expect(screen.queryByRole("button", { name: /VIP Products/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Insights/ })).toBeNull();
    cleanup();
    renderSidebar(false, "dev-admin");
    expect(await screen.findByRole("link", { name: "Audit Logs" })).toBeDefined();
    expect(screen.getByRole("button", { name: /VIP Products/ })).toBeDefined();
  });

  it("asks for confirmation before logging out", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: "Log out" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Log out?" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("collapses to an icon rail whose links are still named", async () => {
    const { container } = renderSidebar(true);
    expect(container.querySelector("aside[data-collapsed='true']")).not.toBeNull();
    expect(screen.queryByText("AFHomes")).toBeNull();
    expect(await screen.findByRole("link", { name: "Departments" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Log out" })).toBeDefined();
  });

  it("expands the Organization group on demand", async () => {
    const user = userEvent.setup();
    renderSidebar();
    const group = await screen.findByRole("button", { name: /Organization/ });
    expect(group).toHaveAttribute("aria-expanded", "false");
    await user.click(group);
    expect(group).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Staff" })).toBeDefined();
  });
});
