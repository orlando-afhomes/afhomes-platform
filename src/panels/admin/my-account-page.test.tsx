import Swal from "sweetalert2";
import { describe, expect, it, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { MyAccountPage } from "./pages/my-account-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/admin/account",
}));

function TestWrapper({ identityId = "dev-admin" }: { identityId?: string }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <ConfigProvider theme={{ token: { motion: false } }}>
      <QueryClientProvider client={queryClient}>
        <MockStoreProvider>
          <DevIdentityProvider initialIdentityId={identityId}>
            <MyAccountPage />
          </DevIdentityProvider>
        </MockStoreProvider>
      </QueryClientProvider>
    </ConfigProvider>
  );
}

afterEach(() => {
  cleanup();
  Swal.close();
});

async function clickSwalConfirm(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => expect(document.querySelector(".swal2-confirm")).not.toBeNull());
  await user.click(document.querySelector(".swal2-confirm") as HTMLElement);
}

describe("my account page", () => {
  it("shows profile fields for a linked admin identity", async () => {
    render(<TestWrapper />);
    expect(await screen.findByDisplayValue("Admin User", {}, { timeout: 5000 })).toBeDefined();
    expect(screen.getByPlaceholderText("New Password")).toBeDefined();
  });

  it("gives admins department and role controls, without account roles", async () => {
    render(<TestWrapper />);
    await screen.findByDisplayValue("Admin User", {}, { timeout: 5000 });
    expect(screen.getByRole("combobox", { name: "My account department" })).toBeDefined();
    expect(await screen.findByRole("combobox", { name: "My account role" })).toBeDefined();
    expect(screen.queryByText("Account Roles")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("saves profile changes with confirmation and success modal", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    const nameInput = await screen.findByDisplayValue("Admin User", {}, { timeout: 5000 });
    fireEvent.change(nameInput, { target: { value: "Admin User Updated" } });
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await clickSwalConfirm(user);
    await waitFor(() => expect(screen.getByDisplayValue("Admin User Updated")).toBeInTheDocument());
    await clickSwalConfirm(user);
  });

  it("rejects mismatched passwords before saving", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByDisplayValue("Admin User", {}, { timeout: 5000 });
    fireEvent.change(screen.getByPlaceholderText("New Password"), { target: { value: "password123" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: "different123" } });
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
  });

  it("shows read-only employment info without admin controls for HR", async () => {
    render(<TestWrapper identityId="dev-hr" />);
    expect(await screen.findByDisplayValue("HR Staff", {}, { timeout: 5000 })).toBeDefined();
    expect(screen.queryByRole("combobox", { name: "My account department" })).toBeNull();
    expect(screen.queryByText("Account Roles")).toBeNull();
    await waitFor(() => expect(screen.getAllByText("Human Resources").length).toBeGreaterThan(0));
  });

  it("shows an empty state when no staff or account is linked", async () => {
    render(<TestWrapper identityId="dev-finance" />);
    expect(await screen.findByText("No linked staff or account record found for this identity.")).toBeDefined();
  });

  it("restricts inactive identities", async () => {
    render(<TestWrapper identityId="dev-inactive" />);
    expect(await screen.findByText("Access restricted")).toBeInTheDocument();
  });
});
