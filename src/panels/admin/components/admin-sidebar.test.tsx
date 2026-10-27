import Swal from "sweetalert2";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
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

afterEach(() => {
  cleanup();
  Swal.close();
});

function renderSidebar(collapsed = false) {
  return render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <QueryClientProvider client={new QueryClient()}>
        <MockStoreProvider>
          <DevIdentityProvider initialIdentityId="dev-admin">
            <AdminSidebar collapsed={collapsed} onCollapse={() => {}} />
          </DevIdentityProvider>
        </MockStoreProvider>
      </QueryClientProvider>
    </ConfigProvider>,
  );
}

describe("admin sidebar", () => {
  it("renders brand, navigation landmark, and logout footer without Accounts", () => {
    renderSidebar();
    expect(screen.getByText("AFHomes")).toBeDefined();
    expect(screen.getByText("Management Platform")).toBeDefined();
    expect(screen.getByRole("navigation", { name: "Administration" })).toBeDefined();
    expect(screen.getByText("Organization")).toBeDefined();
    expect(screen.getByRole("button", { name: "Log out" })).toBeDefined();
    expect(screen.queryByText("Accounts and Permissions")).toBeNull();
  });

  it("asks for confirmation before logging out", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: "Log out" }));
    expect(await screen.findByText("Log out?")).toBeDefined();
    await user.click(document.querySelector(".swal2-cancel") as HTMLElement);
    expect(screen.queryByText("Log out?")).toBeNull();
  });

  it("applies the collapsed rail class when collapsed", () => {
    const { container } = renderSidebar(true);
    expect(container.querySelector(".ant-layout-sider-collapsed")).not.toBeNull();
    expect(screen.getByText("AFHomes")).toBeDefined();
  });
});
