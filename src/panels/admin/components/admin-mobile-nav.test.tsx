import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminMobileNav } from "./admin-mobile-nav";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";

afterEach(() => cleanup());

function renderNav() {
  return render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <QueryClientProvider client={new QueryClient()}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId="dev-admin">
          <AdminMobileNav />
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
    </ConfigProvider>,
  );
}

describe("admin mobile nav", () => {
  it("opens the drawer from the trigger", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Organization")).toBeDefined();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes after navigation", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await user.click(screen.getByRole("menuitem", { name: /Organization/ }));
    await user.click(screen.getByRole("link", { name: "Departments" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("hides the Accounts entry in the mobile drawer", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.queryByText("Accounts and Permissions")).toBeNull();
  });
});
