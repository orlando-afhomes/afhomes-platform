import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminMobileNav } from "./admin-mobile-nav";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";

afterEach(() => cleanup());

function renderNav(identityId = "dev-admin") {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>
          <AdminMobileNav />
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>,
  );
}

describe("admin mobile nav", () => {
  it("opens the drawer from the trigger", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getByRole("dialog", { name: "Navigation" })).toBeDefined();
    expect(screen.getByRole("button", { name: /Organization/ })).toBeDefined();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("closes after navigation", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const group = screen.getByRole("button", { name: /Organization/ });
    expect(group).toHaveAttribute("aria-expanded", "false");
    await user.click(group);
    expect(group).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("link", { name: "Departments" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("has no separate Accounts entry in the mobile drawer for any identity", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.queryByText("Accounts and Permissions")).toBeNull();
    cleanup();
    renderNav("dev-hr");
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.queryByText("Accounts and Permissions")).toBeNull();
  });
});
