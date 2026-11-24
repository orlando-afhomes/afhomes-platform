import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminMobileNav } from "./admin-mobile-nav";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { readSession, writeSession } from "@/shared/providers/mock-session";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ replace }),
}));

afterEach(() => {
  cleanup();
  replace.mockClear();
  localStorage.clear();
});

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
    expect(screen.getByRole("link", { name: /Organization/ })).toBeDefined();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("confirms logout from the drawer footer before clearing the session", async () => {
    const user = userEvent.setup();
    writeSession("dev-admin");
    renderNav();
    const trigger = screen.getByRole("button", { name: "Open navigation" });
    await user.click(trigger);
    const drawer = screen.getByRole("dialog", { name: "Navigation" });
    await user.click(within(drawer).getByRole("button", { name: "Log out" }));

    const confirmation = await screen.findByRole("alertdialog", { name: "Log out?" });
    expect(screen.queryByRole("dialog", { name: "Navigation" })).toBeNull();
    await user.click(within(confirmation).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(readSession()?.identityId).toBe("dev-admin");
    expect(replace).not.toHaveBeenCalled();

    await user.click(trigger);
    await user.click(within(screen.getByRole("dialog", { name: "Navigation" })).getByRole("button", { name: "Log out" }));
    await user.click(within(await screen.findByRole("alertdialog", { name: "Log out?" })).getByRole("button", { name: "Log out" }));
    expect(readSession()).toBeNull();
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("closes after navigation", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await user.click(screen.getByRole("link", { name: "Organization" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("has no separate Accounts entry in the mobile drawer for any identity", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.queryByText("Staff Access")).toBeNull();
    cleanup();
    renderNav("dev-hr");
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.queryByText("Staff Access")).toBeNull();
  });
});
