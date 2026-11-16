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

  it("groups the areas each role can open", async () => {
    const user = userEvent.setup();
    renderSidebar(false, "dev-finance");
    await user.click(await screen.findByRole("button", { name: "Money" }));
    expect(await screen.findByRole("link", { name: "Finance" })).toHaveAttribute("href", "/admin/finance");
    expect(screen.getByRole("link", { name: "Commissions" })).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Member Services" }));
    for (const name of ["Membership", "Stay Points", "Redemption"]) {
      expect(screen.getByRole("link", { name })).toBeDefined();
    }
    await user.click(screen.getByRole("button", { name: "Reports and Audit" }));
    expect(screen.getByRole("link", { name: "Reports" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Management" })).toBeNull();
    cleanup();
    renderSidebar(false, "dev-admin");
    await user.click(await screen.findByRole("button", { name: "Reports and Audit" }));
    expect(await screen.findByRole("link", { name: "Audit Logs" })).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Management" }));
    expect(screen.getByRole("link", { name: "Settings" })).toBeDefined();
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
    expect(await screen.findByRole("button", { name: "Management" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Log out" })).toBeDefined();
  });

  it("links Organization straight to its area page", async () => {
    renderSidebar();
    await userEvent.click(await screen.findByRole("button", { name: "Management" }));
    expect(await screen.findByRole("link", { name: "Organization" })).toHaveAttribute("href", "/admin/organization");
  });
});
