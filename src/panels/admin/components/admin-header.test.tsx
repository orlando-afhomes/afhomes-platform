import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminHeader } from "./admin-header";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/admin",
}));

afterEach(() => cleanup());

function renderHeader(identityId = "dev-admin") {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>
          <AdminHeader collapsed={false} onCollapse={() => {}} />
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>,
  );
}

describe("admin header", () => {
  it("shows the profile circle, name, and role on the right side", () => {
    renderHeader();
    expect(screen.getByRole("button", { name: "Account options for Administrator (Dev)" })).toBeDefined();
    expect(screen.getByText("Administrator (Dev)")).toBeDefined();
    expect(screen.getByText("Administrator")).toBeDefined();
    expect(screen.queryByText("Administration")).toBeNull();
  });

  it("opens a dropdown with My Account and Log out", async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole("button", { name: "Account options for Administrator (Dev)" }));
    const accountLink = await screen.findByRole("menuitem", { name: "My Account" });
    expect(accountLink.getAttribute("href")).toBe("/admin/account");
    expect(screen.getByRole("menuitem", { name: "Log out" })).toBeDefined();
  });

  it("names the sidebar toggle by its state", () => {
    renderHeader();
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeDefined();
  });

  it("asks for confirmation before logging out", async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(screen.getByRole("button", { name: "Account options for Administrator (Dev)" }));
    await user.click(await screen.findByRole("menuitem", { name: "Log out" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Log out?" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });
});
